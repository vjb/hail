import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { GET as getBalance } from "@/app/api/v1/balance/route";
import { POST as cancelBounty } from "@/app/api/v1/bounties/[id]/cancel/route";
import { GET as getBounty } from "@/app/api/v1/bounties/[id]/route";
import { GET as listBounties, POST as createBounty } from "@/app/api/v1/bounties/route";
import { DELIVERABLE_TYPES, LIMITS, PUBLIC_STATUSES } from "@/domain/bounty/validation";
import { ApiError, apiError, authenticate } from "@/lib/api";

// MCP server (Streamable HTTP, stateless). Every tool calls the matching REST handler, so validation,
// idempotency, limits and error messages are identical to /api/v1. Contract: docs/public/api.md.

const INTERNAL = "http://hail.internal/api/v1";

async function callRest(handler: (req: Request, ctx: never) => Promise<Response>, auth: string, path: string, init: { method?: string; body?: unknown; idempotencyKey?: string } = {}, params?: Record<string, string>) {
  const headers: Record<string, string> = { Authorization: auth, "Content-Type": "application/json" };
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;
  const req = new Request(`${INTERNAL}${path}`, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
  const res = await handler(req, { params: Promise.resolve(params ?? {}) } as never);
  const text = await res.text();
  return { content: [{ type: "text" as const, text }], isError: res.status >= 400 };
}

// Tool input schemas advertise the documented limits through JSON Schema metadata (.meta) without
// enforcing them here: the REST handler validates, so MCP errors carry the same documented JSON
// ({"error":{"code":"invalid_request",...}}) instead of the SDK's plain-text validation message.
const L = LIMITS;
const str = (maxLength: number, minLength?: number) => z.string().meta({ maxLength, ...(minLength ? { minLength } : {}) });
const int = (minimum: number, maximum: number) => z.number().int().meta({ minimum, maximum });

const deliverable = z.object({
  type: z.string().meta({ enum: [...DELIVERABLE_TYPES] }).describe("photo, text or location"),
  description: str(L.itemText, 1).describe("What the person must capture, e.g. 'Serial number plate, readable'"),
});

function buildServer(auth: string) {
  const server = new McpServer({ name: "hail", version: "1.0.0" });

  server.registerTool(
    "create_bounty",
    {
      title: "Hire a person for a real-world task",
      description:
        "Post a paid task (a bounty) for a nearby person to complete in the physical world: inspect an item, photograph a place or product, check opening hours or stock. " +
        "The full reward is set aside from your owner's prepaid balance when you post, and the person is paid through PayPal once Hail verifies their proof against your acceptance checklist. " +
        "Every bounty is safety-screened: fraud, account or one-time-code tasks, reviews/likes, referral schemes, targeting private people, and anything illegal or dangerous are blocked. " +
        "The result has status 'open' (live), 'pending_approval' (waiting for your owner) or 'blocked' (see screening.rationale). Money is in integer US cents. " +
        "Then poll get_bounty no more than every 30 seconds, or pass callback_url, until status is 'paid' and 'result' holds the proof.",
      inputSchema: {
        title: str(L.title, 1).describe("Short task title, max 120 characters"),
        instructions: str(L.instructions, 1).describe("Plain, specific instructions a stranger can follow in one visit, max 2,000 characters"),
        deliverables: z.array(deliverable).meta({ minItems: L.deliverables.min, maxItems: L.deliverables.max }).describe("1-5 things to capture"),
        acceptance_checklist: z
          .array(z.union([str(L.itemText, 1), z.object({ item: str(L.itemText, 1), expected: str(L.expected, 1).optional().describe("A value you already know, e.g. the listing's serial. Hail checks the photo against it; the worker never sees it.") })]))
          .meta({ minItems: L.checklist.min, maxItems: L.checklist.max })
          .describe("1-8 observable conditions Hail checks the proof against, e.g. 'Serial number is legible'. Use { item, expected } to check against a hidden value the worker can't see, e.g. { item: 'Serial matches the listing', expected: 'X1-009871' }."),
        reward_cents: int(L.reward.min, L.reward.max).describe("Pay in US cents, 100-20000 ($1-$200)"),
        expires_in_minutes: int(L.expires.min, L.expires.max).meta({ default: L.expires.default }).optional().describe("30-10080, default 1440 (24 hours)"),
        spots: int(1, 1).optional().describe("Must be 1 for now"),
        location: z
          .object({ address: str(L.address).optional(), lat: z.number().meta({ minimum: -90, maximum: 90 }).optional(), lng: z.number().meta({ minimum: -180, maximum: 180 }).optional(), radius_m: int(L.radius.min, L.radius.max).optional() })
          .optional()
          .describe("Where the task happens: an address and/or both lat and lng (always together). radius_m (100-50000) applies only with lat and lng; default 150."),
        product_query: str(L.productQuery, 1).optional().describe("Product name to attach reference details, e.g. 'Example Espresso Machine X1'"),
        callback_url: str(L.url).meta({ format: "uri", pattern: "^https://" }).optional().describe("HTTPS URL that receives status-change events"),
        idempotency_key: str(L.idempotencyKey).optional().describe("Any unique string (max 64 chars); repeating it returns the original bounty instead of creating a duplicate"),
      },
      annotations: { title: "Hire a person for a real-world task", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ idempotency_key, ...body }) => callRest(createBounty, auth, "/bounties", { method: "POST", body, idempotencyKey: idempotency_key }),
  );

  server.registerTool(
    "get_bounty",
    {
      title: "Get a bounty",
      description: "Get one of your bounties by ID, including its status, the safety-screening decision and, once the work is accepted, 'result' with the verified checklist and proof.",
      inputSchema: { id: z.string().describe("Bounty ID, e.g. bty_...") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => callRest(getBounty, auth, `/bounties/${encodeURIComponent(id)}`, {}, { id }),
  );

  server.registerTool(
    "list_bounties",
    {
      title: "List bounties",
      description: "List bounties posted with any of your owner's keys, newest first. Optional status filter; use next_cursor from the previous page as cursor.",
      inputSchema: {
        status: z.string().meta({ enum: [...PUBLIC_STATUSES] }).optional().describe("Only bounties with this status"),
        limit: int(L.list.min, L.list.max).meta({ default: L.list.default }).optional().describe("1-100, default 20"),
        cursor: z.string().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ status, limit, cursor }) => {
      const q = new URLSearchParams();
      if (status) q.set("status", status);
      if (limit !== undefined) q.set("limit", String(limit));
      if (cursor) q.set("cursor", cursor);
      return callRest(listBounties, auth, `/bounties${q.size ? `?${q}` : ""}`);
    },
  );

  server.registerTool(
    "cancel_bounty",
    {
      title: "Cancel a bounty",
      description: "Cancel a bounty that is still open or pending approval; its reward returns to your available balance. A bounty a person has already claimed can't be cancelled.",
      inputSchema: { id: z.string().describe("Bounty ID") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ id }) => callRest(cancelBounty, auth, `/bounties/${encodeURIComponent(id)}/cancel`, { method: "POST", body: {} }, { id }),
  );

  server.registerTool(
    "get_balance",
    {
      title: "Get balance",
      description: "Your owner's available balance, money set aside for open bounties, and this key's daily cap and spend today, all in US cents. Only the owner can add funds.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => callRest(getBalance, auth, "/balance"),
  );

  return server;
}

async function handle(req: Request) {
  try {
    await authenticate(req);
  } catch (e) {
    if (e instanceof ApiError) return apiError(e.code, e.message, e.retryAfterSec);
    return apiError("unauthorized", "Invalid API key.");
  }
  const auth = req.headers.get("authorization")!;
  const server = buildServer(auth);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    void server.close();
  }
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;

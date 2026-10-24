import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { GET as getBalance } from "@/app/api/v1/balance/route";
import { POST as cancelBounty } from "@/app/api/v1/bounties/[id]/cancel/route";
import { GET as getBounty } from "@/app/api/v1/bounties/[id]/route";
import { GET as listBounties, POST as createBounty } from "@/app/api/v1/bounties/route";
import { apiError, authenticate } from "@/lib/api";

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

const deliverable = z.object({
  type: z.enum(["photo", "text", "location"]).describe("photo, text or location"),
  description: z.string().describe("What the person must capture, e.g. 'Serial number plate, readable'"),
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
        title: z.string().describe("Short task title, max 120 characters"),
        instructions: z.string().describe("Plain, specific instructions a stranger can follow in one visit, max 2,000 characters"),
        deliverables: z.array(deliverable).describe("1-5 things to capture"),
        acceptance_checklist: z.array(z.string()).describe("1-8 observable conditions Hail checks the proof against, e.g. 'Serial number is legible'"),
        reward_cents: z.number().int().describe("Pay in US cents, 100-20000 ($1-$200)"),
        expires_in_minutes: z.number().int().optional().describe("30-10080, default 1440 (24 hours)"),
        spots: z.number().int().optional().describe("Must be 1 for now"),
        location: z.object({ address: z.string().optional(), lat: z.number().optional(), lng: z.number().optional(), radius_m: z.number().int().optional() }).optional().describe("Where the task happens"),
        product_query: z.string().optional().describe("Product name to attach reference details, e.g. 'Example Espresso Machine X1'"),
        callback_url: z.string().optional().describe("HTTPS URL that receives status-change events"),
        idempotency_key: z.string().optional().describe("Any unique string (max 64 chars); repeating it returns the original bounty instead of creating a duplicate"),
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
        status: z.string().optional().describe("e.g. open, pending_approval, claimed, verifying, paid, blocked"),
        limit: z.number().int().optional().describe("1-100, default 20"),
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
    const err = e as { code?: "unauthorized" | "forbidden"; message?: string };
    return apiError(err.code ?? "unauthorized", err.message ?? "Invalid API key.");
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

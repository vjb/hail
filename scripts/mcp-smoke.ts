/**
 * MCP smoke test with the official client: lists tools, checks balance, posts, reads and cancels a bounty.
 * Usage: npm run mcp:smoke -- <base-url> <api-key-file>
 */
import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  const [base = "http://localhost:3000", keyFile] = process.argv.slice(2);
  const key = keyFile ? readFileSync(keyFile, "utf8").trim() : process.env.HAIL_KEY;
  if (!key) throw new Error("Pass an API key file or set HAIL_KEY");
  const transport = new StreamableHTTPClientTransport(new URL("/api/mcp", base), { requestInit: { headers: { Authorization: `Bearer ${key}` } } });
  const client = new Client({ name: "hail-smoke", version: "1.0.0" });
  await client.connect(transport);

  const tools = await client.listTools();
  console.log("tools:", tools.tools.map((t) => t.name).join(", "));
  const text = (r: Awaited<ReturnType<typeof client.callTool>>) => JSON.parse((r.content as Array<{ text: string }>)[0].text);

  console.log("balance:", text(await client.callTool({ name: "get_balance", arguments: {} })));
  const created = text(
    await client.callTool({
      name: "create_bounty",
      arguments: {
        title: "Check opening hours at the corner bakery",
        instructions: "Photograph the opening hours posted on the bakery door at 5th and Main.",
        deliverables: [{ type: "photo", description: "Opening hours sign" }],
        acceptance_checklist: ["Opening hours are readable"],
        reward_cents: 900,
        idempotency_key: `mcp-smoke-${Date.now()}`,
      },
    }),
  );
  console.log("created:", created.id, created.status, created.screening?.category);
  console.log("get:", text(await client.callTool({ name: "get_bounty", arguments: { id: created.id } })).status);
  console.log("list open:", text(await client.callTool({ name: "list_bounties", arguments: { status: "open", limit: 3 } })).data.length);
  console.log("cancel:", text(await client.callTool({ name: "cancel_bounty", arguments: { id: created.id } })).status);
  const bad = await client.callTool({ name: "create_bounty", arguments: { title: "x", instructions: "y", deliverables: [], acceptance_checklist: ["a"], reward_cents: 5 } });
  console.log("invalid:", bad.isError, text(bad).error.code, "-", text(bad).error.message);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

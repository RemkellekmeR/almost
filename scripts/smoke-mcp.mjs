#!/usr/bin/env node
/**
 * Smoke: Streamable HTTP MCP tools against Neon Corridor fixture.
 * Expects MCP at MCP_PUBLIC_URL (default http://127.0.0.1:3100/mcp).
 *
 * Usage:
 *   npm run start:mcp   # other terminal
 *   npm run smoke:mcp
 */
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const url = process.env.MCP_PUBLIC_URL || "http://127.0.0.1:3100/mcp";
const EXPECTED_PEAKS = [30, 62];
const EXPECTED_PROTOCOL = process.env.EXPECTED_MCP_PROTOCOL || "2025-11-25";

/**
 * Raw Streamable HTTP initialize (no SDK) so we can assert the negotiated
 * protocolVersion. Note: the spec requires Accept to list BOTH
 * application/json and text/event-stream or the server answers 406.
 */
async function rawInitialize(requested) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: requested,
        capabilities: {},
        clientInfo: { name: "almost-smoke-raw", version: "0.1.0" },
      },
    }),
  });
  const body = await res.text();
  // Response may be plain JSON or a single SSE `data:` frame.
  const json = body.trim().startsWith("{")
    ? body
    : body.split("\n").find((l) => l.startsWith("data:"))?.slice(5);
  if (!json) throw new Error(`initialize: unparseable response (${res.status})`);
  return JSON.parse(json).result?.protocolVersion;
}

function parse(result) {
  const text = result.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("empty tool result");
  const data = JSON.parse(text);
  if (data.ok === false) throw new Error(data.error || "tool failed");
  return data;
}

const client = new Client({ name: "almost-smoke", version: "0.1.0" });
const transport = new StreamableHTTPClientTransport(new URL(url));

console.log(`smoke: connecting ${url}`);

const negotiated = await rawInitialize(EXPECTED_PROTOCOL);
console.log(`smoke: initialize protocolVersion ${negotiated}`);
if (negotiated !== EXPECTED_PROTOCOL) {
  console.error(`FAIL: expected protocolVersion ${EXPECTED_PROTOCOL}; got ${negotiated}`);
  process.exit(1);
}

await client.connect(transport);

const tools = await client.listTools();
const names = tools.tools.map((t) => t.name);
console.log(`smoke: tools ${names.join(", ")}`);

parse(
  await client.callTool({
    name: "start_session",
    arguments: { sessionId: "jam-neon-corridor", consent: true },
  }),
);

const listed = parse(
  await client.callTool({
    name: "list_near_misses",
    arguments: { sessionId: "jam-neon-corridor" },
  }),
);

const peaks = (listed.nearMisses || []).map((n) => n.peakT).sort((a, b) => a - b);
console.log(`smoke: peaks @ ${peaks.join("s, ")}s`);

const ok =
  peaks.length === EXPECTED_PEAKS.length &&
  EXPECTED_PEAKS.every((p, i) => peaks[i] === p);

if (!ok) {
  console.error(`FAIL: expected peaks ${EXPECTED_PEAKS.join(", ")}; got ${peaks.join(", ")}`);
  await client.close();
  process.exit(1);
}

const top = listed.nearMisses[0];
if (!top?.graph?.nodes?.length) {
  console.error("FAIL: list_near_misses missing graph on near-miss objects");
  await client.close();
  process.exit(1);
}

const explained = parse(
  await client.callTool({
    name: "explain_near_miss",
    arguments: { nearMissId: top.id },
  }),
);
console.log(`smoke: explain ok (${explained.source})`);

await client.close();
console.log(`PASS: protocol ${negotiated} · Neon Corridor near-misses @ 30s / 62s via live MCP`);

import "server-only";

import {
  Client,
  StreamableHTTPClientTransport,
  type CallToolResult,
} from "@modelcontextprotocol/client";

export function mcpEndpoint(): string {
  return (
    process.env.MCP_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_MCP_URL ||
    "http://127.0.0.1:3100/mcp"
  );
}

function healthUrl(mcpUrl: string): string {
  try {
    const u = new URL(mcpUrl);
    u.pathname = "/health";
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return "http://127.0.0.1:3100/health";
  }
}

/** Quick liveness probe — does not require MCP initialize. */
export async function mcpHealthy(timeoutMs = 1500): Promise<boolean> {
  try {
    const res = await fetch(healthUrl(mcpEndpoint()), {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean };
    return body.ok === true;
  } catch {
    return false;
  }
}

function textPayload(result: CallToolResult): string {
  const block = result.content?.find((c) => c.type === "text");
  if (!block || block.type !== "text" || typeof block.text !== "string") {
    throw new Error("MCP tool returned no text content");
  }
  return block.text;
}

export function parseToolJson<T extends Record<string, unknown>>(result: CallToolResult): T {
  const data = JSON.parse(textPayload(result)) as T & { ok?: boolean; error?: string };
  if (data.ok === false) {
    throw new Error(data.error || "MCP tool failed");
  }
  return data;
}

/**
 * One-shot Streamable HTTP MCP session: connect → callTool → close.
 * Fine for demo/server-action traffic; store state lives on the MCP process.
 */
export async function withMcpClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ name: "almost-web", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(mcpEndpoint()));
  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close().catch(() => undefined);
  }
}

export async function callMcpTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<CallToolResult> {
  return withMcpClient((client) =>
    client.callTool({
      name,
      arguments: args,
    }),
  );
}

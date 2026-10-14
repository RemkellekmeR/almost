import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { isInitializeRequest, McpServer } from "@modelcontextprotocol/server";
import { getStore } from "@almost/core";
import { registerAlmostTools } from "./tools.js";

const PORT = Number(process.env.MCP_PORT ?? 3100);
const HOST = process.env.MCP_HOST ?? "127.0.0.1";

/** Comma-separated hostnames for DNS-rebinding protection when binding openly. */
function resolveAllowedHosts(): string[] | undefined {
  const fromEnv = process.env.ALLOWED_HOSTS?.split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  // Match prior behavior: only enforce when listening on all interfaces.
  if (HOST === "0.0.0.0") return ["localhost", "127.0.0.1"];
  return undefined;
}

const allowedHosts = resolveAllowedHosts();

// Seed fixtures into the in-memory store at boot
getStore();

type SessionEntry = {
  transport: NodeStreamableHTTPServerTransport;
  server: McpServer;
};

/** Stateful Streamable HTTP sessions keyed by Mcp-Session-Id. */
const sessions = new Map<string, SessionEntry>();

function createAlmostServer(): McpServer {
  const server = new McpServer({
    name: "almost",
    version: "0.1.0",
  });
  registerAlmostTools(server);
  return server;
}

const app = createMcpExpressApp({
  host: HOST,
  allowedHosts,
});

app.get("/health", (_req, res) => {
  const store = getStore();
  res.json({
    ok: true,
    service: "almost-mcp",
    sessions: store.list().map((s) => s.id),
    mcpSessions: sessions.size,
    activeClients: store.activeClientCount(),
    mcp: "/mcp",
  });
});

app.all("/mcp", async (req, res) => {
  const sessionIdHeader = req.headers["mcp-session-id"];
  const sessionId =
    typeof sessionIdHeader === "string"
      ? sessionIdHeader
      : Array.isArray(sessionIdHeader)
        ? sessionIdHeader[0]
        : undefined;

  try {
    if (sessionId && sessions.has(sessionId)) {
      const entry = sessions.get(sessionId)!;
      await entry.transport.handleRequest(req, res, req.body);
      return;
    }

    const body = req.body as unknown;
    if (req.method === "POST" && isInitializeRequest(body)) {
      const server = createAlmostServer();
      const transport = new NodeStreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, { transport, server });
        },
        onsessionclosed: (id) => {
          sessions.delete(id);
          getStore().releaseClient(id);
          void server.close().catch(() => undefined);
        },
      });

      transport.onclose = () => {
        const id = transport.sessionId;
        if (id) {
          sessions.delete(id);
          getStore().releaseClient(id);
        }
        void server.close().catch(() => undefined);
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, body);
      return;
    }

    res.status(sessionId ? 404 : 400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: sessionId
          ? "Unknown MCP session"
          : "Bad Request: Mcp-Session-Id required (or send initialize)",
      },
      id: null,
    });
  } catch (err) {
    console.error("MCP /mcp error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Almost MCP Streamable HTTP on http://${HOST}:${PORT}/mcp`);
  console.log(`Health: http://${HOST}:${PORT}/health`);
  if (allowedHosts) {
    console.log(`allowedHosts: ${allowedHosts.join(", ")}`);
  }
});

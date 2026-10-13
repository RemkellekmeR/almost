import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { getStore } from "@almost/core";
import { registerAlmostTools } from "./tools.js";

const PORT = Number(process.env.MCP_PORT ?? 3100);
const HOST = process.env.MCP_HOST ?? "127.0.0.1";

// Seed fixtures into the in-memory store at boot
getStore();

const handler = createMcpHandler(() => {
  const server = new McpServer({
    name: "almost",
    version: "0.1.0",
  });
  registerAlmostTools(server);
  return server;
});

const app = createMcpExpressApp({
  host: HOST,
  allowedHosts: HOST === "0.0.0.0" ? ["localhost", "127.0.0.1"] : undefined,
});

const node = toNodeHandler(handler);

app.get("/health", (_req, res) => {
  const store = getStore();
  res.json({
    ok: true,
    service: "almost-mcp",
    sessions: store.list().map((s) => s.id),
    mcp: "/mcp",
  });
});

app.all("/mcp", (req, res) => {
  void node(req, res, req.body);
});

app.listen(PORT, HOST, () => {
  console.log(`Almost MCP Streamable HTTP on http://${HOST}:${PORT}/mcp`);
  console.log(`Health: http://${HOST}:${PORT}/health`);
});

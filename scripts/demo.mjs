#!/usr/bin/env node
/**
 * One-command local demo: MCP (built dist) + Next.js web (production build).
 *   npm run build && npm run demo
 * → MCP  http://127.0.0.1:3100/mcp   (health: /health)
 * → Web  http://localhost:3000       (mode pill should read "live MCP")
 * Ctrl+C stops both.
 */
import { spawn } from "node:child_process";

const env = {
  ...process.env,
  MCP_PUBLIC_URL: process.env.MCP_PUBLIC_URL || "http://127.0.0.1:3100/mcp",
};

const procs = [
  ["mcp", ["run", "start", "-w", "@almost/mcp-server"]],
  ["web", ["run", "start", "-w", "@almost/web"]],
].map(([tag, args]) => {
  const p = spawn("npm", args, { env, stdio: ["ignore", "pipe", "pipe"] });
  const out = (chunk) =>
    chunk
      .toString()
      .split("\n")
      .filter(Boolean)
      .forEach((l) => console.log(`[${tag}] ${l}`));
  p.stdout.on("data", out);
  p.stderr.on("data", out);
  p.on("exit", (code) => {
    console.log(`[${tag}] exited ${code}`);
    shutdown(code ?? 0);
  });
  return p;
});

let down = false;
function shutdown(code) {
  if (down) return;
  down = true;
  for (const p of procs) p.kill("SIGTERM");
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

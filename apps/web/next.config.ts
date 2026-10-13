import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@almost/core"],
  // Allow reading fixtures from monorepo root in API routes / server components
  outputFileTracingRoot: root,
  // NOTE: do NOT list "server-only" here. Externalizing it makes Node resolve the
  // package's default export (which throws) instead of the bundler's react-server
  // condition → `next build` passes but every page 500s at runtime.
  serverExternalPackages: ["@modelcontextprotocol/client", "@modelcontextprotocol/core"],
};

export default nextConfig;

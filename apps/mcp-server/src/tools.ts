import { z } from "zod";
import type { McpServer, ServerContext } from "@modelcontextprotocol/server";
import { getStore } from "@almost/core";

function text(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

/** MCP transport session id (Mcp-Session-Id), when the client holds a stateful connection. */
function clientKey(ctx: ServerContext): string | undefined {
  return ctx.sessionId;
}

export function registerAlmostTools(server: McpServer): void {
  const store = getStore();

  server.registerTool(
    "start_session",
    {
      description:
        "Start or resume a consent-based jam session. Defaults to the seeded Neon Corridor demo fixture.",
      inputSchema: z.object({
        sessionId: z.string().optional().describe("Fixture session id"),
        title: z.string().optional(),
        consent: z
          .boolean()
          .optional()
          .describe("Must be true (or omitted) — Almost is consent-based"),
      }),
    },
    async (args, ctx) => {
      try {
        const session = store.startSession(args, clientKey(ctx));
        return text({
          ok: true,
          sessionId: session.id,
          title: session.title,
          consent: session.consent,
          durationSec: session.durationSec,
          nearMissCount: session.nearMisses.filter((n) => n.unmarked).length,
          message: `Session "${session.title}" active. Ask: what did I just walk past?`,
        });
      } catch (e) {
        return text({ ok: false, error: String(e) });
      }
    },
  );

  server.registerTool(
    "ingest_timeline",
    {
      description:
        "Append timeline events to a session and re-run deterministic near-miss scoring.",
      inputSchema: z.object({
        sessionId: z.string(),
        events: z.array(
          z.object({
            id: z.string(),
            t: z.number(),
            type: z.string(),
            label: z.string().optional(),
            meta: z.record(z.string(), z.unknown()).optional(),
          }),
        ),
      }),
    },
    async (args) => {
      try {
        const session = store.ingestTimeline(
          args.sessionId,
          args.events as Parameters<typeof store.ingestTimeline>[1],
        );
        return text({
          ok: true,
          sessionId: session.id,
          timelineLength: session.timeline.length,
          nearMisses: session.nearMisses.filter((n) => n.unmarked).map((n) => n.id),
        });
      } catch (e) {
        return text({ ok: false, error: String(e) });
      }
    },
  );

  server.registerTool(
    "list_near_misses",
    {
      description:
        "List unmarked creative near-misses for the active or given session.",
      inputSchema: z.object({
        sessionId: z.string().optional(),
      }),
    },
    async (args, ctx) => {
      const misses = store.listNearMisses(args.sessionId, clientKey(ctx));
      // Full NearMiss objects (incl. graph) so web Alexa+ sim can render forks
      // without a second round-trip. Slim fields remain available on each object.
      return text({
        ok: true,
        count: misses.length,
        nearMisses: misses,
      });
    },
  );

  server.registerTool(
    "explain_near_miss",
    {
      description:
        "Explain a near-miss with reconstructable event graph. Uses fixture text for now (LLM stub later).",
      inputSchema: z.object({
        nearMissId: z.string(),
      }),
    },
    async (args) => {
      try {
        const result = store.explainNearMiss(args.nearMissId);
        return text({ ok: true, ...result });
      } catch (e) {
        return text({ ok: false, error: String(e) });
      }
    },
  );

  server.registerTool(
    "resume_near_miss",
    {
      description:
        "Walk the user back to the Approach node of a near-miss fork.",
      inputSchema: z.object({
        nearMissId: z.string(),
      }),
    },
    async (args) => {
      try {
        const result = store.resumeNearMiss(args.nearMissId);
        return text({ ok: true, ...result });
      } catch (e) {
        return text({ ok: false, error: String(e) });
      }
    },
  );

  server.registerTool(
    "export_seed",
    {
      description:
        "Export an audio/MIDI seed window for a near-miss so the user can continue the abandoned thread.",
      inputSchema: z.object({
        nearMissId: z.string(),
        seedId: z.string().optional(),
      }),
    },
    async (args) => {
      try {
        const result = store.exportSeed(args.nearMissId, args.seedId);
        return text({ ok: true, ...result });
      } catch (e) {
        return text({ ok: false, error: String(e) });
      }
    },
  );

  server.registerTool(
    "session_summary",
    {
      description: "Summarize the active or given jam session.",
      inputSchema: z.object({
        sessionId: z.string().optional(),
      }),
    },
    async (args, ctx) => {
      try {
        const summary = store.summary(args.sessionId, clientKey(ctx));
        return text({ ok: true, summary });
      } catch (e) {
        return text({ ok: false, error: String(e) });
      }
    },
  );
}

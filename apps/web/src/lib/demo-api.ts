"use server";

import {
  getStore,
  type NearMiss,
  type Session,
  type SessionSummary,
  type SeedWindow,
  type EventGraph,
} from "@almost/core";
import { callMcpTool, mcpEndpoint, mcpHealthy, parseToolJson } from "./mcp-client";

export type BackendMode = "mcp" | "core-fallback";

/**
 * Every demo call reports which path actually served it, plus the MCP tool
 * name(s) it maps to — so the Alexa+ sim can show judges "via MCP · tool".
 */
export type Via<T> = {
  data: T;
  mode: BackendMode;
  tools: string[];
};

export type SessionHandle = {
  id: string;
  title: string;
  consent: boolean;
  durationSec: number;
};

export type ExplainResult = {
  nearMiss: NearMiss;
  explanation: string;
  source: "fixture" | "stub-llm";
};

export type ResumeResult = {
  nearMiss: NearMiss;
  resumeFromT: number;
  cue: string;
  graph: EventGraph;
};

export type ExportResult = {
  nearMissId: string;
  seed: SeedWindow;
};

async function viaMcpOrCore<T>(
  tools: string[],
  mcp: () => Promise<T>,
  core: () => T,
): Promise<Via<T>> {
  if (await mcpHealthy()) {
    try {
      return { data: await mcp(), mode: "mcp", tools };
    } catch {
      // fall through to core — same deterministic scorer
    }
  }
  return { data: core(), mode: "core-fallback", tools };
}

export async function demoBackendStatus(): Promise<{
  mode: BackendMode;
  mcpUrl: string;
  healthy: boolean;
}> {
  const mcpUrl = mcpEndpoint();
  const healthy = await mcpHealthy();
  return {
    mode: healthy ? "mcp" : "core-fallback",
    mcpUrl,
    healthy,
  };
}

export async function demoStartSession(sessionId?: string): Promise<Via<SessionHandle>> {
  return viaMcpOrCore(
    ["start_session"],
    async () => {
      const raw = parseToolJson<{
        sessionId: string;
        title: string;
        consent: boolean;
        durationSec: number;
      }>(await callMcpTool("start_session", { sessionId, consent: true }));
      return {
        id: raw.sessionId,
        title: raw.title,
        consent: raw.consent,
        durationSec: raw.durationSec,
      };
    },
    () => {
      const session = getStore().startSession({ sessionId, consent: true });
      return {
        id: session.id,
        title: session.title,
        consent: session.consent,
        durationSec: session.durationSec,
      };
    },
  );
}

export async function demoListNearMisses(sessionId?: string): Promise<Via<NearMiss[]>> {
  return viaMcpOrCore(
    ["list_near_misses"],
    async () =>
      parseToolJson<{ nearMisses: NearMiss[] }>(
        await callMcpTool("list_near_misses", { sessionId }),
      ).nearMisses,
    () => getStore().listNearMisses(sessionId),
  );
}

export async function demoExplain(nearMissId: string): Promise<Via<ExplainResult>> {
  return viaMcpOrCore(
    ["explain_near_miss"],
    async () => {
      const raw = parseToolJson<ExplainResult>(
        await callMcpTool("explain_near_miss", { nearMissId }),
      );
      return { nearMiss: raw.nearMiss, explanation: raw.explanation, source: raw.source };
    },
    () => getStore().explainNearMiss(nearMissId),
  );
}

export async function demoResume(nearMissId: string): Promise<Via<ResumeResult>> {
  return viaMcpOrCore(
    ["resume_near_miss"],
    async () => {
      const raw = parseToolJson<ResumeResult>(
        await callMcpTool("resume_near_miss", { nearMissId }),
      );
      return {
        nearMiss: raw.nearMiss,
        resumeFromT: raw.resumeFromT,
        cue: raw.cue,
        graph: raw.graph,
      };
    },
    () => getStore().resumeNearMiss(nearMissId),
  );
}

export async function demoExport(nearMissId: string, seedId?: string): Promise<Via<ExportResult>> {
  return viaMcpOrCore(
    ["export_seed"],
    async () => {
      const raw = parseToolJson<ExportResult>(
        await callMcpTool("export_seed", { nearMissId, seedId }),
      );
      return { nearMissId: raw.nearMissId, seed: raw.seed };
    },
    () => getStore().exportSeed(nearMissId, seedId),
  );
}

export async function demoSummary(sessionId?: string): Promise<Via<SessionSummary>> {
  return viaMcpOrCore(
    ["session_summary"],
    async () =>
      parseToolJson<{ summary: SessionSummary }>(
        await callMcpTool("session_summary", { sessionId }),
      ).summary,
    () => getStore().summary(sessionId),
  );
}

export async function demoGetSession(sessionId?: string): Promise<Session | undefined> {
  // Session dump is core-only (no MCP get_session tool yet).
  const store = getStore();
  if (sessionId) return store.get(sessionId);
  return store.active() ?? store.startSession({ consent: true });
}

export type { NearMiss, Session, SeedWindow, SessionSummary, EventGraph };

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NearMiss, Session, SeedWindow, SessionSummary } from "./types.js";
import { detectNearMisses, sessionSummary, rescoreSession } from "./scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Resolve fixtures/sessions whether running from src or dist. */
export function fixturesDir(): string {
  const candidates = [
    resolve(__dirname, "../../../fixtures/sessions"),
    resolve(process.cwd(), "fixtures/sessions"),
    resolve(process.cwd(), "../../fixtures/sessions"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

export function loadSessionFile(path: string): Session {
  const raw = JSON.parse(readFileSync(path, "utf8")) as Session;
  if (!raw.consent) {
    throw new Error(`Session ${raw.id} refuses consent — Almost will not process it.`);
  }
  return raw;
}

export function loadAllSessions(): Session[] {
  const dir = fixturesDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => loadSessionFile(join(dir, f)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** In-memory session store seeded from fixtures. */
export class SessionStore {
  private sessions = new Map<string, Session>();
  private activeId: string | null = null;

  seedFromDisk(): void {
    for (const s of loadAllSessions()) {
      // Ensure near-misses match scoring (overwrite fixture list with detector)
      const rescored = rescoreSession(s);
      this.sessions.set(s.id, rescored);
    }
    const first = [...this.sessions.values()][0];
    if (first) this.activeId = first.id;
  }

  list(): Session[] {
    return [...this.sessions.values()];
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  active(): Session | undefined {
    return this.activeId ? this.sessions.get(this.activeId) : undefined;
  }

  startSession(input?: {
    sessionId?: string;
    title?: string;
    consent?: boolean;
  }): Session {
    if (input?.sessionId && this.sessions.has(input.sessionId)) {
      const existing = this.sessions.get(input.sessionId)!;
      if (!existing.consent && input.consent !== true) {
        throw new Error("Consent required to start session.");
      }
      this.activeId = existing.id;
      return existing;
    }

    // Default: activate demo fixture
    const demo =
      this.sessions.get("jam-neon-corridor") ??
      [...this.sessions.values()][0];
    if (!demo) {
      throw new Error("No fixture sessions available. Seed fixtures first.");
    }
    if (input?.consent === false) {
      throw new Error("Consent required. Almost is consent-based.");
    }
    this.activeId = demo.id;
    return demo;
  }

  ingestTimeline(
    sessionId: string,
    events: Session["timeline"],
  ): Session {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error(`Unknown session ${sessionId}`);
    if (!s.consent) throw new Error("Consent required.");
    const merged = {
      ...s,
      timeline: [...s.timeline, ...events].sort((a, b) => a.t - b.t),
    };
    const rescored = rescoreSession(merged);
    this.sessions.set(sessionId, rescored);
    return rescored;
  }

  listNearMisses(sessionId?: string): NearMiss[] {
    const s = sessionId ? this.sessions.get(sessionId) : this.active();
    if (!s) return [];
    return s.nearMisses.filter((n) => n.unmarked);
  }

  explainNearMiss(nearMissId: string): {
    nearMiss: NearMiss;
    explanation: string;
    source: "fixture" | "stub-llm";
  } {
    for (const s of this.sessions.values()) {
      const nm = s.nearMisses.find((n) => n.id === nearMissId);
      if (nm) {
        const explanation = [
          nm.summary,
          `Graph: Approach @ ${nm.approachT.toFixed(1)}s → Peak @ ${nm.peakT.toFixed(1)}s → Abandon @ ${nm.abandonT.toFixed(1)}s → SafeLoop @ ${nm.safeLoopT.toFixed(1)}s.`,
          `Novelty peak ${nm.noveltyPeak.toFixed(2)}; post-return repetition ${nm.repetitionAfter.toFixed(2)}.`,
          "You never hit capture/export near that peak — Almost treated it as a walk-past.",
        ].join(" ");
        return { nearMiss: nm, explanation, source: "fixture" };
      }
    }
    throw new Error(`Near-miss ${nearMissId} not found`);
  }

  resumeNearMiss(nearMissId: string): {
    nearMiss: NearMiss;
    resumeFromT: number;
    cue: string;
    graph: NearMiss["graph"];
  } {
    const { nearMiss } = this.explainNearMiss(nearMissId);
    return {
      nearMiss,
      resumeFromT: nearMiss.approachT,
      cue: `Resume from Approach at ${nearMiss.approachT.toFixed(1)}s — ride the novelty ramp toward Peak @ ${nearMiss.peakT.toFixed(1)}s instead of abandoning.`,
      graph: nearMiss.graph,
    };
  }

  exportSeed(nearMissId: string, seedId?: string): {
    nearMissId: string;
    seed: SeedWindow;
  } {
    const { nearMiss } = this.explainNearMiss(nearMissId);
    const session = this.sessions.get(nearMiss.sessionId);
    if (!session) throw new Error("Session missing");
    const id = seedId ?? nearMiss.seedWindowIds[0];
    const seed =
      session.seedWindows.find((w) => w.id === id) ??
      session.seedWindows[0];
    if (!seed) throw new Error("No seed windows on session");
    return { nearMissId, seed };
  }

  summary(sessionId?: string): SessionSummary {
    const s = sessionId ? this.sessions.get(sessionId) : this.active();
    if (!s) throw new Error("No active session");
    return sessionSummary(s);
  }
}

/** Shared singleton for MCP + web demo mode. */
let _store: SessionStore | null = null;
export function getStore(): SessionStore {
  if (!_store) {
    _store = new SessionStore();
    _store.seedFromDisk();
  }
  return _store;
}

export { detectNearMisses };

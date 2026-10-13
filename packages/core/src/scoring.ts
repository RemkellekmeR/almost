import type {
  EventGraph,
  FeatureFrame,
  NearMiss,
  Session,
  TimelineEvent,
} from "./types.js";

export interface ScoringConfig {
  /** Sliding window length in frames */
  windowSize: number;
  /** Novelty = flux*0.5 + onsetDensity*0.5 - repetition*0.3 */
  noveltyThreshold: number;
  /** Repetition after abandon must exceed this */
  safeRepetitionThreshold: number;
  /** Commitment after return */
  safeCommitmentThreshold: number;
  /** Min seconds of high-novelty ramp */
  minApproachSec: number;
  /** Capture/export markers within this many seconds of peak nullify unmarked */
  captureProximitySec: number;
}

export const DEFAULT_SCORING: ScoringConfig = {
  windowSize: 3,
  noveltyThreshold: 0.55,
  safeRepetitionThreshold: 0.65,
  safeCommitmentThreshold: 0.55,
  minApproachSec: 4,
  captureProximitySec: 8,
};

export function noveltyAt(f: FeatureFrame): number {
  return clamp01(f.flux * 0.5 + f.onsetDensity * 0.5 - f.repetition * 0.3);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function meanNovelty(frames: FeatureFrame[]): number {
  if (frames.length === 0) return 0;
  return frames.reduce((s, f) => s + noveltyAt(f), 0) / frames.length;
}

function hasCaptureNear(
  timeline: TimelineEvent[],
  peakT: number,
  proximitySec: number,
): boolean {
  return timeline.some(
    (e) =>
      (e.type === "capture_marker" || e.type === "export_marker") &&
      Math.abs(e.t - peakT) <= proximitySec,
  );
}

function buildGraph(
  nearMissId: string,
  approachT: number,
  peakT: number,
  abandonT: number,
  safeLoopT: number,
  noveltyPeak: number,
): EventGraph {
  const nodes = [
    {
      id: `${nearMissId}:approach`,
      kind: "Approach" as const,
      t: approachT,
      label: "Approach",
      score: noveltyPeak * 0.6,
    },
    {
      id: `${nearMissId}:peak`,
      kind: "Peak" as const,
      t: peakT,
      label: "Peak novelty",
      score: noveltyPeak,
    },
    {
      id: `${nearMissId}:abandon`,
      kind: "Abandon" as const,
      t: abandonT,
      label: "Abandon",
      score: noveltyPeak * 0.4,
    },
    {
      id: `${nearMissId}:safe`,
      kind: "SafeLoop" as const,
      t: safeLoopT,
      label: "Safe loop",
      score: 0.2,
    },
  ];
  const edges = [
    { from: nodes[0].id, to: nodes[1].id, kind: "continue" as const },
    { from: nodes[1].id, to: nodes[2].id, kind: "fork" as const },
    { from: nodes[2].id, to: nodes[3].id, kind: "return" as const },
  ];
  return { nodes, edges };
}

/**
 * Deterministic near-miss detector.
 * Near-miss = high novelty ramp THEN return to high-repetition safe pattern
 * without an export/capture marker near the peak.
 */
export function detectNearMisses(
  session: Pick<Session, "id" | "features" | "timeline" | "seedWindows">,
  config: ScoringConfig = DEFAULT_SCORING,
): NearMiss[] {
  const { features, timeline } = session;
  if (features.length < config.windowSize + 2) return [];

  const results: NearMiss[] = [];
  let i = config.windowSize;

  while (i < features.length - config.windowSize) {
    const prior = features.slice(i - config.windowSize, i);
    const here = features[i];
    const ahead = features.slice(i + 1, i + 1 + config.windowSize);

    const nPrior = meanNovelty(prior);
    const nHere = noveltyAt(here);
    const nAhead = meanNovelty(ahead);

    const ramp =
      nHere >= config.noveltyThreshold &&
      nHere > nPrior + 0.12 &&
      here.t - prior[0].t >= config.minApproachSec * 0.5;

    if (!ramp) {
      i += 1;
      continue;
    }

    // Look forward for abandon → safe return
    let abandonIdx = -1;
    let safeIdx = -1;
    for (let j = i + 1; j < features.length; j++) {
      const f = features[j];
      const n = noveltyAt(f);
      if (
        abandonIdx < 0 &&
        n < nHere - 0.15 &&
        f.repetition >= config.safeRepetitionThreshold * 0.8
      ) {
        abandonIdx = j;
      }
      if (
        abandonIdx >= 0 &&
        f.repetition >= config.safeRepetitionThreshold &&
        f.commitment >= config.safeCommitmentThreshold
      ) {
        safeIdx = j;
        break;
      }
      // Give up if we wander too long without safe return
      if (f.t - here.t > 45) break;
    }

    if (abandonIdx < 0 || safeIdx < 0) {
      i += 1;
      continue;
    }

    const approachT = prior[0].t;
    const peakT = here.t;
    const abandonT = features[abandonIdx].t;
    const safeLoopT = features[safeIdx].t;
    const unmarked = !hasCaptureNear(
      timeline,
      peakT,
      config.captureProximitySec,
    );

    // Only surface unmarked near-misses as first-class (captured peaks are intentional)
    if (!unmarked) {
      i = safeIdx + 1;
      continue;
    }

    const id = `nm-${session.id}-${results.length + 1}`;
    const seedWindowIds = session.seedWindows
      .filter((w) => w.startT <= peakT && w.endT >= approachT)
      .map((w) => w.id);

    const summary = `Around ${peakT.toFixed(1)}s you ramped into something new (novelty ${nHere.toFixed(2)}), then dropped back to a safe loop at ${safeLoopT.toFixed(1)}s without capturing it.`;

    results.push({
      id,
      sessionId: session.id,
      approachT,
      peakT,
      abandonT,
      safeLoopT,
      noveltyPeak: nHere,
      repetitionAfter: features[safeIdx].repetition,
      unmarked,
      summary,
      graph: buildGraph(id, approachT, peakT, abandonT, safeLoopT, nHere),
      seedWindowIds:
        seedWindowIds.length > 0
          ? seedWindowIds
          : session.seedWindows.slice(0, 1).map((w) => w.id),
    });

    // Skip past this near-miss to avoid overlapping detections
    i = safeIdx + 1;
  }

  return results;
}

/** Re-score a session and replace nearMisses (deterministic). */
export function rescoreSession(session: Session, config?: ScoringConfig): Session {
  const nearMisses = detectNearMisses(session, config);
  return { ...session, nearMisses };
}

export function sessionSummary(session: Session) {
  const unmarked = session.nearMisses.filter((n) => n.unmarked);
  const top = [...unmarked].sort((a, b) => b.noveltyPeak - a.noveltyPeak)[0];
  return {
    sessionId: session.id,
    title: session.title,
    durationSec: session.durationSec,
    nearMissCount: session.nearMisses.length,
    unmarkedNearMissCount: unmarked.length,
    topNearMissId: top?.id ?? null,
    consent: session.consent,
  };
}

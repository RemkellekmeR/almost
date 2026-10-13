/** Feature frame at time t (seconds). All values are deterministic heuristics. */
export interface FeatureFrame {
  t: number;
  /** Proxy for spectral flux / energy change [0,1] */
  flux: number;
  /** Onset density in window [0,1] */
  onsetDensity: number;
  /** Self-similarity / repetition score [0,1] — high = looping safe pattern */
  repetition: number;
  /** Commitment / stabilize score [0,1] — high = locked into a groove */
  commitment: number;
}

export type TimelineEventType =
  | "session_start"
  | "note"
  | "chord"
  | "loop_engage"
  | "loop_disengage"
  | "capture_marker"
  | "export_marker"
  | "tempo_change"
  | "mute"
  | "unmute"
  | "near_miss_peak"
  | "abandon"
  | "safe_return";

export interface TimelineEvent {
  id: string;
  t: number;
  type: TimelineEventType;
  label?: string;
  meta?: Record<string, unknown>;
}

export type GraphNodeKind = "Approach" | "Peak" | "Abandon" | "SafeLoop";

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  t: number;
  label: string;
  score?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "fork" | "continue" | "return";
}

export interface EventGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface NearMiss {
  id: string;
  sessionId: string;
  /** Approach start (s) */
  approachT: number;
  /** Peak novelty (s) */
  peakT: number;
  /** Abandon moment (s) */
  abandonT: number;
  /** Safe loop return (s) */
  safeLoopT: number;
  noveltyPeak: number;
  repetitionAfter: number;
  /** True if no capture/export marker near the peak */
  unmarked: boolean;
  summary: string;
  graph: EventGraph;
  /** Indices into session.seedWindows for export */
  seedWindowIds: string[];
}

export interface SeedWindow {
  id: string;
  startT: number;
  endT: number;
  format: "midi-json" | "audio-clip-ref";
  /** Synthetic MIDI-like events or wav path */
  payload: unknown;
  label: string;
}

export interface Session {
  id: string;
  title: string;
  bpm: number;
  durationSec: number;
  consent: boolean;
  createdAt: string;
  features: FeatureFrame[];
  timeline: TimelineEvent[];
  nearMisses: NearMiss[];
  seedWindows: SeedWindow[];
  audioRef?: string;
  notes?: string;
}

export interface SessionSummary {
  sessionId: string;
  title: string;
  durationSec: number;
  nearMissCount: number;
  unmarkedNearMissCount: number;
  topNearMissId: string | null;
  consent: boolean;
}

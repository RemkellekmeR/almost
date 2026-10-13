"use client";

import type { EventGraph as Graph, GraphNode, GraphNodeKind } from "@almost/core";

/** Which beat of the demo script the graph is illustrating. */
export type GraphStage = "idle" | "walk-past" | "resume" | "export";

const KIND_COLOR: Record<GraphNodeKind, string> = {
  Approach: "#5b8def",
  Peak: "#ff6b6b",
  Abandon: "#f0a500",
  SafeLoop: "#3dd68c",
};

const ORDER: GraphNodeKind[] = ["Approach", "Peak", "Abandon", "SafeLoop"];

const STAGE_LIT: Record<GraphStage, GraphNodeKind[]> = {
  idle: ORDER,
  "walk-past": ["Peak", "Abandon"],
  resume: ["Approach", "Peak"],
  export: ["Approach", "Peak"],
};

const STAGE_CAPTION: Record<GraphStage, string> = {
  idle: "Approach → Peak → Abandon → SafeLoop. The FORK is where you turned back.",
  "walk-past": "FORK: novelty peaked, then you bailed to the safe loop without capturing it.",
  resume: "Take me back: cue jumps to the Approach so you can ride the ramp past the Peak.",
  export: "Export: the shaded window around the Peak becomes a reusable seed.",
};

const W = 480;
const H = 250;
const PAD_X = 44;
const GHOST_RESERVE = 110;
const BASE_Y = 145;
const PEAK_Y = 72;

function layout(nodes: GraphNode[]) {
  const sorted = [...nodes].sort(
    (a, b) => a.t - b.t || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind),
  );
  const t0 = sorted[0]?.t ?? 0;
  const t1 = sorted[sorted.length - 1]?.t ?? 1;
  const span = Math.max(1, t1 - t0);
  // Time-scaled, but every gap gets at least a third of the span so labels never
  // collide (e.g. Abandon == SafeLoop @ 66s in the second Neon Corridor miss).
  const floor = span / 3;
  const gaps = sorted.slice(1).map((n, i) => Math.max(n.t - sorted[i].t, floor));
  const total = gaps.reduce((a, b) => a + b, 0) || 1;
  const usable = W - PAD_X * 2 - GHOST_RESERVE;
  const pos = new Map<string, { x: number; y: number }>();
  let x = PAD_X;
  sorted.forEach((n, i) => {
    if (i > 0) x += (gaps[i - 1] / total) * usable;
    pos.set(n.id, { x, y: n.kind === "Peak" ? PEAK_Y : BASE_Y });
  });
  return { sorted, pos, t0, span };
}

export function EventGraphView({
  graph,
  stage = "idle",
  seedWindow,
}: {
  graph: Graph | null;
  stage?: GraphStage;
  seedWindow?: { startT: number; endT: number } | null;
}) {
  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="graph empty">
        <p>No near-miss fork selected yet.</p>
        <p className="hint">Ask Alexa: “What did I just walk past?”</p>
      </div>
    );
  }

  const { sorted, pos } = layout(graph.nodes);
  const byKind = new Map(sorted.map((n) => [n.kind, n]));
  const lit = new Set(STAGE_LIT[stage]);
  const peak = byKind.get("Peak");
  const approach = byKind.get("Approach");
  const safe = byKind.get("SafeLoop");
  const peakPos = peak ? pos.get(peak.id) : undefined;
  const approachPos = approach ? pos.get(approach.id) : undefined;
  const safePos = safe ? pos.get(safe.id) : undefined;

  // Map seconds → x using the Approach/Peak anchors (seed windows sit around them).
  const tx = (t: number) => {
    if (!approach || !peak || !approachPos || !peakPos || peak.t === approach.t) return PAD_X;
    return approachPos.x + ((t - approach.t) / (peak.t - approach.t)) * (peakPos.x - approachPos.x);
  };

  return (
    <div className={`graph stage-${stage}`}>
      <ol className="steps" aria-label="Near-miss stages">
        {ORDER.map((k, i) => (
          <li key={k} className={lit.has(k) ? "on" : ""} style={{ ["--c" as string]: KIND_COLOR[k] }}>
            <span>{i + 1}</span> {k}
            {byKind.get(k) ? <em>{byKind.get(k)!.t.toFixed(0)}s</em> : null}
          </li>
        ))}
      </ol>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Near-miss event graph">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrow-alexa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#00caff" />
          </marker>
        </defs>

        {/* Export: shaded seed window */}
        {stage === "export" && seedWindow && (
          <g className="seed-window">
            <rect
              x={Math.min(tx(seedWindow.startT), tx(seedWindow.endT))}
              y={24}
              width={Math.max(14, Math.abs(tx(seedWindow.endT) - tx(seedWindow.startT)))}
              height={H - 40}
              rx={10}
              fill="#7c5cff22"
              stroke="#7c5cff"
              strokeDasharray="5 4"
            />
            <text
              x={(tx(seedWindow.startT) + tx(seedWindow.endT)) / 2}
              y={H - 24}
              fill="#b9a8ff"
              fontSize="12"
              fontWeight={600}
              textAnchor="middle"
            >
              seed {seedWindow.startT}s–{seedWindow.endT}s
            </text>
          </g>
        )}

        {/* Edges */}
        {graph.edges.map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          const isFork = e.kind === "fork";
          const hot = isFork && (stage === "walk-past" || stage === "idle");
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={isFork ? "#ff6b6b" : "#6b7280"}
              strokeWidth={hot ? 4 : isFork ? 3 : 2}
              strokeDasharray={e.kind === "return" ? "6 4" : undefined}
              filter={hot ? "url(#glow)" : undefined}
              opacity={stage === "resume" && e.kind !== "continue" ? 0.35 : 1}
            />
          );
        })}

        {/* The road not taken: continuing from the Peak instead of abandoning */}
        {peakPos && (
          <g className={`ghost ${stage === "walk-past" || stage === "resume" ? "hot" : ""}`}>
            <path
              d={`M${peakPos.x},${peakPos.y} C${peakPos.x + 40},${peakPos.y - 22} ${peakPos.x + 70},${peakPos.y - 34} ${peakPos.x + 104},${peakPos.y - 40}`}
              fill="none"
              stroke="#ff6b6b"
              strokeWidth={2}
              strokeDasharray="3 5"
              opacity={0.85}
            />
            <circle cx={peakPos.x + 112} cy={peakPos.y - 40} r={9} fill="none" stroke="#ff6b6b" strokeDasharray="3 3" />
            <text x={peakPos.x + 112} y={peakPos.y - 36} fill="#ff6b6b" fontSize="12" textAnchor="middle">?</text>
            <text x={peakPos.x + 112} y={peakPos.y - 56} fill="#ff9b9b" fontSize="12" textAnchor="middle">
              path not taken
            </text>
            <text
              x={peakPos.x - 12}
              y={peakPos.y - 24}
              fill="#ff6b6b"
              fontSize="13"
              fontWeight={700}
              textAnchor="end"
              letterSpacing="0.08em"
            >
              FORK
            </text>
            <text x={peakPos.x - 12} y={peakPos.y - 10} fill="#ff9b9b" fontSize="11" textAnchor="end">
              walked past
            </text>
          </g>
        )}

        {/* Resume: arc from SafeLoop back to Approach */}
        {stage === "resume" && approachPos && safePos && (
          <g className="resume-arc">
            <path
              d={`M${safePos.x},${safePos.y + 50} C${safePos.x - 30},${H - 14} ${approachPos.x + 30},${H - 14} ${approachPos.x},${approachPos.y + 52}`}
              fill="none"
              stroke="#00caff"
              strokeWidth={2.5}
              markerEnd="url(#arrow-alexa)"
            />
            <text x={(safePos.x + approachPos.x) / 2} y={H - 4} fill="#00caff" fontSize="12" fontWeight={600} textAnchor="middle">
              “take me back” → resume @ {approach?.t.toFixed(0)}s
            </text>
          </g>
        )}

        {/* Nodes */}
        {sorted.map((n) => {
          const p = pos.get(n.id)!;
          const on = lit.has(n.kind);
          const focus =
            (stage === "walk-past" && n.kind === "Peak") ||
            (stage === "resume" && n.kind === "Approach");
          return (
            <g key={n.id} opacity={on ? 1 : 0.4} className={focus ? "focus" : undefined}>
              {focus && (
                <circle cx={p.x} cy={p.y} r={26} fill="none" stroke={KIND_COLOR[n.kind]} strokeWidth={2} className="pulse" />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={focus ? 18 : 14}
                fill={KIND_COLOR[n.kind] ?? "#888"}
                stroke={focus ? "#fff" : "transparent"}
                strokeWidth={2}
                filter={focus ? "url(#glow)" : undefined}
              />
              <text x={p.x} y={p.y + 34} fill="#e5e7eb" fontSize="13" textAnchor="middle">
                {n.kind}
              </text>
              <text x={p.x} y={p.y + 49} fill="#9ca3af" fontSize="12" textAnchor="middle">
                {n.t.toFixed(1)}s
              </text>
            </g>
          );
        })}
      </svg>
      <p className="caption">{STAGE_CAPTION[stage]}</p>
    </div>
  );
}

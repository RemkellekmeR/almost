"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { EventGraph, NearMiss, SeedWindow } from "@almost/core";
import {
  demoStartSession,
  demoListNearMisses,
  demoExplain,
  demoResume,
  demoExport,
  demoSummary,
  demoBackendStatus,
  type BackendMode,
  type Via,
} from "@/lib/demo-api";
import { EventGraphView, type GraphStage } from "./EventGraph";

type ViaTag = { mode: BackendMode; tools: string[] };
type LogLine = {
  role: "user" | "alexa" | "system";
  text: string;
  /** Raw tool explanation / cue, shown small under the spoken reply */
  detail?: string;
  via?: ViaTag;
};

const PROMPTS = [
  "Alexa, what did I just walk past?",
  "Alexa, take me back",
  "Alexa, export that seed",
  "Alexa, the other one",
  "Alexa, summarize this session",
];

const DEMO_SESSION = "jam-neon-corridor";

/** Voice-friendly time: "half a minute in", "about 24 seconds in", "1:02 in". */
export function spokenTime(t: number): string {
  const s = Math.round(t);
  if (s === 30) return "about half a minute in";
  if (s < 60) return `about ${s} seconds in`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  const mins = m === 1 ? "a minute" : `${m} minutes`;
  return r === 0 ? `about ${mins} in` : `about ${mins} and ${r} second${r === 1 ? "" : "s"} in`;
}

function seedSpoken(seed: SeedWindow): string {
  const len = Math.round(seed.endT - seed.startT);
  if (seed.format === "midi-json") {
    const p = seed.payload as { notes?: unknown[]; bpm?: number } | undefined;
    const notes = Array.isArray(p?.notes) ? `${p!.notes!.length} notes` : "MIDI";
    const bpm = p?.bpm ? ` at ${p.bpm} BPM` : "";
    return `${len} seconds of MIDI — ${notes}${bpm}, ${seed.startT} to ${seed.endT} seconds`;
  }
  return `a ${len}-second audio clip reference, ${seed.startT} to ${seed.endT} seconds`;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.03;
  window.speechSynthesis.speak(u);
}

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
};

function getSpeechRecognition(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRec) | null;
}

export function AlexaSim() {
  const [log, setLog] = useState<LogLine[]>([
    {
      role: "system",
      text: "Consent granted on the Neon Corridor demo jam (synthetic fixture). Scoring is deterministic — no LLM in the detector. Live MCP preferred; @almost/core fallback if MCP is down.",
    },
  ]);
  const [input, setInput] = useState(PROMPTS[0]);
  const [sessionId, setSessionId] = useState(DEMO_SESSION);
  const [nearMisses, setNearMisses] = useState<NearMiss[]>([]);
  const [selected, setSelected] = useState<NearMiss | null>(null);
  const [graph, setGraph] = useState<EventGraph | null>(null);
  const [stage, setStage] = useState<GraphStage>("idle");
  const [seed, setSeed] = useState<SeedWindow | null>(null);
  const [sessionTitle, setSessionTitle] = useState("—");
  const [mode, setMode] = useState<BackendMode>("core-fallback");
  const [mcpUrl, setMcpUrl] = useState("http://127.0.0.1:3100/mcp");
  const [voiceOut, setVoiceOut] = useState(false);
  const [listening, setListening] = useState(false);
  const [micAvailable, setMicAvailable] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMicAvailable(getSpeechRecognition() !== null);
    startTransition(async () => {
      const status = await demoBackendStatus();
      setMode(status.mode);
      setMcpUrl(status.mcpUrl);
      const session = await demoStartSession(DEMO_SESSION);
      setSessionId(session.data.id);
      setSessionTitle(session.data.title);
      const misses = await demoListNearMisses(session.data.id);
      setMode(misses.mode);
      setNearMisses(misses.data);
      if (misses.data[0]) {
        setSelected(misses.data[0]);
        setGraph(misses.data[0].graph);
      }
      setLog((L) => [
        ...L,
        {
          role: "system",
          text:
            misses.mode === "mcp"
              ? `Connected: live MCP (Streamable HTTP) at ${status.mcpUrl}`
              : `MCP unreachable at ${status.mcpUrl} — using in-process @almost/core (same scorer).`,
        },
        {
          role: "alexa",
          text: `Almost is on for “${session.data.title}”. I noticed ${misses.data.length} moment${misses.data.length === 1 ? "" : "s"} you walked away from. Ask me what you just walked past.`,
          via: { mode: misses.mode, tools: [...session.tools, ...misses.tools] },
        },
      ]);
    });
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log]);

  function push(line: LogLine) {
    setLog((L) => [...L, line]);
    if (line.via) setMode(line.via.mode);
    if (line.role === "alexa" && voiceOut) speak(line.text);
  }

  function tag(...calls: Via<unknown>[]): ViaTag {
    const mode = calls.every((c) => c.mode === "mcp") ? "mcp" : "core-fallback";
    return { mode, tools: calls.flatMap((c) => c.tools) };
  }

  async function describeMiss(target: NearMiss, all: NearMiss[], listed?: Via<unknown>) {
    const explained = await demoExplain(target.id);
    const nm = explained.data.nearMiss;
    setSelected(nm);
    setGraph(nm.graph);
    setStage("walk-past");
    setSeed(null);
    const others = all.filter((n) => n.id !== nm.id);
    const more =
      others.length > 0
        ? ` The other one is ${spokenTime(others[0].peakT)} — say “the other one.”`
        : "";
    const bail =
      nm.abandonT === nm.safeLoopT
        ? `then dropped straight back to the safe loop at ${nm.safeLoopT.toFixed(0)}`
        : `then you dropped it at ${nm.abandonT.toFixed(0)} and were back on the safe loop by ${nm.safeLoopT.toFixed(0)}`;
    push({
      role: "alexa",
      text:
        `You walked past something ${spokenTime(nm.peakT)}. ` +
        `Your playing peaked at ${nm.peakT.toFixed(0)} seconds — novelty ${nm.noveltyPeak.toFixed(2)} — ` +
        `${bail}. ` +
        `You never hit capture.${more} Say “take me back” to pick it up.`,
      detail: explained.data.explanation,
      via: listed ? tag(listed, explained) : tag(explained),
    });
  }

  async function handleUtterance(raw: string) {
    const q = raw.toLowerCase();
    push({ role: "user", text: raw });

    if (q.includes("walk past") || q.includes("walked past") || q.includes("near miss") || q.includes("near-miss")) {
      const listed = await demoListNearMisses(sessionId);
      setNearMisses(listed.data);
      if (listed.data.length === 0) {
        setGraph(null);
        push({ role: "alexa", text: "Nothing — every bold moment in this jam was either captured or kept. Nice.", via: tag(listed) });
        return;
      }
      await describeMiss(listed.data[0], listed.data, listed);
      return;
    }

    if (q.includes("other one") || q.includes("next one") || q.includes("the other")) {
      if (nearMisses.length < 2) {
        push({ role: "alexa", text: "That's the only one I found in this jam." });
        return;
      }
      const idx = nearMisses.findIndex((n) => n.id === selected?.id);
      await describeMiss(nearMisses[(idx + 1) % nearMisses.length], nearMisses);
      return;
    }

    if (q.includes("take me back") || q.includes("resume") || q.includes("go back")) {
      const id = selected?.id ?? nearMisses[0]?.id;
      if (!id) {
        push({ role: "alexa", text: "Ask me what you just walked past first — then I can take you back to it." });
        return;
      }
      const resumed = await demoResume(id);
      const nm = resumed.data.nearMiss;
      setGraph(resumed.data.graph);
      setSelected(nm);
      setStage("resume");
      const lead = Math.round(nm.peakT - resumed.data.resumeFromT);
      push({
        role: "alexa",
        text:
          `Okay — cueing you at ${resumed.data.resumeFromT.toFixed(0)} seconds, right where the approach started. ` +
          `The peak is ${lead} seconds after that. This time, keep going past ${nm.abandonT.toFixed(0)} instead of heading home.`,
        detail: resumed.data.cue,
        via: tag(resumed),
      });
      return;
    }

    if (q.includes("export") || q.includes("seed") || q.includes("save that")) {
      const id = selected?.id ?? nearMisses[0]?.id;
      if (!id) {
        push({ role: "alexa", text: "Nothing to export yet — ask what you walked past first." });
        return;
      }
      const exported = await demoExport(id);
      const s = exported.data.seed;
      setSeed(s);
      setStage("export");
      setCopied(false);
      push({
        role: "alexa",
        text: `Saved. “${s.label}” is now a seed: ${seedSpoken(s)}. It's in the seed panel — copy it or download the JSON. Synthetic notes only, nothing copyrighted.`,
        via: tag(exported),
      });
      return;
    }

    if (q.includes("summar")) {
      const summary = await demoSummary(sessionId);
      const d = summary.data;
      push({
        role: "alexa",
        text: `${d.title}: ${d.durationSec} seconds, ${d.unmarkedNearMissCount} uncaptured near-miss${d.unmarkedNearMissCount === 1 ? "" : "es"}. Consent ${d.consent ? "on" : "off"}.`,
        detail: `top near-miss: ${d.topNearMissId ?? "none"}`,
        via: tag(summary),
      });
      return;
    }

    push({
      role: "alexa",
      text: "Try “what did I just walk past?”, “take me back”, “export that seed”, “the other one”, or “summarize this session”.",
    });
  }

  function ask(v: string) {
    const text = v.trim();
    if (!text || pending) return;
    setInput(text);
    startTransition(async () => {
      await handleUtterance(text);
    });
  }

  function listen() {
    const Rec = getSpeechRecognition();
    if (!Rec || listening) return;
    const rec = new Rec();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript ?? "";
      if (said) ask(said);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }

  const seedJson = seed ? JSON.stringify(seed, null, 2) : "";

  return (
    <div className="layout">
      <header className="hero">
        <div>
          <p className="eyebrow">Amazon Build/Ship/Shape · Alexa+ track</p>
          <h1>Almost</h1>
          <p className="tagline">
            “Alexa, what did I just walk past?” — consent-based near-miss archaeology for creative
            jams.
          </p>
        </div>
        <div className="hero-meta">
          <div className="session-pill">
            <span className="dot" />
            {sessionTitle}
          </div>
          <div className={`mode-pill ${mode === "mcp" ? "mcp" : "fallback"}`} title={mcpUrl}>
            {mode === "mcp" ? "live MCP" : "core fallback"}
          </div>
        </div>
      </header>

      <div className="grid">
        <section className="panel alexa">
          <div className="panel-head">
            <h2>Alexa+ sim</h2>
            <label className="toggle">
              <input type="checkbox" checked={voiceOut} onChange={(e) => setVoiceOut(e.target.checked)} />
              speak replies
            </label>
          </div>
          <div className="log" ref={logRef}>
            {log.map((line, i) => (
              <div key={i} className={`bubble ${line.role}`}>
                <span className="who">{line.role === "alexa" ? "Alexa · Almost" : line.role}</span>
                <p>{line.text}</p>
                {line.detail && <p className="detail">{line.detail}</p>}
                {line.via && (
                  <p className={`via ${line.via.mode === "mcp" ? "mcp" : "fallback"}`}>
                    {line.via.mode === "mcp" ? "via MCP" : "via core fallback"} · {line.via.tools.join(" → ")}
                  </p>
                )}
              </div>
            ))}
            {pending && <div className="bubble alexa thinking"><span className="who">Alexa · Almost</span><p>…</p></div>}
          </div>
          <div className="chips">
            {PROMPTS.map((p) => (
              <button key={p} type="button" className="chip" disabled={pending} onClick={() => ask(p)}>
                {p.replace(/^Alexa, /, "")}
              </button>
            ))}
          </div>
          <form
            className="prompt"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            {micAvailable && (
              <button type="button" className={`mic ${listening ? "on" : ""}`} onClick={listen} aria-label="Speak to Alexa" title="Speak (browser speech recognition)">
                {listening ? "●" : "🎙"}
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Talk to Almost…"
              aria-label="Alexa utterance"
            />
            <button type="submit" disabled={pending}>
              {pending ? "…" : "Ask"}
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Event graph</h2>
          <EventGraphView graph={graph} stage={stage} seedWindow={seed} />
          <ul className="miss-list">
            {nearMisses.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={selected?.id === n.id ? "active" : ""}
                  onClick={() => {
                    setSelected(n);
                    setGraph(n.graph);
                    setStage("walk-past");
                    setSeed(null);
                  }}
                >
                  <strong>@{n.peakT.toFixed(0)}s</strong> novelty {n.noveltyPeak.toFixed(2)} · approach{" "}
                  {n.approachT.toFixed(0)}s → safe loop {n.safeLoopT.toFixed(0)}s
                </button>
              </li>
            ))}
            {nearMisses.length === 0 && <li className="muted">No unmarked near-misses yet.</li>}
          </ul>
        </section>

        <section className="panel wide">
          <div className="panel-head">
            <h2>Export seed preview</h2>
            {seed && (
              <div className="seed-actions">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(seedJson).then(() => setCopied(true));
                  }}
                >
                  {copied ? "copied" : "copy"}
                </button>
                <a
                  href={`data:application/json;charset=utf-8,${encodeURIComponent(seedJson)}`}
                  download={`almost-${seed.id}.json`}
                >
                  download .json
                </a>
              </div>
            )}
          </div>
          <pre className="seed">{seedJson || "// Say “export that seed” after Alexa finds a near-miss"}</pre>
        </section>
      </div>
    </div>
  );
}

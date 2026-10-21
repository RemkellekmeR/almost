# Almost

> “Alexa, what did I just walk past?”

Consent-based **Alexa+/MCP** agent that detects **creative near-misses** in a jam — moments you approached something new, then abandoned the thread — and walks you back with a reconstructable event graph plus an exportable seed (MIDI-JSON notes or an audio-clip reference) for the abandoned thread.

> **What this build is:** a working MCP server and a web Alexa+ simulator, running on synthetic fixture jams. The detector really is deterministic code, but its inputs are hand-authored feature frames. This build has **no live audio capture or DSP**. See [What's real vs. fixture](#whats-real-vs-fixture).

## Contest

- **Amazon Build/Ship/Shape** — Alexa+ track  
- https://amazonappdev2026.devpost.com/  
- Due: **Fri Oct 23 2026 12:00pm PDT**  
- MCP server (spec 2025-11-25+, Streamable HTTP) **or** Agent Skill **or** web-simulated Alexa+

## Monorepo

```
almost/
  apps/web/           Next.js Alexa+ sim + event graph viz (MCP-first, core fallback)
  apps/mcp-server/    Streamable HTTP MCP (7 tools, stateful Mcp-Session-Id)
  packages/core/      Deterministic scoring, types, fixture store
  fixtures/sessions/  Synthetic canned jams (JSON + tiny wav placeholders)
  docs/DEMO.md        ≤3 min demo script
  docs/FRICTION_LOG.md
  docs/PRODUCT_FEEDBACK.md
  scripts/smoke-mcp.mjs
  scripts/demo.mjs    npm run demo — MCP + web together
```

## Two demo modes

| Mode | When | Path |
|------|------|------|
| **Live MCP** | `apps/mcp-server` is up at `MCP_PUBLIC_URL` (default `http://127.0.0.1:3100/mcp`) | Web server actions call Streamable HTTP tools (`start_session`, `list_near_misses`, …). UI pill: **live MCP**. |
| **Core fallback** | MCP health check fails or a tool call errors | Same server actions use in-process `@almost/core` `SessionStore` (identical deterministic scoring). UI pill: **core fallback**. |

Scoring is **always** deterministic in `@almost/core` — MCP is a transport, not a second scorer. No LLM keys required for either mode today.

**Per-session active jam:** the MCP server is stateful Streamable HTTP. Each client gets a `Mcp-Session-Id`; the “active” jam pointer is keyed by that id (cleaned up on session close). Concurrent clients do not clobber each other. The web Alexa+ sim uses one-shot MCP connections and therefore always passes the jam `sessionId` in tool args for continuity across calls.

## Quick start

```bash
git clone https://github.com/RemkellekmeR/almost && cd almost
npm install
npm run build

# One command — MCP + web (production builds)
npm run demo
# → MCP  http://127.0.0.1:3100/mcp   (health: /health)
# → Web  http://localhost:3000       (mode pill should read "live MCP")
# Ctrl+C stops both
```

Dev (two terminals):

```bash
# Terminal A — MCP (live mode)
npm run dev:mcp
# → http://127.0.0.1:3100/mcp   health: /health

# Terminal B — Web Alexa+ sim (prefers MCP, falls back to core)
npm run dev:web
# → http://localhost:3000
```

Web-only (core fallback — MCP optional):

```bash
npm run build -w @almost/core
npm run dev:web
# Mode pill shows "core fallback" until MCP is reachable
```

Typecheck / build everything:

```bash
npm run typecheck
npm run build
```

Score fixtures from CLI (no MCP):

```bash
npm run demo:score
```

Smoke live MCP (Neon Corridor peaks @ 30s / 62s + concurrent-client isolation):

```bash
npm run start:mcp    # terminal A (built dist)
npm run smoke:mcp    # terminal B
```

### Demo utterances (Neon Corridor)

| Say | Expect |
|-----|--------|
| “Alexa, what did I just walk past?” | Top unmarked near-miss (peaks @ **30s** and **62s** in the fixture). |
| “Alexa, the other one” | Switches to the other peak and re-explains. |
| “Alexa, take me back” | Cue at Approach for the selected miss. |
| “Alexa, export that seed” | Fixture seed window: MIDI-JSON notes (or a placeholder audio-clip ref). |

### Verify web → MCP

1. `npm run build`
2. `npm run start:mcp` → confirm `curl -s http://127.0.0.1:3100/health`
3. `npm run smoke:mcp` → expect Neon Corridor @ 30s / 62s **and** isolation PASS
4. `npm run demo` (or `MCP_PUBLIC_URL=http://127.0.0.1:3100/mcp npm run start -w @almost/web`) → open http://localhost:3000  
   Mode pill should read **live MCP**; ask “what did I just walk past?” then “the other one.”

## MCP tools

| Tool | Role |
|------|------|
| `start_session` | Activate a fixture/demo session (per MCP session). **Requires `consent: true`**; `false` or omitted is refused for every session id |
| `ingest_timeline` | Append events, re-score |
| `list_near_misses` | Unmarked near-misses (**full objects + graph**) |
| `explain_near_miss` | Fixture explanation + graph (LLM stub later) |
| `resume_near_miss` | Walk back to Approach |
| `export_seed` | Return the fixture seed window for a near-miss (MIDI-JSON notes, or a placeholder audio-clip ref) |
| `session_summary` | Session rollup |

## Near-miss scoring

Deterministic sliding-window heuristics (`packages/core/src/scoring.ts`) over per-frame features (`flux`, `onsetDensity`, `repetition`, `commitment`):

- novelty = `clamp(flux·0.5 + onsetDensity·0.5 − repetition·0.3)`
- **repetition** and **commitment** decide whether you went back to a safe loop

In this build the feature frames are **hand-authored fixture values** (2 s frames in `fixtures/sessions/*.json`). Their names follow the audio features they model (spectral flux, onset density, self-similarity), but **no audio is analyzed**. A real DSP front end that extracts them from a live jam is future work.

**Near-miss** = high novelty ramp **then** return to high-repetition safe pattern **without** a capture/export marker near the peak.

Graph: **Approach → Peak → Abandon → SafeLoop**

LLM is **not** used for scoring (explanations only, stubbed with fixtures today).

## What's real vs. fixture

| Piece | Status |
|-------|--------|
| MCP server: spec 2025-11-25, Streamable HTTP, 7 tools, stateful `Mcp-Session-Id` | **Real and live.** `npm run smoke:mcp` asserts the protocol version, the tool results, and session isolation |
| Consent gate on `start_session` | **Real.** Anything other than an explicit `consent: true` is refused |
| Near-miss detector + event graph | **Real deterministic code**, running on hand-authored feature frames |
| Explanations | Templated from detector output (no LLM) |
| Seed export | Returns the fixture's seed windows: synthetic MIDI-JSON notes, or an audio-clip ref to `jam-neon-corridor.wav`. That wav is a **2 s synthetic placeholder tone**, not a recording of the jam |
| Alexa+ | **Web simulator** (text + optional browser speech) calling the MCP server. It has not been tested against a hosted Alexa+ client |
| AWS services | **Not used** in this build |

## Environment

See `.env.example`:

- `LLM_API_KEY`, `LLM_PROVIDER` — explanations only (unused this pass)
- `MCP_PUBLIC_URL` — Streamable HTTP URL web server actions call (also `NEXT_PUBLIC_MCP_URL`)
- `MCP_PORT`, `MCP_HOST` — MCP listen address
- `ALLOWED_HOSTS` — comma-separated Host allowlist when exposing beyond localhost (defaults to `localhost,127.0.0.1` if `MCP_HOST=0.0.0.0`)
- `AWS_*` — optional Bedrock stretch (not used in this build)
- `DATABASE_URL` — optional; fixtures work in-memory

## Docs for judges

- `docs/DEMO.md` — ≤3 min script  
- `docs/FRICTION_LOG.md` — friction log (full-format entries)  
- `docs/PRODUCT_FEEDBACK.md` — product feedback for the tools used + feature requests  

## License

MIT — see `LICENSE`.

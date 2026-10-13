# Almost

> “Alexa, what did I just walk past?”

Consent-based **Alexa+/MCP** agent that detects **creative near-misses** in a jam — moments you approached something new, then abandoned the thread — and walks you back with a reconstructable event graph plus exportable audio/MIDI seeds.

**Not** a Case Fit Desk clone, patch suggestor, Capture wrapper, or VCV AI patcher.

## Contest

- **Amazon Build/Ship/Shape** — Alexa+ track  
- https://amazonappdev2026.devpost.com/  
- Due: **Fri Oct 23 2026 12:00pm PDT**  
- MCP server (spec 2025-11-25+, Streamable HTTP) **or** Agent Skill **or** web-simulated Alexa+

## Monorepo

```
almost/
  apps/web/           Next.js Alexa+ sim + event graph viz (MCP-first, core fallback)
  apps/mcp-server/    Streamable HTTP MCP (7 tools)
  packages/core/      Deterministic scoring, types, fixture store
  fixtures/sessions/  Synthetic canned jams (JSON + tiny wav placeholders)
  docs/DEMO.md        ≤3 min demo script
  docs/FRICTION_LOG.md
  docs/PRODUCT_FEEDBACK.md
  scripts/smoke-mcp.mjs
```

## Two demo modes

| Mode | When | Path |
|------|------|------|
| **Live MCP** | `apps/mcp-server` is up at `MCP_PUBLIC_URL` (default `http://127.0.0.1:3100/mcp`) | Web server actions call Streamable HTTP tools (`start_session`, `list_near_misses`, …). UI pill: **live MCP**. |
| **Core fallback** | MCP health check fails or a tool call errors | Same server actions use in-process `@almost/core` `SessionStore` (identical deterministic scoring). UI pill: **core fallback**. |

Scoring is **always** deterministic in `@almost/core` — MCP is a transport, not a second scorer. No LLM keys required for either mode today.

## Quick start

```bash
cd /workspace/almost
npm install
npm run build -w @almost/core

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

Smoke live MCP (Neon Corridor peaks @ 30s / 62s):

```bash
npm run start:mcp    # terminal A (built dist)
npm run smoke:mcp    # terminal B
```

### Verify web → MCP

1. `npm run build -w @almost/core && npm run build -w @almost/mcp-server`
2. `npm run start:mcp` → confirm `curl -s http://127.0.0.1:3100/health`
3. `npm run smoke:mcp` → expect `PASS: Neon Corridor near-misses @ 30s / 62s`
4. `MCP_PUBLIC_URL=http://127.0.0.1:3100/mcp npm run dev:web` → open http://localhost:3000  
   Mode pill should read **live MCP**; ask “what did I just walk past?” and confirm peaks ~30s / ~62s in the list.

## MCP tools

| Tool | Role |
|------|------|
| `start_session` | Consent + activate fixture/demo session |
| `ingest_timeline` | Append events, re-score |
| `list_near_misses` | Unmarked near-misses (**full objects + graph**) |
| `explain_near_miss` | Fixture explanation + graph (LLM stub later) |
| `resume_near_miss` | Walk back to Approach |
| `export_seed` | MIDI-JSON / audio-clip-ref seed |
| `session_summary` | Session rollup |

## Near-miss scoring

Deterministic sliding-window heuristics on feature frames:

- spectral flux / onset density → **novelty**
- self-similarity → **repetition**
- loop/stabilize → **commitment**

**Near-miss** = high novelty ramp **then** return to high-repetition safe pattern **without** a capture/export marker near the peak.

Graph: **Approach → Peak → Abandon → SafeLoop**

LLM is **not** used for scoring (explanations only, stubbed with fixtures today).

## Environment

See `.env.example`:

- `LLM_API_KEY`, `LLM_PROVIDER` — explanations only (unused this pass)
- `MCP_PUBLIC_URL` — Streamable HTTP URL web server actions call (also `NEXT_PUBLIC_MCP_URL`)
- `AWS_*` — optional Bedrock stretch (**HITL before spend**)
- `DATABASE_URL` — optional; fixtures work in-memory

## Docs for judges

- `docs/DEMO.md` — ≤3 min script  
- `docs/FRICTION_LOG.md` — friction-log bonus template + early notes  
- `docs/PRODUCT_FEEDBACK.md` — product feedback stub  

## HITL (Remmy only)

- Devpost submit
- AWS credits / Bedrock if used
- Approve original/synthetic fixtures (no copyrighted tracks)
- Optional Open Agent backup reg — do **not** divert Almost MVP

## License

MIT — see `LICENSE`.

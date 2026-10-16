# Almost — Demo script (≤3 min)

Contest: [Amazon Build/Ship/Shape — Alexa+ track](https://amazonappdev2026.devpost.com/)  
Due: **Fri Oct 23 2026 12:00pm PDT**

## Setup (30s, before recording)

Preferred (one process group):

```bash
cd /workspace/almost
npm install
npm run build
npm run demo
# → MCP  http://127.0.0.1:3100/mcp
# → Web  http://localhost:3000
# Ctrl+C stops both
```

Or two terminals:

```bash
cd /workspace/almost
npm install
npm run build -w @almost/core
npm run dev:mcp    # terminal A → http://127.0.0.1:3100/mcp
npm run dev:web    # terminal B → http://localhost:3000
```

Open the web Alexa+ sim. Confirm session pill shows **Neon Corridor (demo jam)** and mode pill **live MCP** with the MCP host (or **core fallback** if MCP is down — still demoable). Utterance chips follow this script; the glowing **next ·** chip tracks the demo beat.

Neon Corridor has unmarked peaks at **~30s** and **~62s**. After the first walk-past answer, use **“the other one”** to flip.

## Script (~2:30)

| Time | Action | Say / show |
|------|--------|------------|
| 0:00 | Title card | “Almost — what did I just walk past?” Consent-based near-miss archaeology for jams. |
| 0:15 | Show fixture jam context | Timeline: safe groove → lead explores → **uncaptured peak @ ~30s** → abandon → safe loop → later peak @ **~62s**. |
| 0:35 | Alexa+ sim | **“Alexa, what did I just walk past?”** |
| 0:45 | Response + graph | Alexa names the top near-miss; event graph lights **Approach → Peak → Abandon → SafeLoop**. Highlight the **FORK**. Mention the other peak if offered. |
| 1:05 | Disambiguate | **“Alexa, the other one.”** Graph / explanation switches to the other peak (30s ↔ 62s). |
| 1:20 | Flash MCP | Optional split: `curl` / MCP inspector calling `list_near_misses` + `explain_near_miss` on Streamable HTTP `/mcp` (stateful `Mcp-Session-Id`). |
| 1:40 | Resume | **“Alexa, take me back.”** Cue points at Approach timestamp. |
| 2:00 | Export | **“Alexa, export that seed.”** Show MIDI-JSON seed preview; click **copy** or **download .json** (synthetic notes, not copyrighted audio). |
| 2:20 | Why it matters | Capture saves what you played; generators continue what you hand them. **Nobody treats the abandoned approach as a first-class object.** Almost does. |
| 2:40 | Close | Consent-first. Deterministic scoring. MCP tools live. Per-session active jam. HITL only for Devpost submit. |

## Talking points for judges

1. **Real MCP Streamable HTTP** with 7 tools wired to fixture data (protocol **2025-11-25**).
2. **Deterministic** near-miss scoring (no LLM in the detector).
3. **Web Alexa+ sim** calling the same core path judges can replay (`npm run demo`).
4. **Multi-user-safe active jam** keyed by `Mcp-Session-Id` (web still passes explicit jam `sessionId` on one-shot calls).
5. Stretch later: Bedrock explanations + MIT OSS MCP (HITL before AWS spend).

## Friction log (submit with product feedback)

Track during build week — counts toward up to **10% judging bonus**:

- Consent UX for always-on jam listening
- Ambiguity when multiple near-misses stack (“the other one”)
- Export target (DAW clipboard vs file vs MIDI port)
- Shared global active session (mitigated — see `docs/FRICTION_LOG.md`)

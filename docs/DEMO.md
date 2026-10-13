# Almost — Demo script (≤3 min)

Contest: [Amazon Build/Ship/Shape — Alexa+ track](https://amazonappdev2026.devpost.com/)  
Due: **Fri Oct 23 2026 12:00pm PDT**

## Setup (30s, before recording)

```bash
cd /workspace/almost
npm install
npm run build -w @almost/core
npm run dev:mcp    # terminal A → http://127.0.0.1:3100/mcp
npm run dev:web    # terminal B → http://localhost:3000
```

Open the web Alexa+ sim. Confirm session pill shows **Neon Corridor (demo jam)** and mode pill **live MCP** (or **core fallback** if MCP is down — still demoable).

## Script (~2:30)

| Time | Action | Say / show |
|------|--------|------------|
| 0:00 | Title card | “Almost — what did I just walk past?” Consent-based near-miss archaeology for jams. |
| 0:15 | Show fixture jam context | Timeline: safe groove → lead explores → **uncaptured peak @ ~30s** → abandon → safe loop. |
| 0:35 | Alexa+ sim | **“Alexa, what did I just walk past?”** |
| 0:45 | Response + graph | Alexa names the near-miss; event graph lights **Approach → Peak → Abandon → SafeLoop**. Highlight the **FORK**. |
| 1:15 | Flash MCP | Optional split: `curl` / MCP inspector calling `list_near_misses` + `explain_near_miss` on Streamable HTTP `/mcp`. |
| 1:35 | Resume | **“Alexa, take me back.”** Cue points at Approach timestamp. |
| 1:55 | Export | **“Alexa, export that seed.”** Show MIDI-JSON seed preview (synthetic notes, not copyrighted audio). |
| 2:20 | Why it matters | Capture saves what you played; generators continue what you hand them. **Nobody treats the abandoned approach as a first-class object.** Almost does. |
| 2:40 | Close | Consent-first. Deterministic scoring. MCP tools live. HITL only for Devpost submit. |

## Talking points for judges

1. **Real MCP Streamable HTTP** with 7 tools wired to fixture data.
2. **Deterministic** near-miss scoring (no LLM in the detector).
3. **Web Alexa+ sim** calling the same core path judges can replay.
4. Stretch later: Bedrock explanations + MIT OSS MCP (HITL before AWS spend).

## Friction log (submit with product feedback)

Track during build week — counts toward up to **10% judging bonus**:

- Consent UX for always-on jam listening
- Ambiguity when multiple near-misses stack
- Export target (DAW clipboard vs file vs MIDI port)

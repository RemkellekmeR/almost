# Almost — Demo script (≤3 min)

Contest: [Amazon Build/Ship/Shape — Alexa+ track](https://amazonappdev2026.devpost.com/)  
Due: **Fri Oct 23 2026 12:00pm PDT**

## Setup (30s, before recording)

Preferred (one process group):

```bash
git clone https://github.com/RemkellekmeR/almost && cd almost
npm install
npm run build
npm run demo
# → MCP  http://127.0.0.1:3100/mcp
# → Web  http://localhost:3000
# Ctrl+C stops both
```

Or two terminals:

```bash
git clone https://github.com/RemkellekmeR/almost && cd almost
npm install
npm run build -w @almost/core
npm run dev:mcp    # terminal A → http://127.0.0.1:3100/mcp
npm run dev:web    # terminal B → http://localhost:3000
```

Open the web Alexa+ sim. Confirm session pill shows **Neon Corridor (demo jam)** and mode pill **live MCP** with the MCP host (or **core fallback** if MCP is down — still demoable). Utterance chips follow this script; the glowing **next ·** chip tracks the demo beat.

Neon Corridor has unmarked peaks at **~30s** and **~62s**. After the first walk-past answer, use **“the other one”** to flip.

## Script (~2:35, mandatory beats)

Every beat below is **required**, including the live-MCP proof at 1:15. Keep the total under 2:40 so the video stays under 3 min.

| Time | Beat | Say / show |
|------|------|------------|
| 0:00 | Title card | “Almost — what did I just walk past?” Consent-based near-miss archaeology for jams. |
| 0:12 | Fixture jam context | Timeline: safe groove → lead explores → **uncaptured peak @ ~30s** → abandon → safe loop → later peak @ **~62s**. Say once that this is a **synthetic fixture jam**. |
| 0:30 | Ask | **“Alexa, what did I just walk past?”** |
| 0:40 | Response + graph | Alexa names the strongest near-miss (highest novelty, so the 30s peak). The event graph lights **Approach → Peak → Abandon → SafeLoop**. Highlight the **FORK**. |
| 0:58 | Disambiguate | **“Alexa, the other one.”** Graph and explanation switch to the 62s peak. |
| 1:15 | **Live MCP proof (mandatory)** | Point at the **LIVE MCP · 127.0.0.1:3100** pill and the per-bubble `via MCP · list_near_misses → explain_near_miss` tag. Then, in a split or terminal, run `npm run smoke:mcp` (prints `initialize protocolVersion 2025-11-25`, the tools list, peaks @ 30s/62s, and isolation PASS), **or** the curl initialize below. 15–20 s. |
| 1:35 | Resume | **“Alexa, take me back.”** Cue lands at the Approach timestamp. |
| 1:50 | Export | **“Alexa, export that seed.”** Show the MIDI-JSON seed preview; click **copy** or **download .json** (synthetic notes from the fixture, not copyrighted audio). |
| 2:08 | Why it matters | Capture saves what you played; generators continue what you hand them. **Nobody treats the abandoned approach as a first-class object.** Almost does. |
| 2:25 | Close | Consent-first (`start_session` refuses anything but `consent: true`). Deterministic scoring. MCP live on 2025-11-25 Streamable HTTP. |

### Live MCP proof: copy-paste

```bash
# protocol + session id (note the dual Accept header; without it the server returns 406)
curl -si http://127.0.0.1:3100/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"judge","version":"0"}}}'
# → result.protocolVersion "2025-11-25", plus an Mcp-Session-Id response header

# or the full tool walk + isolation check
npm run smoke:mcp
```

You can also point the MCP Inspector (`npx @modelcontextprotocol/inspector`) at `http://127.0.0.1:3100/mcp` (Streamable HTTP) and call `start_session` with `{"consent": true}`. With `{"consent": false}` the call returns `ok: false`.

### What the submitted video (2:06) already covers

The cut video (`almost-demo.mp4`, captions burned in, bed track *Brighter* by Remmy Thomas) was recorded before this script made the MCP beat mandatory. Beats against the video (times are approximate):

| Beat | In the video? |
|------|---------------|
| Title / context | ✅ ~0:00 caption “You jam. Somewhere in there, you almost found something new…” |
| Ask “what did I just walk past?” | ✅ ~0:12 |
| Response + graph / fork | ✅ ~0:24 caption “Almost finds the uncaptured peak…” |
| The other one (62s) | ✅ ~0:36 caption “A second near-miss at 62 seconds.” |
| **Live MCP proof** | ⚠️ **Partial.** The **LIVE MCP · 127.0.0.1:3100** pill is on screen the whole time, but there's no terminal/inspector beat. Judges can reproduce it with the copy-paste block above. |
| Take me back | ✅ ~0:48 caption “Cued at the approach…” |
| Export seed | ✅ ~1:00–1:12 (seed-peak-2 · 60–66 s · synthetic notes) |
| Summarize (bonus) | ✅ ~1:24 |
| Why it matters | ✅ ~1:36–1:48 |

No re-record is required. If Remmy re-cuts, add a 15 s `npm run smoke:mcp` terminal insert after the 62s beat; that keeps the video at ~2:20.

## Talking points for judges

1. **Real MCP Streamable HTTP** with 7 tools wired to fixture data (protocol **2025-11-25**).
2. **Deterministic** near-miss scoring (no LLM in the detector).
3. **Web Alexa+ sim** calling the same core path judges can replay (`npm run demo`).
4. **Multi-user-safe active jam** keyed by `Mcp-Session-Id` (web still passes explicit jam `sessionId` on one-shot calls).
5. **Consent gate is enforced**: `start_session` refuses `consent: false` or omitted for every session id.
6. Honest scope: feature frames are hand-authored fixtures; there is no live audio DSP in this build. No AWS services are used yet (Bedrock explanations are a stretch goal, HITL before spend).

## Friction log (submit with product feedback)

Track during build week — counts toward up to **10% judging bonus**:

- Consent UX for always-on jam listening
- Ambiguity when multiple near-misses stack (“the other one”)
- Export target (DAW clipboard vs file vs MIDI port)
- Shared global active session (mitigated — see `docs/FRICTION_LOG.md`)

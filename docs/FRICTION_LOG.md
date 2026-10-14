# Almost — Friction log

Amazon Build/Ship/Shape judging may award up to **~10%** for a product friction log + feedback. This file tracks real friction found while building and demoing Almost.

**Product:** Almost — consent-based Alexa+/MCP near-miss archaeology for creative jams  
**Contest:** https://amazonappdev2026.devpost.com/ (Alexa+ track)  
**Owners:** Remmy (HITL submit) · Hunter (research) · build agents (scaffold/MVP)

---

## How to use

Add dated entries as you hit them. Prefer concrete, reproducible notes over slogans.

| Field | Meaning |
|-------|---------|
| Date | When observed (PT) |
| Surface | MCP · Web Alexa+ sim · Scoring · Fixtures · Deploy · Docs · Voice UX |
| Severity | blocker / high / medium / low |
| Friction | What slowed or confused a human |
| Workaround | What we did today |
| Proposed fix | Ideal product/engineering change |
| Status | open / mitigated / closed |

---

## Entries

### 2026-10-02 — Scaffold / local dual-process demo

| | |
|--|--|
| **Surface** | Deploy · MCP · Web Alexa+ sim |
| **Severity** | medium |
| **Friction** | Judges (and us) must run **two** processes (`dev:mcp` + `dev:web`) and know `MCP_PUBLIC_URL`. If MCP is down, the web sim used to look “broken” instead of degrading. |
| **Workaround** | Web server actions prefer live Streamable HTTP MCP, then fall back to in-process `@almost/core`. Mode pill shows `live MCP` vs `core fallback`. |
| **Proposed fix** | Single `npm run demo` orchestrator + optional one-box deploy; health banner with copy-paste MCP URL for inspectors. |
| **Status** | mitigated |

### 2026-10-02 — MCP tool payload vs graph UI

| | |
|--|--|
| **Surface** | MCP · Web Alexa+ sim |
| **Severity** | medium |
| **Friction** | Early `list_near_misses` returned a slim summary (no `graph`). Alexa+ sim needs Approach→Peak→Abandon→SafeLoop to light the fork — would force a second `explain_near_miss` round-trip every list. |
| **Workaround** | `list_near_misses` now returns full `NearMiss` objects including `graph`. |
| **Proposed fix** | Keep list full for demo; add optional `detail: "summary" \| "full"` later for bandwidth. |
| **Status** | mitigated |

### 2026-10-02 — Consent always-on jam listening

| | |
|--|--|
| **Surface** | Voice UX · Product |
| **Severity** | high (product) |
| **Friction** | “Detect near-misses while I jam” implies continuous audio/timeline ingest. Creative users and platforms will (rightly) distrust always-on listening without crisp consent, retention, and kill-switch UX. |
| **Workaround** | Fixture sessions require `consent: true`; `start_session` refuses `consent: false`. No live mic ingest in MVP — synthetic timelines only. |
| **Proposed fix** | Explicit session-scoped consent card in Alexa+; visible “Almost is listening / paused”; auto-expire buffers; never train on user audio without separate opt-in. |
| **Status** | open |

### 2026-10-02 — Multiple near-misses in one jam

| | |
|--|--|
| **Surface** | Voice UX · Scoring |
| **Severity** | medium |
| **Friction** | Neon Corridor has peaks @ **30s** and **62s**. “What did I just walk past?” is ambiguous — Alexa needs a ranking rule and a follow-up for “the other one.” |
| **Workaround** | Deterministic scorer ranks by novelty; sim answers with the top unmarked miss and lists both in the event-graph panel. |
| **Proposed fix** | Voice disambiguation (“the early lead break, or the late one?”) + time-anchored replies (“around half a minute in”). |
| **Status** | open |

### 2026-10-02 — Export target unclear

| | |
|--|--|
| **Surface** | Product · Web Alexa+ sim |
| **Severity** | medium |
| **Friction** | “Export that seed” — to where? DAW clipboard, MIDI file, Ableton clip, audio stub? Judges will ask; musicians will ask harder. |
| **Workaround** | Export returns synthetic **MIDI-JSON** / audio-clip-ref preview in the web panel (no copyrighted audio). |
| **Proposed fix** | Pick one primary path for demo video (download MIDI-JSON + “copy for Ableton”); document others as stretch. |
| **Status** | open |

---

## Template (copy)

```md
### YYYY-MM-DD — short title

| | |
|--|--|
| **Surface** | |
| **Severity** | blocker / high / medium / low |
| **Friction** | |
| **Workaround** | |
| **Proposed fix** | |
| **Status** | open / mitigated / closed |
```

---

## 2026-10-13 entries (from build + live smoke)

### 2026-10-13: `next build` passes, but every page returns 500 at runtime
| | |
|--|--|
| **Surface** | Web Alexa+ sim · Deploy |
| **Severity** | blocker (now fixed) |
| **Task / steps** | `npm run build`, then `next start`, then load `/` |
| **Expected vs actual** | Expected the page to render. Actually got a 500: "This module cannot be imported from a Client Component module". |
| **Cause** | `server-only` was listed in `serverExternalPackages`. Node then resolved its default export, which throws, instead of the bundler's `react-server` condition. Build and typecheck stayed green, so only a runtime smoke caught it. |
| **Workaround / fix** | Removed `server-only` from `serverExternalPackages` (comment in `next.config.ts`). A headless browser run now covers the full utterance flow. |
| **Suggestion** | Next.js should warn at build time when `server-only` is externalized. MCP web-sim templates should include a runtime smoke, not just a build. |
| **Status** | closed |

### 2026-10-13: Streamable HTTP rejects requests without a dual Accept header
| | |
|--|--|
| **Surface** | MCP onboarding |
| **Severity** | medium |
| **Task / steps** | Raw `curl -X POST /mcp` initialize with only `content-type: application/json` |
| **Expected vs actual** | Expected a JSON-RPC result. Actually got `406 Not Acceptable: Client must accept both application/json and text/event-stream`. `GET /mcp` returns 405. |
| **Workaround** | Send `Accept: application/json, text/event-stream`. The response then arrives as an SSE `data:` frame, so the smoke script parses either form. |
| **Suggestion** | Alexa+ MCP docs should include a copy-paste curl initialize that already has the right headers. |
| **Status** | mitigated |

### 2026-10-13: Protocol negotiation silently downgrades or substitutes versions
| | |
|--|--|
| **Surface** | MCP · Alexa+ eligibility |
| **Severity** | medium |
| **Observed** | Requesting `2025-11-25` returned `2025-11-25`. Requesting `2025-06-18`, `2025-03-26`, or `2024-11-05` returned that same older version. Requesting the unknown `2099-01-01` returned `2025-11-25` with no error. |
| **Why it matters** | The track requires a minimum of 2025-11-25, but the server will happily speak older versions, so a client can't tell which one is "the contest version". |
| **Workaround** | `smoke:mcp` asserts `protocolVersion === 2025-11-25` (override with `EXPECTED_MCP_PROTOCOL`). |
| **Suggestion** | The SDK could offer a `minProtocolVersion` option. Alexa+ could document which version its client sends. |
| **Status** | mitigated |

### 2026-10-13: Dual modes (live MCP vs core fallback) were invisible per reply
| | |
|--|--|
| **Surface** | Web Alexa+ sim · Demo |
| **Severity** | low |
| **Friction** | Only a global pill showed the mode. Judges couldn't see which MCP tool backed each Alexa answer. |
| **Fix** | Every Alexa bubble now shows `via MCP · list_near_misses → explain_near_miss` or `via core fallback · …`. Verified both ways by killing MCP mid-session. |
| **Status** | closed |

### 2026-10-13: Shared global store on the MCP server
| | |
|--|--|
| **Surface** | MCP |
| **Severity** | medium (multi-user) |
| **Friction** | The `getStore()` singleton kept one "active session" for all clients, and each web call opens a fresh one-shot MCP connection. One client's `start_session` could change another client's default. |
| **Workaround** | (1) Stateful Streamable HTTP: active jam pointer is keyed by `Mcp-Session-Id`, cleaned up on session close. `smoke:mcp` proves two concurrent clients each keep their own active. (2) Web Alexa+ sim still passes jam `sessionId` explicitly on every tool call so one-shot connect→call→close stays correct across connections. (3) `ALLOWED_HOSTS` env (comma-separated) configures `allowedHosts` for a future public hostname; defaults unchanged (localhost/127.0.0.1 when binding `0.0.0.0`). |
| **Suggestion** | Keep explicit jam `sessionId` in Alexa+/web tool args even after deploy — one-shot clients will always mint a new MCP session. Consider idle TTL on MCP sessions if the map grows under load. |
| **Status** | mitigated |

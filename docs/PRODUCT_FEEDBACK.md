# Almost — Product feedback

Stub for Amazon Build/Ship/Shape **product feedback** (pair with `docs/FRICTION_LOG.md`).  
Capture quotes, reactions, and decisions — not just bugs.

**Product one-liner:** Consent-based Alexa+/MCP agent that treats abandoned creative approaches as first-class objects (“Alexa, what did I just walk past?”).

---

## Audience hypotheses

| Who | Job to be done | Why Almost |
|-----|----------------|------------|
| Hardware / modular jammers | Recover ideas they flinched away from mid-flow | Capture/Ableton Capture save what you *kept*; Almost recovers what you *left* |
| Producer / DAW users | Resume a near-miss without scrubbing a 2-hour take | Event graph + exportable seed window |
| Judges / Alexa+ | Novel MCP + voice UX that isn’t another “AI patch suggestor” | Demo utterance maps cleanly to MCP tools |

---

## Feedback log

| Date (PT) | Source | Quote / observation | Implication | Action |
|-----------|--------|---------------------|-------------|--------|
| 2026-10-02 | Remmy (voice brief) | Mind-blowing unmet need — something people don’t know they need yet but will; ideally never done before | Near-miss archaeology (not Capture clone) is the wedge | Ship Almost MVP; HITL only on Devpost submit |
| 2026-10-02 | Hunter (research lock) | Nobody treats the abandoned approach as a first-class object | Novelty claim must stay crisp in demo script | Keep scoring deterministic; LLM only for explain later |
| 2026-10-14–15 | Build / live smoke | Shared MCP “active jam” leaked across clients; Host header would block a public hostname | Multi-user demo/deploy needs per-session state + host allowlist | Keyed active jam by `Mcp-Session-Id` + cleanup on close; `ALLOWED_HOSTS`; isolation smoke PASS. Would still build with MCP again — one backend for voice + web sim holds; session scoping is the tax, not a reason to leave. |
| | | | | |

---

## Open product questions

1. **Consent UX** — session start card vs always-armed skill? Kill-switch utterance?
2. **Seed destination** — MIDI-JSON download vs DAW deep-link vs clipboard? *(MVP: web panel now has copy + download .json of synthetic MIDI-JSON.)*
3. **Multi-miss ranking** — novelty-only vs recency (“just”) vs user-weighted?
4. **Live ingest** — feature frames from essentia.js/librosa on short clips only, or MIDI/CC timeline first?
5. **Alexa+ distribution** — Streamable HTTP MCP URL for judges vs Agent Skill package?

---

## Nudge for playtesters

Ask after a 3-minute demo:

1. In one sentence, what did Almost just do?
2. Would you turn this on for a real jam? Why / why not?
3. What felt magical? What felt fake or creepy?
4. Where should the seed land in *your* setup?

---

## Feature requests (Devpost-ready)

Grounded in open items in `FRICTION_LOG.md` / this file — not new product directions.

### Critical
- **Consent UX for jam listening** — Explicit session-scoped consent card in Alexa+ (start / pause / kill-switch), visible “Almost is listening” state, auto-expire buffers. Continuous ingest without this will not ship. *(FRICTION: Consent always-on jam listening — open / high.)*

### Important
- **Seed destination as a first-class path** — Primary demo path is MIDI-JSON download + clipboard copy (now in the web panel). Stretch: Ableton/DAW deep-link. Judges and musicians both ask “export to where?” *(FRICTION: Export target unclear — open / medium; MVP workaround landed.)*
- **Multi-miss voice disambiguation** — When a jam has peaks at ~30s and ~62s, offer a ranked follow-up (“the early lead break, or the late one?”) and time-anchored replies. “The other one” works in the sim; voice still needs the clarifying prompt. *(FRICTION: Multiple near-misses — open / medium.)*
- **`minProtocolVersion` on the MCP server/SDK** — Track requires ≥ `2025-11-25`, but negotiation silently accepts older or unknown versions. A hard floor (or clear reject) would make eligibility checkable. *(FRICTION: Protocol negotiation — mitigated / medium.)*

### Nice-to-have
- **Alexa+ docs: which `protocolVersion` the client sends** — Plus a copy-paste curl initialize with the dual `Accept` header. Cuts onboarding friction for the Streamable HTTP path. *(FRICTION: Accept header 406 + protocol docs — mitigated.)*

---

## Devpost Product Feedback draft (Oct 15)

**Tools used:** the MCP TypeScript SDK v2 (`@modelcontextprotocol/server`, `/express`, `/node`, `/client`) for a self-hosted Streamable HTTP server (7 tools) and the web sim's client, plus Next.js 15 for the web Alexa+ simulation. AWS services are not used yet.
**Worked well:** `createMcpHandler` + `McpServer.registerTool` with zod schemas made it quick to go from zero to a working tool. Initialize negotiates `2025-11-25` out of the box, and the SDK client connects and calls tools in a few lines. Stateful Streamable HTTP (`Mcp-Session-Id`) made per-client active-jam isolation straightforward once we keyed store state by session and cleaned up on close.
**Needs work:** the 406 on a missing dual Accept header has no curl example in the docs. An unknown version request quietly gets substituted. There's no `minProtocolVersion` guard. And it isn't clear which protocolVersion the Alexa+ client sends. See `FRICTION_LOG.md` for the details. For public deploy, Host allowlisting (`ALLOWED_HOSTS`) is easy to miss until the first non-localhost hit.
**Onboarding:** under an hour to a hello-world tool call. Most of the time went into transport headers, the Next.js `server-only` runtime trap, and learning that one-shot MCP clients mint a new session every call (so jam `sessionId` must stay explicit in tool args).
**Build again?** Yes. MCP still lets one deterministic backend serve a voice agent and a web sim at the same time. The Oct 14–15 session-isolation work was the right kind of tax — session scoping and Host policy — not a reason to leave the stack.

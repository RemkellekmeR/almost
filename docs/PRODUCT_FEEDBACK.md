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
| | | | | |

---

## Open product questions

1. **Consent UX** — session start card vs always-armed skill? Kill-switch utterance?
2. **Seed destination** — MIDI-JSON download vs DAW deep-link vs clipboard?
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

## Devpost Product Feedback draft (Oct 13)

**Tools used:** the MCP TypeScript SDK v2 (`@modelcontextprotocol/server`, `/express`, `/node`, `/client`) for a self-hosted Streamable HTTP server (7 tools) and the web sim's client, plus Next.js 15 for the web Alexa+ simulation. AWS services are not used yet.
**Worked well:** `createMcpHandler` + `McpServer.registerTool` with zod schemas made it quick to go from zero to a working tool. Initialize negotiates `2025-11-25` out of the box, and the SDK client connects and calls tools in a few lines.
**Needs work:** the 406 on a missing dual Accept header has no curl example in the docs. An unknown version request quietly gets substituted. There's no `minProtocolVersion` guard. And it isn't clear which protocolVersion the Alexa+ client sends. See `FRICTION_LOG.md` for the details.
**Onboarding:** under an hour to a hello-world tool call. Most of the time went into transport headers and the Next.js `server-only` runtime trap, not MCP concepts.
**Build again?** Yes. MCP lets one deterministic backend serve a voice agent and a web sim at the same time.

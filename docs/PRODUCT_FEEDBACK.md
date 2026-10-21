# Almost — Product feedback

Product feedback for Amazon Build/Ship/Shape (Alexa+ track). Read it alongside `docs/FRICTION_LOG.md`. The Devpost-ready answers to the five required prompts are in the **Devpost Product Feedback** section at the bottom.

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
| 2026-10-20 | Pre-submit audit | `start_session` with `consent: false` still succeeded for a fixture that had consent recorded, because the gate only checked the fixture's flag | A consent-first pitch needs the caller's consent checked on every call | Gate now refuses anything other than an explicit `consent: true`, for every session id. See FRICTION_LOG 2026-10-20 |

---

## Open product questions

1. **Consent UX** — session start card vs always-armed skill? Kill-switch utterance?
2. **Seed destination** — MIDI-JSON download vs DAW deep-link vs clipboard? *(MVP: web panel now has copy + download .json of synthetic MIDI-JSON.)*
3. **Multi-miss ranking** — novelty-only vs recency (“just”) vs user-weighted? *(The sim now answers with the highest-novelty miss, with ties going to the most recent.)*
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
- **Hosted Alexa+ MCP test client / sandbox for builders.** A way to point a real Alexa+ session at a self-hosted Streamable HTTP MCP URL during the hackathon, plus docs on the client's `protocolVersion` and `Mcp-Session-Id` behavior. Without it, Alexa+ track teams ship web simulations and can't verify the real voice path. *(FRICTION: No hosted Alexa+ MCP client — open / high.)*
- **Seed destination as a first-class path** — Primary demo path is MIDI-JSON download + clipboard copy (now in the web panel). Stretch: Ableton/DAW deep-link. Judges and musicians both ask “export to where?” *(FRICTION: Export target unclear — mitigated / medium; MVP workaround landed.)*
- **Multi-miss voice disambiguation** — When a jam has peaks at ~30s and ~62s, offer a ranked follow-up (“the early lead break, or the late one?”) and time-anchored replies. “The other one” works in the sim; voice still needs the clarifying prompt. *(FRICTION: Multiple near-misses — open / medium.)*
- **`minProtocolVersion` on the MCP server/SDK** — Track requires ≥ `2025-11-25`, but negotiation silently accepts older or unknown versions. A hard floor (or clear reject) would make eligibility checkable. *(FRICTION: Protocol negotiation — mitigated / medium.)*

### Nice-to-have
- **Alexa+ docs: which `protocolVersion` the client sends** — Plus a copy-paste curl initialize with the dual `Accept` header. Cuts onboarding friction for the Streamable HTTP path. *(FRICTION: Accept header 406 + protocol docs — mitigated.)*

---

## Devpost Product Feedback (updated Oct 20). Paste into the Devpost form.

**1. Tools used and why**
- **MCP TypeScript SDK v2.** `@modelcontextprotocol/server` (`McpServer.registerTool` with zod input schemas), `@modelcontextprotocol/express` (`createMcpExpressApp`, which includes Host allowlisting), `@modelcontextprotocol/node` (`NodeStreamableHTTPServerTransport`, stateful `Mcp-Session-Id`), and `@modelcontextprotocol/client` (`Client` + `StreamableHTTPClientTransport`, used by the web sim and `smoke:mcp`). We chose it because the Alexa+ track accepts a self-hosted MCP server on spec 2025-11-25 over Streamable HTTP, and one MCP backend can serve both a voice agent and our web simulator.
- **Next.js 15 (App Router, server actions) + React 19.** The web Alexa+ simulator. Server actions call the MCP server and fall back to the in-process `@almost/core` if MCP is down.
- **AWS services: none yet.** We didn't use Bedrock, Lambda, or any other AWS service in this build. Explanations are templated from the deterministic detector. Bedrock explanations are a stretch goal, and we'll do them only after a human approves the spend.
- **Alexa+:** we had no hosted Alexa+ MCP client to test against during the hackathon, so the Alexa+ experience is a web simulation that calls the same live MCP tools (see FRICTION_LOG 2026-10-20).

**2. What worked well**
- `McpServer.registerTool` with zod schemas took us from zero to a callable tool in minutes. The input schemas double as the tool docs a client sees.
- Initialize negotiated `2025-11-25` with no configuration.
- `createMcpExpressApp` + `NodeStreamableHTTPServerTransport` with a session-id generator gave us stateful sessions. Keying our "active jam" by `Mcp-Session-Id` (and cleaning up on close) fixed cross-client leakage in about an hour.
- The SDK client is a few lines, so we could write `smoke:mcp`, which asserts the protocol version, tool results, and two-client isolation against the live server.

**3. What needs work**
- Streamable HTTP returns **406** when a client doesn't send `Accept: application/json, text/event-stream`, and the docs don't have a copy-paste curl initialize. The response can come back as JSON or as an SSE `data:` frame, so hand-rolled clients have to handle both.
- Version negotiation is permissive. Older versions are accepted as requested, and an unknown future version is silently answered with `2025-11-25`. There's no `minProtocolVersion` floor, so "is my server contest-eligible?" can only be checked by a test you write yourself.
- Host allowlisting is easy to miss until your first non-localhost request is rejected.
- On the Alexa+ side, we couldn't find documentation for which `protocolVersion` the Alexa+ client sends, how it handles `Mcp-Session-Id`, or a sandbox where a hackathon team can point Alexa+ at a self-hosted MCP URL.

**4. Onboarding**
Under an hour to a hello-world tool call over Streamable HTTP. Most of the remaining time went to:
- transport headers (the 406),
- a Next.js `server-only` runtime trap that passed build and typecheck but 500'd every page,
- learning that one-shot MCP clients mint a new session on every call, so the jam `sessionId` has to stay explicit in tool args.

Finding the Alexa+-specific MCP integration docs (if they exist publicly) took longer than writing the server.

**5. Would you build with it again? Yes.**
MCP let one deterministic backend serve a voice-style agent and a web sim at the same time, and the SDK's server, transport, and client pieces fit together cleanly. The friction was in session scoping, Host policy, and version and Alexa+ client documentation, not the core abstraction. We'd want a hosted Alexa+ test client before shipping to real users.

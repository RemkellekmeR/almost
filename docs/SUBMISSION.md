# Almost — Devpost submission checklist

Contest: https://amazonappdev2026.devpost.com/ · Alexa+ track · **due Fri Oct 23 2026 12:00pm PT**
Rules live-checked Oct 13 2026. Submissions close Oct 23 12:00pm PDT; judging Oct 26–Nov 20; winners ~Dec 3.

## Required
- [ ] Text description of features and functionality (README "Two demo modes" + "MCP tools")
- [ ] GitHub repo URL. It must be **public with an OSS license** (MIT is in `LICENSE` and has to show in the About section) **or** private with collaborators chris-trag, knmeiss, giolaq, anishamalde, mosesroth, emersonsklar. *(Remmy does this. Nothing has been created yet.)*
- [ ] Clear setup and run instructions in the repo (README quick start + `npm run build && npm run demo`)
- [ ] Alexa+ runtime hook: a self-hosted MCP server, spec **2025-11-25**, over Streamable HTTP. It's done: `apps/mcp-server`, and `npm run smoke:mcp` asserts the negotiated protocolVersion.
- [ ] Demo video **< 3 min**, public on YouTube or Vimeo, no copyrighted music. Use the synthetic fixtures only, and follow `docs/DEMO.md`. *(Remmy records it.)*
- [ ] Product Feedback for each tool used (`docs/PRODUCT_FEEDBACK.md`): which tools and why, what worked, what needs work, onboarding, would you build again Y/N + why
- [ ] Track: **Alexa+**
- [ ] Mini challenges: none planned. Open Source would need a *separate* new repo or a PR plus a contribution URL. AWS Builder would need a documented AWS service (Kiro counts).

## Optional (scored)
- [ ] Friction log entries (`docs/FRICTION_LOG.md`). These are worth **up to a 10% bonus**. Each entry needs the task, steps, expected vs actual, severity, workaround, and a suggestion.
- [ ] Feature requests with a priority (Critical / Important / Nice-to-have)

## Pre-submit verification
`npm run typecheck && npm run build` → `npm run demo` → `npm run smoke:mcp` (PASS) → open http://localhost:3000 and confirm the pill shows **live MCP** → walk-past / take me back / export / the other one

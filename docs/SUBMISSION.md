# Almost — Devpost submission checklist

Contest: https://amazonappdev2026.devpost.com/ · Alexa+ track · **due Fri Oct 23 2026 12:00pm PT**
Rules live-checked Oct 16 2026. Submissions close Oct 23 12:00pm PDT; judging Nov 9–20 (12:00pm PT); winners ~Dec 3.
Internal submit-by: **Thu Oct 22**. Remmy presses Submit. Bots do not.

## Required
- [x] Text description of features and functionality (README "Two demo modes" + "MCP tools")
- [x] GitHub repo URL — **public**, MIT in `LICENSE`, About shows license. https://github.com/RemkellekmeR/almost
- [x] Clear setup and run instructions (README quick start + `npm run build && npm run demo`)
- [x] Alexa+ runtime hook: self-hosted MCP server, spec **2025-11-25**, Streamable HTTP (`apps/mcp-server`; `npm run smoke:mcp` asserts protocolVersion)
- [ ] Demo video **< 3 min**, **public on YouTube or Vimeo**, no copyrighted music. Local file ready: `/workspace/almost-video/almost-demo.mp4` (box) and a copy in Downloads on Remkel1 (2:06, captions burned in, bed = Remmy Thomas — *Brighter*, own work). Beat coverage vs the script: `docs/DEMO.md` → “What the submitted video already covers”. **Remmy uploads + pastes the URL into Devpost.**
- [x] Product Feedback ready (`docs/PRODUCT_FEEDBACK.md` → “Devpost Product Feedback”, all 5 prompts; updated Oct 20) — **Remmy pastes into Devpost form**
- [x] Track: **Alexa+**
- [ ] Mini challenges: none planned

## Optional (scored)
- [x] Friction log ready (`docs/FRICTION_LOG.md`, incl. Oct 20 Alexa+ client + consent-gate entries) — up to **10% bonus**. **Remmy pastes entries into Devpost form.**
- [x] Feature requests with priority — see `docs/PRODUCT_FEEDBACK.md`

## Remmy HITL (do these; bots will not)
1. Upload `/workspace/almost-video/almost-demo.mp4` to YouTube or Vimeo (public/unlisted-ok if contest allows public link; rules want public YouTube/Vimeo).
2. Open Devpost project → paste video URL, repo URL, description from README, Product Feedback, Friction log.
3. Press Submit before **Thu Oct 22** (internal) / hard close Fri Oct 23 12:00pm PDT.

## Pre-submit verification
`npm run typecheck && npm run build` → `npm run demo` → `npm run smoke:mcp` (PASS) → open http://localhost:3000 and confirm the pill shows **live MCP** → walk-past / take me back / export / the other one

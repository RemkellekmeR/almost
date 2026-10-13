# Session fixtures

Synthetic-only jams for deterministic near-miss demos. **No copyrighted audio.**

| File | Purpose |
|------|---------|
| `jam-neon-corridor.json` | Primary demo — unmarked near-miss(es) at ~30s (and possibly ~62s) |
| `jam-captured-peak.json` | Control — peak has `capture_marker`, must yield 0 unmarked |
| `jam-steady-state.json` | Flat groove — 0 near-misses |
| `*.wav` | Tiny synthetic tone/silence placeholders (JSON timeline is enough for scoring) |

Feature frames are hand-authored. `@almost/core` re-scores on load so detector output stays the source of truth.

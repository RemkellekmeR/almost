import { getStore, noveltyAt } from "./index.js";

const store = getStore();
const sessions = store.list();
console.log(`Loaded ${sessions.length} session(s)`);
for (const s of sessions) {
  console.log(`\n== ${s.id}: ${s.title} (${s.durationSec}s) ==`);
  console.log(`features=${s.features.length} timeline=${s.timeline.length}`);
  const sample = s.features.slice(0, 3).map((f) => ({
    t: f.t,
    novelty: Number(noveltyAt(f).toFixed(3)),
    rep: f.repetition,
  }));
  console.log("sample novelty", sample);
  for (const nm of s.nearMisses) {
    console.log(
      `  NEAR-MISS ${nm.id} peak@${nm.peakT}s novelty=${nm.noveltyPeak.toFixed(2)} unmarked=${nm.unmarked}`,
    );
  }
  console.log("summary", store.summary(s.id));
}

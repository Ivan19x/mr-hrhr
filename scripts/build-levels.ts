// Builds the Break of Structure campaign from REAL chart setups.
//   node scripts/build-levels.ts        (after scripts/fetch-charts.mjs)
// Reads scripts/.cache/charts/*.json (raw downloads), finds real BOS setups, ranks them from textbook
// to messy, and writes src/data/real/bosCampaign.json.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { findSetups, setupToLevel, cleanliness, type Dataset, type Setup } from "../src/engine/setups.ts";

const dir = new URL("./.cache/charts/", import.meta.url);
const index: { id: string }[] = JSON.parse(await readFile(new URL("index.json", dir), "utf8"));
const datasets = new Map<string, Dataset>();
const all: Setup[] = [];
for (const { id } of index) {
  const ds: Dataset = JSON.parse(await readFile(new URL(`${id}.json`, dir), "utf8"));
  datasets.set(id, ds);
  const found = findSetups(ds);
  all.push(...found);
  console.log(`${id.padEnd(12)} ${found.length} setups (${found.filter((s) => s.won).length} reached 2R)`);
}

const ranked = [...all].sort((a, b) => cleanliness(b) - cleanliness(a));
const taken = new Set<Setup>();
const usedDatasets = new Map<string, number>();

/** Pick the first setup matching `ok`, spreading picks across markets. */
function pick(pool: Setup[], ok: (s: Setup) => boolean): Setup {
  for (const maxUse of [0, 1, 2, 99]) {
    const s = pool.find((x) => !taken.has(x) && ok(x) && (usedDatasets.get(x.datasetId) ?? 0) <= maxUse);
    if (s) {
      taken.add(s);
      usedDatasets.set(s.datasetId, (usedDatasets.get(s.datasetId) ?? 0) + 1);
      return s;
    }
  }
  throw new Error("No setup left for this slot");
}

const n = ranked.length;
const top = ranked.slice(0, Math.ceil(n * 0.25));
const mid = ranked.slice(Math.floor(n * 0.3), Math.ceil(n * 0.7));
const low = ranked.slice(Math.floor(n * 0.65));

const plan: { id: string; difficulty: "tutorial" | "easy" | "medium" | "hard" | "exam"; pool: Setup[]; ok: (s: Setup) => boolean }[] = [
  // The tutorial must be bullish and unflipped to match the tutorial animation.
  { id: "tutorial", difficulty: "tutorial", pool: top, ok: (s) => s.dir === "bull" && s.won },
  { id: "easy-1", difficulty: "easy", pool: top, ok: (s) => s.dir === "bull" && s.won },
  { id: "easy-2", difficulty: "easy", pool: top, ok: (s) => s.dir === "bear" && s.won },
  { id: "easy-3", difficulty: "easy", pool: top, ok: (s) => s.won },
  { id: "medium-1", difficulty: "medium", pool: mid, ok: (s) => s.dir === "bear" && s.won },
  { id: "medium-2", difficulty: "medium", pool: mid, ok: (s) => s.dir === "bull" && s.won },
  { id: "medium-3", difficulty: "medium", pool: mid, ok: (s) => !s.won },
  { id: "hard-1", difficulty: "hard", pool: low, ok: (s) => s.dir === "bull" && s.won },
  { id: "hard-2", difficulty: "hard", pool: low, ok: (s) => s.dir === "bear" && s.won },
  { id: "hard-3", difficulty: "hard", pool: low, ok: (s) => !s.won },
  { id: "exam", difficulty: "exam", pool: mid.concat(low), ok: (s) => s.won },
];

const levels = plan.map((p) => {
  const s = pick(p.pool, p.ok);
  const ds = datasets.get(s.datasetId)!;
  console.log(`  ${p.id.padEnd(9)} ← ${ds.label} ${ds.tf} ${s.dir} ${s.won ? "win" : "loss"} (clean ${cleanliness(s).toFixed(2)})`);
  return setupToLevel(ds, s, `t2-bos-${p.id}`, p.difficulty);
});

await mkdir(new URL("../src/data/real/", import.meta.url), { recursive: true });
await writeFile(new URL("../src/data/real/bosCampaign.json", import.meta.url), JSON.stringify(levels));
console.log(`\n${all.length} real setups found; wrote ${levels.length} campaign levels.`);

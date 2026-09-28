// Builds every playable strategy's levels from REAL charts (Tier 1 → Tier 4), except
// Candlesticks (scripts/build-candle-levels.ts). Pass strategy ids to rebuild only those.
//   node scripts/build-all-levels.ts        (after scripts/fetch-charts.mjs)
// Per strategy: tutorial + 10 easy + 10 medium + 10 hard + exam = 32 levels.
// Output (compact): src/data/real/levels/<strategy>.json + src/data/real/levelIndex.json
// The raw cache (scripts/.cache) can be deleted afterwards.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { SPECS, buildSpec, type Compact } from "./level-specs.ts";

// ------------------------------------------------------------------ run
const OUT = new URL("../src/data/real/levels/", import.meta.url);
await mkdir(OUT, { recursive: true });
const indexOut: { id: string; strategyId: string; tier: number; difficulty: string }[] = [];

const only = process.argv.slice(2);
for (const spec of SPECS) {
  if (only.length && !only.includes(spec.strategy)) continue;
  const levels = buildSpec(spec);
  await writeFile(new URL(`${spec.strategy}.json`, OUT), JSON.stringify(levels));
  const wins = levels.filter((l) => /reached the 2R/.test(l.explanation)).length;
  console.log(`✓ ${spec.strategy.padEnd(16)} ${levels.length} levels (${wins} winners) · ${[...new Set(levels.map((l) => `${l.source!.label} ${l.source!.timeframe}`))].slice(0, 4).join(", ")}…`);
}

// Level index (small, loaded up front).
const { readdir } = await import("node:fs/promises");
for (const f of (await readdir(OUT)).filter((f) => f.endsWith(".json"))) {
  const levels: Compact[] = JSON.parse(await readFile(new URL(f, OUT), "utf8"));
  for (const l of levels) indexOut.push({ id: l.id, strategyId: l.strategyId, tier: l.tier, difficulty: l.difficulty });
}
await writeFile(new URL("../src/data/real/levelIndex.json", import.meta.url), JSON.stringify(indexOut));
console.log(`\nLevel index: ${indexOut.length} levels.`);

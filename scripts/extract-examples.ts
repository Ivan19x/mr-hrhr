// Finds a REAL chart section for every Academy concept (hammer, engulfing,
// head & shoulders, liquidity sweep, …), cuts out just that section, and writes
// the small result into the game:
//   src/data/real/examples.json     lesson examples (by id)
//   src/data/real/practiceBank.json real BOS setups for Practice mode
// Run after scripts/fetch-charts.mjs:  node scripts/extract-examples.ts
// The raw downloads (scripts/.cache) can be deleted afterwards.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { findSetups, cleanliness, type Dataset, type Setup } from "../src/engine/setups.ts";

import { CTX, D, loadContexts, type Cand, type Detector, type DS } from "./detect.ts";

const CACHE = new URL("./.cache/charts/", import.meta.url);
const index: { id: string }[] = JSON.parse(await readFile(new URL("index.json", CACHE), "utf8"));
const all: DS[] = [];
for (const { id } of index) all.push(JSON.parse(await readFile(new URL(`${id}.json`, CACHE), "utf8")));

loadContexts(all);

// ------------------------------------------------------------------ selection
type Example = { label: string; tf: string; t0: number; t1: number; pre: number; rows: number[][]; pts: Record<string, number>; lv: Record<string, number> };

const round = (v: number) => Number(v.toPrecision(6));
const used = new Map<string, number>();
const taken: { ds: string; a: number; b: number }[] = [];

/** Reject windows where a later explosive move squashes the pattern into a sliver. */
function readable(c: Cand): boolean {
  const rows = c.ds.candles.slice(c.start, c.end + 1);
  const ranges = rows.map((r) => r[2] - r[3]).sort((a, b) => a - b);
  const median = ranges[Math.floor(ranges.length / 2)] || 1e-12;
  const span = Math.max(...rows.map((r) => r[2])) - Math.min(...rows.map((r) => r[3]));
  return span / median <= 28;
}

function choose(id: string, detector: Detector, filter: (c: Cand) => boolean = () => true, withVolume = false): Example | null {
  const cands = CTX.flatMap((x) => detector(x)).filter((c) => filter(c) && readable(c)).sort((a, b) => b.score - a.score);
  for (const maxUse of [1, 2, 4, 99]) {
    const pick = cands.find(
      (c) =>
        (used.get(c.ds.id) ?? 0) < maxUse &&
        !taken.some((t) => t.ds === c.ds.id && c.start <= t.b && c.end >= t.a) &&
        (!withVolume || c.ds.source === "binance"),
    );
    if (!pick) continue;
    used.set(pick.ds.id, (used.get(pick.ds.id) ?? 0) + 1);
    taken.push({ ds: pick.ds.id, a: pick.start, b: pick.end });
    const pre = pick.pre ?? 0;
    const from = Math.max(0, pick.start - pre);
    const rows = pick.ds.candles.slice(from, pick.end + 1).map((r) => {
      const base = [round(r[1]), round(r[2]), round(r[3]), round(r[4])];
      return withVolume ? [...base, Math.round(r[5])] : base;
    });
    const ex: Example = {
      label: pick.ds.label,
      tf: pick.ds.tf,
      t0: pick.ds.candles[pick.start]![0],
      t1: pick.ds.candles[pick.end]![0],
      pre: pick.start - from,
      rows,
      pts: pick.pts,
      lv: Object.fromEntries(Object.entries(pick.lv ?? {}).map(([k, v]) => [k, round(v)])),
    };
    console.log(`✓ ${id.padEnd(18)} ${pick.ds.label} ${pick.ds.tf}  (${cands.length} candidates, score ${pick.score.toFixed(2)})`);
    return ex;
  }
  console.log(`✗ ${id.padEnd(18)} no real example found`);
  return null;
}

const examples: Record<string, Example> = {};
const want: [string, Detector, ((c: Cand) => boolean)?, boolean?][] = [
  ["trend-up", D["trend-up"]!],
  ["trend-down", D["trend-down"]!],
  ["trend-up-volume", D["trend-up"]!, undefined, true],
  ["range", D["range"]!],
  ["marubozu-bull", D["marubozu-bull"]!],
  ["marubozu-bear", D["marubozu-bear"]!],
  ["doji", D["doji"]!],
  ["doji-long", D["doji-long"]!],
  ["doji-dragonfly", D["doji-dragonfly"]!],
  ["doji-gravestone", D["doji-gravestone"]!],
  ["hammer", D["hammer"]!],
  ["hanging-man", D["hanging-man"]!],
  ["inverted-hammer", D["inverted-hammer"]!],
  ["shooting-star", D["shooting-star"]!],
  ["spinning-top", D["spinning-top"]!],
  ["pin-bar", D["pin-bar"]!],
  ["momentum-fade", D["momentum-fade"]!],
  ["wick-defense", D["wick-defense"]!],
  ["engulfing-bull", D["engulfing-bull"]!],
  ["engulfing-bear", D["engulfing-bear"]!],
  ["harami-bull", D["harami-bull"]!],
  ["harami-bear", D["harami-bear"]!],
  ["tweezer-bottom", D["tweezer-bottom"]!],
  ["tweezer-top", D["tweezer-top"]!],
  ["piercing", D["piercing"]!],
  ["dark-cloud", D["dark-cloud"]!],
  ["inside-bar", D["inside-bar"]!],
  ["morning-star", D["morning-star"]!],
  ["evening-star", D["evening-star"]!],
  ["three-soldiers", D["three-soldiers"]!],
  ["three-crows", D["three-crows"]!],
  ["breakout-retest", D["breakout-retest"]!],
  ["breakout-retest-2", D["breakout-retest"]!],
  ["fakeout", D["fakeout"]!],
  ["liquidity-sweep", D["liquidity-sweep"]!],
  ["trendline", D["trendline"]!],
  ["bos-choch", D["bos-choch"]!],
  ["double-top", D["double-top"]!],
  ["double-bottom", D["double-bottom"]!],
  ["head-shoulders", D["head-shoulders"]!],
  ["triangle-asc", D["triangle-asc"]!],
  ["triangle-desc", D["triangle-desc"]!],
  ["triangle-sym", D["triangle-sym"]!],
  ["bull-flag", D["bull-flag"]!],
  ["rising-wedge", D["rising-wedge"]!],
  ["cup-handle", D["cup-handle"]!],
  ["golden-cross", D["golden-cross"]!],
  ["fib-pullback", D["fib-pullback"]!],
  ["divergence-bear", D["divergence-bear"]!],
  ["divergence-bull", D["divergence-bull"]!],
  ["ob-fvg", D["ob-fvg"]!],
  ["premium-discount", D["premium-discount"]!],
  ["ema-pullback", D["ema-pullback"]!],
  ["london-breakout", D["london-breakout"]!],
  ["tf-15m", D["tf-15m"]!],
];
for (const [id, det, filter, vol] of want) {
  const ex = choose(id, det, filter, vol);
  if (ex) examples[id] = ex;
}

// Real BOS setups for the strategy lessons and the Practice bank.
const setups: { s: Setup; ds: Dataset }[] = [];
for (const d of all) {
  const ds: Dataset = { id: d.id, label: d.label, tf: d.tf, source: d.source, candles: d.candles.map((r) => [r[0], r[1], r[2], r[3], r[4]]) };
  for (const s of findSetups(ds)) setups.push({ s, ds });
}
setups.sort((a, b) => cleanliness(b.s) - cleanliness(a.s));
function setupExample(pick: { s: Setup; ds: Dataset }): Example {
  const { s, ds } = pick;
  const start = Math.max(0, s.brk - 45);
  const end = Math.min(ds.candles.length - 1, s.brk + 25);
  return {
    label: ds.label, tf: ds.tf, t0: ds.candles[start]![0], t1: ds.candles[end]![0], pre: 0,
    rows: ds.candles.slice(start, end + 1).map((r) => [round(r[1]), round(r[2]), round(r[3]), round(r[4])]),
    pts: { swing: s.swing - start, pull: s.pull - start, prev: s.prevSwing - start, brk: s.brk - start },
    lv: { entry: round(s.entry), sl: round(s.sl), tp: round(s.tp) },
  };
}
const bosBull = setups.find((p) => p.s.dir === "bull" && p.s.won && p.s.brk - p.s.prevSwing < 40);
if (bosBull) examples["bos-setup"] = setupExample(bosBull);

// Practice bank: ~60 varied real setups (both directions, wins and losses).
const bank: { label: string; tf: string; dir: "bull" | "bear"; atr: number; t: number[]; rows: number[][]; swing: number; pull: number; prev: number; brk: number; won: boolean; bars: number }[] = [];
const perDs = new Map<string, number>();
for (const p of [...setups].sort(() => 0.5 - Math.random())) {
  if (bank.length >= 40) break;
  const k = perDs.get(p.ds.id) ?? 0;
  if (k >= 2) continue;
  perDs.set(p.ds.id, k + 1);
  const start = Math.max(0, p.s.brk - 60);
  const end = Math.min(p.ds.candles.length - 1, p.s.brk + 40);
  const slice = p.ds.candles.slice(start, end + 1);
  bank.push({
    label: p.ds.label, tf: p.ds.tf, dir: p.s.dir, atr: round(p.s.atr), t: [slice[0]![0], p.ds.candles[p.s.brk]![0], slice[slice.length - 1]![0]],
    rows: slice.map((r) => [round(r[1]), round(r[2]), round(r[3]), round(r[4])]),
    swing: p.s.swing - start, pull: p.s.pull - start, prev: p.s.prevSwing - start, brk: p.s.brk - start, won: p.s.won, bars: p.s.barsToExit,
  });
}

await mkdir(new URL("../src/data/real/", import.meta.url), { recursive: true });
await writeFile(new URL("../src/data/real/examples.json", import.meta.url), JSON.stringify(examples));
await writeFile(new URL("../src/data/real/practiceBank.json", import.meta.url), JSON.stringify(bank));
console.log(`\n${Object.keys(examples).length} lesson examples, ${bank.length} practice setups (from ${setups.length} real BOS setups).`);

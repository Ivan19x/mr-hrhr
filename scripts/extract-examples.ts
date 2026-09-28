// Finds a REAL chart section for every Academy concept (hammer, engulfing,
// head & shoulders, liquidity sweep, …), cuts out just that section, and writes
// the small result into the game:
//   src/data/real/examples.json     lesson examples (by id)
//   src/data/real/practiceBank.json real BOS setups for Practice mode
//   src/data/real/macro.json        cross-market data (seasonality, correlations, COT, funding)
// Run after scripts/fetch-charts.mjs:  node scripts/extract-examples.ts
// Examples already in examples.json are kept (so lessons stay stable); pass --all
// to re-pick every example. The raw downloads (scripts/.cache) can be deleted afterwards.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { findSetups, cleanliness, type Dataset, type Setup } from "../src/engine/setups.ts";

import { CTX, ctx, D, isMacro, loadContexts, type Cand, type Detector, type DS } from "./detect.ts";
import "./detect-advanced.ts";

const CACHE = new URL("./.cache/charts/", import.meta.url);
const index: { id: string }[] = JSON.parse(await readFile(new URL("index.json", CACHE), "utf8"));
const all: DS[] = [];
const macro = new Map<string, DS>();
for (const { id } of index) {
  const ds: DS = JSON.parse(await readFile(new URL(`${id}.json`, CACHE), "utf8"));
  if (isMacro(id)) macro.set(id, ds);
  else all.push(ds);
}
// The 15-minute index data is used only by the New York session examples.
for (const id of ["spx-15m", "ndx-15m"]) if (macro.has(id)) all.push(macro.get(id)!);

loadContexts(all);
const REDO = process.argv.includes("--all");
const OUT_DIR = new URL("../src/data/real/", import.meta.url);

// ------------------------------------------------------------------ selection
type Example = { label: string; tf: string; t0: number; t1: number; pre: number; rows: number[][]; pts: Record<string, number>; lv: Record<string, number>; alt?: { label: string; rows: number[][] } };
/** Columns kept per candle: 4 = OHLC, 5 = + volume, 6 = + taker-buy volume (for delta). */
type Cols = 4 | 5 | 6;
const previous: Record<string, Example> = REDO ? {} : JSON.parse(await readFile(new URL("examples.json", OUT_DIR), "utf8").catch(() => "{}"));

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

const volOk = (c: Cand, cols: Cols) =>
  cols === 4 ||
  (cols === 5
    ? c.ds.source === "binance" || (c.ds.tf === "1D" && c.ds.candles.slice(c.start, c.end + 1).every((r) => r[5] > 0))
    : c.ds.source === "binance" && c.ds.candles[0]!.length > 6);
function choose(id: string, detector: Detector, filter: (c: Cand) => boolean = () => true, cols: Cols = 4): Example | null {
  let cands: Cand[] = [];
  try {
    cands = CTX.flatMap((x) => detector(x)).filter((c) => filter(c) && readable(c) && volOk(c, cols)).sort((a, b) => b.score - a.score);
  } catch (e) {
    console.log(`✗ ${id.padEnd(18)} detector error: ${(e as Error).message}`);
    return null;
  }
  for (const maxUse of [1, 2, 4, 99]) {
    const pick = cands.find(
      (c) =>
        (used.get(c.ds.id) ?? 0) < maxUse &&
        !taken.some((t) => t.ds === c.ds.id && c.start <= t.b && c.end >= t.a),
    );
    if (!pick) continue;
    used.set(pick.ds.id, (used.get(pick.ds.id) ?? 0) + 1);
    taken.push({ ds: pick.ds.id, a: pick.start, b: pick.end });
    const pre = pick.pre ?? 0;
    const from = Math.max(0, pick.start - pre);
    const rows = pick.ds.candles.slice(from, pick.end + 1).map((r) => {
      const base = [round(r[1]), round(r[2]), round(r[3]), round(r[4])];
      if (cols === 4) return base;
      const v = Math.round(r[5]);
      return cols === 5 ? [...base, v] : [...base, v, Math.round((r as unknown as number[])[6] ?? v / 2)];
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
const want: [string, Detector, ((c: Cand) => boolean)?, (boolean | Cols)?][] = [
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
// Advanced syllabus (Stages 3–18).
const is = (...tfs: string[]) => (c: Cand) => tfs.includes(c.ds.tf);
const notFx15 = (c: Cand) => c.ds.tf !== "15m";
want.push(
  ["belt-hold-bull", D["belt-hold-bull"]!],
  ["kicker-bull", D["kicker-bull"]!],
  ["outside-bar", D["outside-bar"]!],
  ["three-inside-up", D["three-inside-up"]!],
  ["rising-three", D["rising-three"]!],
  ["abandoned-baby-bull", D["abandoned-baby-bull"]!],
  ["hikkake-bull", D["hikkake-bull"]!],
  ["gap-breakaway", D["gap-breakaway"]!],
  ["island-reversal", D["island-reversal"]!],
  ["renko-src", D["trend-up"]!, is("1D")],
  ["compression-expansion", D["compression-expansion"]!, notFx15],
  ["round-number", D["round-number"]!],
  ["staircase", D["trend-up"]!],
  ["mss", D["mss"]!],
  ["internal-external", D["internal-external"]!],
  ["strong-weak", D["trend-down"]!],
  ["inducement", D["inducement"]!],
  ["sfp-bear", D["sfp-bear"]!],
  ["sfp-bull", D["sfp-bull"]!],
  ["triple-top", D["triple-top"]!],
  ["triple-bottom", D["triple-bottom"]!],
  ["rectangle", D["rectangle"]!],
  ["rounding-bottom", D["rounding-bottom"]!],
  ["broadening", D["broadening"]!],
  ["three-drives", D["three-drives"]!],
  ["abcd", D["abcd"]!],
  ["harmonic-gartley", D["harmonic-gartley"]!],
  ["harmonic-bat", D["harmonic-bat"]!],
  ["harmonic-butterfly", D["harmonic-butterfly"]!],
  ["harmonic-crab", D["harmonic-crab"]!],
  ["elliott-impulse", D["elliott-impulse"]!],
  ["ma200", D["ma200"]!],
  ["stoch-range", D["stoch-range"]!],
  ["adx-trend", D["adx-trend"]!],
  ["ichimoku", D["ichimoku"]!],
  ["supertrend-flip", D["supertrend-flip"]!],
  ["obv-accumulation", D["obv-accumulation"]!, undefined, 5],
  ["donchian-breakout", D["donchian-breakout"]!],
  ["pivots-day", D["pivots-day"]!],
  ["anchored-vwap", D["anchored-vwap"]!, undefined, 5],
  ["ssl-sweep", D["ssl-sweep"]!],
  ["trendline-run", D["trendline-run"]!],
  ["irl-erl", D["irl-erl"]!],
  ["turtle-soup", D["turtle-soup"]!],
  ["judas", D["judas"]!],
  ["pdh-sweep", D["pdh-sweep"]!],
  ["pwh-sweep", D["pwh-sweep"]!],
  ["fvg-ce", D["fvg-ce"]!],
  ["first-fvg", D["first-fvg"]!],
  ["ifvg", D["ifvg"]!],
  ["bpr", D["bpr"]!],
  ["stacked-fvg", D["stacked-fvg"]!],
  ["volume-imbalance", D["volume-imbalance"]!],
  ["liquidity-void", D["liquidity-void"]!],
  ["nwog", D["nwog"]!],
  ["breaker", D["breaker"]!],
  ["mitigation-block", D["mitigation-block"]!],
  ["unicorn", D["unicorn"]!],
  ["rejection-block", D["rejection-block"]!],
  ["propulsion", D["propulsion"]!],
  ["ob-unmitigated", D["ob-fvg-bull"]!],
  ["ote", D["ote"]!],
  ["fib-extension", D["fib-extension"]!],
  ["killzones", D["killzones"]!],
  ["silver-bullet", D["silver-bullet"]!],
  ["orb", D["orb"]!],
  ["cbdr", D["cbdr"]!],
  ["weekly-profile", D["weekly-profile"]!],
  ["lunch", D["lunch"]!],
  ["nfp", D["nfp"]!],
  ["midnight-open", D["judas"]!],
  ["order-flow", D["trend-up"]!],
  ["ipda", D["ipda"]!],
  ["mmbm", D["mmbm"]!],
  ["reaccumulation", D["reaccumulation"]!],
  ["wyckoff-acc", D["wyckoff-acc"]!, undefined, 5],
  ["wyckoff-dist", D["wyckoff-dist"]!, undefined, 5],
  ["vp-range", D["range"]!, is("1h", "4h"), 5],
  ["delta-divergence", D["delta-divergence"]!, undefined, 6],
  ["absorption", D["absorption"]!, undefined, 6],
  ["liquidation-cascade", D["liquidation-cascade"]!, undefined, 5],
  ["model-2022", D["model-2022"]!],
  ["crt", D["crt"]!],
  ["sniper", D["ob-fvg-bull"]!, is("1h")],
);

// Previously chosen sections are kept, and reserved first so new picks don't reuse them.
for (const ex of Object.values(previous)) {
  const ds = [...all, ...macro.values()].find((d) => d.label === ex.label && d.tf === ex.tf);
  if (!ds) continue;
  const a = ds.candles.findIndex((r) => r[0] === ex.t0);
  const b = ds.candles.findIndex((r) => r[0] === ex.t1);
  if (a >= 0 && b >= 0) taken.push({ ds: ds.id, a, b });
  used.set(ds.id, (used.get(ds.id) ?? 0) + 1);
}
for (const [id, det, filter, vol] of want) {
  if (previous[id]) {
    examples[id] = previous[id]!;
    continue;
  }
  const ex = choose(id, det, filter, vol === true ? 5 : vol || 4);
  if (ex) examples[id] = ex;
}

// SMT divergence: EUR/USD makes a lower low while GBP/USD makes a higher low (same hours).
if (previous["smt"]) examples["smt"] = previous["smt"];
else {
  const eu = all.find((d) => d.id === "eurusd-1h");
  const gu = all.find((d) => d.id === "gbpusd-1h");
  let best: { score: number; ex: Example } | null = null;
  if (eu && gu) {
    const gAt = new Map(gu.candles.map((r, i) => [r[0], i]));
    const x = ctx(eu, 4);
    for (let j = 0; j + 1 < x.swL.length; j++) {
      const A = x.swL[j]!, B = x.swL[j + 1]!;
      if (B - A < 6 || B - A > 40 || x.l[B]! >= x.l[A]! || B + 15 >= x.n || A < 20) continue;
      const ga = gAt.get(x.t[A]!), gb = gAt.get(x.t[B]!);
      if (ga === undefined || gb === undefined || gb < 15) continue;
      const gLow = (i: number) => Math.min(...gu.candles.slice(i - 1, i + 2).map((r) => r[3]));
      const atrG = Math.max(...gu.candles.slice(gb - 14, gb).map((r) => r[2] - r[3]));
      if (!(gLow(gb) > gLow(ga) + 0.2 * atrG)) continue;
      const rally = (x.hiOf(B + 1, B + 15) - x.l[B]!) / x.atr[B]!;
      if (rally < 3) continue;
      const start = A - 20, end = B + 15;
      const altRows: number[][] = [];
      let aligned = true;
      for (let k = start; k <= end; k++) {
        const gi = gAt.get(x.t[k]!);
        if (gi === undefined) {
          aligned = false;
          break;
        }
        const r = gu.candles[gi]!;
        altRows.push([round(r[1]), round(r[2]), round(r[3]), round(r[4])]);
      }
      if (!aligned) continue;
      const score = rally + (gLow(gb) - gLow(ga)) / atrG;
      if (!best || score > best.score)
        best = {
          score,
          ex: {
            label: eu.label, tf: eu.tf, t0: x.t[start]!, t1: x.t[end]!, pre: 0,
            rows: eu.candles.slice(start, end + 1).map((r) => [round(r[1]), round(r[2]), round(r[3]), round(r[4])]),
            pts: { A: A - start, B: B - start }, lv: {}, alt: { label: gu.label, rows: altRows },
          },
        };
    }
  }
  if (best) {
    examples["smt"] = best.ex;
    console.log(`✓ smt                EUR/USD vs GBP/USD 1h (score ${best.score.toFixed(2)})`);
  } else console.log("✗ smt                no real example found");
}
// One harmonic example for the lesson: the first pattern type found, in the syllabus order.
if (!examples["harmonic"]) {
  const kinds = ["harmonic-gartley", "harmonic-bat", "harmonic-butterfly", "harmonic-crab"];
  const h = kinds.find((k) => examples[k]);
  if (h) examples["harmonic"] = { ...examples[h]!, lv: { ...examples[h]!.lv, kind: kinds.indexOf(h) } };
}
for (const k of ["harmonic-gartley", "harmonic-bat", "harmonic-butterfly", "harmonic-crab"]) delete examples[k];


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

await mkdir(OUT_DIR, { recursive: true });
await writeFile(new URL("examples.json", OUT_DIR), JSON.stringify(examples));
if (REDO) await writeFile(new URL("practiceBank.json", OUT_DIR), JSON.stringify(bank));
await writeFile(new URL("macro.json", OUT_DIR), JSON.stringify(await buildMacro()));
console.log(`\n${Object.keys(examples).length} lesson examples, ${bank.length} practice setups (from ${setups.length} real BOS setups).`);

// ------------------------------------------------------------------ cross-market data
async function buildMacro() {
  const byId = (id: string) => all.find((d) => d.id === id) ?? macro.get(id);
  const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
  const closes = (id: string) => new Map((byId(id)?.candles ?? []).map((r) => [day(r[0]), r[4]]));
  const r4 = (v: number) => Number(v.toPrecision(5));

  // Seasonality: average S&P 500 return per calendar month (10 years of daily data).
  const spx = byId("spx-1d")!.candles;
  const monthly = new Map<string, { o: number; c: number }>();
  for (const r of spx) {
    const k = day(r[0]).slice(0, 7);
    const m = monthly.get(k);
    if (!m) monthly.set(k, { o: r[1], c: r[4] });
    else m.c = r[4];
  }
  const season = Array.from({ length: 12 }, (_, m) => {
    const rets = [...monthly.entries()].filter(([k]) => Number(k.slice(5)) === m + 1).map(([, v]) => (v.c / v.o - 1) * 100);
    return { m: m + 1, avg: r4(rets.reduce((s, x) => s + x, 0) / rets.length), up: rets.filter((x) => x > 0).length, n: rets.length };
  });

  // Aligned daily closes for intermarket charts (last 250 common days).
  const pair = (a: string, b: string, n = 250) => {
    const A = closes(a), B = closes(b);
    const days = [...A.keys()].filter((d) => B.has(d)).sort().slice(-n);
    return { from: days[0], to: days[days.length - 1], a: days.map((d) => r4(A.get(d)!)), b: days.map((d) => r4(B.get(d)!)) };
  };
  const inter = { eurDxy: pair("eurusd-1d", "dxy-1d"), spxVix: pair("spx-1d", "vix-1d"), jpyTnx: pair("usdjpy-1d", "us10y-1d"), goldDxy: pair("gold-1d", "dxy-1d") };

  // Correlation of daily returns over the last year.
  const names: [string, string][] = [["EUR/USD", "eurusd-1d"], ["GBP/USD", "gbpusd-1d"], ["AUD/USD", "audusd-1d"], ["USD/JPY", "usdjpy-1d"], ["Gold", "gold-1d"], ["DXY", "dxy-1d"], ["S&P 500", "spx-1d"], ["NASDAQ 100", "ndx-1d"], ["BTC", "btcusdt-1d"], ["ETH", "ethusdt-1d"]];
  const series = names.map(([, id]) => closes(id));
  const common = [...series[0]!.keys()].filter((d) => series.every((s) => s.has(d))).sort().slice(-251);
  const rets = series.map((s) => common.slice(1).map((d, k) => Math.log(s.get(d)! / s.get(common[k]!)!)));
  const corr = (a: number[], b: number[]) => {
    const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length;
    let sab = 0, saa = 0, sbb = 0;
    a.forEach((x, k) => {
      sab += (x - ma) * (b[k]! - mb);
      saa += (x - ma) ** 2;
      sbb += (b[k]! - mb) ** 2;
    });
    return Math.round((sab / Math.sqrt(saa * sbb)) * 100) / 100;
  };
  const correlation = { names: names.map(([n]) => n), from: common[0], to: common[common.length - 1], m: rets.map((a) => rets.map((b) => corr(a, b))) };

  // COT (euro futures, weekly) with the EUR/USD close of that week, plus BTC funding.
  const extras = JSON.parse(await readFile(new URL("extras.json", CACHE), "utf8").catch(() => "null"));
  const eur = byId("eurusd-1d")!.candles;
  const eurAt = (d: string) => {
    let v = 0;
    for (const r of eur) if (day(r[0]) <= d) v = r[4];
    return v;
  };
  const cot = (extras?.cot ?? []).map((r: [string, number, number, number, number]) => [r[0], r[1] - r[2], r[3] - r[4], r4(eurAt(r[0]))]);
  const btc = closes("btcusdt-1d");
  const fundByDay = new Map<string, number[]>();
  for (const [t, rate] of (extras?.funding ?? []) as [number, number][]) {
    const d = day(t);
    if (!fundByDay.has(d)) fundByDay.set(d, []);
    fundByDay.get(d)!.push(rate);
  }
  const funding = [...fundByDay.entries()]
    .filter(([d]) => btc.has(d))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-365)
    .map(([d, v]) => [d, r4((v.reduce((s, x) => s + x, 0) / v.length) * 100), r4(btc.get(d)!)]);
  console.log(`macro: seasonality ${season.length} months, ${cot.length} COT weeks, ${funding.length} funding days, correlation over ${common.length} days`);
  return { season, seasonFrom: day(spx[0]![0]), seasonTo: day(spx[spx.length - 1]![0]), inter, correlation, cot, funding, depth: extras?.depth ?? null };
}

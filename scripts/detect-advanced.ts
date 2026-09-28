// Detectors for the advanced syllabus (Stages 3–18): candle and gap patterns,
// structure, harmonics and Elliott, indicators, liquidity, imbalances, the order
// block family, ICT time windows, Wyckoff, order flow and entry models.
// Each one scans REAL downloaded history and returns candidate chart sections;
// scripts/extract-examples.ts keeps only the best section for each lesson.
import { alternating, ctx, D, emaSeries, highestOf, inRange, lowestOf, pct, PRE, smaSeries, type Cand, type Ctx, type Detector } from "./detect.ts";

// ------------------------------------------------------------------ helpers
const range = (n: number, from = 0) => Array.from({ length: n }, (_, k) => from + k);
/** Swings far enough apart to read as separate legs on a chart. */
const spaced = (sw: { i: number }[], min = 3) => sw.every((q, k) => k === 0 || q.i - sw[k - 1]!.i >= min);
const findAhead = (x: Ctx, from: number, n: number, test: (k: number) => boolean) => range(n, from).find((k) => k < x.n && test(k));
const isYahoo = (x: Ctx) => x.ds.source === "yahoo";
const isStockDaily = (x: Ctx) => isYahoo(x) && x.ds.tf === "1D" && !/eurusd|gbpusd|usdjpy|audusd|gold/.test(x.ds.id);
const hasVolume = (x: Ctx) => x.ds.source === "binance";
const hasDelta = (x: Ctx) => x.ds.source === "binance" && x.ds.candles[0]!.length > 6;
const takerBuy = (x: Ctx, i: number) => (x.ds.candles[i] as unknown as number[])[6] ?? x.v[i]! / 2;
const avgVol = (x: Ctx, i: number, k = 20) => {
  let s = 0;
  for (let j = Math.max(0, i - k); j < i; j++) s += x.v[j]!;
  return s / Math.max(1, Math.min(k, i)) || 1e-9;
};

/** New York wall-clock time for every candle (sessions, killzones, opens). */
export type NY = { d: string; wd: number; hm: number };
const NYF = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const nyCache = new Map<Ctx, NY[]>();
export function ny(x: Ctx): NY[] {
  let out = nyCache.get(x);
  if (out) return out;
  out = x.t.map((t) => {
    const p = Object.fromEntries(NYF.formatToParts(new Date(t * 1000)).map((q) => [q.type, q.value]));
    return { d: `${p["year"]}-${p["month"]}-${p["day"]}`, wd: WD[p["weekday"]!] ?? 0, hm: Number(p["hour"]) * 60 + Number(p["minute"]) };
  });
  nyCache.set(x, out);
  return out;
}
const HM = (h: number, m = 0) => h * 60 + m;
/** First candle index at/after NY time hm on the same NY date as candle i (or -1). */
function atTime(x: Ctx, i: number, hm: number, maxAhead = 120): number {
  const T = ny(x);
  for (let k = i; k < Math.min(x.n, i + maxAhead); k++) {
    if (T[k]!.d !== T[i]!.d) return -1;
    if (T[k]!.hm >= hm) return k;
  }
  return -1;
}
/** Indices where a new NY trading day starts at `hm` (e.g. midnight or 18:00). */
function dayStarts(x: Ctx, hm = 0): number[] {
  const T = ny(x);
  const out: number[] = [];
  for (let i = 1; i < x.n; i++) if (T[i]!.hm >= hm && (T[i - 1]!.hm < hm || T[i - 1]!.d !== T[i]!.d) && (T[i]!.hm - hm) < 60) out.push(i);
  return out;
}
const fx15 = (x: Ctx) => x.ds.tf === "15m" && isYahoo(x) && /eurusd|gbpusd/.test(x.ds.id);
const fx1h = (x: Ctx) => x.ds.tf === "1h" && isYahoo(x) && /eurusd|gbpusd|gold|audusd|usdjpy/.test(x.ds.id);
const stock15 = (x: Ctx) => x.ds.tf === "15m" && isYahoo(x) && /spx|ndx/.test(x.ds.id);

function wider(x: Ctx, w: number): Ctx {
  const key = `__w${w}`;
  const anyX = x as unknown as Record<string, Ctx>;
  return (anyX[key] ??= ctx(x.ds, w));
}
/** Bullish FVG made by candles j, j+1, j+2 (gap between j's high and j+2's low). */
const bullFvg = (x: Ctx, j: number, min = 0.1) => x.l[j + 2]! > x.h[j]! + min * x.atr[j + 1]!;
const bearFvg = (x: Ctx, j: number, min = 0.1) => x.h[j + 2]! < x.l[j]! - min * x.atr[j + 1]!;

// ================================================================== candles
function combo(test: (x: Ctx, i: number) => { pts?: Record<string, number>; score: number } | null, before = 14, after = 6, only?: (x: Ctx) => boolean): Detector {
  return (x) => {
    const out: Cand[] = [];
    if (only && !only(x)) return out;
    for (let i = 20; i < x.n - after - 1; i++) {
      if (!inRange(x, i, before, after)) continue;
      const r = test(x, i);
      if (!r) continue;
      const start = i - before;
      const pts: Record<string, number> = { k: before };
      for (const [k, v] of Object.entries(r.pts ?? {})) pts[k] = v - start;
      out.push({ ds: x.ds, start, end: i + after, pts, score: r.score });
    }
    return out;
  };
}
D["belt-hold-bull"] = combo((x, i) => {
  const r = x.range(i);
  if (!x.bull(i) || x.lo(i) > 0.04 * r || pct(x, i) < 0.72 || r < 1.6 * x.atr[i]!) return null;
  if (x.trend(i, 8) > -3 || !lowestOf(x, i, 10) || x.c[i + 5]! < x.h[i]!) return null;
  return { score: r / x.atr[i]! + Math.abs(x.trend(i, 8)) / 3 + (x.o[i]! < x.c[i - 1]! ? 1 : 0) };
});
D["kicker-bull"] = combo(
  (x, i) => {
    const p = i - 1;
    if (x.bull(p) || x.body(p) < 0.7 * x.atr[i]! || !x.bull(i) || pct(x, i) < 0.6) return null;
    if (x.o[i]! < x.o[p]!) return null; // opens at/above the previous open: the "kick"
    if (x.body(i) < 1.2 * x.atr[i]! || x.c[i + 4]! < x.c[i]!) return null;
    return { pts: { prev: p }, score: (x.o[i]! - x.o[p]!) / x.atr[i]! * 2 + x.body(i) / x.atr[i]! };
  },
  14, 6, isYahoo,
);
D["outside-bar"] = combo((x, i) => {
  const p = i - 1;
  if (!(x.h[i]! > x.h[p]! && x.l[i]! < x.l[p]!) || x.range(i) < 1.5 * x.range(p) || x.range(i) < 1.5 * x.atr[i]!) return null;
  if (!x.bull(i) || x.c[i]! < x.l[i]! + 0.75 * x.range(i) || !lowestOf(x, i, 12) || x.c[i + 5]! < x.h[i]!) return null;
  return { pts: { prev: p }, score: x.range(i) / x.range(p) + (x.c[i + 5]! - x.c[i]!) / x.atr[i]! / 2 };
});
D["three-inside-up"] = combo((x, i) => {
  const a = i - 2;
  const b = i - 1;
  if (x.bull(a) || x.body(a) < 1.3 * x.atr[i]! || !x.bull(b)) return null;
  if (Math.max(x.o[b]!, x.c[b]!) > x.o[a]! || Math.min(x.o[b]!, x.c[b]!) < x.c[a]! || x.body(b) > 0.6 * x.body(a)) return null;
  if (!x.bull(i) || x.c[i]! <= x.o[a]! || x.trend(a, 8) > -2.5 || x.c[i + 5]! < x.c[i]!) return null;
  return { pts: { a, b }, score: x.body(a) / x.atr[i]! + (x.c[i]! - x.o[a]!) / x.atr[i]! };
}, 14, 6);
D["rising-three"] = combo((x, i) => {
  const a = i - 4;
  if (!x.bull(a) || x.body(a) < 1.5 * x.atr[i]!) return null;
  for (const k of [a + 1, a + 2, a + 3]) {
    if (x.body(k) > 0.5 * x.body(a) || x.h[k]! > x.h[a]! + 0.1 * x.atr[i]! || x.l[k]! < x.l[a]!) return null;
  }
  const bears = [a + 1, a + 2, a + 3].filter((k) => !x.bull(k)).length;
  if (bears < 2 || !x.bull(i) || x.c[i]! <= x.h[a]! || x.body(i) < 1.1 * x.atr[i]!) return null;
  return { pts: { a }, score: bears + x.body(a) / x.atr[i]! + (x.c[i + 5]! - x.c[i]!) / x.atr[i]! / 3 };
}, 14, 6);
D["abandoned-baby-bull"] = combo((x, i) => {
  const a = i - 2;
  const b = i - 1;
  if (x.bull(a) || x.body(a) < 0.8 * x.atr[i]! || pct(x, b) > 0.25 || !x.bull(i) || x.body(i) < 0.8 * x.atr[i]!) return null;
  const bTop = Math.max(x.o[b]!, x.c[b]!);
  const bodyGaps = bTop < x.c[a]! && bTop < x.o[i]!;
  const trueGaps = x.h[b]! < x.l[a]! && x.h[b]! < x.l[i]!;
  if (!bodyGaps || !lowestOf(x, b, 8) || x.c[i + 4]! < x.c[i]!) return null;
  return { pts: { a, b }, score: (trueGaps ? 4 : 0) + (x.c[a]! - bTop) / x.atr[i]! * 3 + (x.o[i]! - bTop) / x.atr[i]! * 3 };
}, 14, 6);
D["hikkake-bull"] = combo((x, i) => {
  const m = i - 2;
  const ib = i - 1;
  if (!(x.h[ib]! < x.h[m]! && x.l[ib]! > x.l[m]!)) return null;
  if (!(x.l[i]! < x.l[ib]! && x.h[i]! <= x.h[ib]!)) return null; // false break down
  const conf = findAhead(x, i + 1, 3, (k) => x.c[k]! > x.h[ib]!);
  if (conf === undefined || conf + 6 >= x.n) return null;
  const run = (x.hiOf(conf, conf + 6) - x.h[ib]!) / x.atr[i]!;
  if (run < 2) return null;
  return { pts: { m, ib, conf }, score: run + (x.h[m]! - x.l[m]!) / x.atr[i]! / 2 };
}, 14, 9);

// ================================================================== gaps
D["gap-breakaway"] = (x) => {
  const out: Cand[] = [];
  if (!isStockDaily(x)) return out;
  for (let i = 30; i < x.n - 25; i++) {
    const atr = x.atr[i]!;
    const top = x.hiOf(i - 20, i - 1);
    const bot = x.loOf(i - 20, i - 1);
    if ((top - bot) / atr > 7) continue;
    if (!(x.l[i]! > x.h[i - 1]! + 0.3 * atr && x.l[i]! > top)) continue;
    if (x.loOf(i, i + 10) < x.h[i - 1]!) continue; // gap stays open
    // Look for a later runaway gap and an exhaustion gap.
    const run = findAhead(x, i + 3, 15, (k) => x.l[k]! > x.h[k - 1]! + 0.2 * atr);
    const start = i - 24;
    const pts: Record<string, number> = { gap: i - start };
    if (run !== undefined) pts["run"] = run - start;
    out.push({ ds: x.ds, start, end: i + 22, pts, lv: { top, bot }, score: (x.l[i]! - x.h[i - 1]!) / atr + (run !== undefined ? 2 : 0) + (x.hiOf(i, i + 22) - x.c[i]!) / atr / 4 });
    i += 10;
  }
  return out;
};
D["island-reversal"] = (x) => {
  const out: Cand[] = [];
  if (!isYahoo(x) || x.ds.tf !== "1D") return out;
  for (let a = 25; a < x.n - 20; a++) {
    const atr = x.atr[a]!;
    if (!(x.l[a]! > x.h[a - 1]! + 0.1 * atr)) continue; // gap up into the island
    for (let b = a; b < a + 12 && b + 1 < x.n; b++) {
      if (x.l[b]! <= x.h[a - 1]!) break;
      if (x.h[b + 1]! < x.l[b]! && x.h[b + 1]! < x.loOf(a, b) - 0.05 * atr && x.h[b + 1]! < x.l[a]!) {
        const drop = (x.loOf(a, b) - x.loOf(b + 1, b + 15)) / atr;
        if (drop < 2 || x.trend(a, 15) < 2) break;
        const start = a - 20;
        out.push({ ds: x.ds, start, end: Math.min(x.n - 1, b + 15), pts: { a: a - start, b: b - start, gd: b + 1 - start }, score: drop + (b - a < 8 ? 2 : 0) });
        break;
      }
    }
  }
  return out;
};

// ================================================================== structure
D["compression-expansion"] = (x) => {
  const out: Cand[] = [];
  for (let i = 40; i < x.n - 15; i++) {
    const atr = x.atr[i - 12]!;
    let avg = 0;
    for (let k = i - 10; k < i; k++) avg += x.range(k) / 10;
    if (avg > 0.55 * atr) continue;
    const hi = x.hiOf(i - 10, i - 1);
    const lo = x.loOf(i - 10, i - 1);
    if (x.range(i) < 3 * avg || !(x.c[i]! > hi || x.c[i]! < lo)) continue;
    const dir = x.c[i]! > hi ? 1 : -1;
    const follow = dir === 1 ? (x.hiOf(i, i + 10) - hi) / atr : (lo - x.loOf(i, i + 10)) / atr;
    if (follow < 2.5) continue;
    const start = i - 26;
    out.push({ ds: x.ds, start, end: i + 12, pts: { c0: 16, c1: 25, ex: 26 }, lv: { hi, lo, dir }, score: follow + atr / avg / 2 });
    i += 15;
  }
  return out;
};
const ROUND: Record<string, number> = { eurusd: 0.01, gbpusd: 0.01, audusd: 0.01, usdjpy: 1, gold: 50, btcusdt: 5000, ethusdt: 500, solusdt: 25, bnbusdt: 50, xrpusdt: 0.25, adausdt: 0.1, dogeusdt: 0.05, spx: 250, ndx: 1000 };
D["round-number"] = (x) => {
  const out: Cand[] = [];
  const step = ROUND[x.ds.id.split("-")[0]!];
  if (!step || x.ds.tf === "15m") return out;
  for (let a = 0; a + 60 < x.n; a += 6) {
    const b = a + 60;
    const mid = (x.hiOf(a, b) + x.loOf(a, b)) / 2;
    const R = Math.round(mid / step) * step;
    const tol = 0.3 * x.atr[b]!;
    const touches = [...x.swH, ...x.swL].filter((i) => i >= a && i <= b && (Math.abs(x.h[i]! - R) < tol || Math.abs(x.l[i]! - R) < tol));
    if (touches.length < 3) continue;
    const crosses = range(60, a).filter((k) => (x.c[k]! - R) * (x.c[k + 1]! - R) < 0).length;
    if (crosses > 6) continue;
    const pts: Record<string, number> = {};
    touches.sort((p, q) => p - q).forEach((i, k) => (pts[`t${k}`] = i - a));
    out.push({ ds: x.ds, start: a, end: b, pts, lv: { R }, score: touches.length - crosses / 2 });
  }
  return out;
};
D["mss"] = (x) => {
  const sw = alternating(x);
  const out: Cand[] = [];
  for (let k = 4; k < sw.length; k++) {
    const [H0, L1, H2, L3] = sw.slice(k - 4, k);
    if (!H0 || H0.kind !== "H" || !L1 || !H2 || !L3) continue;
    const atr = x.atr[L3.i]!;
    if (!(H2.p < H0.p - 0.5 * atr && L3.p < L1.p - 0.5 * atr)) continue; // LH, LL
    const m = findAhead(x, L3.i + 1, 15, (j) => x.c[j]! > H2.p);
    if (m === undefined || m + 10 >= x.n) continue;
    // Displacement: a big body through the level, leaving a fair value gap.
    const f = range(3, m - 2).find((j) => j > L3.i && bullFvg(x, j));
    if (f === undefined || x.body(m) < 1.2 * atr) continue;
    const run = (x.hiOf(m, m + 10) - H2.p) / atr;
    const start = Math.max(0, H0.i - 5);
    if (m - start > 60) continue;
    out.push({ ds: x.ds, start, end: m + 10, pts: { H0: H0.i - start, L1: L1.i - start, H2: H2.i - start, L3: L3.i - start, mss: m - start, f: f - start }, score: run + x.body(m) / atr });
  }
  return out;
};
D["internal-external"] = (x0) => {
  const out: Cand[] = [];
  const X = wider(x0, 7);
  const x = wider(x0, 2);
  for (const A of X.swL) {
    const B = X.swH.find((b) => b > A && b - A >= 10 && b - A <= 40);
    if (B === undefined) continue;
    const C = X.swL.find((c) => c > B && c - B >= 8 && c - B <= 30);
    if (C === undefined || x.l[C]! <= x.l[A]! || x.hiOf(B + 1, C) > x.h[B]!) continue;
    const brk = findAhead(x, C + 1, 25, (k) => x.c[k]! > x.h[B]!);
    if (brk === undefined || brk + 5 >= x.n) continue;
    // Internal lower highs inside the pullback B → C.
    const inner = x.swH.filter((i) => i > B && i < C);
    if (inner.length < 2) continue;
    const start = Math.max(0, A - 5);
    const pts: Record<string, number> = { A: A - start, B: B - start, C: C - start, brk: brk - start };
    inner.slice(0, 3).forEach((i, k) => (pts[`ih${k}`] = i - start));
    x.swL.filter((i) => i > B && i < C).slice(0, 3).forEach((i, k) => (pts[`il${k}`] = i - start));
    out.push({ ds: x.ds, start, end: brk + 5, pts, score: inner.length + (x.h[B]! - x.l[A]!) / x.atr[B]! / 3 });
  }
  return out;
};
D["inducement"] = (x0) => {
  const out: Cand[] = [];
  const X = wider(x0, 5);
  const x = wider(x0, 2);
  for (const A of X.swL) {
    const B = X.swH.find((b) => b > A && b - A <= 35);
    if (B === undefined) continue;
    const atr = x.atr[B]!;
    if (x.h[B]! - x.l[A]! < 6 * atr) continue;
    // Pullback makes a minor low (inducement), a small bounce, then sweeps it.
    const idm = x.swL.find((m) => m > B + 1 && m < B + 12 && x.l[m]! > x.l[A]! + 0.45 * (x.h[B]! - x.l[A]!));
    if (idm === undefined) continue;
    const sweep = findAhead(x, idm + 2, 15, (k) => x.l[k]! < x.l[idm]! - 0.1 * atr);
    if (sweep === undefined || x.hiOf(idm, sweep) > x.h[B]!) continue;
    const C = range(8, sweep).reduce((m, k) => (k < x.n && x.l[k]! < x.l[m]! ? k : m), sweep);
    if (x.l[C]! <= x.l[A]!) continue;
    const brk = findAhead(x, C + 1, 25, (k) => x.c[k]! > x.h[B]!);
    if (brk === undefined || brk + 4 >= x.n || x.loOf(C, brk) < x.l[C]!) continue;
    const start = Math.max(0, A - 5);
    out.push({ ds: x.ds, start, end: brk + 4, pts: { A: A - start, B: B - start, idm: idm - start, sweep: sweep - start, C: C - start, brk: brk - start }, score: (x.l[idm]! - x.l[C]!) / atr + 3 });
  }
  return out;
};
function sfp(dir: 1 | -1): Detector {
  return (x0) => {
    const out: Cand[] = [];
    const x = wider(x0, 4);
    const S = dir === 1 ? x.swH : x.swL;
    for (const s of S) {
      const lvl = dir === 1 ? x.h[s]! : x.l[s]!;
      const atr = x.atr[s]!;
      const f = findAhead(x, s + 5, 35, (k) => (dir === 1 ? x.h[k]! > lvl && x.c[k]! < lvl : x.l[k]! < lvl && x.c[k]! > lvl));
      if (f === undefined || f + 10 >= x.n) continue;
      // No close beyond the level before the failure.
      if (range(f - s - 1, s + 1).some((k) => (dir === 1 ? x.c[k]! > lvl : x.c[k]! < lvl))) continue;
      const wick = dir === 1 ? x.h[f]! - lvl : lvl - x.l[f]!;
      const move = dir === 1 ? (lvl - x.loOf(f + 1, f + 10)) / atr : (x.hiOf(f + 1, f + 10) - lvl) / atr;
      if (move < 3 || wick < 0.2 * atr) continue;
      const start = Math.max(0, s - 12);
      out.push({ ds: x.ds, start, end: f + 10, pts: { s: s - start, f: f - start }, lv: { lvl }, score: move / 2 + Math.min(wick / atr, 2) });
    }
    return out;
  };
}
D["sfp-bear"] = sfp(1);
D["sfp-bull"] = sfp(-1);

// ================================================================== chart patterns II
function tripleTop(dir: 1 | -1): Detector {
  return (x0) => {
    const out: Cand[] = [];
    const x = wider(x0, 4);
    const S = dir === 1 ? x.swH : x.swL;
    const P = dir === 1 ? x.h : x.l;
    for (let j = 0; j + 2 < S.length; j++) {
      const [a, b, c] = [S[j]!, S[j + 1]!, S[j + 2]!];
      const atr = x.atr[c]!;
      if (b - a < 5 || c - b < 5 || c - a > 70) continue;
      const lvl = (P[a]! + P[b]! + P[c]!) / 3;
      if ([a, b, c].some((k) => Math.abs(P[k]! - lvl) > 0.45 * atr)) continue;
      const neck = dir === 1 ? x.loOf(a, c) : x.hiOf(a, c);
      if (Math.abs(lvl - neck) < 2.5 * atr) continue;
      if (dir === 1 ? x.hiOf(a, c) > lvl + 0.6 * atr : x.loOf(a, c) < lvl - 0.6 * atr) continue;
      const br = findAhead(x, c + 1, 20, (k) => (dir === 1 ? x.c[k]! < neck : x.c[k]! > neck));
      if (br === undefined || br + 8 >= x.n) continue;
      const start = Math.max(0, a - 12);
      out.push({ ds: x.ds, start, end: br + 8, pts: { a: a - start, b: b - start, c: c - start, br: br - start }, lv: { lvl, neck }, score: 4 - [a, b, c].reduce((s, k) => s + Math.abs(P[k]! - lvl) / atr, 0) + Math.abs(lvl - neck) / atr / 3 });
    }
    return out;
  };
}
D["triple-top"] = tripleTop(1);
D["triple-bottom"] = tripleTop(-1);
D["rectangle"] = (x) => {
  const out: Cand[] = [];
  for (let a = 25; a + 45 < x.n; a += 4) {
    for (const len of [20, 28, 36]) {
      const b = a + len;
      const atr = x.atr[b]!;
      const top = x.hiOf(a, b);
      const bot = x.loOf(a, b);
      const w = (top - bot) / atr;
      if (w < 2.5 || w > 7) continue;
      if ((x.c[a]! - x.loOf(a - 25, a)) / atr < 6) continue; // uptrend into the box
      const tops = x.swH.filter((i) => i >= a && i <= b && x.h[i]! >= top - 0.4 * atr).length;
      const bots = x.swL.filter((i) => i >= a && i <= b && x.l[i]! <= bot + 0.4 * atr).length;
      if (tops < 2 || bots < 2) continue;
      const br = findAhead(x, b + 1, 8, (k) => x.c[k]! > top);
      if (br === undefined || br + 10 >= x.n) continue;
      const run = (x.hiOf(br, br + 10) - top) / atr;
      if (run < 2.5) continue;
      const start = a - 20;
      out.push({ ds: x.ds, start, end: br + 10, pts: { a: 20, b: b - start, br: br - start }, lv: { top, bot }, score: tops + bots + run / 2 });
      a += len;
      break;
    }
  }
  return out;
};
D["rounding-bottom"] = (x) => {
  const out: Cand[] = [];
  for (let a = 0; a + 60 < x.n - 12; a += 3) {
    for (const len of [40, 55]) {
      const b = a + len;
      const ys = range(len + 1, a).map((k) => x.c[k]!);
      // Least-squares parabola y = p t² + q t + r on t in [-1, 1].
      const ts = ys.map((_, k) => (k / len) * 2 - 1);
      const S = (f: (t: number, y: number) => number) => ts.reduce((s, t, k) => s + f(t, ys[k]!), 0);
      const n = ts.length;
      const s1 = S((t) => t), s2 = S((t) => t * t), s3 = S((t) => t ** 3), s4 = S((t) => t ** 4);
      const sy = S((_, y) => y), sty = S((t, y) => t * y), st2y = S((t, y) => t * t * y);
      const det = (m: number[][]) => m[0]![0]! * (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!) - m[0]![1]! * (m[1]![0]! * m[2]![2]! - m[1]![2]! * m[2]![0]!) + m[0]![2]! * (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!);
      const M = [[s4, s3, s2], [s3, s2, s1], [s2, s1, n]];
      const d = det(M);
      if (Math.abs(d) < 1e-12) continue;
      const p = det([[st2y, s3, s2], [sty, s2, s1], [sy, s1, n]]) / d;
      const q = det([[s4, st2y, s2], [s3, sty, s1], [s2, sy, n]]) / d;
      const r = det([[s4, s3, st2y], [s3, s2, sty], [s2, s1, sy]]) / d;
      if (p <= 0) continue;
      const vx = -q / (2 * p);
      if (Math.abs(vx) > 0.25) continue;
      const mean = sy / n;
      const ssTot = ys.reduce((s, y) => s + (y - mean) ** 2, 0);
      const ssRes = ys.reduce((s, y, k) => s + (y - (p * ts[k]! ** 2 + q * ts[k]! + r)) ** 2, 0);
      const r2 = 1 - ssRes / ssTot;
      const atr = x.atr[b]!;
      const depth = p / atr;
      if (r2 < 0.82 || depth < 5) continue;
      const rim = Math.max(x.c[a]!, x.c[b]!);
      const br = findAhead(x, b, 12, (k) => x.c[k]! > rim);
      if (br === undefined) continue;
      out.push({ ds: x.ds, start: a, end: Math.min(x.n - 1, br + 8), pts: { a: 0, b: len, br: br - a }, lv: { rim }, score: r2 * 10 + depth / 4 });
      a += len;
      break;
    }
  }
  return out;
};
D["broadening"] = (x0) => {
  const out: Cand[] = [];
  const x = wider(x0, 3);
  const sw = alternating(x);
  for (let k = 0; k + 5 <= sw.length; k++) {
    const s = sw.slice(k, k + 5);
    if (s[0]!.kind !== "H") continue;
    const [H1, L1, H2, L2, H3] = s as [typeof s[0], typeof s[0], typeof s[0], typeof s[0], typeof s[0]];
    const atr = x.atr[H3.i]!;
    if (!(H2.p > H1.p + 0.4 * atr && H3.p > H2.p + 0.4 * atr && L2.p < L1.p - 0.4 * atr)) continue;
    if (H3.i - H1.i > 70 || H3.i - H1.i < 15) continue;
    const drop = findAhead(x, H3.i + 1, 20, (j) => x.c[j]! < L2.p);
    if (drop === undefined || drop + 5 >= x.n) continue;
    const start = Math.max(0, H1.i - 10);
    out.push({ ds: x.ds, start, end: drop + 5, pts: { H1: H1.i - start, L1: L1.i - start, H2: H2.i - start, L2: L2.i - start, H3: H3.i - start, br: drop - start }, score: (H3.p - H1.p + L1.p - L2.p) / atr });
  }
  return out;
};
D["three-drives"] = (x0) => {
  const out: Cand[] = [];
  const x = wider(x0, 3);
  const sw = alternating(x);
  for (let k = 0; k + 6 <= sw.length; k++) {
    const s = sw.slice(k, k + 6);
    if (s[0]!.kind !== "L") continue;
    if (!spaced(s)) continue;
    const [L0, D1, L1, D2, L2, D3] = s as [typeof s[0], typeof s[0], typeof s[0], typeof s[0], typeof s[0], typeof s[0]];
    const atr = x.atr[D3.i]!;
    if (!(D2.p > D1.p + 0.5 * atr && D3.p > D2.p + 0.5 * atr && L1.p > L0.p && L2.p > L1.p)) continue;
    const d1 = D1.p - L0.p, d2 = D2.p - L1.p, d3 = D3.p - L2.p;
    if (d1 < 3 * atr || [d2 / d1, d3 / d2].some((r) => r < 0.6 || r > 1.6)) continue;
    const rev = (D3.p - x.loOf(D3.i + 1, Math.min(x.n - 1, D3.i + 15))) / d3;
    if (rev < 0.8 || D3.i + 15 >= x.n || D3.i - L0.i > 80) continue;
    const start = Math.max(0, L0.i - 5);
    out.push({ ds: x.ds, start, end: D3.i + 15, pts: { L0: L0.i - start, D1: D1.i - start, L1: L1.i - start, D2: D2.i - start, L2: L2.i - start, D3: D3.i - start }, score: rev * 3 - Math.abs(d3 / d2 - 1) - Math.abs(d2 / d1 - 1) });
  }
  return out;
};
type Harm = { name: string; b: [number, number]; c: [number, number]; d: [number, number] };
const HARMONICS: Harm[] = [
  { name: "gartley", b: [0.56, 0.68], c: [0.382, 0.886], d: [0.74, 0.83] },
  { name: "bat", b: [0.35, 0.52], c: [0.382, 0.886], d: [0.84, 0.92] },
  { name: "butterfly", b: [0.74, 0.83], c: [0.382, 0.886], d: [1.2, 1.35] },
  { name: "crab", b: [0.35, 0.65], c: [0.382, 0.886], d: [1.5, 1.7] },
];
function harmonic(h: Harm): Detector {
  return (x0) => {
    const out: Cand[] = [];
    const x = wider(x0, 3);
    const sw = alternating(x);
    for (let k = 0; k + 5 <= sw.length; k++) {
      const s = sw.slice(k, k + 5);
      if (!spaced(s)) continue;
      const bull = s[0]!.kind === "L"; // bullish: X low, A high, B low, C high, D low
      const [X, A, B, C, Dp] = s as [typeof s[0], typeof s[0], typeof s[0], typeof s[0], typeof s[0]];
      const xa = Math.abs(A.p - X.p);
      const atr = x.atr[Dp.i]!;
      if (xa < 5 * atr || Dp.i - X.i > 90) continue;
      const rb = Math.abs(A.p - B.p) / xa;
      const rc = Math.abs(C.p - B.p) / Math.abs(A.p - B.p);
      const rd = Math.abs(A.p - Dp.p) / xa;
      if (rb < h.b[0] || rb > h.b[1] || rc < h.c[0] || rc > h.c[1] || rd < h.d[0] || rd > h.d[1]) continue;
      const after = Math.min(x.n - 1, Dp.i + 15);
      const rev = bull ? (x.hiOf(Dp.i + 1, after) - Dp.p) / Math.abs(C.p - Dp.p) : (Dp.p - x.loOf(Dp.i + 1, after)) / Math.abs(C.p - Dp.p);
      if (rev < 0.5 || Dp.i + 15 >= x.n) continue;
      const mid = (lo: number, hi: number) => (lo + hi) / 2;
      const start = Math.max(0, X.i - 6);
      out.push({ ds: x.ds, start, end: after, pts: { X: X.i - start, A: A.i - start, B: B.i - start, C: C.i - start, D: Dp.i - start }, lv: { rb, rc, rd, bull: bull ? 1 : -1 }, score: rev * 2 - Math.abs(rb - mid(...h.b)) * 10 - Math.abs(rd - mid(...h.d)) * 10 });
    }
    return out;
  };
}
for (const h of HARMONICS) D[`harmonic-${h.name}`] = harmonic(h);
D["abcd"] = (x0) => {
  const out: Cand[] = [];
  const x = wider(x0, 3);
  const sw = alternating(x);
  for (let k = 0; k + 4 <= sw.length; k++) {
    const [A, B, C, Dp] = sw.slice(k, k + 4) as [ReturnType<typeof alternating>[0], ReturnType<typeof alternating>[0], ReturnType<typeof alternating>[0], ReturnType<typeof alternating>[0]];
    if (A.kind !== "H") continue; // bullish ABCD: A high → B low → C high → D low
    const ab = A.p - B.p;
    const atr = x.atr[Dp.i]!;
    if (ab < 4 * atr) continue;
    const rc = (C.p - B.p) / ab;
    const cd = C.p - Dp.p;
    if (rc < 0.5 || rc > 0.886 || cd / ab < 0.9 || cd / ab > 1.15 || Dp.p >= B.p) continue;
    if (Math.abs((Dp.i - C.i) / (B.i - A.i) - 1) > 0.6) continue; // similar time too
    const rev = (x.hiOf(Dp.i + 1, Math.min(x.n - 1, Dp.i + 12)) - Dp.p) / cd;
    if (rev < 0.382 || Dp.i + 12 >= x.n) continue;
    const start = Math.max(0, A.i - 6);
    out.push({ ds: x.ds, start, end: Dp.i + 12, pts: { A: A.i - start, B: B.i - start, C: C.i - start, D: Dp.i - start }, lv: { rc, rd: cd / ab }, score: rev * 2 - Math.abs(cd / ab - 1) * 8 });
  }
  return out;
};
D["elliott-impulse"] = (x0) => {
  const out: Cand[] = [];
  const x = wider(x0, 3);
  const sw = alternating(x);
  for (let k = 0; k + 7 <= sw.length; k++) {
    const s = sw.slice(k, k + 7);
    if (s[0]!.kind !== "L") continue;
    const [W0, W1, W2, W3, W4, W5, A] = s.map((q) => q) as ReturnType<typeof alternating>;
    const w1 = W1!.p - W0!.p, w3 = W3!.p - W2!.p, w5 = W5!.p - W4!.p;
    const atr = x.atr[W5!.i]!;
    if (w1 < 2 * atr || W2!.p <= W0!.p || W4!.p <= W1!.p || W5!.p <= W3!.p) continue; // the three hard rules
    if (w3 < w1 && w3 < w5) continue; // wave 3 never the shortest
    if (w3 < 1.2 * w1) continue;
    const r2 = (W1!.p - W2!.p) / w1;
    const r4 = (W3!.p - W4!.p) / w3;
    if (r2 < 0.3 || r2 > 0.8 || r4 < 0.15 || r4 > 0.55) continue;
    if (W5!.i - W0!.i > 90 || A!.i + 3 >= x.n) continue;
    const start = Math.max(0, W0!.i - 5);
    const end = Math.min(x.n - 1, A!.i + 8);
    out.push({ ds: x.ds, start, end, pts: { w0: W0!.i - start, w1: W1!.i - start, w2: W2!.i - start, w3: W3!.i - start, w4: W4!.i - start, w5: W5!.i - start, a: A!.i - start }, score: 5 - Math.abs(r2 - 0.55) * 5 - Math.abs(w3 / w1 - 1.618) * 2 + (W5!.p - A!.p) / w5 });
  }
  return out;
};

// ================================================================== indicators II
function sarSeries(x: Ctx, step = 0.02, max = 0.2) {
  const out: number[] = [];
  let up = x.c[1]! > x.c[0]!;
  let sar = up ? x.l[0]! : x.h[0]!;
  let ep = up ? x.h[0]! : x.l[0]!;
  let af = step;
  out.push(sar);
  for (let i = 1; i < x.n; i++) {
    sar = sar + af * (ep - sar);
    if (up) {
      sar = Math.min(sar, x.l[i - 1]!, x.l[Math.max(0, i - 2)]!);
      if (x.l[i]! < sar) {
        up = false;
        sar = ep;
        ep = x.l[i]!;
        af = step;
      } else if (x.h[i]! > ep) {
        ep = x.h[i]!;
        af = Math.min(max, af + step);
      }
    } else {
      sar = Math.max(sar, x.h[i - 1]!, x.h[Math.max(0, i - 2)]!);
      if (x.h[i]! > sar) {
        up = true;
        sar = ep;
        ep = x.h[i]!;
        af = step;
      } else if (x.l[i]! < ep) {
        ep = x.l[i]!;
        af = Math.min(max, af + step);
      }
    }
    out.push(sar);
  }
  return out;
}
export function adxSeries(x: Ctx, n = 14) {
  const adx: number[] = [];
  const pdi: number[] = [];
  const mdi: number[] = [];
  let trS = 0, pS = 0, mS = 0, a = 0;
  for (let i = 0; i < x.n; i++) {
    if (i === 0) {
      adx.push(0), pdi.push(0), mdi.push(0);
      continue;
    }
    const up = x.h[i]! - x.h[i - 1]!;
    const dn = x.l[i - 1]! - x.l[i]!;
    const pdm = up > dn && up > 0 ? up : 0;
    const mdm = dn > up && dn > 0 ? dn : 0;
    const tr = Math.max(x.h[i]! - x.l[i]!, Math.abs(x.h[i]! - x.c[i - 1]!), Math.abs(x.l[i]! - x.c[i - 1]!));
    trS = trS - trS / n + tr;
    pS = pS - pS / n + pdm;
    mS = mS - mS / n + mdm;
    const p = (100 * pS) / (trS || 1e-12);
    const m = (100 * mS) / (trS || 1e-12);
    const dx = (100 * Math.abs(p - m)) / (p + m || 1e-12);
    a = i < 2 * n ? (a * (i - 1) + dx) / i : (a * (n - 1) + dx) / n;
    adx.push(a), pdi.push(p), mdi.push(m);
  }
  return { adx, pdi, mdi };
}
D["adx-trend"] = (x) => {
  const out: Cand[] = [];
  const { adx, pdi, mdi } = adxSeries(x);
  for (let i = PRE + 30; i < x.n - 40; i++) {
    if (!(adx[i - 1]! < 25 && adx[i]! >= 25) || Math.min(...adx.slice(i - 12, i)) > 20) continue;
    const dir = pdi[i]! > mdi[i]! ? 1 : -1;
    const move = dir === 1 ? (x.hiOf(i, i + 35) - x.c[i]!) / x.atr[i]! : (x.c[i]! - x.loOf(i, i + 35)) / x.atr[i]!;
    if (move < 8) continue;
    const start = i - 30;
    out.push({ ds: x.ds, start, end: i + 35, pre: PRE, pts: { cross: 30 }, lv: { dir }, score: move / 2 });
    i += 30;
  }
  return out;
};
D["ichimoku"] = (x) => {
  const out: Cand[] = [];
  const mid = (a: number, b: number) => (x.hiOf(a, b) + x.loOf(a, b)) / 2;
  const spanA = (i: number) => (i < 78 ? null : ((mid(i - 26 - 8, i - 26) + mid(i - 26 - 25, i - 26)) / 2));
  const spanB = (i: number) => (i < 78 ? null : mid(i - 26 - 51, i - 26));
  for (let i = 100; i < x.n - 40; i++) {
    const a = spanA(i), b = spanB(i);
    if (a === null || b === null) continue;
    const top = Math.max(a, b);
    const pa = spanA(i - 1)!, pb = spanB(i - 1)!;
    if (!(x.c[i]! > top && x.c[i - 1]! <= Math.max(pa, pb))) continue;
    let below = 0;
    for (let k = i - 25; k < i; k++) if (x.c[k]! < Math.min(spanA(k)!, spanB(k)!)) below++;
    if (below < 12) continue;
    const move = (x.hiOf(i, i + 35) - x.c[i]!) / x.atr[i]!;
    if (move < 8) continue;
    const start = i - 35;
    out.push({ ds: x.ds, start, end: i + 35, pre: 90, pts: { br: 35 }, score: move / 2 + below / 10 });
    i += 30;
  }
  return out;
};
D["supertrend-flip"] = (x) => {
  const out: Cand[] = [];
  const sar = sarSeries(x);
  for (let i = PRE + 25; i < x.n - 35; i++) {
    const nowUp = sar[i]! < x.l[i]!;
    const wasDown = sar[i - 1]! > x.h[i - 1]!;
    if (!(nowUp && wasDown)) continue;
    let down = 0;
    for (let k = i - 20; k < i; k++) if (sar[k]! > x.h[k]!) down++;
    let upAfter = 0;
    for (let k = i; k < i + 25; k++) if (sar[k]! < x.l[k]!) upAfter++;
    const move = (x.hiOf(i, i + 30) - x.c[i]!) / x.atr[i]!;
    if (down < 14 || upAfter < 20 || move < 7) continue;
    const start = i - 25;
    out.push({ ds: x.ds, start, end: i + 30, pre: PRE, pts: { flip: 25 }, score: move / 2 + upAfter / 10 });
    i += 25;
  }
  return out;
};
D["obv-accumulation"] = (x) => {
  const out: Cand[] = [];
  if (!hasVolume(x)) return out;
  const obv: number[] = [0];
  for (let i = 1; i < x.n; i++) obv.push(obv[i - 1]! + (x.c[i]! > x.c[i - 1]! ? x.v[i]! : x.c[i]! < x.c[i - 1]! ? -x.v[i]! : 0));
  for (let i = 60; i < x.n - 20; i++) {
    const a = i - 30;
    const atr = x.atr[i]!;
    if (Math.abs(x.c[i]! - x.c[a]!) > 1.5 * atr || (x.hiOf(a, i) - x.loOf(a, i)) / atr > 6) continue;
    let vs = 0;
    for (let k = a; k <= i; k++) vs += x.v[k]!;
    const rise = (obv[i]! - obv[a]!) / vs;
    if (rise < 0.25) continue;
    const top = x.hiOf(a, i);
    const br = findAhead(x, i + 1, 10, (k) => x.c[k]! > top);
    if (br === undefined || br + 10 >= x.n) continue;
    const run = (x.hiOf(br, br + 10) - top) / atr;
    if (run < 3) continue;
    const start = a - 10;
    out.push({ ds: x.ds, start, end: br + 10, pre: 20, pts: { a: 10, b: i - start, br: br - start }, lv: { top }, score: rise * 5 + run / 2 });
    i += 30;
  }
  return out;
};
D["donchian-breakout"] = (x) => {
  const out: Cand[] = [];
  for (let i = PRE + 25; i < x.n - 30; i++) {
    const hi20 = x.hiOf(i - 20, i - 1);
    if (!(x.c[i]! > hi20 && x.c[i - 1]! <= x.hiOf(i - 21, i - 2))) continue;
    const width = (hi20 - x.loOf(i - 20, i - 1)) / x.atr[i]!;
    if (width > 6) continue;
    const move = (x.hiOf(i, i + 28) - x.c[i]!) / x.atr[i]!;
    if (move < 8) continue;
    const start = i - 30;
    out.push({ ds: x.ds, start, end: i + 28, pre: PRE, pts: { br: 30 }, score: move / 2 + (6 - width) / 2 });
    i += 25;
  }
  return out;
};
D["ma200"] = (x) => {
  const out: Cand[] = [];
  if (x.ds.tf !== "1D") return out;
  const s = smaSeries(x.c, 200);
  for (let i = 260; i < x.n - 60; i++) {
    if (s[i] == null || !(x.c[i - 1]! < s[i - 1]! && x.c[i]! > s[i]!)) continue;
    let below = 0;
    for (let k = i - 50; k < i; k++) if (x.c[k]! < s[k]!) below++;
    let above = 0;
    for (let k = i + 1; k <= i + 60; k++) if (x.c[k]! > s[k]!) above++;
    if (below < 40 || above < 52) continue;
    const start = i - 60;
    out.push({ ds: x.ds, start, end: i + 60, pre: 210, pts: { cross: 60 }, score: above / 10 + below / 10 + (x.c[i + 60]! - x.c[i]!) / x.atr[i]! / 5 });
    i += 60;
  }
  return out;
};
D["stoch-range"] = (x) => {
  const out: Cand[] = [];
  for (const c of D["range"]!(x)) if (c.start >= PRE) out.push({ ...c, pre: PRE });
  return out;
};
D["pivots-day"] = (x) => {
  const out: Cand[] = [];
  if (!fx1h(x)) return out;
  const T = ny(x);
  const starts = dayStarts(x, HM(17));
  for (let d = 1; d + 1 < starts.length; d++) {
    const y0 = starts[d - 1]!, s = starts[d]!, e = starts[d + 1]! - 1;
    if (s - y0 < 20 || e - s < 20 || T[s]!.wd === 0) continue;
    const H = x.hiOf(y0, s - 1), L = x.loOf(y0, s - 1), C = x.c[s - 1]!;
    const P = (H + L + C) / 3;
    const R1 = 2 * P - L, S1 = 2 * P - H, R2 = P + (H - L), S2 = P - (H - L);
    const atr = x.atr[s]!;
    const tol = 0.15 * (H - L);
    // Price tests S1 (or R1) and turns back through the pivot.
    const lo = x.loOf(s, e), hi = x.hiOf(s, e);
    let score = 0;
    let pts: Record<string, number> = {};
    if (Math.abs(lo - S1) < tol && hi > P) {
      const k = range(e - s + 1, s).find((q) => x.l[q]! === lo)!;
      pts = { touch: k - y0, kind: -1 };
      score = (hi - lo) / atr - Math.abs(lo - S1) / tol;
    } else if (Math.abs(hi - R1) < tol && lo < P) {
      const k = range(e - s + 1, s).find((q) => x.h[q]! === hi)!;
      pts = { touch: k - y0, kind: 1 };
      score = (hi - lo) / atr - Math.abs(hi - R1) / tol;
    } else continue;
    out.push({ ds: x.ds, start: y0, end: e, pts: { ...pts, open: s - y0 }, lv: { P, R1, S1, R2, S2 }, score });
  }
  return out;
};
D["anchored-vwap"] = (x0) => {
  const out: Cand[] = [];
  if (!hasVolume(x0)) return out;
  const x = wider(x0, 5);
  for (const A of x.swL) {
    let pv = 0, vv = 0;
    const vw: number[] = [];
    for (let k = A; k < Math.min(x.n, A + 70); k++) {
      const tp = (x.h[k]! + x.l[k]! + x.c[k]!) / 3;
      pv += tp * x.v[k]!;
      vv += x.v[k]!;
      vw.push(pv / vv);
    }
    const touch = range(50, A + 15).find((k) => k < A + vw.length - 12 && x.l[k]! <= vw[k - A]! + 0.15 * x.atr[k]! && x.c[k]! > vw[k - A]! && x.loOf(k - 8, k - 1) > vw[k - 8 - A]!);
    if (touch === undefined) continue;
    const run = (x.hiOf(touch + 1, touch + 12) - x.c[touch]!) / x.atr[touch]!;
    if (run < 4 || range(touch - A, A + 1).some((k) => x.c[k]! < vw[k - A]! - 0.3 * x.atr[k]!)) continue;
    const start = Math.max(0, A - 8);
    out.push({ ds: x.ds, start, end: touch + 12, pts: { A: A - start, touch: touch - start }, score: run + (touch - A) / 15 });
  }
  return out;
};

// ================================================================== liquidity
D["ssl-sweep"] = (x) => {
  const out: Cand[] = [];
  for (let j = 0; j < x.swL.length - 1; j++) {
    const A = x.swL[j]!;
    const B = x.swL[j + 1]!;
    const atr = x.atr[B]!;
    if (B - A < 5 || B - A > 30 || Math.abs(x.l[A]! - x.l[B]!) > 0.35 * atr) continue;
    const L = Math.min(x.l[A]!, x.l[B]!);
    if (x.hiOf(A, B) < L + 2 * atr) continue;
    const fk = findAhead(x, B + 2, 12, (k) => x.l[k]! < L - 0.3 * atr && x.c[k]! > L && x.c[k - 1]! > L);
    if (fk === undefined || fk + 12 >= x.n) continue;
    const rally = (x.hiOf(fk + 1, fk + 10) - L) / atr;
    if (rally < 3) continue;
    const start = Math.max(0, A - 12);
    out.push({ ds: x.ds, start, end: fk + 11, pts: { A: A - start, B: B - start, fk: fk - start }, lv: { L }, score: rally / 2 + (L - x.l[fk]!) / atr });
  }
  return out;
};
D["trendline-run"] = (x) => {
  const out: Cand[] = [];
  const L = x.swL;
  for (let j = 0; j < L.length - 2; j++) {
    const a = L[j]!, b = L[j + 1]!, c = L[j + 2]!;
    if (b - a < 5 || c - b < 5 || c - a > 50) continue;
    const slope = (x.l[b]! - x.l[a]!) / (b - a);
    if (slope <= 0 || Math.abs(x.l[c]! - (x.l[a]! + slope * (c - a))) > 0.3 * x.atr[c]!) continue;
    let clean = true;
    for (let k = a; k <= c; k++) if (x.c[k]! < x.l[a]! + slope * (k - a) - 0.2 * x.atr[k]!) clean = false;
    if (!clean) continue;
    const br = findAhead(x, c + 2, 15, (k) => x.c[k]! < x.l[a]! + slope * (k - a) - 0.3 * x.atr[k]!);
    if (br === undefined || br + 10 >= x.n) continue;
    const run = (x.l[c]! - x.loOf(br, br + 10)) / x.atr[br]!;
    if (run < 3) continue;
    const start = Math.max(0, a - 6);
    out.push({ ds: x.ds, start, end: br + 10, pts: { a: a - start, b: b - start, c: c - start, br: br - start }, score: run });
  }
  return out;
};
D["irl-erl"] = (x) => {
  const out: Cand[] = [];
  for (let j = 20; j < x.n - 40; j++) {
    const atr = x.atr[j]!;
    if (!bullFvg(x, j, 0.2) || x.c[j + 2]! - x.o[j + 1]! < 2.5 * atr) continue;
    // Dealing range: the swing high above (buy-side, external) and the swing low below.
    const H = [...x.swH].reverse().find((h) => h < j && h > j - 40 && x.h[h]! > x.hiOf(j, j + 2));
    if (H === undefined) continue;
    const Lw = x.loOf(H, j + 1);
    const rt = findAhead(x, j + 4, 20, (k) => x.l[k]! <= x.l[j + 2]! && x.c[k]! > x.h[j]!);
    if (rt === undefined || x.loOf(j + 3, rt) < Lw) continue;
    const erl = findAhead(x, rt + 1, 25, (k) => x.h[k]! > x.h[H]!);
    if (erl === undefined || erl + 4 >= x.n) continue;
    const start = Math.max(0, H - 8);
    const low = range(j - H + 2, H).reduce((m, k) => (x.l[k]! < x.l[m]! ? k : m), H);
    out.push({ ds: x.ds, start, end: erl + 4, pts: { H: H - start, low: low - start, f: j - start, rt: rt - start, erl: erl - start }, lv: { fvgTop: x.l[j + 2]!, fvgBot: x.h[j]! }, score: (x.l[j + 2]! - x.h[j]!) / atr + 3 - (erl - rt) / 15 });
    j += 10;
  }
  return out;
};
D["turtle-soup"] = (x) => {
  const out: Cand[] = [];
  for (let i = 30; i < x.n - 12; i++) {
    // Previous 20-period low made at least 4 bars earlier.
    const prevLow = x.loOf(i - 20, i - 1);
    const at = range(20, i - 20).find((k) => x.l[k]! === prevLow)!;
    if (i - at < 4) continue;
    if (!(x.l[i]! < prevLow && x.c[i]! > prevLow)) continue;
    const atr = x.atr[i]!;
    const rally = (x.hiOf(i + 1, i + 10) - x.c[i]!) / atr;
    if (rally < 3 || x.loOf(i + 1, i + 10) < x.l[i]!) continue;
    const start = i - 25;
    out.push({ ds: x.ds, start, end: i + 10, pts: { prev: at - start, k: 25 }, lv: { prevLow }, score: rally + (prevLow - x.l[i]!) / atr });
    i += 8;
  }
  return out;
};
/** A NY day where London fakes one way before New York runs the other way. */
function judas(x: Ctx): Cand[] {
  const out: Cand[] = [];
  if (!fx15(x)) return out;
  const T = ny(x);
  for (const s of dayStarts(x, 0)) {
    if (T[s]!.wd === 0 || T[s]!.wd === 6) continue;
    const pre = atTime(x, s, 0) - 20; // show a little of the Asian session
    const e = atTime(x, s, HM(16));
    const lon = atTime(x, s, HM(5));
    if (pre < 0 || e < 0 || lon < 0 || e - s < 55) continue;
    const open = x.o[s]!;
    const atr = x.atr[s]!;
    const lowK = range(lon - s + 1, s).reduce((m, k) => (x.l[k]! < x.l[m]! ? k : m), s);
    const dayHi = x.hiOf(s, e), dayLo = x.loOf(s, e);
    const dayRange = dayHi - dayLo;
    if (dayRange < 5 * atr) continue;
    // Bullish Judas: the day's low forms before 05:00 below the open, the close is near the high.
    if (x.l[lowK]! > dayLo + 0.05 * dayRange || open - x.l[lowK]! < 0.25 * dayRange) continue;
    if (x.c[e]! < dayLo + 0.75 * dayRange) continue;
    const hiK = range(e - s + 1, s).reduce((m, k) => (x.h[k]! > x.h[m]! ? k : m), s);
    out.push({ ds: x.ds, start: pre, end: e, pts: { open: s - pre, low: lowK - pre, high: hiK - pre, lon: lon - pre, ny: atTime(x, s, HM(7)) - pre, sb: atTime(x, s, HM(10)) - pre }, lv: { open }, score: (open - x.l[lowK]!) / dayRange * 4 + (x.c[e]! - dayLo) / dayRange * 3 });
  }
  return out;
}
D["judas"] = judas;
function prevExtreme(kind: "day" | "week"): Detector {
  return (x) => {
    const out: Cand[] = [];
    const ok = kind === "day" ? x.ds.tf === "1h" && x.ds.source === "binance" : x.ds.tf === "4h" && x.ds.source === "binance";
    if (!ok) return out;
    const period = kind === "day" ? 86400 : 7 * 86400;
    const offset = kind === "day" ? 0 : 4 * 86400; // weeks start Monday 00:00 UTC
    const pid = (i: number) => Math.floor((x.t[i]! - offset) / period);
    const starts: number[] = [];
    for (let i = 1; i < x.n; i++) if (pid(i) !== pid(i - 1)) starts.push(i);
    for (let d = 1; d + 1 < starts.length; d++) {
      const a = starts[d - 1]!, s = starts[d]!, e = Math.min(x.n - 1, starts[d + 1]! - 1);
      const PH = x.hiOf(a, s - 1), PL = x.loOf(a, s - 1);
      const atr = x.atr[s]!;
      const sw = range(e - s + 1, s).find((k) => x.h[k]! > PH && x.c[k]! < PH + 0.1 * atr);
      if (sw === undefined || x.hiOf(s, sw - 1) > PH) continue;
      const back = findAhead(x, sw, 3, (k) => x.c[k]! < PH);
      if (back === undefined) continue;
      if (range(e - sw, sw + 1).some((k) => x.c[k]! > x.h[sw]!)) continue;
      const drop = (PH - x.loOf(sw, e)) / (PH - PL);
      if (drop < 0.6 || (x.h[sw]! - PH) / atr > 1.5) continue;
      out.push({ ds: x.ds, start: a, end: e, pts: { open: s - a, sweep: sw - a }, lv: { PH, PL }, score: drop * 4 + (x.h[sw]! - PH) / atr });
    }
    return out;
  };
}
D["pdh-sweep"] = prevExtreme("day");
D["pwh-sweep"] = prevExtreme("week");

// ================================================================== imbalances
D["fvg-ce"] = (x) => {
  const out: Cand[] = [];
  for (let j = 15; j < x.n - 30; j++) {
    const atr = x.atr[j]!;
    if (!bullFvg(x, j, 0.4) || x.c[j + 2]! - x.o[j + 1]! < 2.5 * atr) continue;
    const top = x.l[j + 2]!, bot = x.h[j]!, ce = (top + bot) / 2;
    const rt = findAhead(x, j + 3, 20, (k) => x.l[k]! <= top);
    if (rt === undefined || Math.abs(x.l[rt]! - ce) > 0.15 * (top - bot) || x.c[rt]! < ce) continue;
    const run = (x.hiOf(rt + 1, rt + 12) - x.hiOf(j, rt)) / atr;
    if (run < 1 || rt + 12 >= x.n) continue;
    const start = Math.max(0, j - 12);
    out.push({ ds: x.ds, start, end: rt + 12, pts: { f: j - start, rt: rt - start }, lv: { top, bot, ce }, score: 4 - Math.abs(x.l[rt]! - ce) / (top - bot) * 10 + run / 2 + (top - bot) / atr });
    j += 5;
  }
  return out;
};
D["first-fvg"] = (x) => {
  const out: Cand[] = [];
  if (!fx15(x)) return out;
  const T = ny(x);
  for (const s of dayStarts(x, HM(9, 30))) {
    if (T[s]!.wd === 0 || T[s]!.wd === 6) continue;
    const f = range(8, s).find((j) => j + 2 < x.n && T[j + 2]!.hm <= HM(10, 30) && (bullFvg(x, j, 0.15) || bearFvg(x, j, 0.15)));
    if (f === undefined) continue;
    const bull = bullFvg(x, f, 0.15);
    const top = bull ? x.l[f + 2]! : x.l[f]!;
    const bot = bull ? x.h[f]! : x.h[f + 2]!;
    const rt = findAhead(x, f + 3, 16, (k) => (bull ? x.l[k]! <= top && x.c[k]! > bot : x.h[k]! >= bot && x.c[k]! < top));
    if (rt === undefined || rt + 16 >= x.n) continue;
    const atr = x.atr[f]!;
    const run = bull ? (x.hiOf(rt, rt + 16) - x.hiOf(f, rt)) / atr : (x.loOf(f, rt) - x.loOf(rt, rt + 16)) / atr;
    if (run < 1.5) continue;
    const start = s - 26;
    out.push({ ds: x.ds, start, end: rt + 16, pts: { open: 26, f: f - start, rt: rt - start }, lv: { top, bot, dir: bull ? 1 : -1 }, score: run + (top - bot) / atr });
  }
  return out;
};
D["ifvg"] = (x) => {
  const out: Cand[] = [];
  for (let j = 15; j < x.n - 40; j++) {
    const atr = x.atr[j]!;
    if (!bearFvg(x, j, 0.3)) continue;
    const top = x.l[j]!, bot = x.h[j + 2]!;
    // The bearish gap fails: price closes back above its top…
    const fail = findAhead(x, j + 3, 20, (k) => x.c[k]! > top + 0.1 * atr);
    if (fail === undefined) continue;
    // …then returns into it from above and holds it as support.
    const rt = findAhead(x, fail + 2, 15, (k) => x.l[k]! <= top && x.c[k]! > bot);
    if (rt === undefined || rt + 10 >= x.n || x.loOf(fail, rt + 3) < bot - 0.2 * atr) continue;
    const run = (x.hiOf(rt, rt + 10) - x.hiOf(fail, rt)) / atr;
    if (run < 1.5) continue;
    const start = Math.max(0, j - 12);
    out.push({ ds: x.ds, start, end: rt + 10, pts: { f: j - start, fail: fail - start, rt: rt - start }, lv: { top, bot }, score: run + (top - bot) / atr * 2 });
    j += 8;
  }
  return out;
};
D["bpr"] = (x) => {
  const out: Cand[] = [];
  for (let j = 15; j < x.n - 40; j++) {
    if (!bearFvg(x, j, 0.2)) continue;
    const bTop = x.l[j]!, bBot = x.h[j + 2]!;
    const k = range(15, j + 3).find((q) => q + 2 < x.n && bullFvg(x, q, 0.2) && x.l[q + 2]! > bBot && x.h[q]! < bTop);
    if (k === undefined) continue;
    const top = Math.min(bTop, x.l[k + 2]!), bot = Math.max(bBot, x.h[k]!);
    const atr = x.atr[k]!;
    if (top - bot < 0.3 * atr) continue;
    const rt = findAhead(x, k + 3, 15, (q) => x.l[q]! <= top && x.c[q]! > bot);
    if (rt === undefined || rt + 10 >= x.n) continue;
    const run = (x.hiOf(rt, rt + 10) - x.hiOf(k, rt)) / atr;
    if (run < 1.5) continue;
    const start = Math.max(0, j - 10);
    out.push({ ds: x.ds, start, end: rt + 10, pts: { bear: j - start, bull: k - start, rt: rt - start }, lv: { top, bot, bTop, bBot, uTop: x.l[k + 2]!, uBot: x.h[k]! }, score: run + (top - bot) / atr * 2 });
    j += 8;
  }
  return out;
};
D["stacked-fvg"] = (x) => {
  const out: Cand[] = [];
  for (let j = 15; j < x.n - 20; j++) {
    const gaps = range(4, j).filter((q) => bullFvg(x, q, 0.15));
    if (gaps.length < 2 || gaps[1]! - gaps[0]! > 2) continue;
    const atr = x.atr[j]!;
    if (x.c[j + 5]! - x.o[j + 1]! < 4 * atr) continue;
    const start = Math.max(0, j - 15);
    const pts: Record<string, number> = {};
    gaps.forEach((q, k) => (pts[`g${k}`] = q - start));
    out.push({ ds: x.ds, start, end: j + 20, pts, score: gaps.length * 2 + (x.c[j + 5]! - x.o[j + 1]!) / atr / 2 });
    j += 10;
  }
  return out;
};
D["volume-imbalance"] = (x) => {
  const out: Cand[] = [];
  if (!isYahoo(x) || x.ds.tf === "15m") return out;
  for (let i = 20; i < x.n - 20; i++) {
    const atr = x.atr[i]!;
    const prevTop = Math.max(x.o[i - 1]!, x.c[i - 1]!);
    const bodyLo = Math.min(x.o[i]!, x.c[i]!);
    // Bodies don't touch, but the wicks do (not a full gap).
    if (!(x.bull(i - 1) && x.bull(i) && bodyLo > prevTop + 0.15 * atr && x.l[i]! <= x.h[i - 1]!)) continue;
    const rt = findAhead(x, i + 2, 15, (k) => x.l[k]! <= bodyLo && x.c[k]! > prevTop - 0.1 * atr);
    if (rt === undefined || rt + 8 >= x.n) continue;
    const run = (x.hiOf(rt, rt + 8) - x.hiOf(i, rt)) / atr;
    if (run < 0.5) continue;
    const start = i - 14;
    out.push({ ds: x.ds, start, end: rt + 8, pts: { k: 14, rt: rt - start }, lv: { top: bodyLo, bot: prevTop }, score: (bodyLo - prevTop) / atr * 3 + run });
    i += 8;
  }
  return out;
};
D["liquidity-void"] = (x) => {
  const out: Cand[] = [];
  for (let i = 20; i < x.n - 40; i++) {
    const atr = x.atr[i]!;
    let k = i;
    while (k < x.n && x.bull(k) && x.body(k) >= 0.9 * atr && pct(x, k) > 0.6) k++;
    if (k - i < 4) continue;
    const lo = x.o[i]!, hi = x.c[k - 1]!;
    const fill = findAhead(x, k + 1, 35, (q) => x.l[q]! <= lo + 0.4 * (hi - lo));
    if (fill === undefined || fill + 5 >= x.n) continue;
    const start = Math.max(0, i - 10);
    out.push({ ds: x.ds, start, end: fill + 5, pts: { a: i - start, b: k - 1 - start, fill: fill - start }, lv: { lo, hi }, score: (k - i) + (hi - lo) / atr / 3 });
    i = k;
  }
  return out;
};
D["nwog"] = (x) => {
  const out: Cand[] = [];
  if (!fx1h(x)) return out;
  for (let i = 30; i < x.n - 60; i++) {
    if (x.t[i]! - x.t[i - 1]! < 36 * 3600) continue; // weekend gap in the data
    const fc = x.c[i - 1]!, so = x.o[i]!;
    const atr = x.atr[i]!;
    if (Math.abs(so - fc) < 0.5 * atr) continue;
    const top = Math.max(fc, so), bot = Math.min(fc, so);
    const ce = (top + bot) / 2;
    const back = findAhead(x, i + 6, 60, (k) => x.l[k]! <= ce && x.h[k]! >= ce);
    if (back === undefined || back + 10 >= x.n) continue;
    const start = i - 24;
    out.push({ ds: x.ds, start, end: Math.min(x.n - 1, back + 14), pts: { fri: 23, sun: 24, back: back - start }, lv: { top, bot, ce }, score: (top - bot) / atr });
  }
  return out;
};

// ================================================================== order block family
/** Breaker (lower low swept first) or mitigation block (higher low), bullish. */
function breakerLike(kind: "breaker" | "mitigation" | "unicorn"): Detector {
  return (x0) => {
    const out: Cand[] = [];
    const x = wider(x0, 3);
    const sw = alternating(x);
    for (let k = 0; k + 3 <= sw.length; k++) {
      const [L1, H, L2] = sw.slice(k, k + 3) as ReturnType<typeof alternating>;
      if (L1!.kind !== "L") continue;
      const atr = x.atr[L2!.i]!;
      const lower = L2!.p < L1!.p - 0.2 * atr;
      if (kind === "mitigation" ? L2!.p <= L1!.p + 0.3 * atr : !lower) continue;
      const brk = findAhead(x, L2!.i + 1, 20, (j) => x.c[j]! > H!.p);
      if (brk === undefined) continue;
      // The block: last up-close candle at the swing high before the drop.
      const blk = range(6, H!.i - 5).reverse().find((j) => j >= 0 && x.bull(j));
      if (blk === undefined) continue;
      const bTop = x.h[blk]!, bBot = x.l[blk]!;
      if (bTop - bBot < 0.4 * atr) continue;
      let fvg: number | undefined;
      if (kind === "unicorn") {
        fvg = range(brk - L2!.i + 1, L2!.i).find((j) => j + 2 < x.n && bullFvg(x, j, 0.1) && x.l[j + 2]! > bBot && x.h[j]! < bTop);
        if (fvg === undefined) continue;
      }
      const rt = findAhead(x, brk + 2, 20, (j) => x.l[j]! <= bTop && x.c[j]! > bBot);
      if (rt === undefined || rt + 10 >= x.n || x.loOf(brk, rt) < bBot - 0.2 * atr) continue;
      const run = (x.hiOf(rt, rt + 10) - x.hiOf(brk, rt)) / atr;
      if (run < 1.5) continue;
      const start = Math.max(0, L1!.i - 10);
      if (rt + 10 - start > 90) continue;
      const pts: Record<string, number> = { L1: L1!.i - start, H: H!.i - start, L2: L2!.i - start, brk: brk - start, blk: blk - start, rt: rt - start };
      if (fvg !== undefined) pts["fvg"] = fvg - start;
      out.push({ ds: x.ds, start, end: rt + 10, pts, lv: { bTop, bBot, ...(fvg !== undefined ? { fTop: x.l[fvg + 2]!, fBot: x.h[fvg]! } : {}) }, score: run + (H!.p - L2!.p) / atr / 3 });
    }
    return out;
  };
}
D["breaker"] = breakerLike("breaker");
D["mitigation-block"] = breakerLike("mitigation");
D["unicorn"] = breakerLike("unicorn");
D["rejection-block"] = (x0) => {
  const out: Cand[] = [];
  const x = wider(x0, 4);
  for (const s of x.swL) {
    const wickers = [s - 1, s, s + 1].filter((k) => x.lo(k) >= 0.5 * x.range(k) && x.range(k) >= 1 * x.atr[k]!);
    if (wickers.length < 2) continue;
    const bodyLo = Math.min(...wickers.map((k) => Math.min(x.o[k]!, x.c[k]!)));
    const low = x.l[s]!;
    const atr = x.atr[s]!;
    const rt = findAhead(x, s + 5, 25, (k) => x.l[k]! <= bodyLo && x.c[k]! > low);
    if (rt === undefined || rt + 10 >= x.n || x.loOf(s + 1, rt + 2) < low) continue;
    const run = (x.hiOf(rt, rt + 10) - x.hiOf(s, rt)) / atr;
    if (run < 1) continue;
    const start = Math.max(0, s - 15);
    out.push({ ds: x.ds, start, end: rt + 10, pts: { s: s - start, rt: rt - start }, lv: { top: bodyLo, bot: low }, score: run + wickers.length });
  }
  return out;
};
D["propulsion"] = (x) => {
  const out: Cand[] = [];
  for (const c of D["ob-fvg-bull"]!(x)) {
    const ob = c.start + c.pts["ob"]!;
    const rt = c.start + c.pts["rt"]!;
    // The candle that traded into the order block and launched price.
    const p = range(4, rt).find((k) => k < x.n - 20 && x.bull(k) && x.l[k]! <= x.h[ob]! && x.c[k]! > x.h[ob]!);
    if (p === undefined) continue;
    const rt2 = findAhead(x, p + 3, 20, (k) => x.l[k]! <= Math.max(x.o[p]!, x.l[p]! + 0.5 * x.range(p)) && x.c[k]! > x.l[p]!);
    if (rt2 === undefined || rt2 + 8 >= x.n || x.loOf(p + 1, rt2) < x.l[p]!) continue;
    const run = (x.hiOf(rt2, rt2 + 8) - x.hiOf(p, rt2)) / x.atr[p]!;
    if (run < 1) continue;
    out.push({ ds: x.ds, start: c.start, end: rt2 + 8, pts: { ob: ob - c.start, p: p - c.start, rt2: rt2 - c.start }, lv: { obTop: x.h[ob]!, obBot: x.l[ob]!, pTop: x.h[p]!, pBot: x.l[p]! }, score: run + c.score / 2 });
  }
  return out;
};

// ================================================================== premium / discount
D["ote"] = (x) => {
  const out: Cand[] = [];
  for (const A of x.swL) {
    for (const B of x.swH.filter((b) => b > A && b - A <= 25)) {
      const atr = x.atr[B]!;
      const leg = x.h[B]! - x.l[A]!;
      if (leg < 6 * atr || x.loOf(A, B) < x.l[A]! || x.hiOf(A, B) > x.h[B]!) continue;
      const C = x.swL.find((cc) => cc > B && cc - B <= 15);
      if (C === undefined || x.hiOf(B + 1, C) > x.h[B]!) continue;
      const retr = (x.h[B]! - x.l[C]!) / leg;
      if (retr < 0.62 || retr > 0.79) continue;
      const tgt = findAhead(x, C + 1, 30, (k) => x.h[k]! >= x.h[B]! + 0.27 * leg);
      if (tgt === undefined || tgt + 3 >= x.n) continue;
      const start = Math.max(0, A - 5);
      out.push({ ds: x.ds, start, end: tgt + 3, pts: { A: A - start, B: B - start, C: C - start, T: tgt - start }, score: 3 - Math.abs(retr - 0.705) * 20 + Math.min(leg / atr, 12) / 4 });
    }
  }
  return out;
};
D["fib-extension"] = (x) => {
  const out: Cand[] = [];
  for (const A of x.swL) {
    for (const B of x.swH.filter((b) => b > A && b - A <= 25)) {
      const atr = x.atr[B]!;
      const leg = x.h[B]! - x.l[A]!;
      if (leg < 6 * atr || x.loOf(A, B) < x.l[A]! || x.hiOf(A, B) > x.h[B]!) continue;
      const C = x.swL.find((cc) => cc > B && cc - B <= 15);
      if (C === undefined || x.hiOf(B + 1, C) > x.h[B]!) continue;
      const retr = (x.h[B]! - x.l[C]!) / leg;
      if (retr < 0.38 || retr > 0.79) continue;
      const Dh = x.swH.find((d) => d > C && d - C <= 30);
      if (Dh === undefined || x.loOf(C + 1, Dh) < x.l[C]!) continue;
      const ext = (x.h[Dh]! - x.l[A]!) / leg;
      const near = [1.272, 1.618].reduce((m, e) => (Math.abs(ext - e) < Math.abs(ext - m) ? e : m), 1.272);
      if (Math.abs(ext - near) > 0.06) continue;
      const rev = (x.h[Dh]! - x.loOf(Dh + 1, Math.min(x.n - 1, Dh + 10))) / atr;
      if (rev < 2.5 || Dh + 10 >= x.n) continue;
      const start = Math.max(0, A - 5);
      out.push({ ds: x.ds, start, end: Dh + 10, pts: { A: A - start, B: B - start, C: C - start, D: Dh - start }, lv: { ext: near }, score: 4 - Math.abs(ext - near) * 30 + rev / 2 });
    }
  }
  return out;
};

// ================================================================== ICT time
D["killzones"] = (x) => {
  const out: Cand[] = [];
  if (!fx15(x)) return out;
  const T = ny(x);
  for (const s of dayStarts(x, 0)) {
    if (T[s]!.wd < 2 || T[s]!.wd > 4) continue; // Tue–Thu
    const pre = s - 20; // 19:00 NY the evening before (Asian session)
    const e = atTime(x, s, HM(16));
    if (pre < 0 || e < 0 || e - s < 60) continue;
    const at = (hm: number) => atTime(x, s, hm);
    const [l0, l1, n0, n1, c1, p0] = [at(HM(2)), at(HM(5)), at(HM(7)), at(HM(10)), at(HM(12)), at(HM(13, 30))];
    if ([l0, l1, n0, n1, c1, p0].some((k) => k < 0)) continue;
    const dayR = x.hiOf(pre, e) - x.loOf(pre, e);
    const kzMove = (x.hiOf(l0, l1) - x.loOf(l0, l1) + x.hiOf(n0, n1) - x.loOf(n0, n1)) / dayR;
    const asiaR = (x.hiOf(pre, s) - x.loOf(pre, s)) / dayR;
    out.push({ ds: x.ds, start: pre, end: e, pts: { asia: 0, mid: s - pre, l0: l0 - pre, l1: l1 - pre, n0: n0 - pre, n1: n1 - pre, c1: c1 - pre, p0: p0 - pre }, score: kzMove * 3 - asiaR * 2 + dayR / x.atr[s]! / 10 });
  }
  return out;
};
D["silver-bullet"] = (x) => {
  const out: Cand[] = [];
  if (!fx15(x)) return out;
  const T = ny(x);
  for (const s of dayStarts(x, HM(10))) {
    if (T[s]!.wd === 0 || T[s]!.wd === 6) continue;
    const e = atTime(x, s, HM(11));
    if (e < 0) continue;
    const f = range(e - s - 1, s).find((j) => bullFvg(x, j, 0.15) || bearFvg(x, j, 0.15));
    if (f === undefined) continue;
    const bull = bullFvg(x, f, 0.15);
    const top = bull ? x.l[f + 2]! : x.l[f]!, bot = bull ? x.h[f]! : x.h[f + 2]!;
    const rt = findAhead(x, f + 3, 8, (k) => T[k]!.hm < HM(11, 30) && (bull ? x.l[k]! <= top && x.c[k]! > bot : x.h[k]! >= bot && x.c[k]! < top));
    if (rt === undefined || rt + 12 >= x.n) continue;
    const atr = x.atr[f]!;
    const run = bull ? (x.hiOf(rt, rt + 12) - x.c[rt]!) / atr : (x.c[rt]! - x.loOf(rt, rt + 12)) / atr;
    if (run < 2) continue;
    const start = s - 16;
    out.push({ ds: x.ds, start, end: rt + 12, pts: { sb0: 16, sb1: e - start, f: f - start, rt: rt - start }, lv: { top, bot, dir: bull ? 1 : -1 }, score: run + (top - bot) / atr });
  }
  return out;
};
D["orb"] = (x) => {
  const out: Cand[] = [];
  if (!stock15(x)) return out;
  const T = ny(x);
  for (const s of dayStarts(x, HM(9, 30))) {
    if (T[s]!.hm !== HM(9, 30)) continue;
    const e = atTime(x, s, HM(15, 45));
    if (e < 0 || e - s < 20) continue;
    const hi = x.hiOf(s, s + 1), lo = x.loOf(s, s + 1); // first 30 minutes
    const br = range(10, s + 2).find((k) => x.c[k]! > hi || x.c[k]! < lo);
    if (br === undefined) continue;
    const up = x.c[br]! > hi;
    const run = up ? (x.hiOf(br, e) - hi) / (hi - lo) : (lo - x.loOf(br, e)) / (hi - lo);
    if (run < 1.5) continue;
    out.push({ ds: x.ds, start: s, end: e, pts: { or1: 1, br: br - s, lunch: atTime(x, s, HM(12)) - s, pm: atTime(x, s, HM(15)) - s }, lv: { hi, lo, dir: up ? 1 : -1 }, score: run });
  }
  return out;
};
D["cbdr"] = (x) => {
  const out: Cand[] = [];
  if (!fx15(x)) return out;
  const T = ny(x);
  for (const s of dayStarts(x, HM(14))) {
    if (T[s]!.wd === 5 || T[s]!.wd === 6 || T[s]!.wd === 0) continue;
    const e = atTime(x, s, HM(20));
    if (e < 0 || e - s < 20) continue;
    const hi = x.hiOf(s, e - 1), lo = x.loOf(s, e - 1);
    const w = hi - lo;
    const end = e + 16 * 4; // until 12:00 NY next day
    if (end >= x.n || w > 2.5 * x.atr[s]! * 2) continue;
    const dayHi = x.hiOf(e, end), dayLo = x.loOf(e, end);
    const upSd = (dayHi - hi) / w, dnSd = (lo - dayLo) / w;
    const best = (v: number) => [1, 2, 2.5, 3, 4].reduce((m, q) => (Math.abs(v - q) < Math.abs(v - m) ? q : m), 1);
    const eu = Math.abs(upSd - best(upSd)), ed = Math.abs(dnSd - best(dnSd));
    if (Math.min(eu, ed) > 0.2 || Math.max(upSd, dnSd) < 1.5) continue;
    out.push({ ds: x.ds, start: s, end, pts: { cb1: e - s, lon: atTime(x, e + 30, HM(2)) - s }, lv: { hi, lo, upSd, dnSd }, score: 3 - Math.min(eu, ed) * 10 + Math.max(upSd, dnSd) / 2 });
  }
  return out;
};
D["weekly-profile"] = (x) => {
  const out: Cand[] = [];
  if (!fx1h(x) || !/eurusd|gbpusd/.test(x.ds.id)) return out;
  const T = ny(x);
  for (let i = 1; i < x.n - 130; i++) {
    if (!(T[i]!.wd === 0 && T[i - 1]!.wd !== 0)) continue; // Sunday open
    const e = range(140, i).find((k) => k < x.n && T[k]!.wd === 5 && T[k]!.hm >= HM(16))!;
    if (e === undefined) continue;
    const lowK = range(e - i + 1, i).reduce((m, k) => (x.l[k]! < x.l[m]! ? k : m), i);
    const wd = T[lowK]!.wd;
    if (wd !== 2 && wd !== 3) continue;
    const wkHi = x.hiOf(i, e), wkLo = x.l[lowK]!;
    if ((x.c[e]! - wkLo) / (wkHi - wkLo) < 0.75 || x.o[i]! - wkLo < 0.25 * (wkHi - wkLo)) continue;
    const pts: Record<string, number> = { low: lowK - i };
    for (const [name, d] of [["mon", 1], ["tue", 2], ["wed", 3], ["thu", 4], ["fri", 5]] as const) {
      const k = range(e - i, i).find((q) => T[q]!.wd === d);
      if (k !== undefined) pts[name] = k - i;
    }
    out.push({ ds: x.ds, start: i, end: e, pts, lv: { open: x.o[i]! }, score: (x.c[e]! - wkLo) / (wkHi - wkLo) * 3 + (wkHi - wkLo) / x.atr[i]! / 10 });
  }
  return out;
};
D["lunch"] = (x) => {
  const out: Cand[] = [];
  if (!stock15(x)) return out;
  const T = ny(x);
  for (const s of dayStarts(x, HM(9, 30))) {
    if (T[s]!.hm !== HM(9, 30)) continue;
    const l0 = atTime(x, s, HM(12)), l1 = atTime(x, s, HM(13, 30)), p = atTime(x, s, HM(15)), e = atTime(x, s, HM(15, 45));
    if ([l0, l1, p, e].some((k) => k < 0)) continue;
    const am = x.hiOf(s, l0 - 1) - x.loOf(s, l0 - 1);
    const lunch = x.hiOf(l0, l1 - 1) - x.loOf(l0, l1 - 1);
    const last = Math.abs(x.c[e]! - x.o[p]!);
    if (lunch > 0.35 * am || last < 1.2 * lunch) continue;
    out.push({ ds: x.ds, start: s, end: e, pts: { l0: l0 - s, l1: l1 - s, p: p - s }, score: am / lunch + last / lunch });
  }
  return out;
};
D["nfp"] = (x) => {
  const out: Cand[] = [];
  if (!(x.ds.id === "eurusd-1h" || x.ds.id === "gbpusd-1h" || x.ds.id === "gold-1h")) return out;
  const T = ny(x);
  for (let i = 24; i < x.n - 12; i++) {
    const t = T[i]!;
    // First Friday of the month, the 08:00 NY candle contains the 08:30 release.
    if (t.wd !== 5 || t.hm !== HM(8) || Number(t.d.slice(8)) > 7) continue;
    const atr = x.atr[i - 1]!;
    if (x.range(i) < 3 * atr) continue;
    out.push({ ds: x.ds, start: i - 14, end: i + 10, pts: { news: 14 }, score: x.range(i) / atr });
  }
  return out;
};

// ================================================================== institutional
D["ipda"] = (x) => {
  const out: Cand[] = [];
  if (x.ds.tf !== "1D" || x.ds.id.startsWith("vix")) return out;
  for (let i = 70; i < x.n - 10; i++) {
    const H60 = x.hiOf(i - 60, i - 1);
    if (!(x.h[i]! > H60 && x.c[i]! < H60 + 0.3 * x.atr[i]!)) continue;
    if (x.hiOf(i - 20, i - 1) >= H60) continue; // the 60-day high is older than 20 days
    const drop = (x.h[i]! - x.loOf(i + 1, i + 10)) / x.atr[i]!;
    if (drop < 4) continue;
    out.push({ ds: x.ds, start: i - 65, end: i + 10, pts: { now: 65 }, lv: { H60 }, score: drop });
    i += 20;
  }
  return out;
};
D["mmbm"] = (x0) => {
  const out: Cand[] = [];
  const x = wider(x0, 3);
  const sw = alternating(x);
  for (let k = 0; k + 7 <= sw.length; k++) {
    const s = sw.slice(k, k + 7);
    if (s[0]!.kind !== "H") continue;
    const [H0, L1, H1, L2, H2, L3] = s as ReturnType<typeof alternating>;
    const atr = x.atr[L3!.i]!;
    // Sell program: lower highs and lower lows into the smart money reversal (L3).
    if (!(H1!.p < H0!.p && H2!.p < H1!.p && L2!.p < L1!.p && L3!.p < L2!.p - 0.3 * atr)) continue;
    const mss = findAhead(x, L3!.i + 1, 15, (j) => x.c[j]! > H2!.p);
    if (mss === undefined) continue;
    const back = findAhead(x, mss, 50, (j) => x.h[j]! >= H0!.p - 0.1 * (H0!.p - L3!.p));
    if (back === undefined || back + 4 >= x.n || x.loOf(mss, back) < L3!.p) continue;
    if (back - H0!.i > 100) continue;
    const start = Math.max(0, H0!.i - 12);
    out.push({ ds: x.ds, start, end: back + 4, pts: { H0: H0!.i - start, L1: L1!.i - start, H1: H1!.i - start, L2: L2!.i - start, H2: H2!.i - start, L3: L3!.i - start, mss: mss - start, back: back - start }, score: (H0!.p - L3!.p) / atr / 3 + 3 - (back - H0!.i) / 50 });
  }
  return out;
};
D["reaccumulation"] = (x) => {
  const out: Cand[] = [];
  for (let a = 30; a < x.n - 80; a++) {
    const atr = x.atr[a]!;
    const leg = x.c[a]! - x.loOf(a - 25, a);
    if (leg < 8 * atr || x.h[a]! < x.hiOf(a - 25, a)) continue;
    for (const len of [18, 26, 34]) {
      const b = a + len;
      const top = x.hiOf(a, b), bot = x.loOf(a, b);
      if (top - bot > 0.5 * leg || top > x.h[a]! + 0.5 * atr || bot < x.c[a]! - 0.5 * leg) continue;
      const br = findAhead(x, b + 1, 10, (k) => x.c[k]! > top);
      if (br === undefined || br + 15 >= x.n) continue;
      const run = (x.hiOf(br, br + 15) - top) / leg;
      if (run < 0.5) continue;
      const start = a - 25;
      out.push({ ds: x.ds, start, end: br + 15, pts: { a: 25, b: b - start, br: br - start }, lv: { top, bot }, score: run * 3 + len / 20 });
      a = br;
      break;
    }
  }
  return out;
};

// ================================================================== Wyckoff and volume
function wyckoff(dir: 1 | -1): Detector {
  return (x0) => {
    const out: Cand[] = [];
    if (!(hasVolume(x0) || isStockDaily(x0))) return out;
    const x = wider(x0, 4);
    const S = dir === 1 ? x.swL : x.swH;
    const P = dir === 1 ? x.l : x.h;
    const Q = dir === 1 ? x.h : x.l;
    for (const sc of S) {
      if (sc < 45 || sc + 40 >= x.n) continue;
      const atr = x.atr[sc]!;
      // Trend into the climax, on heavy volume.
      if (dir * (x.c[sc - 40]! - P[sc]!) < 8 * atr) continue;
      if (Math.max(x.v[sc]!, x.v[sc - 1]!, x.v[sc + 1]!) < 1.8 * avgVol(x, sc - 1)) continue;
      // Automatic rally / reaction: the far side of the range.
      const arK = range(18, sc + 3).reduce((m, k) => (k < x.n && dir * (Q[k]! - Q[m]!) > 0 ? k : m), sc + 2);
      const ar = Q[arK]!;
      const height = dir * (ar - P[sc]!);
      if (height < 3 * atr) continue;
      // Spring / UTAD: a false break of the climax extreme that closes back inside.
      const sp = range(80, arK + 8).find((k) => k < x.n - 20 && dir * (P[sc]! - P[k]!) > 0 && dir * (P[sc]! - P[k]!) < 0.5 * height && dir * (x.c[k]! - P[sc]!) > 0);
      if (sp === undefined) continue;
      // Nothing may close beyond the range in between (it must be a range).
      if (range(sp - arK, arK).some((k) => dir * (x.c[k]! - P[sc]!) < -0.1 * atr || dir * (x.c[k]! - ar) > 0.3 * atr)) continue;
      // Secondary test: a return toward the climax between AR and the spring.
      const st = range(sp - arK - 2, arK + 2).find((k) => Math.abs(P[k]! - P[sc]!) < 0.3 * height && (dir === 1 ? x.isSwL.has(k) : x.isSwH.has(k)));
      if (st === undefined) continue;
      const sos = findAhead(x, sp + 1, 30, (k) => dir * (x.c[k]! - ar) > 0);
      if (sos === undefined || sos + 15 >= x.n) continue;
      const lps = range(15, sos + 1).reduce((m, k) => (k < x.n && dir * (P[k]! - P[m]!) < 0 ? k : m), sos + 1);
      if (dir * (P[lps]! - (P[sc]! + ar) / 2) < 0) continue;
      // Phase E: the trend must actually leave the range (markup / markdown) past the SOS extreme.
      const mk = findAhead(x, lps + 1, 20, (k) => dir * (Q[k]! - Q[sos]!) > 0);
      if (mk === undefined || range(mk - lps, lps + 1).some((k) => dir * (x.c[k]! - P[lps]!) < 0)) continue;
      const end = Math.min(x.n - 1, mk + 4);
      const start = Math.max(0, sc - 25);
      if (end - start > 170) continue;
      out.push({ ds: x.ds, start, end, pts: { sc: sc - start, ar: arK - start, st: st - start, sp: sp - start, sos: sos - start, lps: lps - start }, lv: { top: dir === 1 ? ar : P[sc]!, bot: dir === 1 ? P[sc]! : ar }, score: height / atr / 2 + (x.v[sc]! / avgVol(x, sc - 1)) / 2 + 3 - (end - start) / 60 });
    }
    return out;
  };
}
D["wyckoff-acc"] = wyckoff(1);
D["wyckoff-dist"] = wyckoff(-1);
D["delta-divergence"] = (x0) => {
  const out: Cand[] = [];
  if (!hasDelta(x0)) return out;
  const x = wider(x0, 4);
  const cd: number[] = [];
  let s = 0;
  for (let i = 0; i < x.n; i++) cd.push((s += 2 * takerBuy(x, i) - x.v[i]!));
  for (let j = 0; j + 1 < x.swH.length; j++) {
    const A = x.swH[j]!, B = x.swH[j + 1]!;
    const atr = x.atr[B]!;
    if (B - A < 8 || B - A > 35 || x.h[B]! < x.h[A]! + 0.3 * atr) continue;
    const dA = cd[A]! - cd[A - 20]!, dB = cd[B]! - cd[A - 20]!;
    if (!(dB < dA)) continue;
    const drop = (x.h[B]! - x.loOf(B + 1, Math.min(x.n - 1, B + 12))) / atr;
    if (drop < 4 || B + 12 >= x.n) continue;
    const start = A - 20;
    out.push({ ds: x.ds, start, end: B + 12, pts: { A: 20, B: B - start }, score: drop / 2 + (dA - dB) / (Math.abs(dA) + 1e-9) });
  }
  return out;
};
D["absorption"] = (x) => {
  const out: Cand[] = [];
  if (!hasDelta(x)) return out;
  for (let i = 30; i < x.n - 12; i++) {
    const v = x.v[i]!;
    if (v < 2.5 * avgVol(x, i)) continue;
    const sellShare = 1 - takerBuy(x, i) / v;
    if (sellShare < 0.55 || x.c[i]! < x.l[i]! + 0.5 * x.range(i) || !lowestOf(x, i, 15)) continue;
    if (x.loOf(i + 1, i + 10) < x.l[i]!) continue;
    const run = (x.hiOf(i + 1, i + 10) - x.c[i]!) / x.atr[i]!;
    if (run < 3) continue;
    out.push({ ds: x.ds, start: i - 20, end: i + 10, pts: { k: 20 }, score: run + v / avgVol(x, i) / 2 + sellShare * 3 });
    i += 10;
  }
  return out;
};
D["liquidation-cascade"] = (x) => {
  const out: Cand[] = [];
  if (!(hasVolume(x) && x.ds.tf === "1h")) return out;
  for (let i = 30; i < x.n - 10; i++) {
    const atr = x.atr[i - 1]!;
    if (x.range(i) < 4 * atr || x.v[i]! < 4 * avgVol(x, i) || x.lo(i) < 0.45 * x.range(i)) continue;
    out.push({ ds: x.ds, start: i - 20, end: i + 10, pts: { k: 20 }, score: x.range(i) / atr + x.v[i]! / avgVol(x, i) / 3 });
    i += 10;
  }
  return out;
};

// ================================================================== entry models
D["model-2022"] = (x0) => {
  const out: Cand[] = [];
  const x = wider(x0, 3);
  const sw = alternating(x);
  for (let k = 0; k + 3 <= sw.length; k++) {
    const [Lp, LH, Ls] = sw.slice(k, k + 3) as ReturnType<typeof alternating>;
    if (Lp!.kind !== "L") continue;
    const atr = x.atr[Ls!.i]!;
    if (!(Ls!.p < Lp!.p - 0.1 * atr) || (LH!.p - Ls!.p) / atr > 8) continue; // sell-side swept
    const mss = findAhead(x, Ls!.i + 1, 12, (j) => x.c[j]! > LH!.p);
    if (mss === undefined) continue;
    const f = range(mss - Ls!.i + 1, Ls!.i).find((j) => j + 2 <= mss + 1 && bullFvg(x, j, 0.15));
    if (f === undefined) continue;
    const top = x.l[f + 2]!, bot = x.h[f]!;
    const en = findAhead(x, mss + 1, 15, (j) => x.l[j]! <= top);
    if (en === undefined || x.loOf(mss, en) < Ls!.p) continue;
    const sl = Ls!.p;
    const risk = top - sl;
    const tgt = findAhead(x, en, 30, (j) => x.h[j]! >= top + 2 * risk);
    if (tgt === undefined || x.loOf(en, tgt) < sl || tgt + 3 >= x.n) continue;
    const start = Math.max(0, Lp!.i - 12);
    if (tgt + 3 - start > 90) continue;
    out.push({ ds: x.ds, start, end: tgt + 3, pts: { Lp: Lp!.i - start, LH: LH!.i - start, sweep: Ls!.i - start, mss: mss - start, f: f - start, en: en - start, tgt: tgt - start }, lv: { top, bot, sl, tp: top + 2 * risk }, score: (x.hiOf(tgt, tgt + 3) - top) / risk + (top - bot) / atr });
  }
  return out;
};
D["crt"] = (x) => {
  const out: Cand[] = [];
  if (!(x.ds.tf === "4h" || x.ds.tf === "1D")) return out;
  for (let i = 20; i < x.n - 8; i++) {
    const c1 = i - 1;
    const atr = x.atr[c1]!;
    if (x.range(c1) < 1.5 * atr) continue;
    if (!(x.l[i]! < x.l[c1]! && x.c[i]! > x.l[c1]! && x.c[i]! < x.h[c1]!)) continue; // candle 2 raids the low, closes back inside
    const hit = findAhead(x, i + 1, 3, (k) => x.h[k]! >= x.h[c1]!);
    if (hit === undefined || x.loOf(i + 1, hit) < x.l[i]!) continue;
    out.push({ ds: x.ds, start: i - 14, end: i + 7, pts: { c1: 13, c2: 14, hit: hit - (i - 14) }, lv: { hi: x.h[c1]!, lo: x.l[c1]! }, score: x.range(c1) / atr + (x.l[c1]! - x.l[i]!) / atr + (hit === i + 1 ? 1 : 0) });
    i += 5;
  }
  return out;
};

export const ADV_READY = true;
void emaSeries;
void highestOf;

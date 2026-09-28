// Maths and annotation helpers for the advanced lessons (modules 13+). Every
// indicator here is computed from the real stored candles, so what a lesson shows
// is exactly what that indicator printed on that market at that time.
import type { OHLC } from "./build";
import { ema, sma } from "./build";
import type { Note, Tone } from "./types";
import type { Real } from "./real";

// ------------------------------------------------------------------ indicators
export function atrSeries(c: OHLC[], n = 14): number[] {
  const out: number[] = [];
  let a = 0;
  c.forEach(([, h, l], i) => {
    const pc = i ? c[i - 1]![3] : c[0]![3];
    const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    a = i < n ? (a * i + tr) / (i + 1) : (a * (n - 1) + tr) / n;
    out.push(a);
  });
  return out;
}

export function stochastic(c: OHLC[], n = 14, smoothK = 3, d = 3) {
  const raw = c.map((_, i) => {
    if (i < n - 1) return null;
    const w = c.slice(i - n + 1, i + 1);
    const hi = Math.max(...w.map((x) => x[1]));
    const lo = Math.min(...w.map((x) => x[2]));
    return hi === lo ? 50 : ((c[i]![3] - lo) / (hi - lo)) * 100;
  });
  const avg = (v: (number | null)[], k: number): (number | null)[] =>
    v.map((_, i) => {
      if (i < k - 1) return null;
      const w = v.slice(i - k + 1, i + 1);
      return w.some((x) => x == null) ? null : (w as number[]).reduce((s, x) => s + x, 0) / k;
    });
  const K = avg(raw, smoothK);
  return { k: K, d: avg(K, d) };
}

export function adx(c: OHLC[], n = 14) {
  const out = { adx: [] as (number | null)[], pdi: [] as (number | null)[], mdi: [] as (number | null)[] };
  let trS = 0, pS = 0, mS = 0, a = 0;
  c.forEach(([, h, l], i) => {
    if (!i) {
      out.adx.push(null), out.pdi.push(null), out.mdi.push(null);
      return;
    }
    const [, ph, pl, pc] = c[i - 1]!;
    const up = h - ph, dn = pl - l;
    const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    trS = trS - trS / n + tr;
    pS = pS - pS / n + (up > dn && up > 0 ? up : 0);
    mS = mS - mS / n + (dn > up && dn > 0 ? dn : 0);
    const p = (100 * pS) / (trS || 1e-12), m = (100 * mS) / (trS || 1e-12);
    const dx = (100 * Math.abs(p - m)) / (p + m || 1e-12);
    a = i < 2 * n ? (a * (i - 1) + dx) / i : (a * (n - 1) + dx) / n;
    out.adx.push(i < 2 * n ? null : a), out.pdi.push(i < n ? null : p), out.mdi.push(i < n ? null : m);
  });
  return out;
}

/** Ichimoku (9, 26, 52). Spans are shifted 26 candles forward, as on a real chart. */
export function ichimoku(c: OHLC[]) {
  const mid = (i: number, k: number) => {
    if (i < k - 1) return null;
    const w = c.slice(i - k + 1, i + 1);
    return (Math.max(...w.map((x) => x[1])) + Math.min(...w.map((x) => x[2]))) / 2;
  };
  const tenkan = c.map((_, i) => mid(i, 9));
  const kijun = c.map((_, i) => mid(i, 26));
  const spanA = c.map((_, i) => {
    const j = i - 26;
    return j < 0 || tenkan[j] == null || kijun[j] == null ? null : (tenkan[j]! + kijun[j]!) / 2;
  });
  const spanB = c.map((_, i) => (i - 26 < 0 ? null : mid(i - 26, 52)));
  return { tenkan, kijun, spanA, spanB };
}

export function psar(c: OHLC[], step = 0.02, max = 0.2): number[] {
  let up = c[1]![3] > c[0]![3];
  let sar = up ? c[0]![2] : c[0]![1];
  let ep = up ? c[0]![1] : c[0]![2];
  let af = step;
  const out = [sar];
  for (let i = 1; i < c.length; i++) {
    const [, h, l] = c[i]!;
    sar = sar + af * (ep - sar);
    if (up) {
      sar = Math.min(sar, c[i - 1]![2], c[Math.max(0, i - 2)]![2]);
      if (l < sar) [up, sar, ep, af] = [false, ep, l, step];
      else if (h > ep) [ep, af] = [h, Math.min(max, af + step)];
    } else {
      sar = Math.max(sar, c[i - 1]![1], c[Math.max(0, i - 2)]![1]);
      if (h > sar) [up, sar, ep, af] = [true, ep, h, step];
      else if (l < ep) [ep, af] = [l, Math.min(max, af + step)];
    }
    out.push(sar);
  }
  return out;
}

/** Supertrend (ATR 10, multiplier 3): one line that flips sides when price closes through it. */
export function supertrend(c: OHLC[], n = 10, mult = 3): (number | null)[] {
  const a = atrSeries(c, n);
  let upper = 0, lower = 0, dirUp = true;
  return c.map(([, h, l, cl], i) => {
    const mid = (h + l) / 2;
    const bu = mid + mult * a[i]!, bl = mid - mult * a[i]!;
    const pc = i ? c[i - 1]![3] : cl;
    upper = i === 0 || bu < upper || pc > upper ? bu : upper;
    lower = i === 0 || bl > lower || pc < lower ? bl : lower;
    if (dirUp && cl < lower) dirUp = false;
    else if (!dirUp && cl > upper) dirUp = true;
    return i < n ? null : dirUp ? lower : upper;
  });
}

export function obv(c: OHLC[], v: number[]): number[] {
  let s = 0;
  return c.map(([, , , cl], i) => (s += i === 0 ? 0 : cl > c[i - 1]![3] ? v[i]! : cl < c[i - 1]![3] ? -v[i]! : 0));
}

export function cci(c: OHLC[], n = 20): (number | null)[] {
  const tp = c.map(([, h, l, cl]) => (h + l + cl) / 3);
  return tp.map((_, i) => {
    if (i < n - 1) return null;
    const w = tp.slice(i - n + 1, i + 1);
    const m = w.reduce((s, x) => s + x, 0) / n;
    const md = w.reduce((s, x) => s + Math.abs(x - m), 0) / n;
    return (tp[i]! - m) / (0.015 * (md || 1e-12));
  });
}

export function williamsR(c: OHLC[], n = 14): (number | null)[] {
  return c.map((_, i) => {
    if (i < n - 1) return null;
    const w = c.slice(i - n + 1, i + 1);
    const hi = Math.max(...w.map((x) => x[1])), lo = Math.min(...w.map((x) => x[2]));
    return hi === lo ? -50 : ((hi - c[i]![3]) / (hi - lo)) * -100;
  });
}

export function keltner(c: OHLC[], n = 20, mult = 2) {
  const mid = ema(c.map((x) => x[3]), n);
  const a = atrSeries(c, 10);
  return { mid, upper: mid.map((m, i) => (m == null ? null : m + mult * a[i]!)), lower: mid.map((m, i) => (m == null ? null : m - mult * a[i]!)) };
}

export function donchian(c: OHLC[], n = 20) {
  const upper = c.map((_, i) => (i < n ? null : Math.max(...c.slice(i - n, i).map((x) => x[1]))));
  const lower = c.map((_, i) => (i < n ? null : Math.min(...c.slice(i - n, i).map((x) => x[2]))));
  return { upper, lower };
}

/** VWAP anchored at candle `from` (typical price × volume). */
export function anchoredVwap(c: OHLC[], v: number[], from: number): (number | null)[] {
  let pv = 0, vv = 0;
  return c.map(([, h, l, cl], i) => {
    if (i < from) return null;
    pv += ((h + l + cl) / 3) * v[i]!;
    vv += v[i]!;
    return pv / (vv || 1e-12);
  });
}

/** Volume by price: each candle's volume spread evenly over its high–low range. */
export function volumeProfile(c: OHLC[], v: number[], bins = 24) {
  const hi = Math.max(...c.map((x) => x[1])), lo = Math.min(...c.map((x) => x[2]));
  const step = (hi - lo) / bins;
  const vol = new Array<number>(bins).fill(0);
  c.forEach(([, h, l], i) => {
    const a = Math.max(0, Math.floor((l - lo) / step)), b = Math.min(bins - 1, Math.floor((h - lo) / step));
    for (let k = a; k <= b; k++) vol[k]! += v[i]! / (b - a + 1);
  });
  const poc = vol.indexOf(Math.max(...vol));
  // Value area: grow out from the POC until 70% of volume is inside.
  const total = vol.reduce((s, x) => s + x, 0);
  let a = poc, b = poc, inside = vol[poc]!;
  while (inside < 0.7 * total && (a > 0 || b < bins - 1)) {
    const down = a > 0 ? vol[a - 1]! : -1, up = b < bins - 1 ? vol[b + 1]! : -1;
    if (up >= down) inside += vol[++b]!;
    else inside += vol[--a]!;
  }
  const mean = total / bins;
  return {
    bins: vol.map((x, k) => ({ p1: lo + k * step, p2: lo + (k + 1) * step, v: x, color: (k === poc ? "gold" : k >= a && k <= b ? "electric" : "muted") as Tone })),
    poc: lo + (poc + 0.5) * step,
    vah: lo + (b + 1) * step,
    val: lo + a * step,
    hvn: vol.map((x, k) => (x > 1.5 * mean ? lo + (k + 0.5) * step : null)).filter((x): x is number => x !== null),
    lvn: vol.map((x, k) => (x < 0.45 * mean && k > a && k < b ? lo + (k + 0.5) * step : null)).filter((x): x is number => x !== null),
  };
}

/** Renko bricks from closes: a new brick only after price moves a full box size. */
export function renko(closes: number[], box: number): OHLC[] {
  const out: OHLC[] = [];
  let base = closes[0]!;
  for (const c of closes) {
    while (c >= base + box) {
      const prevDown = out.length && out[out.length - 1]![3] < out[out.length - 1]![0];
      if (prevDown && c < base + 2 * box) break; // a reversal needs two boxes
      const o = prevDown ? base + box : base;
      out.push([o, o + box, o, o + box]);
      base = o + box;
    }
    while (c <= base - box) {
      const prevUp = out.length && out[out.length - 1]![3] > out[out.length - 1]![0];
      if (prevUp && c > base - 2 * box) break;
      const o = prevUp ? base - box : base;
      out.push([o, o, o - box, o - box]);
      base = o - box;
    }
  }
  return out;
}

export function heikinAshi(c: OHLC[]): OHLC[] {
  const out: OHLC[] = [];
  c.forEach(([o, h, l, cl], i) => {
    const hc = (o + h + l + cl) / 4;
    const ho = i === 0 ? (o + cl) / 2 : (out[i - 1]![0] + out[i - 1]![3]) / 2;
    out.push([ho, Math.max(h, ho, hc), Math.min(l, ho, hc), hc]);
  });
  return out;
}

export { ema, sma };

// ------------------------------------------------------------------ annotation helpers
/** Label above a candle's high. */
export const hiTag = (r: Real, name: string, text: string, color: Tone = "electric"): Note => ({ k: "label", i: r.i(name), p: r.hi(name), text, color, pos: "above" });
/** Label below a candle's low. */
export const loTag = (r: Real, name: string, text: string, color: Tone = "electric"): Note => ({ k: "label", i: r.i(name), p: r.lo(name), text, color, pos: "below" });
export const vline = (i: number, text?: string, color: Tone = "muted"): Note => (text ? { k: "vline", i, text, color } : { k: "vline", i, color });
export const zone = (i1: number, i2: number, p1: number, p2: number, color: Tone, text?: string): Note => (text ? { k: "zone", i1, i2, p1, p2, color, text } : { k: "zone", i1, i2, p1, p2, color });
export const level = (p: number, text: string, color: Tone = "gold", dash = true, i1?: number, i2?: number): Note => ({ k: "hline", p, text, color, dash, ...(i1 !== undefined ? { i1 } : {}), ...(i2 !== undefined ? { i2 } : {}) });
export const last = (r: Real) => r.candles.length - 1;
/** Highest high / lowest low between two displayed candles. */
export const hiOf = (r: Real, a: number, b: number) => Math.max(...r.candles.slice(a, b + 1).map((x) => x[1]));
export const loOf = (r: Real, a: number, b: number) => Math.min(...r.candles.slice(a, b + 1).map((x) => x[2]));
export const argMax = (r: Real, a: number, b: number) => a + r.candles.slice(a, b + 1).reduce((m, x, k, arr) => (x[1] > arr[m]![1] ? k : m), 0);
export const argMin = (r: Real, a: number, b: number) => a + r.candles.slice(a, b + 1).reduce((m, x, k, arr) => (x[2] < arr[m]![2] ? k : m), 0);

/** Candle index at a New York time (hh:mm) on or after candle `from`, using the stored start time. */
export function atNY(r: Real, hm: string, from = 0): number {
  const step = r.tf === "15m" ? 900 : r.tf === "1h" ? 3600 : r.tf === "4h" ? 14400 : 86400;
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hourCycle: "h23", hour: "2-digit", minute: "2-digit" });
  for (let i = from; i < r.candles.length; i++) if (fmt.format(new Date((r.t0 + i * step) * 1000)) >= hm) return i;
  return r.candles.length - 1;
}

/** Normalise a series to % change from its first value (to overlay two markets). */
export const pctFrom = (v: number[]) => v.map((x) => (x / v[0]! - 1) * 100);

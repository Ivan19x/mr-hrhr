// Builders for academy diagrams: deterministic price paths, candles, and real
// indicator maths (SMA, EMA, RSI, MACD, Bollinger) so examples are accurate.
import { mulberry32 } from "@/engine/transform";

export type OHLC = [number, number, number, number];

/** Close prices that walk between anchor points [index, price] with a little noise. */
export function path(anchors: [number, number][], noise = 0.6, seed = 7): number[] {
  const rng = mulberry32(seed);
  const out: number[] = [];
  for (let a = 0; a < anchors.length - 1; a++) {
    const [i0, p0] = anchors[a]!;
    const [i1, p1] = anchors[a + 1]!;
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / (i1 - i0);
      const wobble = i === i0 ? 0 : (rng() - 0.5) * noise;
      out.push(p0 + (p1 - p0) * t + wobble);
    }
  }
  out.push(anchors[anchors.length - 1]![1]);
  return out;
}

/** Candles whose opens chain from the previous close; wicks scale with `wick`. */
export function candles(closes: number[], wick = 0.5, seed = 11, firstOpen?: number): OHLC[] {
  const rng = mulberry32(seed);
  return closes.map((c, k) => {
    const o = k === 0 ? (firstOpen ?? c - (closes[1]! - c)) : closes[k - 1]!;
    const hi = Math.max(o, c) + rng() * wick;
    const lo = Math.min(o, c) - rng() * wick;
    return [o, hi, lo, c];
  });
}

/** A short trend of candles for pattern context. dir: +1 up, -1 down. */
export function lead(start: number, n: number, dir: 1 | -1, step = 1.4, seed = 3): OHLC[] {
  const closes = Array.from({ length: n }, (_, k) => start + dir * step * (k + 1));
  return candles(closes, 0.5, seed, start);
}

export function sma(v: number[], n: number): (number | null)[] {
  return v.map((_, i) => (i < n - 1 ? null : v.slice(i - n + 1, i + 1).reduce((s, x) => s + x, 0) / n));
}

export function ema(v: number[], n: number): (number | null)[] {
  const k = 2 / (n + 1);
  const out: (number | null)[] = [];
  let prev: number | null = null;
  v.forEach((x, i) => {
    if (i < n - 1) {
      out.push(null);
      return;
    }
    if (prev === null) prev = v.slice(0, n).reduce((s, y) => s + y, 0) / n;
    else prev = x * k + prev * (1 - k);
    out.push(prev);
  });
  return out;
}

export function rsi(v: number[], n = 14): (number | null)[] {
  const out: (number | null)[] = [null];
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < v.length; i++) {
    const d = v[i]! - v[i - 1]!;
    const g = Math.max(d, 0);
    const l = Math.max(-d, 0);
    if (i <= n) {
      gain += g / n;
      loss += l / n;
      out.push(i === n ? 100 - 100 / (1 + gain / (loss || 1e-9)) : null);
    } else {
      gain = (gain * (n - 1) + g) / n;
      loss = (loss * (n - 1) + l) / n;
      out.push(100 - 100 / (1 + gain / (loss || 1e-9)));
    }
  }
  return out;
}

export function macd(v: number[], fast = 12, slow = 26, signal = 9) {
  const f = ema(v, fast);
  const s = ema(v, slow);
  const line = v.map((_, i) => (f[i] != null && s[i] != null ? f[i]! - s[i]! : null));
  const firstIdx = line.findIndex((x) => x !== null);
  const sig: (number | null)[] = line.map(() => null);
  if (firstIdx >= 0) {
    const tail = ema(line.slice(firstIdx) as number[], signal);
    tail.forEach((x, k) => (sig[firstIdx + k] = x));
  }
  const hist = line.map((x, i) => (x !== null && sig[i] != null ? x - sig[i]! : null));
  return { line, signal: sig, hist };
}

export function bollinger(v: number[], n = 20, mult = 2) {
  const mid = sma(v, n);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  v.forEach((_, i) => {
    const m = mid[i];
    if (m == null) {
      upper.push(null);
      lower.push(null);
      return;
    }
    const w = v.slice(i - n + 1, i + 1);
    const sd = Math.sqrt(w.reduce((s, x) => s + (x - m) ** 2, 0) / n);
    upper.push(m + mult * sd);
    lower.push(m - mult * sd);
  });
  return { mid, upper, lower };
}

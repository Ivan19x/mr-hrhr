// Shared chart-pattern detectors used by the extraction scripts
// (extract-examples.ts for lesson charts, build-*-levels.ts for game levels).
export type Row = [number, number, number, number, number, number]; // t o h l c v
export type DS = { id: string; label: string; tf: string; source: string; candles: Row[] };

// ------------------------------------------------------------------ helpers
export type Ctx = {
  ds: DS;
  n: number;
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
  t: number[];
  atr: number[];
  body: (i: number) => number;
  range: (i: number) => number;
  up: (i: number) => number; // upper wick
  lo: (i: number) => number; // lower wick
  bull: (i: number) => boolean;
  trend: (i: number, k: number) => number; // close change over k bars before i, in ATRs
  hiOf: (a: number, b: number) => number;
  loOf: (a: number, b: number) => number;
  swH: number[];
  swL: number[];
  isSwH: Set<number>;
  isSwL: Set<number>;
};

export function ctx(ds: DS, w = 3): Ctx {
  const R = ds.candles;
  const n = R.length;
  const t = R.map((r) => r[0]);
  const o = R.map((r) => r[1]);
  const h = R.map((r) => r[2]);
  const l = R.map((r) => r[3]);
  const c = R.map((r) => r[4]);
  const v = R.map((r) => r[5] ?? 0);
  const tr = R.map((r, i) => (i === 0 ? r[2] - r[3] : Math.max(r[2] - r[3], Math.abs(r[2] - c[i - 1]!), Math.abs(r[3] - c[i - 1]!))));
  const atr: number[] = [];
  let a = tr[0]!;
  tr.forEach((x, i) => {
    a = i < 14 ? (a * i + x) / (i + 1) : (a * 13 + x) / 14;
    atr.push(a || 1e-9);
  });
  const swH: number[] = [];
  const swL: number[] = [];
  for (let i = w; i < n - w; i++) {
    let hi = true;
    let lw = true;
    for (let k = 1; k <= w; k++) {
      if (!(h[i]! > h[i - k]! && h[i]! >= h[i + k]!)) hi = false;
      if (!(l[i]! < l[i - k]! && l[i]! <= l[i + k]!)) lw = false;
    }
    if (hi) swH.push(i);
    if (lw) swL.push(i);
  }
  return {
    ds, n, o, h, l, c, v, t, atr,
    body: (i) => Math.abs(c[i]! - o[i]!),
    range: (i) => Math.max(h[i]! - l[i]!, 1e-12),
    up: (i) => h[i]! - Math.max(o[i]!, c[i]!),
    lo: (i) => Math.min(o[i]!, c[i]!) - l[i]!,
    bull: (i) => c[i]! > o[i]!,
    trend: (i, k) => (i - 1 - k < 0 ? 0 : (c[i - 1]! - c[i - 1 - k]!) / atr[i]!),
    hiOf: (a2, b) => Math.max(...h.slice(Math.max(0, a2), b + 1)),
    loOf: (a2, b) => Math.min(...l.slice(Math.max(0, a2), b + 1)),
    swH, swL, isSwH: new Set(swH), isSwL: new Set(swL),
  };
}

export let CTX: Ctx[] = [];
export let CTX4: Ctx[] = []; // wider swings for chart patterns
/** Build indicator/swing contexts for every dataset (call once after loading data). */
export function loadContexts(all: DS[]): void {
  CTX = all.map((d) => ctx(d));
  CTX4 = all.map((d) => ctx(d, 4));
}

export type Cand = { ds: DS; start: number; end: number; pts: Record<string, number>; lv?: Record<string, number>; score: number; pre?: number };

export const inRange = (x: Ctx, i: number, before: number, after: number) => i - before >= 0 && i + after < x.n;
export const win = (x: Ctx, i: number, before: number, after: number) => ({ start: i - before, end: i + after });

export function rsiSeries(c: number[], n = 14): number[] {
  const out: number[] = [50];
  let g = 0;
  let lo = 0;
  for (let i = 1; i < c.length; i++) {
    const d = c[i]! - c[i - 1]!;
    const G = Math.max(d, 0);
    const L = Math.max(-d, 0);
    if (i <= n) {
      g += G / n;
      lo += L / n;
    } else {
      g = (g * (n - 1) + G) / n;
      lo = (lo * (n - 1) + L) / n;
    }
    out.push(i < n ? 50 : 100 - 100 / (1 + g / (lo || 1e-12)));
  }
  return out;
}
export function smaSeries(c: number[], n: number): (number | null)[] {
  let s = 0;
  return c.map((x, i) => {
    s += x;
    if (i >= n) s -= c[i - n]!;
    return i >= n - 1 ? s / n : null;
  });
}
export function emaSeries(c: number[], n: number): number[] {
  const k = 2 / (n + 1);
  let e = c[0]!;
  return c.map((x) => (e = x * k + e * (1 - k)));
}

// ------------------------------------------------------------------ detectors
export type Detector = (x: Ctx) => Cand[];
export const D: Record<string, Detector> = {};

// Single candles ------------------------------------------------------------
function single(dir: "bull" | "bear", shape: (x: Ctx, i: number) => number | null, before = 14, after = 5): Detector {
  return (x) => {
    const out: Cand[] = [];
    for (let i = 20; i < x.n - 8; i++) {
      if (!inRange(x, i, before, after)) continue;
      const s = shape(x, i);
      if (s === null) continue;
      out.push({ ds: x.ds, ...win(x, i, before, after), pts: { k: before }, score: s });
    }
    return out;
  };
}
export const pct = (x: Ctx, i: number) => x.body(i) / x.range(i);
export const lowestOf = (x: Ctx, i: number, k: number) => x.l[i]! <= x.loOf(i - k, i);
export const highestOf = (x: Ctx, i: number, k: number) => x.h[i]! >= x.hiOf(i - k, i);

D["marubozu-bull"] = single("bull", (x, i) => (x.bull(i) && pct(x, i) >= 0.93 && x.range(i) >= 1.8 * x.atr[i]! ? x.range(i) / x.atr[i]! : null));
D["marubozu-bear"] = single("bear", (x, i) => (!x.bull(i) && pct(x, i) >= 0.93 && x.range(i) >= 1.8 * x.atr[i]! ? x.range(i) / x.atr[i]! : null));
D["doji"] = single("bull", (x, i) => {
  const r = x.range(i);
  if (pct(x, i) > 0.05 || r < 1.1 * x.atr[i]! || x.up(i) < 0.3 * r || x.lo(i) < 0.3 * r || Math.abs(x.trend(i, 8)) < 3) return null;
  return Math.abs(x.trend(i, 8)) / 3 + r / x.atr[i]! - pct(x, i) * 10;
});
D["doji-long"] = single("bull", (x, i) => {
  const r = x.range(i);
  if (pct(x, i) > 0.06 || r < 2.2 * x.atr[i]! || x.up(i) < 0.35 * r || x.lo(i) < 0.35 * r) return null;
  return r / x.atr[i]! - pct(x, i) * 10;
});
D["doji-dragonfly"] = single("bull", (x, i) => {
  const r = x.range(i);
  if (pct(x, i) > 0.07 || x.lo(i) < 0.75 * r || x.up(i) > 0.08 * r || r < 1.3 * x.atr[i]! || x.trend(i, 8) > -2.5 || !lowestOf(x, i, 10)) return null;
  return x.lo(i) / x.atr[i]! + (x.c[i + 4]! - x.c[i]!) / x.atr[i]!;
});
D["doji-gravestone"] = single("bear", (x, i) => {
  const r = x.range(i);
  if (pct(x, i) > 0.07 || x.up(i) < 0.75 * r || x.lo(i) > 0.08 * r || r < 1.3 * x.atr[i]! || x.trend(i, 8) < 2.5 || !highestOf(x, i, 10) || x.bull(i + 1)) return null;
  return x.up(i) / x.atr[i]! + (x.c[i]! - x.c[i + 4]!) / x.atr[i]!;
});
function hammerShape(x: Ctx, i: number) {
  const r = x.range(i);
  const b = x.body(i);
  return b >= 0.12 * r && b <= 0.35 * r && x.lo(i) >= 2.2 * b && x.up(i) <= 0.1 * r && r >= 1.3 * x.atr[i]!;
}
function starShape(x: Ctx, i: number) {
  const r = x.range(i);
  const b = x.body(i);
  return b >= 0.12 * r && b <= 0.35 * r && x.up(i) >= 2.2 * b && x.lo(i) <= 0.1 * r && r >= 1.3 * x.atr[i]!;
}
D["hammer"] = single("bull", (x, i) =>
  hammerShape(x, i) && x.trend(i, 8) <= -3 && lowestOf(x, i, 12) && x.c[i + 1]! > x.c[i]! && x.c[i + 4]! > x.h[i]!
    ? x.lo(i) / x.range(i) * 2 + Math.abs(x.trend(i, 8)) / 3 + (x.c[i + 5]! - x.c[i]!) / x.atr[i]! / 2
    : null,
);
D["hanging-man"] = single("bear", (x, i) =>
  hammerShape(x, i) && x.trend(i, 8) >= 2.5 && highestOf(x, i, 12) && x.c[i + 1]! < x.c[i]! && x.c[i + 4]! < x.c[i]! - x.atr[i]!
    ? x.lo(i) / x.range(i) * 2 + x.trend(i, 8) / 3 + (x.c[i]! - x.c[i + 5]!) / x.atr[i]! / 2
    : null,
);
D["inverted-hammer"] = single("bull", (x, i) =>
  starShape(x, i) && x.trend(i, 8) <= -3 && lowestOf(x, i, 12) && x.c[i + 1]! > x.c[i]! && x.c[i + 4]! > x.h[i]!
    ? x.up(i) / x.range(i) * 2 + Math.abs(x.trend(i, 8)) / 3 + (x.c[i + 5]! - x.c[i]!) / x.atr[i]! / 2
    : null,
);
D["shooting-star"] = single("bear", (x, i) =>
  starShape(x, i) && x.trend(i, 8) >= 3 && highestOf(x, i, 12) && x.c[i + 1]! < x.c[i]! && x.c[i + 4]! < x.l[i]!
    ? x.up(i) / x.range(i) * 2 + x.trend(i, 8) / 3 + (x.c[i]! - x.c[i + 5]!) / x.atr[i]! / 2
    : null,
);
D["spinning-top"] = single("bull", (x, i) => {
  const r = x.range(i);
  const p = pct(x, i);
  if (p < 0.12 || p > 0.3 || x.up(i) < 0.3 * r || x.lo(i) < 0.3 * r || r < 1.1 * x.atr[i]! || Math.abs(x.trend(i, 6)) < 3.5) return null;
  return Math.abs(x.trend(i, 6)) / 3;
}, 12, 4);
D["pin-bar"] = single("bull", (x, i) => {
  const r = x.range(i);
  if (x.lo(i) < 0.66 * r || Math.min(x.o[i]!, x.c[i]!) < x.l[i]! + 0.66 * r || r < 1.6 * x.atr[i]! || !lowestOf(x, i, 20)) return null;
  const rally = (x.hiOf(i + 1, i + 8) - x.h[i]!) / x.atr[i]!;
  return rally >= 2 ? x.lo(i) / x.atr[i]! + rally / 2 : null;
}, 20, 8);

// Two / three candle combos --------------------------------------------------
function combo(test: (x: Ctx, i: number) => number | null, before = 14, after = 5): Detector {
  return (x) => {
    const out: Cand[] = [];
    for (let i = 20; i < x.n - 8; i++) {
      if (!inRange(x, i, before, after)) continue;
      const s = test(x, i);
      if (s !== null) out.push({ ds: x.ds, ...win(x, i, before, after), pts: { k: before }, score: s });
    }
    return out;
  };
}
D["engulfing-bull"] = combo((x, i) => {
  const p = i - 1;
  if (x.bull(p) || !x.bull(i) || x.body(p) < 0.4 * x.atr[i]! || x.body(i) < 1.3 * x.body(p)) return null;
  if (!(x.o[i]! <= x.c[p]! + 0.02 * x.atr[i]! && x.c[i]! > x.o[p]!) || x.trend(p, 8) > -3 || !lowestOf(x, i, 12) || x.c[i + 4]! <= x.c[i]!) return null;
  return x.body(i) / x.body(p) + Math.abs(x.trend(p, 8)) / 3 + (x.c[i + 4]! - x.c[i]!) / x.atr[i]! / 2;
});
D["engulfing-bear"] = combo((x, i) => {
  const p = i - 1;
  if (!x.bull(p) || x.bull(i) || x.body(p) < 0.4 * x.atr[i]! || x.body(i) < 1.3 * x.body(p)) return null;
  if (!(x.o[i]! >= x.c[p]! - 0.02 * x.atr[i]! && x.c[i]! < x.o[p]!) || x.trend(p, 8) < 3 || !highestOf(x, i, 12) || x.c[i + 4]! >= x.c[i]!) return null;
  return x.body(i) / x.body(p) + x.trend(p, 8) / 3 + (x.c[i]! - x.c[i + 4]!) / x.atr[i]! / 2;
});
D["harami-bull"] = combo((x, i) => {
  const p = i - 1;
  if (x.bull(p) || !x.bull(i) || x.body(p) < 1.8 * x.atr[i]! || x.body(i) > 0.35 * x.body(p)) return null;
  if (Math.max(x.o[i]!, x.c[i]!) > x.o[p]! || Math.min(x.o[i]!, x.c[i]!) < x.c[p]! || x.trend(p, 6) > -2.5 || x.c[i + 3]! <= x.h[i]!) return null;
  return x.body(p) / x.atr[i]! + (x.c[i + 4]! - x.c[i]!) / x.atr[i]!;
});
D["harami-bear"] = combo((x, i) => {
  const p = i - 1;
  if (!x.bull(p) || x.bull(i) || x.body(p) < 1.8 * x.atr[i]! || x.body(i) > 0.35 * x.body(p)) return null;
  if (Math.max(x.o[i]!, x.c[i]!) > x.c[p]! || Math.min(x.o[i]!, x.c[i]!) < x.o[p]! || x.trend(p, 6) < 2.5 || x.c[i + 3]! >= x.l[i]!) return null;
  return x.body(p) / x.atr[i]! + (x.c[i]! - x.c[i + 4]!) / x.atr[i]!;
});
D["tweezer-bottom"] = combo((x, i) => {
  const p = i - 1;
  if (Math.abs(x.l[i]! - x.l[p]!) > 0.05 * x.atr[i]! || x.bull(p) || !x.bull(i) || !lowestOf(x, i, 12) || x.trend(p, 8) > -3 || x.c[i + 4]! <= x.h[i]!) return null;
  return Math.abs(x.trend(p, 8)) / 3 + (x.c[i + 4]! - x.c[i]!) / x.atr[i]! + Math.min(x.lo(p), x.lo(i)) / x.atr[i]!;
});
D["tweezer-top"] = combo((x, i) => {
  const p = i - 1;
  if (Math.abs(x.h[i]! - x.h[p]!) > 0.05 * x.atr[i]! || !x.bull(p) || x.bull(i) || !highestOf(x, i, 12) || x.trend(p, 8) < 3 || x.c[i + 4]! >= x.l[i]!) return null;
  return x.trend(p, 8) / 3 + (x.c[i]! - x.c[i + 4]!) / x.atr[i]! + Math.min(x.up(p), x.up(i)) / x.atr[i]!;
});
D["piercing"] = combo((x, i) => {
  const p = i - 1;
  const mid = (x.o[p]! + x.c[p]!) / 2;
  if (x.bull(p) || !x.bull(i) || x.body(p) < 1.2 * x.atr[i]! || x.o[i]! > x.c[p]! || x.c[i]! <= mid || x.c[i]! >= x.o[p]! || x.trend(p, 8) > -2.5) return null;
  return (x.c[i]! - mid) / x.body(p) + (x.c[p]! - x.o[i]!) / x.atr[i]! * 2 + Math.abs(x.trend(p, 8)) / 4;
});
D["dark-cloud"] = combo((x, i) => {
  const p = i - 1;
  const mid = (x.o[p]! + x.c[p]!) / 2;
  if (!x.bull(p) || x.bull(i) || x.body(p) < 1.2 * x.atr[i]! || x.o[i]! < x.c[p]! || x.c[i]! >= mid || x.c[i]! <= x.o[p]! || x.trend(p, 8) < 2.5) return null;
  return (mid - x.c[i]!) / x.body(p) + (x.o[i]! - x.c[p]!) / x.atr[i]! * 2 + x.trend(p, 8) / 4;
});
D["inside-bar"] = combo((x, i) => {
  const p = i - 1;
  if (x.range(p) < 1.8 * x.atr[i]! || x.h[i]! >= x.h[p]! || x.l[i]! <= x.l[p]! || x.range(i) > 0.55 * x.range(p) || x.trend(p, 8) < 2) return null;
  const br = [i + 1, i + 2, i + 3].find((k) => x.c[k]! > x.h[p]!);
  if (br === undefined || x.c[br + 2]! <= x.c[br]!) return null;
  return x.range(p) / x.range(i) + (x.c[br + 2]! - x.h[p]!) / x.atr[i]!;
}, 12, 6);
D["morning-star"] = combo((x, i) => {
  const a = i - 2;
  const b = i - 1;
  if (x.bull(a) || x.body(a) < 1.2 * x.atr[i]! || x.body(b) > 0.45 * x.body(a) || Math.max(x.o[b]!, x.c[b]!) > x.c[a]! + 0.3 * x.atr[i]!) return null;
  if (!x.bull(i) || x.body(i) < 0.9 * x.atr[i]! || x.c[i]! <= (x.o[a]! + x.c[a]!) / 2 || x.trend(a, 8) > -2) return null;
  return x.body(a) / x.atr[i]! + x.body(i) / x.atr[i]! - x.body(b) / x.atr[i]! + (x.c[i + 4]! - x.c[i]!) / x.atr[i]! / 2;
});
D["evening-star"] = combo((x, i) => {
  const a = i - 2;
  const b = i - 1;
  if (!x.bull(a) || x.body(a) < 1.2 * x.atr[i]! || x.body(b) > 0.45 * x.body(a) || Math.min(x.o[b]!, x.c[b]!) < x.c[a]! - 0.3 * x.atr[i]!) return null;
  if (x.bull(i) || x.body(i) < 0.9 * x.atr[i]! || x.c[i]! >= (x.o[a]! + x.c[a]!) / 2 || x.trend(a, 8) < 2) return null;
  return x.body(a) / x.atr[i]! + x.body(i) / x.atr[i]! - x.body(b) / x.atr[i]! + (x.c[i]! - x.c[i + 4]!) / x.atr[i]! / 2;
});
D["three-soldiers"] = combo((x, i) => {
  const ks = [i - 2, i - 1, i];
  if (!ks.every((k) => x.bull(k) && x.body(k) >= 0.8 * x.atr[i]! && x.up(k) <= 0.3 * x.body(k))) return null;
  if (!(x.c[i - 1]! > x.c[i - 2]! && x.c[i]! > x.c[i - 1]!) || x.trend(i - 2, 8) > 0.5) return null;
  return ks.reduce((s, k) => s + x.body(k), 0) / x.atr[i]! - Math.abs(x.trend(i - 2, 8)) / 10;
});
D["three-crows"] = combo((x, i) => {
  const ks = [i - 2, i - 1, i];
  if (!ks.every((k) => !x.bull(k) && x.body(k) >= 0.8 * x.atr[i]! && x.lo(k) <= 0.3 * x.body(k))) return null;
  if (!(x.c[i - 1]! < x.c[i - 2]! && x.c[i]! < x.c[i - 1]!) || x.trend(i - 2, 8) < -0.5) return null;
  return ks.reduce((s, k) => s + x.body(k), 0) / x.atr[i]!;
});
D["momentum-fade"] = combo((x, i) => {
  // 4 green candles with shrinking bodies, then a big red one at i.
  const g = [i - 4, i - 3, i - 2, i - 1];
  if (!g.every((k) => x.bull(k)) || x.bull(i)) return null;
  if (!(x.body(g[0]!) > x.body(g[1]!) && x.body(g[1]!) > x.body(g[2]!) && x.body(g[2]!) > x.body(g[3]!))) return null;
  if (x.body(g[0]!) < 1.4 * x.atr[i]! || x.body(i) < 1.2 * x.atr[i]!) return null;
  return x.body(g[0]!) / x.body(g[3]!) / 3 + x.body(i) / x.atr[i]!;
}, 10, 4);
D["wick-defense"] = (x) => {
  const out: Cand[] = [];
  for (let i = 30; i < x.n - 12; i++) {
    const a = i - 14;
    const floor = x.loOf(a, i);
    const tol = 0.3 * x.atr[i]!;
    const touches = [];
    let ok = true;
    for (let k = a; k <= i; k++) {
      if (x.c[k]! < floor + 0.15 * x.atr[i]!) ok = false; // no close at/below the floor
      if (x.l[k]! <= floor + tol && x.lo(k) >= 0.6 * x.atr[i]!) touches.push(k);
    }
    if (!ok || touches.length < 3 || touches[touches.length - 1]! - touches[0]! < 5) continue;
    const rally = (x.hiOf(i + 1, i + 10) - x.hiOf(a, i)) / x.atr[i]!;
    if (rally < 1.5) continue;
    const pts: Record<string, number> = {};
    touches.forEach((k, j) => (pts[`t${j}`] = k - (a - 4)));
    out.push({ ds: x.ds, start: a - 4, end: i + 8, pts, lv: { floor }, score: touches.length + rally / 2 });
  }
  return out;
};

// Structure ------------------------------------------------------------------
export type Sw = { i: number; p: number; kind: "H" | "L" };
export function alternating(x: Ctx): Sw[] {
  const raw: Sw[] = [...x.swH.map((i) => ({ i, p: x.h[i]!, kind: "H" as const })), ...x.swL.map((i) => ({ i, p: x.l[i]!, kind: "L" as const }))].sort((a, b) => a.i - b.i);
  const out: Sw[] = [];
  for (const s of raw) {
    const last = out[out.length - 1];
    if (last && last.kind === s.kind) {
      if ((s.kind === "H" && s.p > last.p) || (s.kind === "L" && s.p < last.p)) out[out.length - 1] = s;
    } else out.push(s);
  }
  return out;
}
function trendRun(dir: 1 | -1): Detector {
  return (x) => {
    const sw = alternating(x);
    const out: Cand[] = [];
    for (let a = 0; a < sw.length - 6; a++) {
      let b = a + 1;
      while (b < sw.length) {
        const cur = sw[b]!;
        const prevSame = sw[b - 2];
        if (prevSame && dir * (cur.p - prevSame.p) < 0.5 * x.atr[cur.i]!) break;
        b++;
      }
      const run = sw.slice(a, b);
      if (run.length < 6) continue;
      const first = run[0]!.i;
      const last = run[Math.min(run.length, 8) - 1]!.i;
      const len = last - first;
      if (len < 20 || len > 70) continue;
      const pts: Record<string, number> = {};
      const start = Math.max(0, first - 3);
      run.slice(0, 8).forEach((s, k) => (pts[`${s.kind}${k}`] = s.i - start));
      const leg = Math.abs(run[Math.min(run.length, 8) - 1]!.p - run[0]!.p) / x.atr[last]!;
      out.push({ ds: x.ds, start, end: Math.min(x.n - 1, last + 4), pts, score: Math.min(run.length, 8) + leg / 4 - len / 40 });
      a = b - 1;
    }
    return out;
  };
}
D["trend-up"] = trendRun(1);
D["trend-down"] = trendRun(-1);
D["range"] = (x) => {
  const out: Cand[] = [];
  for (let a = 0; a + 45 < x.n; a += 5) {
    const b = a + 45;
    const top = x.hiOf(a, b);
    const bot = x.loOf(a, b);
    const w = (top - bot) / x.atr[b]!;
    if (w < 3 || w > 9) continue;
    const tops = x.swH.filter((i) => i >= a && i <= b && x.h[i]! >= top - 0.5 * x.atr[b]!);
    const bots = x.swL.filter((i) => i >= a && i <= b && x.l[i]! <= bot + 0.5 * x.atr[b]!);
    if (tops.length < 2 || bots.length < 2 || tops.length + bots.length < 5) continue;
    const pts: Record<string, number> = {};
    tops.forEach((i, k) => (pts[`top${k}`] = i - a));
    bots.forEach((i, k) => (pts[`bot${k}`] = i - a));
    out.push({ ds: x.ds, start: a, end: b, pts, lv: { top, bot }, score: tops.length + bots.length - Math.abs(w - 5) / 2 });
  }
  return out;
};
function levelBreak(kind: "retest" | "fakeout"): Detector {
  return (x) => {
    const out: Cand[] = [];
    for (let j = 0; j < x.swH.length - 1; j++) {
      const A = x.swH[j]!;
      const B = x.swH[j + 1]!;
      const atr = x.atr[B]!;
      if (B - A < 5 || B - A > 30 || Math.abs(x.h[A]! - x.h[B]!) > 0.35 * atr) continue;
      const L = Math.max(x.h[A]!, x.h[B]!);
      if (x.loOf(A, B) > L - 2 * atr) continue;
      if (kind === "retest") {
        const br = Array.from({ length: 15 }, (_, k) => B + 1 + k).find((k) => k < x.n && x.c[k]! > L + 0.3 * atr);
        if (br === undefined || br + 20 >= x.n) continue;
        const rt = Array.from({ length: 12 }, (_, k) => br + 2 + k).find((k) => x.l[k]! <= L + 0.5 * atr && x.l[k]! >= L - 0.7 * atr && x.c[k]! > L);
        if (rt === undefined) continue;
        if (x.loOf(br, rt) < L - 0.8 * atr) continue;
        const cont = (x.hiOf(rt + 1, Math.min(x.n - 1, rt + 8)) - L) / atr;
        if (cont < 2.5) continue;
        const start = Math.max(0, A - 12);
        out.push({ ds: x.ds, start, end: Math.min(x.n - 1, rt + 8), pts: { A: A - start, B: B - start, br: br - start, rt: rt - start }, lv: { L }, score: Math.min(cont, 6) / 2 + 3 - Math.abs(x.h[A]! - x.h[B]!) / atr });
      } else {
        const fk = Array.from({ length: 12 }, (_, k) => B + 2 + k).find((k) => k < x.n && x.h[k]! > L + 0.3 * atr && x.c[k]! < L && x.c[k - 1]! < L);
        if (fk === undefined || fk + 12 >= x.n) continue;
        const drop = (L - x.loOf(fk + 1, fk + 10)) / atr;
        if (drop < 3) continue;
        const start = Math.max(0, A - 12);
        out.push({ ds: x.ds, start, end: fk + 11, pts: { A: A - start, B: B - start, fk: fk - start }, lv: { L }, score: drop / 2 + (x.h[fk]! - L) / atr });
      }
    }
    return out;
  };
}
D["breakout-retest"] = levelBreak("retest");
D["fakeout"] = levelBreak("fakeout");
D["liquidity-sweep"] = levelBreak("fakeout"); // equal highs swept, then a drop (picked separately)
D["trendline"] = (x) => {
  const out: Cand[] = [];
  const L = x.swL;
  for (let j = 0; j < L.length - 2; j++) {
    const a = L[j]!;
    const b = L[j + 1]!;
    const c = L[j + 2]!;
    if (b - a < 6 || c - b < 6 || c - a > 55) continue;
    if (!(x.l[b]! > x.l[a]! + 1 * x.atr[b]!)) continue;
    const slope = (x.l[b]! - x.l[a]!) / (b - a);
    const exp = x.l[a]! + slope * (c - a);
    if (Math.abs(x.l[c]! - exp) > 0.3 * x.atr[c]!) continue;
    // No close below the line between a and c.
    let clean = true;
    for (let k = a; k <= c; k++) if (x.c[k]! < x.l[a]! + slope * (k - a) - 0.2 * x.atr[k]!) clean = false;
    if (!clean || c + 8 >= x.n) continue;
    const start = Math.max(0, a - 6);
    out.push({ ds: x.ds, start, end: c + 5, pts: { a: a - start, b: b - start, c: c - start }, score: 4 - Math.abs(x.l[c]! - exp) / x.atr[c]! * 5 + Math.min((x.hiOf(c, c + 5) - x.l[c]!) / x.atr[c]!, 4) / 3 });
  }
  return out;
};
D["bos-choch"] = (x) => {
  const sw = alternating(x);
  const out: Cand[] = [];
  for (let k = 5; k < sw.length - 1; k++) {
    // L0 H1 L2 H3 L4 (uptrend: higher highs & lows), then a close below L4 → CHoCH.
    const [L0, H1, L2, H3, L4] = sw.slice(k - 5, k);
    if (!L0 || L0.kind !== "L" || !H1 || !L2 || !H3 || !L4) continue;
    const atr = x.atr[L4.i]!;
    if (!(L2.p > L0.p + 0.5 * atr && H3.p > H1.p + 0.5 * atr && L4.p > L2.p + 0.5 * atr)) continue;
    const ch = Array.from({ length: 20 }, (_, j) => L4.i + 1 + j).find((j) => j < x.n && x.c[j]! < L4.p);
    if (ch === undefined || ch + 6 >= x.n) continue;
    if (x.hiOf(L4.i, ch) > H3.p + 3 * atr) continue;
    const bos1 = Array.from({ length: 30 }, (_, j) => H1.i + 1 + j).find((j) => x.c[j]! > H1.p);
    if (bos1 === undefined || bos1 > H3.i) continue;
    const drop = (L4.p - x.loOf(ch, ch + 6)) / atr;
    const start = Math.max(0, L0.i - 4);
    if (ch - start > 70) continue;
    out.push({ ds: x.ds, start, end: ch + 6, pts: { L0: L0.i - start, H1: H1.i - start, L2: L2.i - start, H3: H3.i - start, L4: L4.i - start, bos1: bos1 - start, ch: ch - start }, score: drop + 2 });
  }
  return out;
};

// Chart patterns (wider swings) ---------------------------------------------
function doubleTop(dir: 1 | -1): Detector {
  return (x) => {
    const out: Cand[] = [];
    const S = dir === 1 ? x.swH : x.swL;
    const P = dir === 1 ? x.h : x.l;
    for (let j = 0; j < S.length - 1; j++) {
      const A = S[j]!;
      const B = S[j + 1]!;
      const atr = x.atr[B]!;
      if (B - A < 8 || B - A > 40 || Math.abs(P[A]! - P[B]!) > 0.45 * atr) continue;
      const valley = dir === 1 ? x.loOf(A, B) : x.hiOf(A, B);
      if (dir * (P[A]! - valley) < 3 * atr) continue;
      if (dir * (x.c[A]! - x.c[Math.max(0, A - 15)]!) < 3 * atr) continue; // trend into the first top
      const br = Array.from({ length: 18 }, (_, k) => B + 1 + k).find((k) => k < x.n && dir * (x.c[k]! - valley) < 0);
      if (br === undefined || br + 8 >= x.n) continue;
      const start = Math.max(0, A - 16);
      const vi = Array.from({ length: B - A }, (_, k) => A + k).reduce((m, k) => (dir === 1 ? (x.l[k]! < x.l[m]! ? k : m) : x.h[k]! > x.h[m]! ? k : m), A);
      out.push({ ds: x.ds, start, end: br + 8, pts: { A: A - start, B: B - start, V: vi - start, br: br - start }, lv: { neck: valley, top: (P[A]! + P[B]!) / 2 }, score: dir * (P[A]! - valley) / atr - Math.abs(P[A]! - P[B]!) / atr * 3 });
    }
    return out;
  };
}
D["double-top"] = (x) => doubleTop(1)(CTX4[CTX.indexOf(x)]!);
D["double-bottom"] = (x) => doubleTop(-1)(CTX4[CTX.indexOf(x)]!);
D["head-shoulders"] = (x0) => {
  const x = CTX4[CTX.indexOf(x0)]!;
  const sw = alternating(x);
  const out: Cand[] = [];
  for (let k = 0; k < sw.length - 5; k++) {
    const [LS, T1, HD, T2, RS] = sw.slice(k, k + 5);
    if (!LS || LS.kind !== "H" || !T1 || !HD || !T2 || !RS) continue;
    const atr = x.atr[HD.i]!;
    if (HD.p < LS.p + 1.5 * atr || HD.p < RS.p + 1.5 * atr || Math.abs(LS.p - RS.p) > 1.5 * atr || Math.abs(T1.p - T2.p) > 1.2 * atr) continue;
    if (RS.i - LS.i > 60) continue;
    const neckAt = (i: number) => T1.p + ((T2.p - T1.p) * (i - T1.i)) / (T2.i - T1.i);
    const br = Array.from({ length: 15 }, (_, j) => RS.i + 1 + j).find((j) => j < x.n && x.c[j]! < neckAt(j) - 0.2 * atr);
    if (br === undefined || br + 8 >= x.n) continue;
    const start = Math.max(0, LS.i - 12);
    out.push({
      ds: x.ds, start, end: br + 8,
      pts: { LS: LS.i - start, T1: T1.i - start, HD: HD.i - start, T2: T2.i - start, RS: RS.i - start, br: br - start },
      score: (HD.p - Math.max(LS.p, RS.p)) / atr - Math.abs(LS.p - RS.p) / atr - Math.abs(T1.p - T2.p) / atr,
    });
  }
  return out;
};
function triangle(kind: "asc" | "desc" | "sym"): Detector {
  return (x0) => {
    const x = CTX4[CTX.indexOf(x0)]!;
    const out: Cand[] = [];
    for (let a = 0; a + 40 < x.n; a += 3) {
      const b = a + 35;
      const hs = x.swH.filter((i) => i >= a && i <= b);
      const ls = x.swL.filter((i) => i >= a && i <= b);
      if (hs.length < 2 || ls.length < 2) continue;
      const atr = x.atr[b]!;
      const H = hs.map((i) => x.h[i]!);
      const Lw = ls.map((i) => x.l[i]!);
      const flatTop = Math.max(...H) - Math.min(...H) <= 0.5 * atr;
      const flatBot = Math.max(...Lw) - Math.min(...Lw) <= 0.5 * atr;
      const risingLows = Lw.every((p, k) => k === 0 || p > Lw[k - 1]! + 0.6 * atr);
      const fallingHighs = H.every((p, k) => k === 0 || p < H[k - 1]! - 0.6 * atr);
      const ok = kind === "asc" ? flatTop && risingLows : kind === "desc" ? flatBot && fallingHighs : risingLows && fallingHighs;
      if (!ok) continue;
      const last = Math.max(hs[hs.length - 1]!, ls[ls.length - 1]!);
      const top = kind === "sym" ? x.h[hs[hs.length - 1]!]! : Math.max(...H);
      const bot = kind === "sym" ? x.l[ls[ls.length - 1]!]! : Math.min(...Lw);
      const br = Array.from({ length: 12 }, (_, k) => last + 1 + k).find((k) => k < x.n && (kind === "desc" ? x.c[k]! < bot - 0.2 * atr : kind === "asc" ? x.c[k]! > top + 0.2 * atr : x.c[k]! > top + 0.2 * atr || x.c[k]! < bot - 0.2 * atr));
      if (br === undefined || br + 8 >= x.n) continue;
      const start = Math.max(0, Math.min(hs[0]!, ls[0]!) - 10);
      const pts: Record<string, number> = { br: br - start };
      hs.forEach((i, k) => (pts[`h${k}`] = i - start));
      ls.forEach((i, k) => (pts[`l${k}`] = i - start));
      const follow = Math.abs(x.c[br + 6]! - x.c[br]!) / atr;
      out.push({ ds: x.ds, start, end: br + 8, pts, score: hs.length + ls.length + follow / 2 });
      a += 20;
    }
    return out;
  };
}
D["triangle-asc"] = triangle("asc");
D["triangle-desc"] = triangle("desc");
D["triangle-sym"] = triangle("sym");
D["bull-flag"] = (x) => {
  const out: Cand[] = [];
  for (let s = 10; s < x.n - 30; s++) {
    for (let len = 3; len <= 8; len++) {
      const e = s + len;
      const atr = x.atr[s]!;
      const pole = x.h[e]! - x.l[s]!;
      if (pole < 6 * atr || x.h[e]! < x.hiOf(s, e) || x.l[s]! > x.loOf(s, e)) continue;
      // Flag: 5–15 bars that stay below the pole top and retrace ≤ 50%.
      for (let f = 5; f <= 15; f++) {
        const fe = e + f;
        if (fe + 8 >= x.n) break;
        if (x.hiOf(e + 1, fe) > x.h[e]! + 0.2 * atr || x.loOf(e + 1, fe) < x.h[e]! - 0.5 * pole) continue;
        const br = Array.from({ length: 5 }, (_, k) => fe + 1 + k).find((k) => x.c[k]! > x.hiOf(e, fe));
        if (br === undefined) continue;
        const cont = (x.hiOf(br, Math.min(x.n - 1, br + 10)) - x.h[e]!) / pole;
        if (cont < 0.4) continue;
        const start = Math.max(0, s - 10);
        out.push({ ds: x.ds, start, end: Math.min(x.n - 1, br + 5), pts: { s: s - start, e: e - start, fe: fe - start, br: br - start }, lv: { flagTop: x.hiOf(e, fe), flagBot: x.loOf(e + 1, fe) }, score: Math.min(pole / atr, 10) / 3 + Math.min(cont, 1.2) * 2 - (x.h[e]! - x.loOf(e + 1, fe)) / pole });
        break;
      }
    }
  }
  return out;
};
D["rising-wedge"] = (x0) => {
  const x = CTX4[CTX.indexOf(x0)]!;
  const out: Cand[] = [];
  for (let j = 0; j < x.swH.length - 2; j++) {
    const hs = x.swH.slice(j, j + 3);
    if (hs[2]! - hs[0]! > 45 || hs[2]! - hs[0]! < 12) continue;
    const ls = x.swL.filter((i) => i > hs[0]! - 8 && i < hs[2]!).slice(-3);
    if (ls.length < 2) continue;
    const H = hs.map((i) => x.h[i]!);
    const Lw = ls.map((i) => x.l[i]!);
    if (!(H[1]! > H[0]! && H[2]! > H[1]! && Lw.every((p, k) => k === 0 || p > Lw[k - 1]!))) continue;
    const sH = (H[2]! - H[0]!) / (hs[2]! - hs[0]!);
    const sL = (Lw[Lw.length - 1]! - Lw[0]!) / (ls[ls.length - 1]! - ls[0]!);
    if (!(sL > sH * 1.15)) continue; // converging
    const lineAt = (i: number) => Lw[0]! + sL * (i - ls[0]!);
    const br = Array.from({ length: 10 }, (_, k) => hs[2]! + 1 + k).find((k) => k < x.n && x.c[k]! < lineAt(k));
    if (br === undefined || br + 8 >= x.n) continue;
    const drop = (lineAt(br) - x.loOf(br, br + 8)) / x.atr[br]!;
    const start = Math.max(0, Math.min(hs[0]!, ls[0]!) - 8);
    const pts: Record<string, number> = { br: br - start };
    hs.forEach((i, k) => (pts[`h${k}`] = i - start));
    ls.forEach((i, k) => (pts[`l${k}`] = i - start));
    out.push({ ds: x.ds, start, end: br + 8, pts, score: drop + (sL / sH) });
  }
  return out;
};
D["cup-handle"] = (x0) => {
  const x = CTX4[CTX.indexOf(x0)]!;
  const out: Cand[] = [];
  if (x.ds.tf !== "1D") return out;
  for (let j = 0; j < x.swH.length - 1; j++) {
    const A = x.swH[j]!;
    for (let q = j + 1; q < x.swH.length; q++) {
      const B = x.swH[q]!;
      if (B - A < 25) continue;
      if (B - A > 70) break;
      const rim = x.h[A]!;
      if (Math.abs(x.h[B]! - rim) > 0.03 * rim) continue;
      if (x.hiOf(A + 1, B - 1) > Math.max(rim, x.h[B]!)) continue;
      const bottom = x.loOf(A, B);
      const depth = (rim - bottom) / rim;
      if (depth < 0.12 || depth > 0.4) continue;
      // Rounded: many bars spend time in the lower third of the cup.
      let lowBars = 0;
      for (let k = A; k <= B; k++) if (x.c[k]! < bottom + (rim - bottom) / 3) lowBars++;
      if (lowBars < 0.25 * (B - A)) continue;
      // Handle: shallow pullback, then close above the rim.
      const hEnd = Array.from({ length: 15 }, (_, k) => B + 3 + k).find((k) => k < x.n && x.c[k]! > Math.max(rim, x.h[B]!));
      if (hEnd === undefined || hEnd + 8 >= x.n) continue;
      const handleLow = x.loOf(B, hEnd);
      if (rim - handleLow > (rim - bottom) / 2.5) continue;
      const start = Math.max(0, A - 8);
      out.push({ ds: x.ds, start, end: hEnd + 8, pts: { A: A - start, B: B - start, br: hEnd - start }, lv: { rim, bottom }, score: lowBars / (B - A) * 4 + 2 - Math.abs(x.h[B]! - rim) / rim * 30 });
    }
  }
  return out;
};

// Indicators ------------------------------------------------------------------
export const PRE = 60; // extra lead candles stored so indicators are warmed up
D["golden-cross"] = (x) => {
  const s20 = smaSeries(x.c, 20);
  const s50 = smaSeries(x.c, 50);
  const out: Cand[] = [];
  for (let i = PRE + 40; i < x.n - 45; i++) {
    if (s20[i - 1] == null || s50[i - 1] == null || !(s20[i - 1]! <= s50[i - 1]! && s20[i]! > s50[i]!)) continue;
    const atr = x.atr[i]!;
    const fall = (x.hiOf(i - 40, i - 25) - x.loOf(i - 25, i)) / atr;
    const rise = (x.hiOf(i, i + 40) - x.c[i]!) / atr;
    if (fall < 6 || rise < 8) continue;
    const start = i - 45;
    out.push({ ds: x.ds, start, end: i + 40, pre: PRE, pts: { cross: i - start }, score: rise / 2 + fall / 3 });
  }
  return out;
};
D["fib-pullback"] = (x) => {
  const out: Cand[] = [];
  for (const A of x.swL) {
    const Bs = x.swH.filter((b) => b > A && b - A <= 25);
    for (const B of Bs) {
      const atr = x.atr[B]!;
      const leg = x.h[B]! - x.l[A]!;
      if (leg < 7 * atr || x.loOf(A, B) < x.l[A]! || x.hiOf(A, B) > x.h[B]!) continue;
      const Cs = x.swL.filter((cc) => cc > B && cc - B <= 15);
      const C = Cs[0];
      if (C === undefined || x.hiOf(B + 1, C) > x.h[B]!) continue;
      const retr = (x.h[B]! - x.l[C]!) / leg;
      if (retr < 0.55 || retr > 0.72) continue;
      const nh = Array.from({ length: 20 }, (_, k) => C + 1 + k).find((k) => k < x.n && x.c[k]! > x.h[B]!);
      if (nh === undefined || nh + 4 >= x.n) continue;
      const start = Math.max(0, A - 6);
      out.push({ ds: x.ds, start, end: nh + 4, pts: { A: A - start, B: B - start, C: C - start }, score: 3 - Math.abs(retr - 0.618) * 20 + leg / atr / 5 });
    }
  }
  return out;
};
function divergence(dir: 1 | -1): Detector {
  return (x) => {
    const r = rsiSeries(x.c, 14);
    const S = dir === 1 ? x.swH : x.swL;
    const P = dir === 1 ? x.h : x.l;
    const out: Cand[] = [];
    for (let j = 0; j < S.length - 1; j++) {
      const A = S[j]!;
      const B = S[j + 1]!;
      if (B - A < 8 || B - A > 30 || A < PRE) continue;
      const atr = x.atr[B]!;
      if (dir * (P[B]! - P[A]!) < 0.4 * atr) continue; // HH (bear div) / LL (bull div)
      const rd = dir * (r[A]! - r[B]!);
      if (rd < 6) continue;
      if (dir === 1 ? r[A]! < 65 : r[A]! > 35) continue;
      const move = dir * (P[B]! - (dir === 1 ? x.loOf(B, B + 10) : x.hiOf(B, B + 10))) / atr;
      if (move < 4 || B + 10 >= x.n) continue;
      const start = A - 14;
      out.push({ ds: x.ds, start, end: B + 10, pre: PRE, pts: { A: A - start, B: B - start }, score: rd / 5 + move / 2 });
    }
    return out;
  };
}
D["divergence-bear"] = divergence(1);
D["divergence-bull"] = divergence(-1);

// Smart money -------------------------------------------------------------------
D["ob-fvg"] = (x) => {
  const out: Cand[] = [];
  for (let j = 15; j < x.n - 35; j++) {
    const atr = x.atr[j]!;
    if (x.bull(j) || x.body(j) < 0.3 * atr) continue;
    if (!x.bull(j + 1) || x.c[j + 2]! - x.o[j + 1]! < 3 * atr) continue;
    if (!(x.l[j + 2]! > x.h[j]! + 0.2 * atr)) continue; // fair value gap between candle j and j+2
    if (x.loOf(j - 10, j) < x.l[j]! - 0.1 * atr && x.l[j]! > x.loOf(j - 10, j) + 2 * atr) continue; // OB near the local low
    // Price returns into the gap/OB within 25 bars without closing below the OB…
    const top = x.hiOf(j + 1, j + 6);
    const rt = Array.from({ length: 25 }, (_, k) => j + 4 + k).find((k) => x.l[k]! <= x.l[j + 2]! && x.c[k]! > x.l[j]!);
    if (rt === undefined || x.loOf(j + 3, rt) < x.l[j]! - 0.1 * atr) continue;
    // …and then rallies above the displacement high.
    const nh = Array.from({ length: 15 }, (_, k) => rt + 1 + k).find((k) => k < x.n && x.c[k]! > top);
    if (nh === undefined || nh + 4 >= x.n) continue;
    const start = Math.max(0, j - 14);
    out.push({ ds: x.ds, start, end: nh + 4, pts: { ob: j - start, fvg1: j - start, fvg3: j + 2 - start, rt: rt - start }, lv: { obTop: x.h[j]!, obBot: x.l[j]!, fvgTop: x.l[j + 2]!, fvgBot: x.h[j]! }, score: (x.l[j + 2]! - x.h[j]!) / atr + (x.c[j + 2]! - x.o[j + 1]!) / atr / 2 });
  }
  return out;
};
/**
 * Order block + fair value gap for LEVELS (both directions, no look-ahead filter):
 * last opposite candle j, then displacement over j+1..j+2 leaving a gap, then a
 * return into the gap within 25 candles without closing through the order block.
 */
function obFvgLevels(dir: 1 | -1): Detector {
  return (x) => {
    const out: Cand[] = [];
    for (let j = 15; j < x.n - 30; j++) {
      const atr = x.atr[j]!;
      const opp = dir === 1 ? !x.bull(j) : x.bull(j);
      if (!opp || x.body(j) < 0.25 * atr) continue;
      const disp = dir * (x.c[j + 2]! - x.o[j + 1]!);
      if (disp < 2.5 * atr || (dir === 1 ? !x.bull(j + 1) : x.bull(j + 1))) continue;
      const gapOk = dir === 1 ? x.l[j + 2]! > x.h[j]! + 0.1 * atr : x.h[j + 2]! < x.l[j]! - 0.1 * atr;
      if (!gapOk) continue;
      const rt = Array.from({ length: 25 }, (_, k) => j + 4 + k).find((k) =>
        dir === 1 ? x.l[k]! <= x.l[j + 2]! && x.c[k]! > x.l[j]! : x.h[k]! >= x.h[j + 2]! && x.c[k]! < x.h[j]!,
      );
      if (rt === undefined) continue;
      const broke = dir === 1 ? x.loOf(j + 3, rt) < x.l[j]! - 0.1 * atr : x.hiOf(j + 3, rt) > x.h[j]! + 0.1 * atr;
      if (broke) continue;
      const start = Math.max(0, j - 14);
      const fvgTop = dir === 1 ? x.l[j + 2]! : x.l[j]!;
      const fvgBot = dir === 1 ? x.h[j]! : x.h[j + 2]!;
      out.push({
        ds: x.ds, start, end: rt + 2,
        pts: { ob: j - start, fvg1: j - start, fvg3: j + 2 - start, rt: rt - start },
        lv: { obTop: x.h[j]!, obBot: x.l[j]!, fvgTop, fvgBot, dir },
        score: (fvgTop - fvgBot) / atr + disp / atr / 2,
      });
      j += 3;
    }
    return out;
  };
}
D["ob-fvg-bull"] = obFvgLevels(1);
D["ob-fvg-bear"] = obFvgLevels(-1);

D["premium-discount"] = (x) => {
  const out: Cand[] = [];
  for (const A of x.swL) {
    for (const B of x.swH.filter((b) => b > A && b - A <= 20)) {
      const atr = x.atr[B]!;
      const leg = x.h[B]! - x.l[A]!;
      if (leg < 6 * atr || x.loOf(A, B) < x.l[A]! || x.hiOf(A, B) > x.h[B]!) continue;
      const C = x.swL.find((cc) => cc > B && cc - B <= 12);
      if (C === undefined || x.hiOf(B + 1, C) > x.h[B]!) continue;
      const retr = (x.h[B]! - x.l[C]!) / leg;
      if (retr < 0.6 || retr > 0.85) continue;
      const nh = Array.from({ length: 20 }, (_, k) => C + 1 + k).find((k) => k < x.n && x.c[k]! > x.h[B]!);
      if (nh === undefined || nh + 3 >= x.n) continue;
      const start = Math.max(0, A - 5);
      out.push({ ds: x.ds, start, end: nh + 3, pts: { A: A - start, B: B - start, C: C - start }, score: Math.min(leg / atr, 12) / 4 + (retr > 0.7 ? 1 : 0) });
    }
  }
  return out;
};

// Strategies ---------------------------------------------------------------------
D["ema-pullback"] = (x) => {
  const e = emaSeries(x.c, 20);
  const out: Cand[] = [];
  for (let i = PRE + 20; i < x.n - 15; i++) {
    const atr = x.atr[i]!;
    let above = 0;
    for (let k = i - 15; k < i - 2; k++) if (x.l[k]! > e[k]!) above++;
    if (above < 11 || e[i]! <= e[i - 15]! + 3 * atr) continue;
    if (!(x.l[i]! <= e[i]! + 0.1 * atr && x.c[i]! > e[i]! && x.bull(i))) continue;
    const nh = (x.hiOf(i + 1, i + 12) - x.hiOf(i - 10, i)) / atr;
    if (nh < 2) continue;
    const start = i - 30;
    out.push({ ds: x.ds, start, end: i + 12, pre: PRE, pts: { pull: i - start }, score: nh + above / 5 });
    i += 10;
  }
  return out;
};
D["london-breakout"] = (x) => {
  const out: Cand[] = [];
  if (!x.ds.id.includes("15m") || x.ds.source !== "yahoo") return out;
  const hourOf = (i: number) => new Date(x.t[i]! * 1000).getUTCHours();
  for (let i = 1; i < x.n - 60; i++) {
    if (!(hourOf(i) === 0 && hourOf(i - 1) !== 0)) continue;
    const asia: number[] = [];
    let k = i;
    while (k < x.n && hourOf(k) < 7) asia.push(k++);
    if (asia.length < 20) continue;
    const hi = x.hiOf(asia[0]!, asia[asia.length - 1]!);
    const lo = x.loOf(asia[0]!, asia[asia.length - 1]!);
    const atr = x.atr[k]!;
    const width = (hi - lo) / atr;
    if (width < 3 || width > 9) continue;
    const br = Array.from({ length: 14 }, (_, j) => k + 1 + j).find((j) => x.c[j]! > hi || x.c[j]! < lo);
    if (br === undefined || hourOf(br) < 7 || hourOf(br) > 10) continue;
    const up = x.c[br]! > hi;
    const run = up ? (x.hiOf(br, br + 16) - hi) / (hi - lo) : (lo - x.loOf(br, br + 16)) / (hi - lo);
    if (run < 1.2) continue;
    const start = asia[0]! - 4;
    out.push({ ds: x.ds, start, end: br + 16, pts: { a0: 4, a1: asia[asia.length - 1]! - start, open: k - start, br: br - start }, lv: { hi, lo }, score: run + 1 - width / 10 });
  }
  return out;
};
D["tf-15m"] = (x) => {
  const out: Cand[] = [];
  if (x.ds.id !== "btcusdt-15m") return out;
  const hourOf = (i: number) => new Date(x.t[i]! * 1000).getUTCMinutes();
  for (let i = 0; i + 16 < x.n; i++) {
    if (hourOf(i) !== 0) continue;
    const agg = [0, 1, 2, 3].map((q) => ({ o: x.o[i + q * 4]!, c: x.c[i + q * 4 + 3]! }));
    const pattern = agg[0]!.c < agg[0]!.o && agg[1]!.c > agg[1]!.o && agg[2]!.c > agg[2]!.o && agg[3]!.c < agg[3]!.o;
    if (!pattern) continue;
    const move = Math.abs(agg[2]!.c - agg[0]!.o) / x.atr[i]!;
    out.push({ ds: x.ds, start: i, end: i + 15, pts: {}, score: move + (x.hiOf(i, i + 15) - x.loOf(i, i + 15)) / x.atr[i]! / 3 });
  }
  return out;
};


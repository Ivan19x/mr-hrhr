// Real chart sections pre-cut from market history (scripts/extract-examples.ts).
// Each example stores only the candles needed for one lesson concept, plus the
// key points the detector found (e.g. the hammer candle, both tops of a double top).
import raw from "../real/examples.json";
import type { OHLC } from "./build";
import type { DiagramSpec, Note } from "./types";

type Example = {
  label: string;
  tf: string;
  t0: number;
  t1: number;
  pre: number; // leading candles kept only to warm up indicators
  rows: number[][];
  pts: Record<string, number>;
  lv: Record<string, number>;
  alt?: { label: string; rows: number[][] };
};

const EX = raw as unknown as Record<string, Example>;

export type Real = {
  /** Candles to display (indicator warm-up excluded). */
  candles: OHLC[];
  /** All stored candles, including warm-up (for indicators). */
  all: OHLC[];
  closes: number[];
  pre: number;
  volume?: number[];
  /** Aggressive (taker) buy volume per candle, when stored: delta = 2 × takerBuy − volume. */
  takerBuy?: number[];
  /** A second market over the same candles (e.g. GBP/USD beside EUR/USD). */
  alt?: { label: string; candles: OHLC[] };
  tf: string;
  /** Unix time of the first displayed candle. */
  t0: number;
  pts: Record<string, number>;
  lv: Record<string, number>;
  source: string;
  /** Price at a point: high or low of the candle at index `name`. */
  hi: (name: string) => number;
  lo: (name: string) => number;
  i: (name: string) => number;
};

const TF: Record<string, string> = { "15m": "15-minute", "1h": "1-hour", "4h": "4-hour", "1D": "daily" };

export function real(id: string): Real {
  const e = EX[id];
  if (!e) throw new Error(`Missing real example: ${id}`);
  const all = e.rows.map((r) => [r[0]!, r[1]!, r[2]!, r[3]!] as OHLC);
  const candles = all.slice(e.pre);
  const volume = e.rows[0]!.length > 4 ? e.rows.slice(e.pre).map((r) => r[4]!) : undefined;
  const takerBuy = e.rows[0]!.length > 5 ? e.rows.slice(e.pre).map((r) => r[5]!) : undefined;
  const alt = e.alt ? { label: e.alt.label, candles: e.alt.rows.slice(e.pre).map((r) => [r[0]!, r[1]!, r[2]!, r[3]!] as OHLC) } : undefined;
  const date = new Date(e.t0 * 1000).toLocaleDateString("en-GB", { month: "short", year: "numeric", ...(e.tf === "1D" ? {} : { day: "numeric" }) });
  const i = (name: string) => {
    const v = e.pts[name];
    if (v === undefined) throw new Error(`Example ${id} has no point ${name}`);
    return v;
  };
  return {
    candles,
    all,
    closes: candles.map((c) => c[3]),
    pre: e.pre,
    ...(volume ? { volume } : {}),
    ...(takerBuy ? { takerBuy } : {}),
    ...(alt ? { alt } : {}),
    tf: e.tf,
    t0: e.t0,
    pts: e.pts,
    lv: e.lv,
    source: `Real chart · ${e.label} · ${TF[e.tf] ?? e.tf} · ${date}`,
    hi: (name) => candles[i(name)]![1],
    lo: (name) => candles[i(name)]![2],
    i,
  };
}

/** Diagram spec for a real example with extra notes. */
export function realSpec(id: string, notes: (r: Real) => Note[] = () => [], extra: Partial<DiagramSpec> = {}): DiagramSpec {
  const r = real(id);
  return { candles: r.candles, notes: notes(r), source: r.source, ...extra };
}

/** Drop the warm-up part of an indicator series so it lines up with displayed candles. */
export function visible<T>(r: Real, series: T[]): T[] {
  return series.slice(r.pre);
}

/** Swing points of a trend example in order: { name, i, kind: "H" | "L" }. */
export function swings(r: Real): { name: string; i: number; kind: "H" | "L" }[] {
  return Object.entries(r.pts)
    .filter(([k]) => /^[HL]\d+$/.test(k))
    .map(([name, i]) => ({ name, i, kind: name[0] as "H" | "L" }))
    .sort((a, b) => a.i - b.i);
}

/** A few candles around point `name` (for close-up galleries). */
export function closeUp(id: string, name = "k", before = 6, after = 3): DiagramSpec & { candles: OHLC[]; k: number } {
  const r = real(id);
  const k = r.i(name);
  const a = Math.max(0, k - before);
  return { candles: r.candles.slice(a, k + after + 1), source: r.source.replace("Real chart · ", ""), k: k - a };
}

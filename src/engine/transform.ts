// Anti-cheat client transform: randomly flip the chart vertically and rescale
// prices by a random factor. The same transform applies to the answer key,
// logical SL range, and correct direction. The seed is stored in the ActionLog.
import type { Candle, Level, MarkType } from "@/types/game";

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Transform = { seed: number; flipped: boolean; scale: number; mid: number };

export function makeTransform(seed: number, candles: Candle[], allowFlip = true): Transform {
  const rng = mulberry32(seed);
  const flipped = rng() < 0.5 && allowFlip;
  const scale = 0.5 + rng() * 2.5; // 0.5x – 3x
  const hi = Math.max(...candles.map((c) => c.h));
  const lo = Math.min(...candles.map((c) => c.l));
  return { seed, flipped, scale, mid: (hi + lo) / 2 };
}

export function txPrice(t: Transform, p: number): number {
  const flipped = t.flipped ? 2 * t.mid - p : p;
  return flipped * t.scale;
}

export function txCandle(t: Transform, c: Candle): Candle {
  const o = txPrice(t, c.o);
  const h = txPrice(t, c.h);
  const l = txPrice(t, c.l);
  const cl = txPrice(t, c.c);
  return {
    i: c.i,
    o,
    c: cl,
    h: Math.max(h, l),
    l: Math.min(h, l),
  };
}

export function txCandles(t: Transform, candles: Candle[]): Candle[] {
  return candles.map((c) => txCandle(t, c));
}

export function txDirection(t: Transform, d: "buy" | "sell"): "buy" | "sell" {
  if (!t.flipped) return d;
  return d === "buy" ? "sell" : "buy";
}

// Word pairs swapped in level text when the chart is flipped upside down.
const FLIP_WORDS: [string, string][] = [
  ["high", "low"],
  ["highs", "lows"],
  ["above", "below"],
  ["up", "down"],
  ["uptrend", "downtrend"],
  ["buyers", "sellers"],
  ["buy", "sell"],
  ["bullish", "bearish"],
  ["peak", "trough"],
  ["higher", "lower"],
  ["rally", "drop"],
  ["top", "bottom"],
  ["rise", "fall"],
  ["rising", "falling"],
  ["decline", "rally"],
  ["green", "red"],
  ["support", "resistance"],
];
const FLIP_MAP = new Map<string, string>();
for (const [a, b] of FLIP_WORDS) {
  FLIP_MAP.set(a, b);
  FLIP_MAP.set(b, a);
}

// Multi-word names that mirror each other when a chart is turned upside down.
const FLIP_PHRASES: [string, string][] = [
  ["upper wick", "lower wick"],
  ["inverted hammer", "hanging man"],
  ["hammer", "shooting star"],
  ["morning star", "evening star"],
  ["piercing line", "dark cloud cover"],
  ["dragonfly", "gravestone"],
  ["three white soldiers", "three black crows"],
];

/** Swap directional words ("high" ↔ "low", "buyers" ↔ "sellers", "hammer" ↔ "shooting star", …), keeping capitalisation. */
export function flipText(text: string): string {
  // Phrases first, via placeholders so a swap isn't swapped back.
  const holders: string[] = [];
  let out = text;
  for (const [a, b] of FLIP_PHRASES) {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ] as const) {
      out = out.replace(new RegExp(`\\b${from}\\b`, "gi"), (m) => {
        const rep = m[0] === m[0]!.toUpperCase() ? to[0]!.toUpperCase() + to.slice(1) : to;
        holders.push(rep);
        return `\u0000${holders.length - 1}\u0000`;
      });
    }
  }
  return swapWords(out).replace(/\u0000(\d+)\u0000/g, (_, k) => holders[Number(k)]!);
}

function swapWords(text: string): string {
  return text.replace(/[A-Za-z]+/g, (w) => {
    const swap = FLIP_MAP.get(w.toLowerCase());
    if (!swap) return w;
    if (w === w.toUpperCase() && w.length > 1) return swap.toUpperCase();
    if (w[0] === w[0]!.toUpperCase()) return swap[0]!.toUpperCase() + swap.slice(1);
    return swap;
  });
}

const FLIP_TYPE: Partial<Record<MarkType, MarkType>> = { SWING_HIGH: "SWING_LOW", SWING_LOW: "SWING_HIGH" };

/**
 * Transform a whole level (candles, answer key, SL range, direction, hint, text).
 * Tutorial levels are never flipped so they match the tutorial's example.
 */
export function transformLevel(level: Level, seed: number): Level {
  const t = makeTransform(seed, level.candles, level.difficulty !== "tutorial");
  const text = (s: string) => (t.flipped ? flipText(s) : s);
  return {
    ...level,
    candles: txCandles(t, level.candles),
    answerKey: level.answerKey.map((m) => ({
      ...m,
      type: t.flipped ? (FLIP_TYPE[m.type] ?? m.type) : m.type,
      p1: txPrice(t, m.p1),
      p2: m.p2 !== undefined ? txPrice(t, m.p2) : undefined,
    })),
    questions: level.questions.map((q) =>
      q.kind === "mcq" ? { ...q, prompt: text(q.prompt), options: q.options.map(text) } : { ...q, prompt: text(q.prompt) },
    ),
    explanation: text(level.explanation),
    correctDirection: txDirection(t, level.correctDirection),
    logicalSL: t.flipped
      ? { min: txPrice(t, level.logicalSL.max), max: txPrice(t, level.logicalSL.min) }
      : { min: txPrice(t, level.logicalSL.min), max: txPrice(t, level.logicalSL.max) },
    hintArea: level.hintArea
      ? {
          ...level.hintArea,
          p1: txPrice(t, level.hintArea.p1),
          p2: txPrice(t, level.hintArea.p2),
        }
      : undefined,
  };
}

// Finds real Break of Structure setups in historical OHLC data and turns them
// into playable levels. Pure TS with relative imports only, so the Node build
// script (scripts/build-levels.ts) can run it directly.
import type { AnswerMark, Candle, Level, Question } from "../types/game";

/** Raw dataset row: [unixSeconds, open, high, low, close]. */
export type Row = [number, number, number, number, number];
export type Dataset = { id: string; label: string; tf: string; source: string; candles: Row[] };

export type Setup = {
  datasetId: string;
  dir: "bull" | "bear";
  swing: number; // index of the broken swing point
  pull: number; // index of the pullback extreme between swing and break
  prevSwing: number; // the swing before (proves HL / LH structure)
  brk: number; // index of the first candle closing through the swing
  atr: number;
  entry: number;
  sl: number;
  tp: number;
  won: boolean; // TP (2R) reached before SL
  barsToExit: number;
  clarity: number; // leg size into the break, in ATRs
  displacement: number; // break candle body, in ATRs
  noise: number; // average wick share of candles in the window (0 = clean)
};

const W = 3; // fractal half-width for swings
const BEFORE = 60; // candles shown before the break (max)
const AFTER = 40; // candles kept for the outcome

function atrAt(c: Row[], i: number, n = 14): number {
  let s = 0;
  let k = 0;
  for (let j = Math.max(1, i - n + 1); j <= i; j++) {
    const [, , h, l] = c[j]!;
    const pc = c[j - 1]![4];
    s += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    k++;
  }
  return k ? s / k : c[i]![2] - c[i]![3];
}

function isHigh(c: Row[], i: number) {
  if (i < W || i >= c.length - W) return false;
  for (let k = 1; k <= W; k++) if (c[i]![2] <= c[i - k]![2] || c[i]![2] < c[i + k]![2]) return false;
  return true;
}
function isLow(c: Row[], i: number) {
  if (i < W || i >= c.length - W) return false;
  for (let k = 1; k <= W; k++) if (c[i]![3] >= c[i - k]![3] || c[i]![3] > c[i + k]![3]) return false;
  return true;
}

/** Every continuation BOS in the dataset (bullish and bearish). */
export function findSetups(ds: Dataset): Setup[] {
  const c = ds.candles;
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = 0; i < c.length; i++) {
    if (isHigh(c, i)) highs.push(i);
    if (isLow(c, i)) lows.push(i);
  }
  const out: Setup[] = [];
  const used = new Set<string>();

  for (let i = 30; i < c.length - 12; i++) {
    const close = c[i]![4];
    const prevClose = c[i - 1]![4];
    const atr = atrAt(c, i - 1);
    for (const dir of ["bull", "bear"] as const) {
      const pool = dir === "bull" ? highs : lows;
      // Last swing confirmed before this candle (needs W candles after it).
      const confirmed = pool.filter((s) => s + W < i && i - s <= 40);
      const s = confirmed[confirmed.length - 1];
      if (s === undefined || used.has(`${dir}${s}`)) continue;
      const level = dir === "bull" ? c[s]![2] : c[s]![3];
      const crossed = dir === "bull" ? close > level && prevClose <= level : close < level && prevClose >= level;
      if (!crossed) continue;
      // Price must not have closed through the level between s and i.
      let clean = true;
      for (let j = s + 1; j < i; j++) if (dir === "bull" ? c[j]![4] > level : c[j]![4] < level) clean = false;
      if (!clean) continue;

      // Pullback extreme between the swing and the break.
      let pull = s + 1;
      for (let j = s + 1; j < i; j++) {
        if (dir === "bull" ? c[j]![3] < c[pull]![3] : c[j]![2] > c[pull]![2]) pull = j;
      }
      const pullPrice = dir === "bull" ? c[pull]![3] : c[pull]![2];
      const depth = Math.abs(level - pullPrice);
      if (depth < 1.2 * atr || i - s < 4) continue;

      // Structure before the swing: a higher low (bull) / lower high (bear).
      const other = dir === "bull" ? lows : highs;
      const prev = [...other].reverse().find((k) => k < s && s - k <= 30);
      if (prev === undefined) continue;
      const prevPrice = dir === "bull" ? c[prev]![3] : c[prev]![2];
      if (dir === "bull" ? prevPrice >= pullPrice : prevPrice <= pullPrice) continue;
      // The chart window must include the earlier swing, plus the full outcome.
      if (i - prev > BEFORE - 5 || i + AFTER >= c.length) continue;

      // Trade plan: enter at the break close, stop beyond the pullback, 2R target.
      const sl = dir === "bull" ? pullPrice - 0.25 * atr : pullPrice + 0.25 * atr;
      const risk = Math.abs(close - sl);
      if (risk > 5 * atr || risk < 0.8 * atr) continue;
      const tp = dir === "bull" ? close + 2 * risk : close - 2 * risk;
      let won = false;
      let barsToExit = AFTER;
      for (let j = i + 1; j < Math.min(c.length, i + AFTER); j++) {
        const [, , h, l] = c[j]!;
        const hitSl = dir === "bull" ? l <= sl : h >= sl;
        const hitTp = dir === "bull" ? h >= tp : l <= tp;
        if (hitSl) {
          barsToExit = j - i;
          break;
        }
        if (hitTp) {
          won = true;
          barsToExit = j - i;
          break;
        }
      }

      const start = Math.max(0, i - BEFORE);
      let wick = 0;
      for (let j = start; j <= i; j++) {
        const [, o, h, l, cl] = c[j]!;
        wick += h - l > 0 ? 1 - Math.abs(cl - o) / (h - l) : 1;
      }
      used.add(`${dir}${s}`);
      out.push({
        datasetId: ds.id,
        dir,
        swing: s,
        pull,
        prevSwing: prev,
        brk: i,
        atr,
        entry: close,
        sl,
        tp,
        won,
        barsToExit,
        clarity: depth / atr,
        displacement: Math.abs(close - c[i]![1]) / atr,
        noise: wick / (i - start + 1),
      });
    }
  }
  return out;
}

/** How "textbook" a setup is: higher = cleaner. */
export function cleanliness(s: Setup): number {
  return s.displacement * 1.2 + Math.min(s.clarity, 4) * 0.6 - s.noise * 3 + (s.won ? 1.5 : 0);
}

const TF_WORDS: Record<string, string> = { "15m": "15-minute", "1h": "1-hour", "4h": "4-hour", "1D": "daily" };

/** Build a playable level from a real setup. */
export function setupToLevel(ds: Dataset, s: Setup, id: string, difficulty: Level["difficulty"]): Level {
  const bull = s.dir === "bull";
  const start = Math.max(0, s.brk - BEFORE);
  const end = Math.min(ds.candles.length - 1, s.brk + AFTER);
  const rows = ds.candles.slice(start, end + 1);
  const candles: Candle[] = rows.map(([, o, h, l, c], k) => ({ i: k, o, h, l, c }));
  const at = (k: number) => k - start;
  const swingPrice = bull ? ds.candles[s.swing]![2] : ds.candles[s.swing]![3];
  const pullPrice = bull ? ds.candles[s.pull]![3] : ds.candles[s.pull]![2];
  const price = ds.candles[s.brk]![4];
  // Mark tolerance scales with volatility (≈ half an ATR), not a fixed %.
  const pricePct = Math.max(0.02, ((0.6 * s.atr) / price) * 100);
  const tol = { candles: 2, pricePct };
  const answerKey: AnswerMark[] = [
    { id: "k-swing", type: bull ? "SWING_HIGH" : "SWING_LOW", i1: at(s.swing), p1: swingPrice, tolerance: tol },
    { id: "k-bos", type: "BOS", i1: at(s.swing), i2: at(s.brk), p1: swingPrice, tolerance: { candles: 3, pricePct } },
    { id: "k-pull", type: bull ? "SWING_LOW" : "SWING_HIGH", i1: at(s.pull), p1: pullPrice, tolerance: tol },
  ];
  const questions: Question[] = [
    {
      id: "q1",
      kind: "mcq",
      prompt: "What did price just do at the marked level?",
      options: ["Broke a key swing point with a candle close", "Formed a perfect double top", "Hit a round number and stopped", "Nothing: it's random noise"],
      correctIndex: 0,
    },
    {
      id: "q2",
      kind: "truefalse",
      prompt: bull ? "A close above the last swing high confirms buyers are in control." : "A close below the last swing low confirms sellers are in control.",
      correct: true,
    },
    {
      id: "q3",
      kind: "tap",
      prompt: bull ? "Tap the candle that closed above the swing high." : "Tap the candle that closed below the swing low.",
      correctCandle: at(s.brk),
      toleranceCandles: 1,
    },
  ];
  const tf = TF_WORDS[ds.tf] ?? ds.tf;
  const outcome = s.won
    ? `In reality price reached the 2R target ${s.barsToExit} candle${s.barsToExit === 1 ? "" : "s"} later.`
    : s.barsToExit < AFTER
      ? `In reality this one failed: price hit the stop ${s.barsToExit} candles later. Good setups still lose sometimes, and that's why risk management matters.`
      : "In reality price didn't reach the 2R target or the stop within the next 40 candles.";
  const explanation = bull
    ? `Price was making **higher lows**, formed a **swing high**, then pulled back. The candle that **closed above** that swing high is the **Break of Structure (BOS)**: buyers are still in control. The logical stop sits below the pullback low, with a 2R target. ${outcome}`
    : `Price was making **lower highs**, formed a **swing low**, then pulled back. The candle that **closed below** that swing low is the **Break of Structure (BOS)**: sellers are still in control. The logical stop sits above the pullback high, with a 2R target. ${outcome}`;
  const buf = s.atr;
  return {
    id,
    tier: 2,
    strategyId: "bos",
    difficulty,
    candles,
    decisionIndex: at(s.brk),
    answerKey,
    correctDirection: bull ? "buy" : "sell",
    logicalSL: bull ? { min: pullPrice - 1.5 * buf, max: pullPrice + 0.1 * buf } : { min: pullPrice - 0.1 * buf, max: pullPrice + 1.5 * buf },
    questions,
    explanation,
    hintArea:
      difficulty === "easy" || difficulty === "tutorial"
        ? { i1: Math.max(0, at(s.swing) - 2), i2: at(s.brk) + 1, p1: swingPrice - 0.5 * s.atr, p2: swingPrice + 0.5 * s.atr }
        : undefined,
    version: 2,
    source: {
      label: ds.label,
      timeframe: tf,
      from: rows[0]![0],
      to: rows[rows.length - 1]![0],
      decisionTime: ds.candles[s.brk]![0],
    },
  };
}

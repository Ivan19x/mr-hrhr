// Builds Tier 1 · Candlesticks: 11 playable levels cut from REAL charts.
//   node scripts/build-candle-levels.ts        (after scripts/fetch-charts.mjs)
// Each level: the replay stops on the candle that completes a real pattern.
// The player marks it, trades it (stop beyond the pattern, 2R target), answers
// questions, then sees what the real market did next.
// Output: src/data/real/levels/candles.json (compact; the raw cache can then be deleted).
// Run scripts/build-all-levels.ts afterwards to refresh the level index.
import { readFile, writeFile } from "node:fs/promises";
import { CTX, D, isMacro, loadContexts, type Cand, type DS } from "./detect.ts";
import type { AnswerMark, Candle, Level, Question } from "../src/types/game.ts";

const CACHE = new URL("./.cache/charts/", import.meta.url);
const index: { id: string }[] = JSON.parse(await readFile(new URL("index.json", CACHE), "utf8"));
const all: DS[] = [];
for (const { id } of index) if (!isMacro(id)) all.push(JSON.parse(await readFile(new URL(`${id}.json`, CACHE), "utf8")));
loadContexts(all);

type Pattern = {
  id: string; // detector id
  name: string;
  dir: "buy" | "sell";
  len: 1 | 2 | 3;
  truth: string; // a true statement about the pattern
  lie: string; // a false statement about the pattern
  story: string; // explanation (bold with **)
};

const P: Record<string, Pattern> = {
  "engulfing-bull": {
    id: "engulfing-bull", name: "Bullish engulfing", dir: "buy", len: 2,
    truth: "The green body completely covers the previous red body.",
    lie: "A bullish engulfing needs the green candle to have no wicks at all.",
    story: "Price was falling, then a **green candle's body swallowed the previous red body**. Buyers didn't just stop the drop, they erased the whole previous period. That's a **bullish engulfing** at a low.",
  },
  "engulfing-bear": {
    id: "engulfing-bear", name: "Bearish engulfing", dir: "sell", len: 2,
    truth: "The red body completely covers the previous green body.",
    lie: "A bearish engulfing is strongest in the middle of a range.",
    story: "Price was rising, then a **red candle's body swallowed the previous green body**. Sellers erased the whole previous period. That's a **bearish engulfing** at a high.",
  },
  hammer: {
    id: "hammer", name: "Hammer", dir: "buy", len: 1,
    truth: "The long lower wick shows sellers pushed down but buyers rejected those prices.",
    lie: "A hammer is a bearish signal after a decline.",
    story: "After a decline, sellers drove price much lower, but **buyers rejected the low and closed near the top**: a small body with a **long lower wick**. That's a **hammer**. The stop belongs below the wick.",
  },
  "shooting-star": {
    id: "shooting-star", name: "Shooting star", dir: "sell", len: 1,
    truth: "The long upper wick shows buyers pushed up but sellers rejected those prices.",
    lie: "A shooting star is a bullish signal after a rally.",
    story: "After a rally, buyers pushed to new highs, but **sellers slammed price back down**: a small body with a **long upper wick**. That's a **shooting star**. The stop belongs above the wick.",
  },
  "morning-star": {
    id: "morning-star", name: "Morning star", dir: "buy", len: 3,
    truth: "The small middle candle shows the selling had stalled before buyers took over.",
    lie: "A morning star needs three red candles in a row.",
    story: "A big red candle, then a **small indecision candle** at the low, then a **strong green candle** closing back into the first body. That three-candle turn is a **morning star**.",
  },
  "evening-star": {
    id: "evening-star", name: "Evening star", dir: "sell", len: 3,
    truth: "The small middle candle shows the buying had stalled before sellers took over.",
    lie: "An evening star appears at the bottom of a downtrend.",
    story: "A big green candle, then a **small indecision candle** at the high, then a **strong red candle** closing back into the first body. That three-candle turn is an **evening star**.",
  },
  "doji-gravestone": {
    id: "doji-gravestone", name: "Gravestone doji", dir: "sell", len: 1,
    truth: "Open and close are at the low: buyers reached a high but could not hold it.",
    lie: "A gravestone doji has a long lower wick.",
    story: "After a rise, buyers pushed far higher, but price **closed right back at the open, at the low**. That's a **gravestone doji**: complete rejection of higher prices.",
  },
  "pin-bar": {
    id: "pin-bar", name: "Bullish pin bar", dir: "buy", len: 1,
    truth: "The long 'nose' poked to a new low and was rejected.",
    lie: "A pin bar's nose points in the direction price is likely to go next.",
    story: "At the low of a decline a candle printed a **long nose below everything around it** and closed near its high. That's a **bullish pin bar**: price is likely to move away from the nose.",
  },
  "harami-bear": {
    id: "harami-bear", name: "Bearish harami", dir: "sell", len: 2,
    truth: "The small red body sits inside the previous big green body.",
    lie: "A harami is stronger than an engulfing pattern.",
    story: "A big green candle was followed by a **small red body inside it**. The rally suddenly stalled. That's a **bearish harami**, a warning that needs confirmation.",
  },
  "tweezer-top": {
    id: "tweezer-top", name: "Tweezer top", dir: "sell", len: 2,
    truth: "Two candles failed at exactly the same high.",
    lie: "A tweezer top has two matching lows.",
    story: "Two candles in a row hit the **same high** and failed. Buyers were rejected twice at one price. That's a **tweezer top**.",
  },
  piercing: {
    id: "piercing", name: "Piercing line", dir: "buy", len: 2,
    truth: "The green candle closed above the midpoint of the red candle's body.",
    lie: "A piercing line closes below the red candle's low.",
    story: "After a red candle, the next candle opened low but **closed above the middle of the red body**. Buyers fought back hard. That's a **piercing line**.",
  },
};

const DISTRACTORS = ["Bullish engulfing", "Bearish engulfing", "Hammer", "Shooting star", "Morning star", "Evening star", "Gravestone doji", "Bullish pin bar", "Bearish harami", "Tweezer top", "Piercing line", "Doji", "Spinning top", "Marubozu"];

// Level plan: easy = clean textbook, medium = more context, hard = noisier.
const PLAN: { slot: string; difficulty: Level["difficulty"]; pattern: string; rank: "top" | "mid" | "low"; loss?: boolean }[] = [
  { slot: "tutorial", difficulty: "tutorial", pattern: "engulfing-bull", rank: "top" },
  { slot: "easy-1", difficulty: "easy", pattern: "hammer", rank: "top" },
  { slot: "easy-2", difficulty: "easy", pattern: "engulfing-bull", rank: "top" },
  { slot: "easy-3", difficulty: "easy", pattern: "shooting-star", rank: "top" },
  { slot: "medium-1", difficulty: "medium", pattern: "engulfing-bear", rank: "mid" },
  { slot: "medium-2", difficulty: "medium", pattern: "morning-star", rank: "top" },
  { slot: "medium-3", difficulty: "medium", pattern: "doji-gravestone", rank: "mid" },
  { slot: "hard-1", difficulty: "hard", pattern: "pin-bar", rank: "mid" },
  { slot: "hard-2", difficulty: "hard", pattern: "harami-bear", rank: "mid" },
  { slot: "hard-3", difficulty: "hard", pattern: "tweezer-top", rank: "low", loss: true },
  { slot: "exam", difficulty: "exam", pattern: "piercing", rank: "mid" },
];

const BEFORE = 45;
const AFTER = 25;
const round = (v: number) => Number(v.toPrecision(6));
const used = new Set<string>();

function outcome(ds: DS, k: number, dir: "buy" | "sell", sl: number, tp: number) {
  for (let j = k + 1; j <= Math.min(ds.candles.length - 1, k + AFTER); j++) {
    const [, , h, l] = ds.candles[j]!;
    if (dir === "buy" ? l <= sl : h >= sl) return { won: false, bars: j - k };
    if (dir === "buy" ? h >= tp : l <= tp) return { won: true, bars: j - k };
  }
  return { won: false, bars: AFTER + 1 };
}

function build(slot: (typeof PLAN)[number], n: number): Level {
  const pat = P[slot.pattern]!;
  const cands: (Cand & { k: number; atr: number; sl: number; tp: number; won: boolean; bars: number })[] = [];
  for (const x of CTX) {
    for (const c of D[pat.id]!(x)) {
      const k = c.start + c.pts["k"]!;
      if (k - BEFORE < 0 || k + AFTER >= x.n) continue;
      const atr = x.atr[k]!;
      const lo = Math.min(...Array.from({ length: pat.len }, (_, j) => x.l[k - j]!));
      const hi = Math.max(...Array.from({ length: pat.len }, (_, j) => x.h[k - j]!));
      const entry = x.c[k]!;
      const sl = pat.dir === "buy" ? lo - 0.25 * atr : hi + 0.25 * atr;
      const risk = Math.abs(entry - sl);
      if (risk > 4 * atr) continue;
      const tp = pat.dir === "buy" ? entry + 2 * risk : entry - 2 * risk;
      const o = outcome(x.ds, k, pat.dir, sl, tp);
      if (slot.loss ? o.won : !o.won) continue; // wins, except the level that teaches a real loss
      cands.push({ ...c, k, atr, sl, tp, won: o.won, bars: o.bars });
    }
  }
  cands.sort((a, b) => b.score - a.score);
  // Skip the single best example (it's used in the Academy lesson), then pick by band.
  const pool = cands.length > 3 ? cands.slice(1) : cands;
  const band = slot.rank === "top" ? pool : slot.rank === "mid" ? pool.slice(Math.floor(pool.length * 0.2)) : pool.slice(Math.floor(pool.length * 0.5));
  const pick = band.find((c) => !used.has(`${c.ds.id}:${Math.round(c.k / 80)}`)) ?? pool[0];
  if (!pick) throw new Error(`No real ${pat.name} for ${slot.slot}`);
  used.add(`${pick.ds.id}:${Math.round(pick.k / 80)}`);

  const ds = pick.ds;
  const start = pick.k - BEFORE;
  const rows = ds.candles.slice(start, pick.k + AFTER + 1);
  const candles: Candle[] = rows.map(([, o, h, l, c], i) => ({ i, o: round(o), h: round(h), l: round(l), c: round(c) }));
  const k = BEFORE;
  const lo = Math.min(...Array.from({ length: pat.len }, (_, j) => candles[k - j]!.l));
  const hi = Math.max(...Array.from({ length: pat.len }, (_, j) => candles[k - j]!.h));
  const answerKey: AnswerMark[] = [
    { id: "k-pat", type: "PATTERN", i1: k, p1: candles[k]!.c, tolerance: { candles: pat.len - 1, pricePct: 100 } },
  ];
  // Multiple choice: the right name + 3 others, in a stable shuffled order.
  const others = DISTRACTORS.filter((d) => d !== pat.name).sort((a, b) => ((a.length * 7 + n) % 5) - ((b.length * 7 + n) % 5)).slice(0, 3);
  const at = n % 4;
  const options = [...others];
  options.splice(at, 0, pat.name);
  const trueFirst = n % 2 === 0;
  const questions: Question[] = [
    { id: "q1", kind: "mcq", prompt: "Which candlestick pattern just completed?", options, correctIndex: at },
    { id: "q2", kind: "truefalse", prompt: trueFirst ? pat.truth : pat.lie, correct: trueFirst },
    {
      id: "q3",
      kind: "tap",
      prompt: pat.len === 1 ? `Tap the ${pat.name.toLowerCase()} candle.` : `Tap the candle that completed the ${pat.name.toLowerCase()}.`,
      correctCandle: k,
      toleranceCandles: 0,
    },
  ];
  const outcomeText = pick.won
    ? `In reality price reached the 2R target ${pick.bars} candle${pick.bars === 1 ? "" : "s"} later.`
    : pick.bars <= AFTER
      ? `In reality this one failed: price hit the stop ${pick.bars} candles later. Patterns are probabilities, not guarantees, which is why every trade needs a stop.`
      : "In reality price reached neither the 2R target nor the stop within the next 25 candles.";
  const TF: Record<string, string> = { "15m": "15-minute", "1h": "1-hour", "4h": "4-hour", "1D": "daily" };
  const buf = pick.atr;
  return {
    id: `t1-candles-${slot.slot}`,
    tier: 1,
    strategyId: "candles",
    difficulty: slot.difficulty,
    candles,
    decisionIndex: k,
    answerKey,
    correctDirection: pat.dir,
    logicalSL: pat.dir === "buy" ? { min: lo - 1.5 * buf, max: lo + 0.1 * buf } : { min: hi - 0.1 * buf, max: hi + 1.5 * buf },
    questions,
    explanation: `${pat.story} The logical trade is to ${pat.dir === "buy" ? "buy" : "sell"} with the stop ${pat.dir === "buy" ? "below the pattern's low" : "above the pattern's high"} and a 2R target. ${outcomeText}`,
    hintArea:
      slot.difficulty === "easy" || slot.difficulty === "tutorial"
        ? { i1: k - pat.len + 1, i2: k, p1: lo, p2: hi }
        : undefined,
    version: 1,
    source: { label: ds.label, timeframe: TF[ds.tf] ?? ds.tf, from: rows[0]![0], to: rows[rows.length - 1]![0], decisionTime: ds.candles[pick.k]![0] },
  };
}

const levels = PLAN.map((slot, n) => {
  const l = build(slot, n);
  console.log(`✓ ${l.id.padEnd(24)} ${P[slot.pattern]!.name.padEnd(18)} ← ${l.source!.label} ${l.source!.timeframe}`);
  return l;
});
const compact = levels.map(({ candles, ...rest }) => ({ ...rest, rows: candles.map((c) => [c.o, c.h, c.l, c.c]) }));
await writeFile(new URL("../src/data/real/levels/candles.json", import.meta.url), JSON.stringify(compact));
console.log(`\nWrote ${levels.length} Candlestick levels from real charts.`);

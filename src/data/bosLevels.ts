// Break of Structure content: tutorial + 3 easy + 3 medium + 3 hard + exam,
// built from real charts. The seeded generator below is only a fallback for
// Practice mode when the real chart files can't be loaded.
import type { Candle, Level } from "@/types/game";
import { mulberry32 } from "@/engine/transform";

type GenOpts = {
  seed: number;
  noise: number; // 0 = clean, 1 = messy
  direction: "bull" | "bear";
  fakeout?: boolean;
};

type GenResult = {
  candles: Candle[];
  decisionIndex: number;
  swingIdx: number; // broken swing candle index
  swingPrice: number; // broken swing price
  pullbackIdx: number;
  pullbackPrice: number;
  breakIdx: number;
  slMin: number;
  slMax: number;
  entry: number;
  tp: number;
};

/** Generate a realistic BOS setup: trend → swing → pullback → break → continuation. */
function genBosSeries(opts: GenOpts): GenResult {
  const rng = mulberry32(opts.seed);
  const bull = opts.direction === "bull";
  const candles: Candle[] = [];
  let price = 100;
  const vol = 1 + opts.noise * 1.6;

  const push = (drift: number) => {
    const o = price;
    const move = drift + (rng() - 0.5) * vol;
    const c = o + move;
    const h = Math.max(o, c) + rng() * vol * 0.6;
    const l = Math.min(o, c) - rng() * vol * 0.6;
    candles.push({ i: candles.length, o, h, l, c });
    price = c;
  };

  // Phase 1: trend leg up/down (12 candles)
  for (let k = 0; k < 12; k++) push((bull ? 1 : -1) * (0.9 + rng() * 0.7));
  const swingIdx = candles.length - 1;
  const swingPrice = bull ? candles[swingIdx]!.h : candles[swingIdx]!.l;

  // Phase 2: pullback (6 candles), with optional fake-out noise
  for (let k = 0; k < 6; k++) {
    push((bull ? -1 : 1) * (0.55 + rng() * 0.4) + (opts.fakeout ? (rng() - 0.5) * 2 : 0));
  }
  const pullbackIdx = candles.length - 1;
  const pullbackPrice = bull ? candles[pullbackIdx]!.l : candles[pullbackIdx]!.h;

  // Phase 3: the break — strong candles through the swing (4 candles)
  const leg = Math.abs(swingPrice - pullbackPrice);
  for (let k = 0; k < 4; k++) push((bull ? 1 : -1) * (leg / 3.2 + rng() * 0.5));
  const breakIdx = candles.length - 1;

  // Decision point: price has clearly broken the swing.
  const decisionIndex = candles.length - 1;
  const entry = candles[decisionIndex]!.c;

  // Phase 4: outcome — continuation to TP (8 candles), small wobble
  for (let k = 0; k < 8; k++) push((bull ? 1 : -1) * (0.8 + rng() * 0.6));

  const buf = vol * 0.4;
  const slMin = bull ? pullbackPrice - buf : pullbackPrice - buf * 0.2;
  const slMax = bull ? pullbackPrice + buf * 0.2 : pullbackPrice + buf;
  const risk = Math.abs(entry - pullbackPrice);
  const tp = bull ? entry + risk * 2 : entry - risk * 2;

  return { candles, decisionIndex, swingIdx, swingPrice, pullbackIdx, pullbackPrice, breakIdx, slMin, slMax, entry, tp };
}

function makeLevel(
  idSuffix: string,
  difficulty: Level["difficulty"],
  opts: GenOpts,
  extra?: Partial<Level>,
): Level {
  const g = genBosSeries(opts);
  const bull = opts.direction === "bull";
  const dir: "buy" | "sell" = bull ? "buy" : "sell";
  const swingType = bull ? "SWING_HIGH" : "SWING_LOW";
  const tol = { candles: 2, pricePct: 1.5 };

  const level: Level = {
    id: `t2-bos-${idSuffix}`,
    tier: 2,
    strategyId: "bos",
    difficulty,
    candles: g.candles,
    decisionIndex: g.decisionIndex,
    answerKey: [
      { id: "k-swing", type: swingType, i1: g.swingIdx, p1: g.swingPrice, tolerance: tol },
      { id: "k-bos", type: "BOS", i1: g.swingIdx, i2: g.breakIdx, p1: g.swingPrice, tolerance: { candles: 3, pricePct: 1.5 } },
      { id: "k-pull", type: bull ? "SWING_LOW" : "SWING_HIGH", i1: g.pullbackIdx, p1: g.pullbackPrice, tolerance: tol },
    ],
    correctDirection: dir,
    logicalSL: { min: Math.min(g.slMin, g.slMax), max: Math.max(g.slMin, g.slMax) },
    questions: [
      {
        id: "q1",
        kind: "mcq",
        prompt: "What did price just do at the marked level?",
        options: [
          "Broke a key swing point with momentum",
          "Formed a perfect double top",
          "Hit a round number and stopped",
          "Nothing — it's random noise",
        ],
        correctIndex: 0,
      },
      {
        id: "q2",
        kind: "truefalse",
        prompt: bull
          ? "A break of the swing high confirms buyers are in control."
          : "A break of the swing low confirms sellers are in control.",
        correct: true,
      },
      {
        id: "q3",
        kind: "tap",
        prompt: bull
          ? "Tap the candle where price broke above the swing high."
          : "Tap the candle where price broke below the swing low.",
        correctCandle: g.breakIdx,
        toleranceCandles: 2,
      },
    ],
    explanation: bull
      ? `Price trended up, formed a **swing high**, then pulled back. The strong close through that swing high is a **Break of Structure (BOS)** — proof buyers still control the market. The logical stop sits below the pullback low; targeting 2R keeps the trade worth taking.`
      : `Price trended down, formed a **swing low**, then pulled back. The strong close through that swing low is a **Break of Structure (BOS)** — proof sellers still control the market. The logical stop sits above the pullback high; targeting 2R keeps the trade worth taking.`,
    hintArea:
      difficulty === "easy" || difficulty === "tutorial"
        ? {
            i1: Math.max(0, g.swingIdx - 2),
            i2: g.breakIdx + 1,
            p1: g.swingPrice * 0.995,
            p2: g.swingPrice * 1.005,
          }
        : undefined,
    version: 1,
    ...extra,
  };
  return level;
}



/** A fresh random BOS chart for Practice mode (not part of the campaign). */
export function makePracticeLevel(seed: number): Level {
  const rng = mulberry32(seed);
  const direction = rng() < 0.5 ? "bull" : "bear";
  const noise = 0.1 + rng() * 0.8;
  return makeLevel(`practice-${seed}`, "medium", { seed, noise, direction, fakeout: rng() < 0.4 });
}

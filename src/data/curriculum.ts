import type { Strategy, Tier } from "@/types/game";

export const TIERS: Tier[] = [
  { tier: 1, name: "Foundations", premium: false },
  { tier: 2, name: "Market Structure", premium: false },
  { tier: 3, name: "Smart Money Concepts", premium: false },
  { tier: 4, name: "Combined Setups", premium: false },
];

export const STRATEGIES: Strategy[] = [
  { id: "candles", name: "Candlesticks", tier: 1, premium: false, description: "Read what each candle is telling you, on real charts.", playable: true },
  { id: "trends", name: "Trends", tier: 1, premium: false, description: "Trade with the flow, not against it.", playable: true },
  { id: "sr", name: "Support & Resistance", tier: 1, premium: false, description: "The levels price remembers.", playable: true },
  { id: "sltp", name: "Stop Loss & Take Profit", tier: 1, premium: false, description: "Protect the downside, bank the upside.", playable: true },
  { id: "rr", name: "Risk-to-Reward", tier: 1, premium: false, description: "Only take trades worth taking.", playable: true },
  { id: "swings", name: "Swing Highs & Lows", tier: 2, premium: false, description: "The skeleton of every chart.", playable: true },
  { id: "bos", name: "Break of Structure", tier: 2, premium: false, description: "Spot the moment a trend proves itself — or breaks.", playable: true },
  { id: "choch", name: "Change of Character", tier: 2, premium: false, description: "The first whisper of a reversal.", playable: true },
  { id: "contrev", name: "Continuation vs Reversal", tier: 2, premium: false, description: "Is the move pausing or ending?", playable: true },
  { id: "fvg", name: "Fair Value Gaps", tier: 3, premium: false, description: "Trade the imbalances price leaves behind.", playable: true },
  { id: "orderblocks", name: "Order Blocks", tier: 3, premium: false, description: "Where the big players loaded up.", playable: true },
  { id: "liquidity", name: "Liquidity Sweeps", tier: 3, premium: false, description: "Stop hunts and how to ride them.", playable: true },
  { id: "premiumdiscount", name: "Premium & Discount Zones", tier: 3, premium: false, description: "Buy cheap, sell dear — measured.", playable: true },
  { id: "mtf", name: "Multi-Timeframe Analysis", tier: 4, premium: false, description: "Align the big picture with the entry.", playable: true },
  { id: "sessions", name: "Trading Sessions", tier: 4, premium: false, description: "London and New York move markets.", playable: true },
  { id: "confluence", name: "Confluence", tier: 4, premium: false, description: "Stack reasons until the trade is obvious.", playable: true },
];

const MAJOR_NAMES = ["Intern", "Junior Analyst", "Analyst", "Trader", "Senior Trader", "Fund Manager"] as const;
const ROMAN = ["I", "II", "III"] as const;

/** XP needed for rank step k (0–17). Grows steeply: Trader I ≈ 7,000 XP, Fund Manager III ≈ 21,000 XP. */
const stepXp = (k: number) => (k === 0 ? 0 : Math.round((150 * Math.pow(k, 1.75)) / 10) * 10);

/** 18 steps: each major rank has three sub-ranks (I, II, III). */
export const RANK_STEPS = MAJOR_NAMES.flatMap((major, m) =>
  ROMAN.map((roman, sub) => ({ name: `${major} ${roman}`, major: m, majorName: major, sub, minXp: stepXp(m * 3 + sub) })),
);

/** Major ranks (first sub-rank's threshold). */
export const RANKS = MAJOR_NAMES.map((name, m) => ({ name, minXp: RANK_STEPS[m * 3]!.minXp }));

export function rankForXp(xp: number) {
  let step = 0;
  for (let k = 0; k < RANK_STEPS.length; k++) if (xp >= RANK_STEPS[k]!.minXp) step = k;
  const cur = RANK_STEPS[step]!;
  const next = RANK_STEPS[step + 1];
  return {
    step,
    index: cur.major, // major rank 0–5 (badge design)
    sub: cur.sub, // 0–2
    name: cur.name, // e.g. "Analyst II"
    majorName: cur.majorName,
    minXp: cur.minXp,
    nextXp: next?.minXp ?? null,
    nextName: next?.name ?? null,
    progress: next ? (xp - cur.minXp) / (next.minXp - cur.minXp) : 1,
  };
}

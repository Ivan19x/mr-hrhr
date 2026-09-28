// Builds every playable strategy's levels from REAL charts (Tier 1 → Tier 4), except
// Candlesticks (scripts/build-candle-levels.ts). Pass strategy ids to rebuild only those.
//   node scripts/build-all-levels.ts        (after scripts/fetch-charts.mjs)
// Per strategy: tutorial + 3 easy + 3 medium + 3 hard + exam = 11 levels.
// Output (compact): src/data/real/levels/<strategy>.json + src/data/real/levelIndex.json
// The raw cache (scripts/.cache) can be deleted afterwards.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { CTX, D, isMacro, loadContexts, type Cand, type Ctx, type DS } from "./detect.ts";
import { findSetups, setupToLevel, cleanliness, type Dataset } from "../src/engine/setups.ts";
import type { AnswerMark, Level, MarkType, Question } from "../src/types/game.ts";

const CACHE = new URL("./.cache/charts/", import.meta.url);
const index: { id: string }[] = JSON.parse(await readFile(new URL("index.json", CACHE), "utf8"));
const all: DS[] = [];
for (const { id } of index) if (!isMacro(id)) all.push(JSON.parse(await readFile(new URL(`${id}.json`, CACHE), "utf8")));
loadContexts(all);

const TF: Record<string, string> = { "15m": "15-minute", "1h": "1-hour", "4h": "4-hour", "1D": "daily" };
const AFTER = 25;
const round = (v: number) => Number(v.toPrecision(6));

// ------------------------------------------------------------------ setup model
type KeyMark = { id: string; type: MarkType; i1: number; i2?: number; p1: number; p2?: number };
type Setup = {
  x: Ctx;
  k: number; // decision candle (absolute index)
  dir: "buy" | "sell";
  marks: KeyMark[]; // absolute indices
  sl: number;
  score: number;
  tap: number; // candle the tap question targets (absolute)
  from?: number; // earliest candle to show (absolute)
  extra?: Record<string, number>; // values for question/explanation text
};

type Spec = {
  strategy: string;
  tier: 1 | 2 | 3 | 4;
  find: () => Setup[];
  mcq: (s: Setup) => { prompt: string; right: string; wrong: string[] };
  tf: (s: Setup) => { truth: string; lie: string };
  tapPrompt: (s: Setup) => string;
  story: (s: Setup) => string;
  hardLoss?: boolean; // include one real losing setup among the hard levels
};

/** Candidates from a detector, converted to absolute indices. */
function cands(det: string, xs: Ctx[] = CTX): { x: Ctx; c: Cand; at: (name: string) => number }[] {
  return xs.flatMap((x) => D[det]!(x).map((c) => ({ x, c, at: (n: string) => c.start + c.pts[n]! })));
}

const up = (x: Ctx, i: number) => x.h[i]!;
const dn = (x: Ctx, i: number) => x.l[i]!;

// ------------------------------------------------------------------ strategies
const SPECS: Spec[] = [
  // ---------------- Tier 1
  {
    strategy: "trends",
    tier: 1,
    find: () =>
      ["trend-up", "trend-down"].flatMap((det) =>
        cands(det).flatMap(({ x, c }) => {
          const bull = det === "trend-up";
          const sw = Object.entries(c.pts).map(([n, i]) => ({ kind: n[0] as "H" | "L", i: c.start + i })).sort((a, b) => a.i - b.i);
          // Last swing must be the pullback (HL in an uptrend, LH in a downtrend).
          const last = sw[sw.length - 1];
          if (!last || last.kind !== (bull ? "L" : "H")) return [];
          const highs = sw.filter((s) => s.kind === "H").slice(-2);
          const lows = sw.filter((s) => s.kind === "L").slice(-2);
          if (highs.length < 2 || lows.length < 2) return [];
          const k = last.i + 3; // the pullback swing is confirmed 3 candles later
          if (k + AFTER >= x.n) return [];
          const atr = x.atr[k]!;
          return [
            {
              x, k, dir: bull ? "buy" : "sell",
              marks: [
                ...highs.map((s, j) => ({ id: `h${j}`, type: "SWING_HIGH" as const, i1: s.i, p1: up(x, s.i) })),
                ...lows.map((s, j) => ({ id: `l${j}`, type: "SWING_LOW" as const, i1: s.i, p1: dn(x, s.i) })),
              ],
              sl: bull ? dn(x, last.i) - 0.25 * atr : up(x, last.i) + 0.25 * atr,
              score: c.score,
              tap: last.i,
              from: sw[0]!.i - 8,
              extra: { bull: bull ? 1 : 0 },
            },
          ];
        }),
      ),
    mcq: (s) => ({
      prompt: "What is this market doing?",
      right: s.dir === "buy" ? "Uptrend: higher highs and higher lows" : "Downtrend: lower highs and lower lows",
      wrong: [s.dir === "buy" ? "Downtrend: lower highs and lower lows" : "Uptrend: higher highs and higher lows", "Sideways range", "No structure: random noise"],
    }),
    tf: (s) =>
      s.dir === "buy"
        ? { truth: "The uptrend stays intact as long as price keeps making higher lows.", lie: "One red candle is enough to end an uptrend." }
        : { truth: "The downtrend stays intact as long as price keeps making lower highs.", lie: "One green candle is enough to end a downtrend." },
    tapPrompt: (s) => (s.dir === "buy" ? "Tap the latest higher low." : "Tap the latest lower high."),
    story: (s) =>
      s.dir === "buy"
        ? "Price made **higher highs and higher lows**: an uptrend. The latest dip formed another **higher low**, so the trend-follower's trade is a **buy** with the stop just below that low."
        : "Price made **lower highs and lower lows**: a downtrend. The latest bounce formed another **lower high**, so the trend-follower's trade is a **sell** with the stop just above that high.",
  },
  {
    strategy: "sr",
    tier: 1,
    find: () => [
      ...cands("breakout-retest").map(({ x, c, at }) => {
        const k = at("rt");
        const L = c.lv!["L"]!;
        return { x, k, dir: "buy" as const, marks: [{ id: "lvl", type: "SR_LINE" as const, i1: at("A"), i2: k, p1: L }], sl: dn(x, k) - 0.3 * x.atr[k]!, score: c.score, tap: k, from: at("A") - 10, extra: { flip: 1 } };
      }),
      ...cands("range").flatMap(({ x, c }) => {
        const bots = Object.keys(c.pts).filter((n) => n.startsWith("bot")).map((n) => c.start + c.pts[n]!).sort((a, b) => a - b);
        const touch = bots[bots.length - 1]!;
        const k = touch + 1;
        if (bots.length < 2 || k + AFTER >= x.n || !(x.c[k]! > x.o[k]!)) return [];
        return [{ x, k, dir: "buy" as const, marks: [{ id: "lvl", type: "SR_LINE" as const, i1: bots[0]!, i2: k, p1: c.lv!["bot"]! }], sl: c.lv!["bot"]! - 0.35 * x.atr[k]!, score: c.score, tap: touch, from: c.start - 5, extra: { flip: 0 } }];
      }),
    ],
    mcq: (s) =>
      s.extra!["flip"]
        ? { prompt: "What happened to the level you marked?", right: "Old resistance broke and is now acting as support", wrong: ["It's still resistance", "Price ignored it completely", "It's a trendline, not a level"] }
        : { prompt: "What is the line you marked?", right: "Support: a floor where buyers keep stepping in", wrong: ["Resistance", "A moving average", "A gap"] },
    tf: () => ({ truth: "The more times a level has held, the more traders are watching it.", lie: "Support and resistance are exact single prices that never get wicked through." }),
    tapPrompt: (s) => (s.extra!["flip"] ? "Tap the candle that retested the level." : "Tap the candle that touched support."),
    story: (s) =>
      s.extra!["flip"]
        ? "Price was capped at the same level twice (**resistance**). It then **closed above** it and came back to **retest it from above**. Old resistance acting as **new support** is a classic buy, with the stop just under the retest."
        : "Price kept bouncing off the same floor: **support**. Buying the bounce at support, with the stop just under it, gives a small risk and a clear target at the top of the range.",
  },
  {
    strategy: "sltp",
    tier: 1,
    find: () =>
      cands("ema-pullback").flatMap(({ x, c, at }) => {
        const k = at("pull");
        if (k + AFTER >= x.n) return [];
        const prevHigh = Math.max(...x.h.slice(k - 12, k));
        const ph = x.h.slice(k - 12, k).indexOf(prevHigh) + k - 12;
        return [{ x, k, dir: "buy" as const, marks: [{ id: "stop", type: "SWING_LOW" as const, i1: k, p1: dn(x, k) }, { id: "target", type: "SR_LINE" as const, i1: ph, i2: k, p1: prevHigh }], sl: dn(x, k) - 0.25 * x.atr[k]!, score: c.score, tap: k, from: k - 40 }];
      }),
    mcq: () => ({ prompt: "Where does the stop loss belong on this buy?", right: "Just below the pullback low", wrong: ["Exactly at the entry price", "A fixed 10 pips away", "Above the previous high"] }),
    tf: () => ({ truth: "A stop loss should sit where the trade idea is proven wrong.", lie: "Moving your stop further away when price comes close is good risk management." }),
    tapPrompt: () => "Tap the candle your stop loss should hide behind.",
    story: () =>
      "Price was trending up and pulled back to the **20 EMA**. The **pullback low** is where the idea fails, so the **stop goes just below it**. The **previous high** is the first obvious target; a 2R target gives a trade worth taking.",
  },
  {
    strategy: "rr",
    tier: 1,
    find: () =>
      cands("range").flatMap(({ x, c }) => {
        const bots = Object.keys(c.pts).filter((n) => n.startsWith("bot")).map((n) => c.start + c.pts[n]!).sort((a, b) => a - b);
        const touch = bots[bots.length - 1]!;
        const k = touch + 1;
        if (bots.length < 2 || k + AFTER >= x.n || !(x.c[k]! > x.o[k]!)) return [];
        const top = c.lv!["top"]!;
        const bot = c.lv!["bot"]!;
        const sl = bot - 0.35 * x.atr[k]!;
        const rr = (top - x.c[k]!) / (x.c[k]! - sl);
        return [{ x, k, dir: "buy" as const, marks: [{ id: "floor", type: "SR_LINE" as const, i1: bots[0]!, i2: k, p1: bot }, { id: "ceiling", type: "SR_LINE" as const, i1: c.start, i2: k, p1: top }], sl, score: c.score + (rr >= 2 ? 1 : 0), tap: touch, from: c.start - 5, extra: { rr } }];
      }),
    mcq: (s) => ({
      prompt: `Entry near support, stop below it, target at the range top. Roughly what risk-to-reward is that?`,
      right: `About 1 : ${s.extra!["rr"]!.toFixed(1)}`,
      wrong: [`About 1 : ${(s.extra!["rr"]! / 3).toFixed(1)}`, `About 1 : ${(s.extra!["rr"]! * 2.5).toFixed(1)}`, "It can't be measured"],
    }),
    tf: () => ({ truth: "With a 1:2 risk-to-reward you can be wrong more often than right and still profit.", lie: "A high win rate guarantees profit whatever the risk-to-reward." }),
    tapPrompt: () => "Tap the candle that touched the floor of the range.",
    story: (s) =>
      `Price is ranging between a **floor** and a **ceiling**. Buying at the floor with the stop just below it and aiming for the ceiling gives about **1 : ${s.extra!["rr"]!.toFixed(1)}**. Before any trade, measure the reward against the risk.`,
  },

  // ---------------- Tier 2
  {
    strategy: "swings",
    tier: 2,
    find: () =>
      cands("range").flatMap(({ x, c }) => {
        const tops = Object.keys(c.pts).filter((n) => n.startsWith("top")).map((n) => c.start + c.pts[n]!).sort((a, b) => a - b);
        const bots = Object.keys(c.pts).filter((n) => n.startsWith("bot")).map((n) => c.start + c.pts[n]!).sort((a, b) => a - b);
        const touch = bots[bots.length - 1]!;
        const k = touch + 2;
        if (tops.length < 2 || bots.length < 2 || k + AFTER >= x.n || touch < tops[tops.length - 1]!) return [];
        return [{
          x, k, dir: "buy" as const,
          marks: [...tops.slice(-2).map((i, j) => ({ id: `h${j}`, type: "SWING_HIGH" as const, i1: i, p1: up(x, i) })), ...bots.slice(-2).map((i, j) => ({ id: `l${j}`, type: "SWING_LOW" as const, i1: i, p1: dn(x, i) }))],
          sl: dn(x, touch) - 0.3 * x.atr[k]!, score: c.score, tap: touch, from: c.start - 5,
        }];
      }),
    mcq: () => ({ prompt: "What makes a candle a swing low?", right: "Its low is lower than the candles on both sides", wrong: ["It is red", "It has the biggest body", "It closes at its high"] }),
    tf: () => ({ truth: "Swing highs and lows are the turning points that define structure.", lie: "Every red candle is a swing low." }),
    tapPrompt: () => "Tap the most recent swing low.",
    story: () => "Price swung between the same highs and lows. Marking the **swing highs** and **swing lows** shows the structure: here a range, where buying the latest swing low near the floor keeps risk small.",
  },
  {
    strategy: "bos",
    tier: 2,
    hardLoss: true,
    find: () => bosSetups(),
    mcq: () => ({ prompt: "What did price just do at the marked level?", right: "Broke a key swing point with a candle close", wrong: ["Formed a perfect double top", "Hit a round number and stopped", "Nothing: it's random noise"] }),
    tf: (s) =>
      s.dir === "buy"
        ? { truth: "A close above the last swing high confirms buyers are in control.", lie: "A wick above the swing high is enough to confirm a break of structure." }
        : { truth: "A close below the last swing low confirms sellers are in control.", lie: "A wick below the swing low is enough to confirm a break of structure." },
    tapPrompt: (s) => (s.dir === "buy" ? "Tap the candle that closed above the swing high." : "Tap the candle that closed below the swing low."),
    story: (s) =>
      s.dir === "buy"
        ? "Price made a higher low, then a candle **closed above the last swing high**: a **Break of Structure**. Buyers are still in control, so the trade is a buy with the stop below the pullback low."
        : "Price made a lower high, then a candle **closed below the last swing low**: a **Break of Structure**. Sellers are still in control, so the trade is a sell with the stop above the pullback high.",
  },
  {
    strategy: "choch",
    tier: 2,
    hardLoss: true,
    find: () =>
      cands("bos-choch").flatMap(({ x, c, at }) => {
        const k = at("ch");
        if (k + AFTER >= x.n) return [];
        const lh = Math.max(...x.h.slice(at("L4"), k + 1));
        return [{ x, k, dir: "sell" as const, marks: [{ id: "hl", type: "SWING_LOW" as const, i1: at("L4"), p1: dn(x, at("L4")) }, { id: "choch", type: "BOS" as const, i1: at("L4"), i2: k, p1: dn(x, at("L4")) }], sl: lh + 0.25 * x.atr[k]!, score: c.score, tap: k, from: at("L0") - 6 }];
      }),
    mcq: () => ({ prompt: "What just happened?", right: "Change of Character: the last higher low broke", wrong: ["Break of Structure up", "A liquidity sweep of the high", "Nothing: normal pullback"] }),
    tf: () => ({ truth: "A CHoCH is the first break against the trend: an early warning it may be turning.", lie: "A CHoCH needs a wick below the level, not a candle close." }),
    tapPrompt: () => "Tap the candle that closed below the last higher low.",
    story: () => "The uptrend kept making higher lows until a candle **closed below the last higher low**. That **Change of Character** is the first sign sellers have taken over. The stop goes above the last lower high.",
  },
  {
    strategy: "contrev",
    tier: 2,
    find: () => [
      ...bosSetups().map((s) => ({ ...s, extra: { cont: 1 } })),
      ...cands("bos-choch").flatMap(({ x, c, at }) => {
        const k = at("ch");
        if (k + AFTER >= x.n) return [];
        const lh = Math.max(...x.h.slice(at("L4"), k + 1));
        return [{ x, k, dir: "sell" as const, marks: [{ id: "key", type: "SWING_LOW" as const, i1: at("L4"), p1: dn(x, at("L4")) }, { id: "brk", type: "BOS" as const, i1: at("L4"), i2: k, p1: dn(x, at("L4")) }], sl: lh + 0.25 * x.atr[k]!, score: c.score, tap: k, from: at("L0") - 6, extra: { cont: 0 } }];
      }),
    ],
    mcq: (s) => ({ prompt: "Is this break a continuation or a reversal?", right: s.extra!["cont"] ? "Continuation: it broke in the trend's direction" : "Reversal: it broke against the trend", wrong: [s.extra!["cont"] ? "Reversal: it broke against the trend" : "Continuation: it broke in the trend's direction", "Neither: ranges only", "Can't tell from structure"] }),
    tf: () => ({ truth: "Breaks with the trend continue it; breaks against the trend warn of a reversal.", lie: "Every break of a level means the trend reverses." }),
    tapPrompt: () => "Tap the candle that broke the structure.",
    story: (s) =>
      s.extra!["cont"]
        ? "The break happened **in the direction of the trend** (a new higher high after a higher low): a **continuation**. Trade with it, stop beyond the pullback."
        : "The break happened **against the trend** (the last higher low gave way): a **reversal** signal. Trade the new direction, stop beyond the last swing.",
  },

  // ---------------- Tier 3
  {
    strategy: "fvg",
    tier: 3,
    find: () => obFvgSetups(["fvg"]),
    mcq: (s) =>
      s.extra!["bull"]
        ? { prompt: "Where exactly is a bullish Fair Value Gap?", right: "Between candle 1's high and candle 3's low", wrong: ["Between candle 1's open and close", "Anywhere price moved fast", "Below the lowest wick"] }
        : { prompt: "Where exactly is a bearish Fair Value Gap?", right: "Between candle 1's low and candle 3's high", wrong: ["Between candle 1's open and close", "Anywhere price moved fast", "Above the highest wick"] },
    tf: () => ({ truth: "Price often returns to a fair value gap before continuing.", lie: "A fair value gap needs only two candles." }),
    tapPrompt: () => "Tap the big middle candle that left the gap.",
    story: (s) =>
      s.extra!["bull"]
        ? "A burst of buying left a **fair value gap**: candle 1's high and candle 3's low never overlapped. Price later **returned into the gap**, where buyers stepped in again. Entry in the gap, stop below the move's origin."
        : "A burst of selling left a **fair value gap**: candle 1's low and candle 3's high never overlapped. Price later **returned into the gap**, where sellers stepped in again. Entry in the gap, stop above the move's origin.",
  },
  {
    strategy: "orderblocks",
    tier: 3,
    find: () => obFvgSetups(["ob"]),
    mcq: (s) =>
      s.extra!["bull"]
        ? { prompt: "Which candle is the bullish order block?", right: "The last red candle before the explosive rally", wrong: ["The biggest green candle", "The first candle on the chart", "Any doji"] }
        : { prompt: "Which candle is the bearish order block?", right: "The last green candle before the sharp drop", wrong: ["The biggest red candle", "The first candle on the chart", "Any doji"] },
    tf: () => ({ truth: "A valid order block is followed by displacement that breaks structure.", lie: "Every red candle in an uptrend is an order block." }),
    tapPrompt: () => "Tap the order block candle.",
    story: (s) =>
      s.extra!["bull"]
        ? "The **last red candle before a powerful rally** is the **bullish order block**: where large buy orders were placed. When price came back to it, buyers defended it again. Stop below the order block."
        : "The **last green candle before a sharp drop** is the **bearish order block**: where large sell orders were placed. When price came back to it, sellers defended it again. Stop above the order block.",
  },
  {
    strategy: "liquidity",
    tier: 3,
    find: () =>
      ["liquidity-sweep", "fakeout"].flatMap((det) =>
        cands(det).flatMap(({ x, c, at }) => {
          const k = at("fk");
          if (k + AFTER >= x.n) return [];
          return [{ x, k, dir: "sell" as const, marks: [{ id: "eqh", type: "SR_LINE" as const, i1: at("A"), i2: k, p1: c.lv!["L"]! }, { id: "sweep", type: "PATTERN" as const, i1: k, p1: x.c[k]! }], sl: up(x, k) + 0.25 * x.atr[k]!, score: c.score, tap: k, from: at("A") - 15 }];
        }),
      ),
    mcq: () => ({ prompt: "Why did price spike above the equal highs and fall back?", right: "It grabbed the buy-stop liquidity resting above them", wrong: ["Buyers were getting stronger", "It was a clean breakout", "Random noise"] }),
    tf: () => ({ truth: "Equal highs attract price because many stop orders sit just above them.", lie: "A sweep candle closes above the level it swept." }),
    tapPrompt: () => "Tap the sweep candle.",
    story: () => "Two **equal highs** left a pool of buy-stops above them. Price **wicked above to grab that liquidity**, then closed back below: a **sweep**. Sellers used those orders to enter, and price fell. Stop above the sweep wick.",
  },
  {
    strategy: "premiumdiscount",
    tier: 3,
    find: () =>
      cands("premium-discount").flatMap(({ x, c, at }) => {
        const k = at("C") + 3;
        if (k + AFTER >= x.n) return [];
        return [{ x, k, dir: "buy" as const, marks: [{ id: "lo", type: "SWING_LOW" as const, i1: at("A"), p1: dn(x, at("A")) }, { id: "hi", type: "SWING_HIGH" as const, i1: at("B"), p1: up(x, at("B")) }], sl: dn(x, at("C")) - 0.25 * x.atr[k]!, score: c.score, tap: at("C"), from: at("A") - 10 }];
      }),
    mcq: () => ({ prompt: "The pullback reached below 50% of the swing. That zone is…", right: "Discount: good prices for buyers", wrong: ["Premium: good prices for buyers", "Equilibrium", "Overbought"] }),
    tf: () => ({ truth: "In an uptrend, buying in discount gives a better risk-to-reward than buying in premium.", lie: "Equilibrium is the swing high." }),
    tapPrompt: () => "Tap the pullback low in discount.",
    story: () => "Mark the swing **low** and **high**: the halfway point is **equilibrium**. The pullback dropped **below 50% into discount** and held, so buyers got a cheap price in an uptrend. Stop below the pullback low.",
  },

  // ---------------- Tier 4
  {
    strategy: "mtf",
    tier: 4,
    hardLoss: true,
    find: () => bosSetups({ tfs: ["15m", "1h"] }),
    mcq: () => ({ prompt: "In top-down analysis, where does the trade's direction come from?", right: "The higher timeframe trend", wrong: ["The latest 1-minute candle", "Whichever way RSI points", "The news headline"] }),
    tf: () => ({ truth: "Entering on a lower timeframe inside a higher-timeframe zone gives a tighter stop.", lie: "If the lower timeframe disagrees, always follow the lower timeframe." }),
    tapPrompt: () => "Tap the lower-timeframe candle that confirmed the entry.",
    story: () => "The higher-timeframe structure pointed one way. On this lower timeframe, price pulled back and then **broke structure in the same direction**: the entry trigger. Stop beyond the pullback, target 2R.",
  },
  {
    strategy: "sessions",
    tier: 4,
    find: () =>
      cands("london-breakout").flatMap(({ x, c, at }) => {
        const k = at("br");
        if (k + AFTER >= x.n) return [];
        const bull = x.c[k]! > c.lv!["hi"]!;
        const mid = (c.lv!["hi"]! + c.lv!["lo"]!) / 2;
        return [{
          x, k, dir: bull ? ("buy" as const) : ("sell" as const),
          marks: [{ id: "ahi", type: "SR_LINE" as const, i1: at("a0"), i2: at("a1"), p1: c.lv!["hi"]! }, { id: "alo", type: "SR_LINE" as const, i1: at("a0"), i2: at("a1"), p1: c.lv!["lo"]! }],
          sl: mid, score: c.score, tap: k, from: at("a0") - 4,
        }];
      }),
    mcq: () => ({ prompt: "What is the strategy on this chart?", right: "London breakout of the Asian range", wrong: ["Buying the New York close", "Trading the weekly open", "Scalping the Asian session"] }),
    tf: () => ({ truth: "The quiet Asian session often builds a range that London breaks.", lie: "The London session is the quietest time to trade." }),
    tapPrompt: () => "Tap the London candle that broke out of the Asian range.",
    story: (s) => `Overnight, the **Asian session** built a tight range. When **London opened**, volume arrived and price **closed ${s.dir === "buy" ? "above" : "below"} the Asian ${s.dir === "buy" ? "high" : "low"}**: the breakout. Stop back inside the range.`,
  },
  {
    strategy: "confluence",
    tier: 4,
    find: () => obFvgSetups(["ob", "fvg"]),
    mcq: () => ({ prompt: "Why is this zone a high-probability trade?", right: "Several reasons stack there: order block + fair value gap + the move's direction", wrong: ["It's a round number", "RSI is 50", "It's Monday"] }),
    tf: () => ({ truth: "Confluence means several independent reasons agree on one zone.", lie: "More indicators on the chart always means more confluence." }),
    tapPrompt: () => "Tap the candle where price returned to the zone.",
    story: (s) => `An **order block** and a **fair value gap** overlapped in the same zone after a strong ${s.extra!["bull"] ? "rally" : "drop"}: **confluence**. When price returned there, ${s.extra!["bull"] ? "buyers" : "sellers"} defended it. One zone, several reasons, one clear stop ${s.extra!["bull"] ? "below" : "above"} it.`,
  },
];


/** Order block / FVG setups in both directions (sell setups from bearish zones). */
function obFvgSetups(marks: ("fvg" | "ob")[]): Setup[] {
  return ["ob-fvg-bull", "ob-fvg-bear"].flatMap((det) =>
    cands(det).flatMap(({ x, c, at }) => {
      const k = at("rt");
      if (k + AFTER >= x.n) return [];
      const bull = c.lv!["dir"] === 1;
      const lv = c.lv!;
      const ms: KeyMark[] = [];
      if (marks.includes("ob")) ms.push({ id: "ob", type: "ORDER_BLOCK", i1: at("ob"), i2: k, p1: lv["obTop"]!, p2: lv["obBot"]! });
      if (marks.includes("fvg")) ms.push({ id: "fvg", type: "FVG", i1: at("fvg1") + 1, i2: k, p1: lv["fvgTop"]!, p2: lv["fvgBot"]! });
      return [{
        x, k, dir: bull ? ("buy" as const) : ("sell" as const), marks: ms,
        sl: bull ? lv["obBot"]! - 0.25 * x.atr[k]! : lv["obTop"]! + 0.25 * x.atr[k]!,
        score: c.score, tap: marks[0] === "ob" ? at("ob") : marks.length > 1 ? k : at("fvg1") + 1, from: at("ob") - 25,
        extra: { bull: bull ? 1 : 0 },
      }];
    }),
  );
}

/** Real Break of Structure setups (as generic setups) for BOS / MTF / continuation levels. */
function bosSetups(opts: { tfs?: string[] } = {}): Setup[] {
  const out: Setup[] = [];
  CTX.forEach((x) => {
    if (opts.tfs && !opts.tfs.includes(x.ds.tf)) return;
    const ds: Dataset = { id: x.ds.id, label: x.ds.label, tf: x.ds.tf, source: x.ds.source, candles: x.ds.candles.map((r) => [r[0], r[1], r[2], r[3], r[4]]) };
    for (const s of findSetups(ds)) {
      if (s.brk + AFTER >= x.n) continue;
      const bull = s.dir === "bull";
      const lvl = bull ? x.h[s.swing]! : x.l[s.swing]!;
      out.push({
        x, k: s.brk, dir: bull ? "buy" : "sell",
        marks: [
          { id: "swing", type: bull ? "SWING_HIGH" : "SWING_LOW", i1: s.swing, p1: lvl },
          { id: "bos", type: "BOS", i1: s.swing, i2: s.brk, p1: lvl },
        ],
        sl: s.sl, score: cleanliness(s), tap: s.brk, from: s.prevSwing - 10,
      });
    }
  });
  return out;
}

// ------------------------------------------------------------------ level assembly
const SLOTS: { slot: string; difficulty: Level["difficulty"]; band: "top" | "mid" | "low"; loss?: boolean }[] = [
  { slot: "tutorial", difficulty: "tutorial", band: "top" },
  { slot: "easy-1", difficulty: "easy", band: "top" },
  { slot: "easy-2", difficulty: "easy", band: "top" },
  { slot: "easy-3", difficulty: "easy", band: "top" },
  { slot: "medium-1", difficulty: "medium", band: "mid" },
  { slot: "medium-2", difficulty: "medium", band: "mid" },
  { slot: "medium-3", difficulty: "medium", band: "mid" },
  { slot: "hard-1", difficulty: "hard", band: "low" },
  { slot: "hard-2", difficulty: "hard", band: "low" },
  { slot: "hard-3", difficulty: "hard", band: "low", loss: true },
  { slot: "exam", difficulty: "exam", band: "mid" },
];

type Compact = Omit<Level, "candles"> & { rows: number[][] };

function outcome(x: Ctx, s: Setup, tp: number) {
  for (let j = s.k + 1; j <= Math.min(x.n - 1, s.k + AFTER); j++) {
    if (s.dir === "buy" ? x.l[j]! <= s.sl : x.h[j]! >= s.sl) return { won: false, bars: j - s.k };
    if (s.dir === "buy" ? x.h[j]! >= tp : x.l[j]! <= tp) return { won: true, bars: j - s.k };
  }
  return { won: false, bars: AFTER + 1 };
}

function assemble(spec: Spec, s: Setup, slot: (typeof SLOTS)[number], n: number, won: boolean, bars: number): Compact {
  const x = s.x;
  const atr = x.atr[s.k]!;
  const earliest = Math.min(...s.marks.map((m) => m.i1));
  const start = Math.max(0, Math.min(s.from ?? earliest - 10, earliest - 5, s.k - 30), s.k - 90);
  const end = s.k + AFTER;
  const rel = (i: number) => i - start;
  const price = x.c[s.k]!;
  const pct = (m: number) => Math.max(0.01, ((m * atr) / price) * 100);
  const answerKey: AnswerMark[] = s.marks.map((m) => ({
    id: m.id,
    type: m.type,
    i1: rel(m.i1),
    ...(m.i2 !== undefined ? { i2: rel(m.i2) } : {}),
    p1: round(m.p1),
    ...(m.p2 !== undefined ? { p2: round(m.p2) } : {}),
    tolerance:
      m.type === "PATTERN" ? { candles: 0, pricePct: 100 }
      : m.type === "SR_LINE" ? { candles: 6, pricePct: pct(0.5) }
      : m.type === "BOS" ? { candles: 3, pricePct: pct(0.6) }
      : m.type === "FVG" || m.type === "ORDER_BLOCK" ? { candles: 2, pricePct: pct(0.4) }
      : { candles: 2, pricePct: pct(0.6) },
  }));
  const mc = spec.mcq(s);
  const at = n % 4;
  const options = [...mc.wrong.slice(0, 3)];
  options.splice(at, 0, mc.right);
  const tf = spec.tf(s);
  const truthFirst = n % 2 === 0;
  const questions: Question[] = [
    { id: "q1", kind: "mcq", prompt: mc.prompt, options, correctIndex: at },
    { id: "q2", kind: "truefalse", prompt: truthFirst ? tf.truth : tf.lie, correct: truthFirst },
    { id: "q3", kind: "tap", prompt: spec.tapPrompt(s), correctCandle: rel(s.tap), toleranceCandles: 1 },
  ];
  const outcomeText = won
    ? `In reality price reached the 2R target ${bars} candle${bars === 1 ? "" : "s"} later.`
    : bars <= AFTER
      ? `In reality this one failed: price hit the stop ${bars} candles later. Good setups still lose sometimes, which is why every trade needs a stop and small risk.`
      : "In reality price reached neither the 2R target nor the stop within the next 25 candles.";
  const lo = s.dir === "buy";
  const first = answerKey[0]!;
  const hintP = [first.p1, first.p2 ?? first.p1];
  const rows = x.ds.candles.slice(start, end + 1);
  return {
    id: `t${spec.tier}-${spec.strategy}-${slot.slot}`,
    tier: spec.tier,
    strategyId: spec.strategy,
    difficulty: slot.difficulty,
    rows: rows.map((r) => [round(r[1]), round(r[2]), round(r[3]), round(r[4])]),
    decisionIndex: rel(s.k),
    answerKey,
    correctDirection: s.dir,
    logicalSL: lo ? { min: round(s.sl - 1.2 * atr), max: round(s.sl + 0.35 * atr) } : { min: round(s.sl - 0.35 * atr), max: round(s.sl + 1.2 * atr) },
    questions,
    explanation: `${spec.story(s)} ${outcomeText}`,
    hintArea:
      slot.difficulty === "easy" || slot.difficulty === "tutorial"
        ? { i1: Math.max(0, first.i1 - 1), i2: Math.min(rel(s.k), (first.i2 ?? first.i1) + 1), p1: Math.min(...hintP) - 0.4 * atr, p2: Math.max(...hintP) + 0.4 * atr }
        : undefined,
    version: 1,
    source: { label: x.ds.label, timeframe: TF[x.ds.tf] ?? x.ds.tf, from: rows[0]![0], to: rows[rows.length - 1]![0], decisionTime: x.ds.candles[s.k]![0] },
  };
}

// Charts already used by any strategy (so each level is a different real chart where possible).
const used = new Set<string>();

function buildSpec(spec: Spec): Compact[] {
  const found = spec
    .find()
    .filter((s) => {
      const risk = Math.abs(s.x.c[s.k]! - s.sl);
      const atr = s.x.atr[s.k]!;
      return risk >= 0.4 * atr && risk <= 5 * atr && (s.dir === "buy" ? s.sl < s.x.c[s.k]! : s.sl > s.x.c[s.k]!);
    })
    .map((s) => {
      const entry = s.x.c[s.k]!;
      const tp = s.dir === "buy" ? entry + 2 * (entry - s.sl) : entry - 2 * (s.sl - entry);
      return { s, ...outcome(s.x, s, tp) };
    })
    .sort((a, b) => b.s.score - a.s.score);
  if (found.length < 11) console.log(`   ! ${spec.strategy}: only ${found.length} real setups found`);
  const key = (s: Setup) => `${s.x.ds.id}:${Math.round(s.k / 60)}`;
  const band = (b: "top" | "mid" | "low") => (b === "top" ? found : b === "mid" ? found.slice(Math.floor(found.length * 0.2)) : found.slice(Math.floor(found.length * 0.45)));
  return SLOTS.map((slot, n) => {
    const wantLoss = slot.loss && (spec.hardLoss ?? true);
    const pools = [band(slot.band), found];
    let pick: (typeof found)[number] | undefined;
    for (const pool of pools) {
      pick = pool.find((f) => !used.has(key(f.s)) && (wantLoss ? !f.won && f.bars <= AFTER : f.won)) ?? pool.find((f) => !used.has(key(f.s)));
      if (pick) break;
    }
    if (!pick) pick = found[n % found.length]!;
    used.add(key(pick.s));
    return assemble(spec, pick.s, slot, n, pick.won, pick.bars);
  });
}

// ------------------------------------------------------------------ run
const OUT = new URL("../src/data/real/levels/", import.meta.url);
await mkdir(OUT, { recursive: true });
const indexOut: { id: string; strategyId: string; tier: number; difficulty: string }[] = [];

const only = process.argv.slice(2);
for (const spec of SPECS) {
  if (only.length && !only.includes(spec.strategy)) continue;
  const levels = buildSpec(spec);
  await writeFile(new URL(`${spec.strategy}.json`, OUT), JSON.stringify(levels));
  const wins = levels.filter((l) => /reached the 2R/.test(l.explanation)).length;
  console.log(`✓ ${spec.strategy.padEnd(16)} ${levels.length} levels (${wins} winners) · ${[...new Set(levels.map((l) => `${l.source!.label} ${l.source!.timeframe}`))].slice(0, 4).join(", ")}…`);
}

// Level index (small, loaded up front).
const { readdir } = await import("node:fs/promises");
for (const f of (await readdir(OUT)).filter((f) => f.endsWith(".json"))) {
  const levels: Compact[] = JSON.parse(await readFile(new URL(f, OUT), "utf8"));
  for (const l of levels) indexOut.push({ id: l.id, strategyId: l.strategyId, tier: l.tier, difficulty: l.difficulty });
}
await writeFile(new URL("../src/data/real/levelIndex.json", import.meta.url), JSON.stringify(indexOut));
console.log(`\nLevel index: ${indexOut.length} levels.`);

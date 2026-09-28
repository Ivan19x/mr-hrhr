import type { Module, Note, Tone } from "./types";
import { real, realSpec } from "./real";
import { hiTag, level, loTag, zone } from "./adv";

/** Price at a named pivot: the high for a peak, the low for a trough. */
const pivot = (r: ReturnType<typeof real>, name: string, peak: boolean) => (peak ? r.hi(name) : r.lo(name));
function legs(r: ReturnType<typeof real>, names: string[], firstIsPeak: boolean, color: Tone = "electric", labels = true): Note[] {
  const out: Note[] = [];
  for (let k = 0; k + 1 < names.length; k++) {
    const a = names[k]!, b = names[k + 1]!;
    const aPeak = (k % 2 === 0) === firstIsPeak;
    out.push({ k: "line", i1: r.i(a), p1: pivot(r, a, aPeak), i2: r.i(b), p2: pivot(r, b, !aPeak), color });
  }
  if (labels)
  names.forEach((n, k) => {
    const peak = (k % 2 === 0) === firstIsPeak;
    out.push({ k: "label", i: r.i(n), p: pivot(r, n, peak), text: n.toUpperCase().replace(/^W/, ""), color: "gold", pos: peak ? "above" : "below" });
  });
  return out;
}

const hm = real("harmonic");
const bullH = (hm.lv["bull"] ?? 1) > 0;
const HNAME = ["Gartley", "Bat", "Butterfly", "Crab"][hm.lv["kind"] ?? 0]!;
const pct = (v: number | undefined) => `${Math.round((v ?? 0) * 1000) / 10}%`;

export const M15_PATTERNS_PRO: Module = {
  id: "patterns-pro",
  n: 15,
  title: "Chart Patterns II",
  tagline: "Triple tops, rectangles, rounding bases, broadening formations, three drives, harmonics and Elliott waves.",
  icon: "📐",
  lessons: [
    {
      id: "triple-top-bottom",
      title: "Triple top and triple bottom",
      summary: "Three failed attempts at one level, then a break of the neckline.",
      minutes: 5,
      terms: ["Triple Top / Bottom"],
      blocks: [
        {
          t: "p",
          text: "A **triple top** is a double top with one more failure: price tests the same resistance three times and can't break it. The pattern completes only when price **closes below the neckline** (the lowest trough between the tops). A **triple bottom** is the mirror at support.",
        },
        {
          t: "diagram",
          caption: "A real triple top: three tests of the same level, then a close through the neckline.",
          spec: realSpec("triple-top", (r) => [level(r.lv["lvl"]!, "resistance", "down", true), level(r.lv["neck"]!, "neckline", "gold", true), hiTag(r, "a", "1", "down"), hiTag(r, "b", "2", "down"), hiTag(r, "c", "3", "down"), loTag(r, "br", "break", "down")]),
        },
        {
          t: "diagram",
          caption: "A real triple bottom: three holds of support, then a close above the neckline.",
          spec: realSpec("triple-bottom", (r) => [level(r.lv["lvl"]!, "support", "up", true), level(r.lv["neck"]!, "neckline", "gold", true), loTag(r, "a", "1", "up"), loTag(r, "b", "2", "up"), loTag(r, "c", "3", "up"), hiTag(r, "br", "break", "up")]),
        },
        { t: "callout", tone: "tip", text: "Target: measure top-to-neckline and project it from the break. Each extra test also stacks more stops beyond the level, so a clean break often moves fast." },
      ],
      quiz: [
        { q: "When is a triple top complete?", options: ["At the third touch", "When price closes below the neckline", "When RSI is 70", "After a gap"], answer: 1, why: "Until the neckline breaks it's just a range." },
        { q: "The neckline of a triple top is…", options: ["The highest top", "The lowest trough between the tops", "A moving average", "The open"], answer: 1, why: "It's the support that must break." },
        { q: "A triple bottom is a…", options: ["Bearish continuation", "Bullish reversal at support", "Gap", "Candle"], answer: 1, why: "Three failed pushes lower, then a break up." },
      ],
    },
    {
      id: "rectangle-rounding",
      title: "Rectangles and rounding bottoms",
      summary: "A flat pause inside a trend, and a slow U-shaped change of direction.",
      minutes: 5,
      terms: ["Rectangle", "Rounding bottom / top"],
      blocks: [
        {
          t: "p",
          text: "A **rectangle** is a horizontal range that forms **inside a trend**: flat highs, flat lows, several touches of each. It's the market resting. The usual resolution is a break in the direction of the trend that came before it.",
        },
        { t: "diagram", caption: "A real rectangle after a rally: flat top, flat bottom, then a close above the box.", spec: realSpec("rectangle", (r) => [zone(r.i("a"), r.i("b"), r.lv["bot"]!, r.lv["top"]!, "electric", "rectangle"), hiTag(r, "br", "breakout", "up")]) },
        {
          t: "p",
          text: "A **rounding bottom** (saucer) is a slow U-turn: selling fades gradually, price goes flat, then buying picks up gradually. It forms over many candles and signals a patient change of hands. The trade is the break above the rim (the level where the U started). A **rounding top** is the upside-down version.",
        },
        { t: "diagram", caption: "A real rounding bottom: a smooth U over dozens of candles, then a close above the rim.", spec: realSpec("rounding-bottom", (r) => [level(r.lv["rim"]!, "rim", "gold", true), hiTag(r, "br", "rim break", "up")]) },
      ],
      quiz: [
        { q: "A rectangle usually breaks…", options: ["Against the prior trend", "In the direction of the prior trend", "Never", "At the midpoint"], answer: 1, why: "It's a continuation pause." },
        { q: "A rounding bottom forms…", options: ["In one candle", "Gradually, over many candles", "Only on weekends", "Only after news"], answer: 1, why: "The U-shape shows a slow shift." },
        { q: "Entry trigger for a rounding bottom?", options: ["The first red candle", "A close above the rim", "Touching the bottom", "A doji"], answer: 1, why: "The rim break confirms the new trend." },
      ],
    },
    {
      id: "broadening-wedge-liquidity",
      title: "Broadening formations, diamonds and wedge liquidity",
      summary: "Expanding swings that show a market losing control, and the stops lining a wedge.",
      minutes: 6,
      terms: ["Broadening formation / Diamond", "Wedge Liquidity"],
      blocks: [
        {
          t: "p",
          text: "A **broadening formation** (megaphone) makes **higher highs AND lower lows**: each swing is bigger than the last. It's the opposite of a triangle, and it shows emotional, two-sided trading, often near tops. A **diamond** is a broadening formation that then narrows into a triangle.",
        },
        {
          t: "diagram",
          caption: "A real broadening top: highs rising, lows falling, then a break below the last low.",
          spec: realSpec("broadening", (r) => [
            { k: "line", i1: r.i("H1"), p1: r.hi("H1"), i2: r.i("H3"), p2: r.hi("H3"), color: "down" },
            { k: "line", i1: r.i("L1"), p1: r.lo("L1"), i2: r.i("L2"), p2: r.lo("L2"), color: "up" },
            hiTag(r, "H1", "H1", "down"), hiTag(r, "H2", "H2", "down"), hiTag(r, "H3", "H3", "down"),
            loTag(r, "L1", "L1", "up"), loTag(r, "L2", "L2", "up"),
          ]),
        },
        {
          t: "p",
          text: "**Wedge liquidity**: every touch of a wedge's trendline convinces more traders to buy there and put stops just below. When a rising wedge breaks, those stops are sell orders, so the break is often fast and deep.",
        },
        {
          t: "diagram",
          caption: "A real rising wedge. The lower line collected stops at each touch; the break turned them into fuel.",
          spec: realSpec("rising-wedge", (r) => [
            { k: "line", i1: r.i("l0"), p1: r.lo("l0"), i2: r.i("l2"), p2: r.lo("l2"), color: "up", text: "stops below" },
            { k: "line", i1: r.i("h0"), p1: r.hi("h0"), i2: r.i("h2"), p2: r.hi("h2"), color: "down" },
            loTag(r, "br", "break", "down"),
          ]),
        },
      ],
      quiz: [
        { q: "A broadening formation has…", options: ["Lower highs and higher lows", "Higher highs and lower lows", "Flat highs", "One swing"], answer: 1, why: "The swings expand." },
        { q: "What is a diamond?", options: ["A broadening formation that then contracts", "A gap", "A candle", "A moving average"], answer: 0, why: "Expanding then narrowing swings." },
        { q: "Why do wedge breaks move fast?", options: ["Low volume", "Stops that built up along the wedge line get triggered", "Brokers push price", "They don't"], answer: 1, why: "Each touch added stops beyond the line." },
      ],
    },
    {
      id: "three-drives-abcd",
      title: "Three drives and the ABCD",
      summary: "Symmetry patterns: three equal pushes to exhaustion, and two equal legs.",
      minutes: 6,
      terms: ["Three Drives"],
      blocks: [
        {
          t: "p",
          text: "**Three drives** is three pushes of similar size in one direction, each one making a new extreme after a pullback. After the third, the trend is usually exhausted and reverses. Ideally the drives are similar in size and time, and the pullbacks are similar too.",
        },
        { t: "diagram", caption: "A real three-drives top: three similar pushes up, then a reversal.", spec: realSpec("three-drives", (r) => [...legs(r, ["L0", "D1", "L1", "D2", "L2", "D3"], false, "electric", false), hiTag(r, "D1", "drive 1", "up"), hiTag(r, "D2", "drive 2", "up"), hiTag(r, "D3", "drive 3", "down")]) },
        {
          t: "p",
          text: "The **ABCD** is the simplest harmonic: leg AB, a retracement BC (usually 61.8–78.6% of AB), then leg CD roughly **equal to AB** in size (and often time). D is where the pattern completes and a reversal is expected.",
        },
        {
          t: "diagram",
          caption: (() => {
            const r = real("abcd");
            return `A real bullish ABCD: C retraced ${pct(r.lv["rc"])} of AB, and CD was ${pct(r.lv["rd"])} of AB. Price turned up from D.`;
          })(),
          spec: realSpec("abcd", (r) => legs(r, ["A", "B", "C", "D"], true)),
        },
      ],
      quiz: [
        { q: "Three drives signals…", options: ["Continuation forever", "Exhaustion after three similar pushes", "A gap", "A range"], answer: 1, why: "The third push is often the last." },
        { q: "In an ABCD, CD is usually…", options: ["Half of AB", "About equal to AB", "Twice AB always", "Unrelated"], answer: 1, why: "Symmetry is the idea." },
        { q: "Typical BC retracement of AB?", options: ["5–10%", "61.8–78.6%", "150%", "0%"], answer: 1, why: "A deep but not complete retracement." },
      ],
    },
    {
      id: "harmonic-patterns",
      title: "Harmonic patterns: Gartley, Bat, Butterfly, Crab",
      summary: "Five-point XABCD shapes defined by Fibonacci ratios.",
      minutes: 8,
      terms: ["Harmonic patterns (ABCD, Gartley, Bat, Butterfly, Crab)"],
      blocks: [
        {
          t: "p",
          text: "Harmonic patterns (popularised by H.M. Gartley in 1935, then Scott Carney and Larry Pesavento) use five points **X, A, B, C, D**. Each pattern is defined by where **B** retraces the XA leg and where **D** completes. D is a precise 'potential reversal zone'.",
        },
        {
          t: "table",
          head: ["Pattern", "B (of XA)", "C (of AB)", "D (of XA)", "Note"],
          rows: [
            ["Gartley", "61.8%", "38.2–88.6%", "78.6%", "D inside X"],
            ["Bat", "38.2–50%", "38.2–88.6%", "88.6%", "Deep D, still inside X"],
            ["Butterfly", "78.6%", "38.2–88.6%", "127–161.8%", "D beyond X"],
            ["Crab", "38.2–61.8%", "38.2–88.6%", "161.8%", "Most extended"],
          ],
        },
        {
          t: "diagram",
          caption: `A real ${bullH ? "bullish" : "bearish"} ${HNAME}: B retraced ${pct(hm.lv["rb"])} of XA and D completed at ${pct(hm.lv["rd"])} of XA. Price reversed from D.`,
          spec: realSpec("harmonic", (r) => legs(r, ["X", "A", "B", "C", "D"], !bullH, "purple")),
        },
        {
          t: "callout",
          tone: "warn",
          text: "Real swings never hit ratios exactly: allow a tolerance of a few percent. Harmonics give a zone, not a guarantee. Wait for a reaction at D (a CHoCH on a lower timeframe) and put the stop beyond X (Gartley/Bat) or beyond the D zone (Butterfly/Crab).",
        },
      ],
      quiz: [
        { q: "How many points does a harmonic pattern have?", options: ["3", "4 (ABCD only)", "5: X, A, B, C, D", "7"], answer: 2, why: "XABCD." },
        { q: "The Gartley's D completes at about…", options: ["38.2% of XA", "78.6% of XA", "161.8% of XA", "200%"], answer: 1, why: "The classic 0.786 retracement." },
        { q: "Which patterns complete BEYOND X?", options: ["Gartley and Bat", "Butterfly and Crab", "All of them", "None"], answer: 1, why: "Their D is an extension of XA." },
      ],
    },
    {
      id: "elliott-wave",
      title: "Elliott Wave basics",
      summary: "Five waves with the trend, three against it, and the three rules that can't be broken.",
      minutes: 8,
      terms: ["Elliott Wave basics"],
      blocks: [
        {
          t: "p",
          text: "Ralph Nelson Elliott (1930s) observed that trends move in a **5-wave impulse** (1, 2, 3, 4, 5) followed by a **3-wave correction** (A, B, C). Waves 1, 3, 5 go with the trend; 2 and 4 correct it.",
        },
        {
          t: "diagram",
          caption: "A real 5-wave impulse, then the start of the correction (A).",
          spec: realSpec("elliott-impulse", (r) => [...legs(r, ["w0", "w1", "w2", "w3", "w4", "w5"], false), loTag(r, "a", "A", "down")]),
        },
        { t: "h", text: "The three unbreakable rules" },
        {
          t: "list",
          ordered: true,
          items: ["Wave 2 never retraces more than 100% of wave 1.", "Wave 3 is never the shortest of waves 1, 3 and 5 (it's usually the longest).", "Wave 4 never enters the price territory of wave 1."],
        },
        {
          t: "table",
          head: ["Wave", "Typical behaviour", "Common Fibonacci"],
          rows: [
            ["2", "Deep pullback, fear returns", "50–61.8% of wave 1"],
            ["3", "Strongest, the crowd joins", "161.8% of wave 1"],
            ["4", "Shallow, sideways", "23.6–38.2% of wave 3"],
            ["5", "Final push, momentum divergence common", "≈ wave 1"],
          ],
        },
        { t: "callout", tone: "warn", text: "Wave counts are subjective and change as price develops. Use the three rules to reject bad counts, and use Elliott as a map, not as an entry signal." },
      ],
      quiz: [
        { q: "An Elliott impulse has…", options: ["3 waves", "5 waves", "8 waves", "2 waves"], answer: 1, why: "1-2-3-4-5." },
        { q: "Which wave can never be the shortest?", options: ["Wave 1", "Wave 3", "Wave 5", "Wave 2"], answer: 1, why: "Rule 2." },
        { q: "Wave 4 may not overlap…", options: ["Wave 1's territory", "Wave 5", "Wave C", "The moving average"], answer: 0, why: "Rule 3." },
      ],
    },
  ],
};

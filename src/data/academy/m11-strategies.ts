import type { Lesson, Module, Note, QuizQ } from "./types";
import type { OHLC } from "./build";
import { ema, rsi, sma } from "./build";
import { real, visible } from "./real";

type Rules = { entry: string; stop: string; target: string; invalid: string; best: string };

function strategy(o: {
  id: string;
  title: string;
  summary: string;
  idea: string;
  spec: { candles: OHLC[]; source: string; notes: Note[]; overlays?: { values: (number | null)[]; color: "electric" | "gold" | "purple"; label?: string }[]; pane?: import("./types").Pane };
  caption: string;
  spot: string[];
  rules: Rules;
  mistakes: string;
  quiz: QuizQ[];
  extra?: import("./types").Block[];
}): Lesson {
  return {
    id: o.id,
    title: o.title,
    summary: o.summary,
    minutes: 6,
    blocks: [
      { t: "p", text: o.idea },
      {
        t: "diagram",
        caption: o.caption,
        spec: {
          candles: o.spec.candles,
          source: o.spec.source,
          notes: o.spec.notes,
          ...(o.spec.overlays ? { overlays: o.spec.overlays } : {}),
          ...(o.spec.pane ? { pane: o.spec.pane } : {}),
        },
      },
      { t: "spot", items: o.spot },
      {
        t: "table",
        head: ["Rule", "How"],
        rows: [
          ["Entry", o.rules.entry],
          ["Stop loss", o.rules.stop],
          ["Take profit", o.rules.target],
          ["Invalidation", o.rules.invalid],
          ["Works best", o.rules.best],
        ],
      },
      ...(o.extra ?? []),
      { t: "callout", tone: "warn", text: `**Common mistakes:** ${o.mistakes}` },
    ],
    quiz: o.quiz,
  };
}

const entryNotes = (i: number, entry: number, sl: number, tp: number): Note[] => [
  { k: "hline", p: entry, text: "entry", color: "electric", i1: i },
  { k: "hline", p: sl, text: "stop", color: "down", dash: true, i1: i },
  { k: "hline", p: tp, text: "target", color: "up", dash: true, i1: i },
];

// Real chart sections for each playbook (scripts/extract-examples.ts).
const pb = real("ema-pullback");
const pbE = visible(pb, ema(pb.all.map((c) => c[3]), 20));
const pbK = pb.i("pull");
const pbPrevHigh = Math.max(...pb.candles.slice(Math.max(0, pbK - 12), pbK).map((c) => c[1]));
const br = real("breakout-retest");
const rg = real("range");
const bos = real("bos-setup");
const ch = real("bos-choch");
const smc = real("ob-fvg");
const gc = real("golden-cross");
const gcCloses = gc.all.map((c) => c[3]);
const maF = visible(gc, sma(gcCloses, 9));
const maS = visible(gc, sma(gcCloses, 21));
const dv = real("divergence-bull");
const dvR = visible(dv, rsi(dv.all.map((c) => c[3]), 14));
const lon = real("london-breakout");

/** Entry / stop / 2R target lines from an entry index and stop price. */
function plan(i: number, entry: number, stop: number): Note[] {
  return entryNotes(i, entry, stop, entry + 2 * (entry - stop));
}

export const M11_STRATEGIES: Module = {
  id: "strategies",
  n: 11,
  title: "Trading Strategies",
  tagline: "Complete playbooks: what to look for on the chart, where to enter, stop and take profit.",
  icon: "🎯",
  lessons: [
    strategy({
      id: "strat-trend-pullback",
      title: "Trend pullback",
      summary: "Join an existing trend after a pullback. The bread-and-butter strategy.",
      idea: "Trends move in steps. Instead of chasing a big candle, wait for price to **pull back** into value (a moving average, support, or the 38–61.8% Fibonacci zone), then enter when it starts moving in the trend direction again.",
      spec: {
        candles: pb.candles,
        source: pb.source,
        notes: [...plan(pbK, pb.candles[pbK]![3], pb.lo("pull") - (pb.hi("pull") - pb.lo("pull")) * 0.2), { k: "dot", i: pbK, p: pb.lo("pull"), color: "gold", text: "pullback to EMA", pos: "below" }, { k: "hline", p: pbPrevHigh, text: "prior high", color: "muted", dash: true, i2: pbK }],
        overlays: [{ values: pbE, color: "electric", label: "EMA 20" }],
      },
      caption: "A real uptrend pulling back to the 20 EMA. The bullish candle off the EMA is the entry, the stop goes under the pullback low, and the target is 2R.",
      spot: ["Clear HH/HL structure (or LH/LL for shorts)", "Pullback on smaller candles, lower volume", "Price reaches a value area: MA, old resistance-turned-support, 50–61.8% fib", "A bullish trigger candle (engulfing, pin bar) or a small BOS on a lower timeframe"],
      rules: { entry: "Close of the trigger candle in the trend direction", stop: "Beyond the pullback's swing low/high", target: "Previous swing high/low, then trail for more (≥ 2R)", invalid: "Pullback breaks the last higher low (a CHoCH)", best: "Trending markets; H1–D1" },
      mistakes: "Buying the top of an extended move instead of waiting for the pullback; entering before any sign the pullback has ended.",
      quiz: [
        { q: "Where do you enter a trend pullback?", options: ["At the top of the impulse", "After the pullback reaches value and turns", "Anywhere", "Before the trend starts"], answer: 1, why: "Wait for value + a trigger." },
        { q: "The stop goes…", options: ["Beyond the pullback low (for a long)", "At the high", "10 pips away always", "Nowhere"], answer: 0, why: "Breaking that low invalidates the trend." },
        { q: "The idea is invalid when…", options: ["Price makes a new high", "The last higher low breaks", "RSI > 50", "Volume rises"], answer: 1, why: "That's a change of character." },
      ],
    }),
    strategy({
      id: "strat-breakout-retest",
      title: "Breakout and retest",
      summary: "Let the level break, then buy the retest.",
      idea: "When price has been capped by a level several times, a decisive break releases trapped orders. Instead of chasing, wait for price to come back and **retest the broken level from the other side**, then enter on confirmation.",
      spec: {
        candles: br.candles,
        source: br.source,
        notes: [{ k: "hline", p: br.lv["L"]!, text: "resistance → support", color: "gold", dash: true, i2: br.i("rt") }, ...plan(br.i("rt"), br.candles[br.i("rt")]![3], br.lo("rt") - (br.hi("rt") - br.lo("rt")) * 0.2)],
      },
      caption: "A real level tested twice, broken with a strong candle, then retested as support before the move continued.",
      spot: ["A level with 2+ clean touches", "Breakout candle closes decisively beyond it (big body)", "Pullback to the level on weaker candles", "Rejection candle at the retest"],
      rules: { entry: "Confirmation candle at the retest", stop: "Back inside the old range (beyond the retest wick)", target: "Measured move (range height) or next major level", invalid: "Price closes back inside the range", best: "Session opens, after consolidation; all timeframes" },
      mistakes: "Buying the breakout candle itself (often a fakeout), or placing the stop right on the level where the retest wick will hit it.",
      quiz: [
        { q: "What makes a breakout convincing?", options: ["A wick through the level", "A strong close beyond it", "A doji", "Low volume"], answer: 1, why: "Acceptance beyond the level." },
        { q: "The retest entry uses the old resistance as…", options: ["Resistance", "Support", "Nothing", "A target"], answer: 1, why: "Role reversal." },
        { q: "Invalidation?", options: ["Price closing back inside the range", "A higher high", "RSI above 70", "Weekend"], answer: 0, why: "Then the breakout failed." },
      ],
    }),
    strategy({
      id: "strat-range",
      title: "Range trading",
      summary: "Buy the floor, sell the ceiling while the market goes sideways.",
      idea: "When the market has no trend, it bounces between support and resistance. Range traders **buy near the bottom and sell near the top**, taking profit near the other side, until the range breaks.",
      spec: (() => {
        const top = rg.lv["top"]!;
        const bot = rg.lv["bot"]!;
        const band = (top - bot) * 0.12;
        const lastBot = Object.keys(rg.pts).filter((k) => k.startsWith("bot")).sort((a, b) => rg.i(b) - rg.i(a))[0]!;
        return {
          candles: rg.candles,
          source: rg.source,
          notes: [
            { k: "zone" as const, i1: 0, i2: rg.candles.length - 1, p1: top - band, p2: top, color: "down" as const, text: "sell zone" },
            { k: "zone" as const, i1: 0, i2: rg.candles.length - 1, p1: bot, p2: bot + band, color: "up" as const, text: "buy zone" },
            { k: "arrow" as const, i: rg.i(lastBot), p: rg.lo(lastBot), dir: "up" as const, color: "up" as const, text: "buy" },
          ],
        };
      })(),
      caption: "A real, clearly defined range: buy the rejection at the floor, target the ceiling.",
      spot: ["At least 2 touches of both the top and bottom", "Flat moving averages; RSI swinging 30–70", "Rejection wicks at the edges", "No big news due"],
      rules: { entry: "Rejection candle at the range edge", stop: "Just outside the range", target: "Mid-range (partial) and the opposite edge", invalid: "A close outside the range", best: "Asian session, quiet markets, before news" },
      mistakes: "Trading in the middle of the range, and refusing to accept when the range finally breaks.",
      quiz: [
        { q: "Range traders buy near…", options: ["Resistance", "Support", "The middle", "Breakouts"], answer: 1, why: "Buy the floor." },
        { q: "A typical first target is…", options: ["Mid-range", "10× the range", "Below support", "None"], answer: 0, why: "Take partial profit at equilibrium, then the other edge." },
        { q: "The range strategy is invalid when…", options: ["Price closes outside the range", "Price touches support", "It's quiet", "RSI is 50"], answer: 0, why: "The market is no longer ranging." },
      ],
    }),
    strategy({
      id: "strat-bos",
      title: "Break of Structure continuation",
      summary: "Trade in the direction of a confirmed BOS, entering on the pullback. This is what the Play levels train.",
      idea: "A **BOS** proves the trend is alive. After it, price usually pulls back toward the origin of the move. Enter on that pullback in the BOS direction with the stop behind the swing that created the break.",
      spec: {
        candles: bos.candles,
        source: bos.source,
        notes: [
          { k: "line", i1: bos.i("swing"), p1: bos.hi("swing"), i2: bos.i("brk"), p2: bos.hi("swing"), color: "up", text: "BOS" },
          { k: "dot", i: bos.i("pull"), p: bos.lo("pull"), color: "gold", text: "pullback low", pos: "below" },
          ...entryNotes(bos.i("brk"), bos.lv["entry"]!, bos.lv["sl"]!, bos.lv["tp"]!),
        ],
      },
      caption: "A real BOS: price closes above the last swing high after a higher low. Stop under the pullback low, target 2R.",
      spot: ["Clear swing high/low being broken with a candle CLOSE", "Displacement (strong candles) on the break", "Pullback that holds above the broken level / in discount", "Entry trigger on the lower timeframe"],
      rules: { entry: "On the pullback after the BOS, in the BOS direction", stop: "Beyond the pullback swing (the last higher low)", target: "At least 2R; the next liquidity (old high/low)", invalid: "A CHoCH: the pullback low breaks", best: "Trending markets; M15–H4" },
      mistakes: "Calling a BOS on a wick, or entering far from the pullback so the stop becomes huge and the RR poor.",
      extra: [{ t: "callout", tone: "tip", text: "Practise this: Learn → Break of Structure has 10 scored levels plus practice charts." }],
      quiz: [
        { q: "A BOS must be confirmed by…", options: ["A wick", "A candle close", "RSI", "The news"], answer: 1, why: "Closes, not wicks." },
        { q: "Where is the entry?", options: ["On the breakout candle's high", "On the pullback after the BOS", "Before the BOS", "Anywhere"], answer: 1, why: "Better price, tighter stop." },
        { q: "Invalidation is…", options: ["A new high", "A CHoCH (pullback low breaks)", "A doji", "Low volume"], answer: 1, why: "Structure changed." },
      ],
    }),
    strategy({
      id: "strat-choch-reversal",
      title: "CHoCH reversal",
      summary: "Catch the turn once the old trend's structure breaks.",
      idea: "Trends end with a **change of character**: price breaks the last swing against the trend. Aggressive traders enter on the first pullback after the CHoCH; conservative traders wait for the first BOS in the new direction.",
      spec: {
        candles: ch.candles,
        source: ch.source,
        notes: [
          { k: "dot", i: ch.i("H3"), p: ch.hi("H3"), color: "gold", text: "final high", pos: "above" },
          { k: "line", i1: ch.i("L4"), p1: ch.lo("L4"), i2: ch.i("ch"), p2: ch.lo("L4"), color: "down", text: "CHoCH" },
        ],
      },
      caption: "The bearish version on a real chart: an uptrend makes its final high, then closes below the last higher low (CHoCH). Sellers now look for a pullback to sell.",
      spot: ["An extended trend, often with divergence", "A liquidity sweep of the last low/high", "Strong candle breaking the last lower high (for longs)", "Pullback into the origin of the CHoCH move (order block / FVG)"],
      rules: { entry: "Pullback after the CHoCH (or after the first BOS for conservative)", stop: "Beyond the final swing extreme", target: "Previous swing points of the old trend", invalid: "Price makes a new extreme beyond the final low/high", best: "At higher-timeframe key levels" },
      mistakes: "Calling reversals too early without a CHoCH; fighting a strong higher-timeframe trend.",
      quiz: [
        { q: "A bullish CHoCH breaks…", options: ["The last lower high", "The last lower low", "A moving average", "The spread"], answer: 0, why: "Breaking against the downtrend." },
        { q: "Conservative traders wait for…", options: ["Nothing", "The first BOS in the new direction", "Two weeks", "RSI 90"], answer: 1, why: "More confirmation, later entry." },
        { q: "The stop goes beyond…", options: ["The final swing extreme", "The entry candle only", "The moving average", "Round numbers"], answer: 0, why: "A new extreme means the old trend continues." },
      ],
    }),
    strategy({
      id: "strat-smc-ob-fvg",
      title: "Smart Money: sweep → displacement → OB/FVG",
      summary: "The classic SMC model: grab liquidity, break structure, return to the zone.",
      idea: "Smart Money traders wait for a 3-step story: **(1)** price sweeps liquidity (takes out a low), **(2)** it reverses with **displacement** that breaks structure and leaves an FVG, **(3)** it returns to the **order block / FVG**, where they enter.",
      spec: {
        candles: smc.candles,
        source: smc.source,
        notes: [
          { k: "label", i: smc.i("fvg1") + 1, p: smc.hi("fvg3"), text: "displacement", color: "up" },
          { k: "zone", i1: smc.i("ob"), i2: smc.i("rt") + 1, p1: smc.lv["obBot"]!, p2: smc.lv["fvgTop"]!, color: "electric", text: "OB + FVG" },
          ...plan(smc.i("rt"), smc.lv["fvgBot"]!, smc.lv["obBot"]! - (smc.lv["obTop"]! - smc.lv["obBot"]!) * 0.3),
        ],
      },
      caption: "A real displacement leaving an order block and a fair value gap. Price returned into the zone (the entry) and rallied.",
      spot: ["A clear liquidity pool (equal lows, session low) gets swept", "Displacement: big candles + BOS + FVG", "The order block / FVG left behind by the displacement", "Zone in discount of the new swing"],
      rules: { entry: "Limit order in the OB/FVG (often its 50%)", stop: "Below the sweep low", target: "Opposing liquidity (old highs); 3R+ common", invalid: "Close below the OB / the sweep low", best: "London & New York sessions; M5–H1 with H4 bias" },
      mistakes: "Marking every candle as an order block. Without a sweep AND displacement AND a BOS, it isn't the model.",
      quiz: [
        { q: "Step 1 of the model is…", options: ["Entry", "A liquidity sweep", "Take profit", "A doji"], answer: 1, why: "Liquidity is taken first." },
        { q: "Displacement means…", options: ["Slow drift", "Strong, fast candles that break structure", "A gap on the weekend", "Low volume"], answer: 1, why: "It shows institutional intent." },
        { q: "Where is the entry?", options: ["At the sweep", "In the OB/FVG after the displacement", "At the high", "After the target"], answer: 1, why: "The return to the zone." },
      ],
    }),
    strategy({
      id: "strat-ma-trend",
      title: "Moving average trend-following",
      summary: "Let two moving averages define the trend and trade in its direction.",
      idea: "A simple, rules-based approach: when the fast MA is above the slow MA, only look for buys; below, only sells. Enter on pullbacks to the fast MA. It's great for beginners because it removes opinion.",
      spec: { candles: gc.candles, source: gc.source, notes: [{ k: "dot", i: gc.i("cross"), p: gc.lo("cross"), color: "up", text: "regime turns bullish", pos: "below" }], overlays: [{ values: maF, color: "electric", label: "SMA 9" }, { values: maS, color: "gold", label: "SMA 21" }] },
      caption: "A real chart: once the fast MA crossed above the slow MA, buying pullbacks to the fast MA kept you in the new uptrend.",
      spot: ["Fast MA above slow MA, both sloping up (longs)", "Clean separation between the MAs (not tangled)", "Pullback touches or nears the fast MA", "Bullish candle off the MA"],
      rules: { entry: "Bullish candle after a pullback to the fast MA", stop: "Below the pullback low / below the slow MA", target: "Trail the stop under the slow MA, or fixed 2R", invalid: "Fast MA crosses back below the slow MA", best: "Strong trends; H4/D1" },
      mistakes: "Using it in ranges (tangled, flat MAs = constant false signals).",
      quiz: [
        { q: "When fast MA > slow MA you look for…", options: ["Sells", "Buys", "Nothing", "Both"], answer: 1, why: "Bullish regime." },
        { q: "Tangled, flat MAs mean…", options: ["Strong trend", "Range: avoid the strategy", "Buy", "Sell"], answer: 1, why: "No trend to follow." },
        { q: "A common exit is…", options: ["Trailing the stop under the slow MA", "Never exiting", "At a random time", "When RSI is 50"], answer: 0, why: "Lets winners run." },
      ],
    }),
    strategy({
      id: "strat-rsi-divergence",
      title: "RSI divergence reversal",
      summary: "Spot fading momentum at a key level and trade the turn.",
      idea: "When price makes a **new low but RSI makes a higher low** (bullish divergence) at support, sellers are running out of force. Enter after structure confirms the turn.",
      spec: {
        candles: dv.candles,
        source: dv.source,
        notes: [{ k: "line", i1: dv.i("A"), p1: dv.lo("A"), i2: dv.i("B"), p2: dv.lo("B"), color: "down", text: "lower low" }],
        pane: { label: "RSI (14)", min: 0, max: 100, series: [{ values: dvR, color: "purple" }], levels: [{ v: 30, color: "up" }, { v: 70, color: "down" }], notes: [{ k: "line", i1: dv.i("A"), p1: dvR[dv.i("A")] ?? 25, i2: dv.i("B"), p2: dvR[dv.i("B")] ?? 35, color: "up", text: "higher low" }] },
      },
      caption: "A real bullish divergence: price made a lower low, RSI made a higher low, and price rallied.",
      spot: ["Two swing lows (or highs) at/near a key level", "RSI disagreeing with price", "A structure break (CHoCH) for confirmation", "Ideally a reversal candle on the second low"],
      rules: { entry: "After the CHoCH / break of the last lower high", stop: "Below the second low", target: "The start of the last down-leg; 2R+", invalid: "A third lower low with RSI following", best: "At major levels; H1–D1" },
      mistakes: "Entering on divergence alone. It can repeat several times in a strong trend.",
      quiz: [
        { q: "Bullish divergence: price makes a ___, RSI makes a ___.", options: ["LL / HL", "HH / LH", "HL / LL", "LL / LL"], answer: 0, why: "Momentum disagrees with the new low." },
        { q: "What confirms the entry?", options: ["Divergence alone", "A structure break", "Time", "Volume only"], answer: 1, why: "Divergence is a warning, not a trigger." },
        { q: "Stop placement?", options: ["Below the second low", "Above entry", "At RSI 30", "None"], answer: 0, why: "A new low invalidates it." },
      ],
    }),
    strategy({
      id: "strat-london-breakout",
      title: "London session breakout",
      summary: "Trade the break of the Asian range when London opens.",
      idea: "During the quiet Asian session price usually builds a tight range. When London opens (≈ 08:00 GMT / 11:00 EAT), volume surges and price often breaks out of that range. Trade the break (or the fake-out and reversal if the break fails).",
      spec: {
        candles: lon.candles,
        source: lon.source,
        notes: [
          { k: "zone", i1: lon.i("a0"), i2: lon.i("a1"), p1: lon.lv["lo"]!, p2: lon.lv["hi"]!, color: "gold", text: "Asian range" },
          { k: "vline", i: lon.i("open"), text: "London open", color: "electric" },
          { k: "arrow", i: lon.i("br"), p: lon.candles[lon.i("br")]![3] > lon.lv["hi"]! ? lon.lo("br") : lon.hi("br"), dir: lon.candles[lon.i("br")]![3] > lon.lv["hi"]! ? "up" : "down", color: "up", text: "breakout" },
        ],
      },
      caption: "A real London session: price coiled in the Asian range overnight, broke out after London opened, and ran.",
      spot: ["Mark the Asian session high and low", "A tight range (small compared with the daily ATR) is best", "Strong candle closing outside after London opens", "Retest of the range edge"],
      rules: { entry: "Break + retest of the Asian high/low after London opens", stop: "Middle or opposite side of the Asian range", target: "1–2× the range height; previous day high/low", invalid: "Close back inside the range (then consider the reverse)", best: "GBP, EUR pairs, gold; London open ±2h" },
      mistakes: "Trading ranges that are already too wide, and ignoring news scheduled at the open.",
      quiz: [
        { q: "The London breakout trades the break of…", options: ["The weekly high", "The Asian session range", "A moving average", "The spread"], answer: 1, why: "Asia builds the range; London breaks it." },
        { q: "London opens at about…", options: ["08:00 GMT (11:00 EAT)", "13:00 GMT", "00:00 GMT", "20:00 EAT"], answer: 0, why: "Session timing." },
        { q: "If the break fails and closes back inside…", options: ["Double the position", "The idea is invalid; consider the reversal", "Hold forever", "Ignore it"], answer: 1, why: "A failed breakout often reverses." },
      ],
    }),
    strategy({
      id: "strat-top-down",
      title: "Multi-timeframe top-down",
      summary: "Combine everything: bias from above, zone in the middle, trigger below.",
      idea: "The professional routine. Use the **higher timeframe** for direction, the **middle** for the zone, and the **lower** for the precise trigger. It turns any strategy above into a higher-probability version.",
      spec: {
        candles: bos.candles,
        source: bos.source,
        notes: [
          { k: "zone", i1: bos.i("pull") - 2, i2: bos.i("brk"), p1: bos.lo("pull"), p2: bos.lo("pull") + (bos.hi("swing") - bos.lo("pull")) * 0.35, color: "electric", text: "higher-TF zone" },
          ...entryNotes(bos.i("brk"), bos.lv["entry"]!, bos.lv["sl"]!, bos.lv["tp"]!),
        ],
      },
      caption: "Higher timeframe gives the direction, the pullback reaches a zone, and the lower-timeframe break is the entry trigger.",
      spot: ["D1/H4: trend direction + major levels", "H1: pullback into a zone (OB, FVG, support, fib) in discount", "M15/M5: a CHoCH/BOS in the D1 direction inside the zone", "Stop behind the M15 swing = tight stop, large RR"],
      rules: { entry: "Lower-timeframe structure break inside the higher-timeframe zone", stop: "Beyond the lower-timeframe swing", target: "Higher-timeframe liquidity / swing high", invalid: "Close beyond the H1 zone", best: "Any market; D1-H1-M15 or H4-M15-M1" },
      mistakes: "Using too many timeframes (paralysis) or letting a lower timeframe override the higher-timeframe bias.",
      extra: [{ t: "widget", name: "positionSizer" }],
      quiz: [
        { q: "The higher timeframe gives you…", options: ["The entry candle", "The direction/bias", "The spread", "Nothing"], answer: 1, why: "Top-down starts with direction." },
        { q: "Why enter on the lower timeframe?", options: ["More fun", "Tighter stop → bigger RR", "Less risk of news", "It's required"], answer: 1, why: "Precision entries shrink the stop." },
        { q: "If the lower timeframe disagrees with the higher…", options: ["Follow the lower", "Respect the higher-timeframe bias", "Trade both", "Double risk"], answer: 1, why: "The bigger picture wins." },
      ],
    }),
  ],
};

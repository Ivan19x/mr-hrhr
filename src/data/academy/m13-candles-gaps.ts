import type { Module } from "./types";
import { closeUp, real, realSpec } from "./real";
import { hiTag, level, loTag, renko, zone } from "./adv";

const gap = real("gap-breakaway");
const gi = gap.i("gap");
const runI = gap.pts["run"];
const isl = real("island-reversal");
const rk = real("renko-src");
const ranges = rk.candles.map((c) => c[1] - c[2]).sort((a, b) => a - b);
const box = ranges[Math.floor(ranges.length / 2)]! * 1.2;
const bricks = renko(rk.closes, box);

export const M13_CANDLES_GAPS: Module = {
  id: "advanced-candles",
  n: 13,
  title: "Advanced Candles & Gaps",
  tagline: "The rarer candle signals, fakeout bars, price gaps and charts that ignore time.",
  icon: "🕯️",
  lessons: [
    {
      id: "belt-hold-kicker",
      title: "Belt hold and kicker",
      summary: "Two single-push reversal candles: one opens at its extreme, the other flips sentiment in one open.",
      minutes: 5,
      terms: ["Belt hold", "Kicker"],
      blocks: [
        {
          t: "p",
          text: "A **belt hold** is a long candle that opens at its extreme and never looks back. A bullish belt hold opens at (or almost at) its **low**, has no lower wick, and closes near the high, usually after a decline. It says buyers took control from the first tick of the candle.",
        },
        { t: "diagram", caption: "A real bullish belt hold at the end of a decline: no lower wick, a big body, and price kept rising.", spec: realSpec("belt-hold-bull", (r) => [loTag(r, "k", "belt hold", "up")]) },
        {
          t: "p",
          text: "A **kicker** is stronger. The previous candle moves one way, then the next candle **opens at or beyond the previous open** (a gap against it) and runs the other way. It usually happens after news or a session open, when positioning flips in one moment.",
        },
        { t: "diagram", caption: "A real bullish kicker: after a red candle, the next one opens above that candle's open and never trades back into it.", spec: realSpec("kicker-bull", (r) => [hiTag(r, "prev", "red candle", "down"), loTag(r, "k", "kicker", "up")]) },
        {
          t: "spot",
          items: [
            "Belt hold: the candle opens at its low (bullish) or high (bearish): no wick on the opening side.",
            "Belt hold: the body is at least ~70% of the range and bigger than the recent candles.",
            "Kicker: the second candle opens at or beyond the first candle's OPEN, not just its close.",
            "Both matter most after an extended move and at a key level.",
          ],
        },
        { t: "callout", tone: "tip", text: "On 24/7 crypto charts each candle opens where the last one closed, so kickers almost never appear. Look for them on stocks, indices and forex after a session or weekend gap." },
      ],
      quiz: [
        { q: "A bullish belt hold opens…", options: ["At its high", "At or near its low", "In the middle", "With a gap down only"], answer: 1, why: "It opens at the low and never trades below it." },
        { q: "What makes a bullish kicker?", options: ["A doji after a red candle", "A red candle, then a green one that opens at/above the red candle's open", "Two green candles in a row", "A long upper wick"], answer: 1, why: "The open 'kicks' past the prior open and runs the other way." },
        { q: "Where do kickers usually appear?", options: ["On 24/7 crypto charts", "At session or weekend gaps (stocks, indices, FX)", "Only on the 1-minute chart", "Only in ranges"], answer: 1, why: "A kicker needs an open that jumps away from the previous candle." },
      ],
    },
    {
      id: "outside-three-inside",
      title: "Outside bar and three inside up / down",
      summary: "A bar that swallows the previous range, and the harami that gets confirmed.",
      minutes: 5,
      terms: ["Outside Bar", "Three inside up / down"],
      blocks: [
        {
          t: "p",
          text: "An **outside bar** has a higher high AND a lower low than the previous candle: it covers the entire previous range. Both sides' stops were run in one candle. Where it **closes** tells you who won: a close near the top after a decline is a bullish outside bar.",
        },
        { t: "diagram", caption: "A real bullish outside bar: it takes out the previous candle's low, then closes above its high.", spec: realSpec("outside-bar", (r) => [hiTag(r, "prev", "previous", "muted"), loTag(r, "k", "outside bar", "up")]) },
        {
          t: "p",
          text: "**Three inside up** is a harami with confirmation: (1) a big bearish candle, (2) a small bullish candle inside its body, (3) a bullish candle that **closes above candle 1's open**. The third candle is the proof that the harami meant something. **Three inside down** is the mirror image at a top.",
        },
        {
          t: "diagram",
          caption: "Real three inside up: big red candle, small candle inside it, then a close above the red candle's open.",
          spec: realSpec("three-inside-up", (r) => [hiTag(r, "a", "1", "down"), loTag(r, "b", "2", "muted"), hiTag(r, "k", "3", "up"), level(r.candles[r.i("a")]![0], "candle 1 open", "gold", true, r.i("a"), r.i("k") + 2)]),
        },
        {
          t: "table",
          head: ["Pattern", "Candles", "Signal", "Confirmation"],
          rows: [
            ["Outside bar", "1 bar vs the previous", "Range expansion both ways", "Close in the top/bottom quarter"],
            ["Harami", "2", "Momentum pause", "None yet"],
            ["Three inside up/down", "3", "Reversal", "Built in: candle 3 closes past candle 1's open"],
          ],
        },
      ],
      quiz: [
        { q: "An outside bar has…", options: ["A lower high and a higher low", "A higher high and a lower low than the previous bar", "No wicks", "The same open and close"], answer: 1, why: "It covers the whole previous range." },
        { q: "What does candle 3 of three inside up do?", options: ["Opens with a gap", "Closes above candle 1's open", "Forms a doji", "Closes below candle 2"], answer: 1, why: "That close confirms the harami." },
        { q: "What decides whether an outside bar is bullish?", options: ["Its colour only", "Where it closes within its range", "Its volume only", "Its time"], answer: 1, why: "A close near the high after a decline is bullish." },
      ],
    },
    {
      id: "three-methods-abandoned-baby",
      title: "Rising three methods and the abandoned baby",
      summary: "A continuation pause inside one big candle, and a rare gapped reversal star.",
      minutes: 5,
      terms: ["Rising / falling three methods", "Abandoned baby"],
      blocks: [
        {
          t: "p",
          text: "**Rising three methods** is a continuation pattern: a big bullish candle, then about three small candles drifting down **without leaving the big candle's range**, then another big bullish candle closing above the first one's high. Sellers tried and couldn't even undo one candle. **Falling three methods** is the bearish version.",
        },
        { t: "diagram", caption: "Real rising three methods: small pullback candles stay inside the first big candle, then a new high.", spec: realSpec("rising-three", (r) => [zone(r.i("a"), r.i("k") - 1, r.lo("a"), r.hi("a"), "electric", "range of candle 1"), hiTag(r, "k", "breakout", "up")]) },
        {
          t: "p",
          text: "The **abandoned baby** is a morning/evening star where the middle doji **gaps away from both neighbours**. A bearish candle, a doji that opens below its body, then a bullish candle that opens above the doji. The doji is left stranded ('abandoned'). It is rare, which is exactly why it is taken seriously when it prints.",
        },
        { t: "diagram", caption: "A real bullish abandoned baby: the doji's body sits below both neighbouring bodies.", spec: realSpec("abandoned-baby-bull", (r) => [hiTag(r, "a", "bearish", "down"), loTag(r, "b", "doji", "gold"), hiTag(r, "k", "bullish", "up")]) },
        { t: "gallery", items: [
          { title: "Morning star", spec: closeUp("morning-star", "k", 6, 3), text: "Middle candle small, no gaps needed.", tone: "up" },
          { title: "Abandoned baby", spec: closeUp("abandoned-baby-bull", "k", 6, 3), text: "Middle doji gapped away on both sides.", tone: "gold" },
        ] },
        { t: "callout", tone: "warn", text: "Textbook abandoned babies need true gaps, which mostly appear on stocks and indices. On 24/7 markets, look for the star shape instead and demand stronger confirmation." },
      ],
      quiz: [
        { q: "In rising three methods, the small middle candles…", options: ["Break below candle 1's low", "Stay inside candle 1's range", "Must be green", "Gap up"], answer: 1, why: "They pull back without undoing the first candle." },
        { q: "Rising three methods is a…", options: ["Reversal pattern", "Continuation pattern", "Volume pattern", "Gap pattern"], answer: 1, why: "The trend resumes after a small pause." },
        { q: "What makes an abandoned baby different from a morning star?", options: ["It has four candles", "The middle doji gaps away from both neighbours", "It only forms at tops", "Nothing"], answer: 1, why: "The gaps isolate the doji." },
      ],
    },
    {
      id: "hikkake",
      title: "The hikkake (inside-bar fakeout)",
      summary: "Traders break an inside bar, get trapped, and price runs the other way.",
      minutes: 4,
      terms: ["Hikkake (inside-bar fakeout)"],
      blocks: [
        {
          t: "p",
          text: "An **inside bar** tempts traders to trade its breakout. The **hikkake** is what happens when that breakout fails: price breaks one side of the inside bar, the breakout traders pile in, then price reverses and **closes through the other side** within a few candles. The trapped traders' stops fuel the move.",
        },
        {
          t: "diagram",
          caption: "A real bullish hikkake: the inside bar's low breaks, the break fails, and a close above the inside bar's high starts the run.",
          spec: realSpec("hikkake-bull", (r) => [
            zone(r.i("m"), r.i("k"), r.lo("ib"), r.hi("ib"), "muted", "inside bar"),
            loTag(r, "k", "false break", "down"),
            hiTag(r, "conf", "close above", "up"),
          ]),
        },
        {
          t: "flow",
          steps: [
            { title: "Mother bar + inside bar", text: "Candle 2 fits completely inside candle 1." },
            { title: "False break", text: "Price pokes below the inside bar's low (bullish setup)." },
            { title: "Trigger", text: "Within ~3 candles price closes above the inside bar's high." },
            { title: "Stop", text: "Below the false-break low: if price goes back there, the idea is wrong." },
          ],
        },
      ],
      quiz: [
        { q: "A hikkake starts with…", options: ["An outside bar", "An inside bar", "A gap", "A doji"], answer: 1, why: "It's the failed break of an inside bar." },
        { q: "A bullish hikkake triggers when price…", options: ["Breaks the inside bar low", "Closes above the inside bar high after a false break down", "Makes a doji", "Touches a moving average"], answer: 1, why: "The false break down traps sellers first." },
        { q: "Why does the hikkake move fast?", options: ["News", "Trapped breakout traders' stops fuel it", "Low volume", "It's random"], answer: 1, why: "Their stops become fuel in the other direction." },
      ],
    },
    {
      id: "price-gaps",
      title: "Gaps: breakaway, runaway, exhaustion and islands",
      summary: "What it means when price jumps between sessions, and which gaps get filled.",
      minutes: 7,
      terms: ["Gaps (common, breakaway, runaway, exhaustion)", "Island reversal", "Opening Gap / Breakaway Gap"],
      blocks: [
        {
          t: "p",
          text: "A **gap** is empty space between one candle's range and the next. It happens when a market opens far from its last price, usually overnight or after news. On stocks and indices this is normal; on 24/7 crypto it is rare. There are four classic kinds:",
        },
        {
          t: "table",
          head: ["Gap", "Where it appears", "What it means", "Filled?"],
          rows: [
            ["Common", "Inside a range", "Noise", "Usually within days"],
            ["Breakaway", "Out of a range or base", "A new trend starts", "Often not for a long time"],
            ["Runaway (measuring)", "Mid-trend", "The trend is accelerating", "Rarely soon"],
            ["Exhaustion", "After a long run, on huge volume", "The last buyers/sellers", "Filled quickly; reversal risk"],
          ],
        },
        {
          t: "diagram",
          caption: "A real breakaway gap out of a tight range, followed by a runaway gap: neither was filled while the trend ran.",
          spec: realSpec("gap-breakaway", (r) => [
            level(r.lv["top"]!, "range high", "muted", true, 0, gi),
            zone(gi - 1, gi, r.candles[gi - 1]![1], r.candles[gi]![2], "up", "breakaway gap"),
            ...(runI !== undefined ? [zone(runI - 1, runI, r.candles[runI - 1]![1], r.candles[runI]![2], "electric", "runaway")] : []),
          ]),
        },
        {
          t: "p",
          text: "An **island reversal** is a cluster of candles cut off by a gap on **both** sides: price gaps up, trades a few days, then gaps down (or the reverse). Everyone who bought on the island is trapped above the market.",
        },
        {
          t: "diagram",
          caption: "A real island top: gap up, a few candles alone, then a gap down that leaves them stranded.",
          spec: realSpec("island-reversal", (r) => [zone(r.i("a"), r.i("b"), Math.min(...r.candles.slice(r.i("a"), r.i("b") + 1).map((c) => c[2])), Math.max(...r.candles.slice(r.i("a"), r.i("b") + 1).map((c) => c[1])), "gold", "island"), loTag(r, "gd", "gap down", "down")]),
        },
        { t: "callout", tone: "key", text: "The **opening gap** (today's open vs yesterday's close) is a reference level in itself: price often returns to it. You'll see ICT's version, the New Day / New Week Opening Gap, in the Imbalances module." },
      ],
      quiz: [
        { q: "A gap out of a range that starts a new trend is a…", options: ["Common gap", "Breakaway gap", "Exhaustion gap", "Island"], answer: 1, why: "It breaks away from the base." },
        { q: "Which gap is usually filled quickly?", options: ["Breakaway", "Runaway", "Exhaustion", "None"], answer: 2, why: "Exhaustion gaps mark the last push and get reversed." },
        { q: "An island reversal is gapped…", options: ["On one side", "On both sides", "Never", "Only intraday"], answer: 1, why: "It's isolated by gaps before and after." },
      ],
    },
    {
      id: "renko-range-bars",
      title: "Renko and range bars: charts without time",
      summary: "Bricks that only print when price moves a set amount, filtering out noise.",
      minutes: 5,
      terms: ["Renko / Range bars"],
      blocks: [
        {
          t: "p",
          text: "Normal candles print on the clock. **Renko** charts print a new **brick** only when price closes a full **box size** beyond the last brick (a reversal needs two boxes). Quiet periods produce no bricks at all, so trends and support/resistance look very clean.",
        },
        { t: "diagram", caption: `The same real market drawn two ways. Top: normal daily candles.`, spec: realSpec("renko-src", () => [], { height: 170 }) },
        { t: "diagram", caption: `Bottom: Renko bricks built from those closes (box size ≈ ${box.toPrecision(3)}). Sideways chop disappears.`, spec: { candles: bricks, height: 170, source: "Renko built from the chart above" } },
        {
          t: "table",
          head: ["Chart", "New bar when…", "Good for", "Watch out"],
          rows: [
            ["Time candles", "The clock ticks", "Everything, sessions, news timing", "Noise in quiet periods"],
            ["Renko", "Price moves one box", "Trend and S/R clarity", "Wicks and exact timing are lost; lags reversals"],
            ["Range bars", "The bar reaches a fixed high-low size", "Scalping, even-sized bars", "Bar count explodes in fast markets"],
          ],
        },
        { t: "callout", tone: "warn", text: "Renko hides wicks and time. Use it to read direction, but always check the real candle chart before placing a stop." },
      ],
      quiz: [
        { q: "When does Renko print a new brick?", options: ["Every hour", "When price moves one full box size", "At every trade", "When volume spikes"], answer: 1, why: "Renko is price-driven, not time-driven." },
        { q: "A Renko reversal brick needs…", options: ["One box", "Two boxes against the trend", "A gap", "A doji"], answer: 1, why: "That's the classic reversal rule." },
        { q: "What does Renko lose?", options: ["Direction", "Wicks and time", "Price", "Support levels"], answer: 1, why: "Bricks ignore time and wick extremes." },
      ],
    },
  ],
};

import type { Module } from "./types";
import { real, realSpec } from "./real";
import { hiTag, level, loTag, vline, zone } from "./adv";

const jd = real("judas");
const pdh = real("pdh-sweep");
const pwh = real("pwh-sweep");

export const M17_LIQUIDITY_PRO: Module = {
  id: "liquidity-pro",
  n: 17,
  title: "Liquidity: Deep Dive",
  tagline: "Sell-side pools, trendline and engineered liquidity, the draw on liquidity, IRL/ERL, turtle soup, the Judas swing and previous highs and lows.",
  icon: "💧",
  lessons: [
    {
      id: "sell-side-clean-old",
      title: "Sell-side liquidity, clean lows and old lows",
      summary: "Where the stops below the market rest, and why equal lows are a target.",
      minutes: 6,
      terms: ["Sell-Side Liquidity (SSL)", "Clean Highs / Clean Lows", "Old High / Old Low"],
      blocks: [
        {
          t: "p",
          text: "**Buy-side liquidity (BSL)** rests above highs: buy stops of shorts and buy-stop entries of breakout traders. **Sell-side liquidity (SSL)** rests below lows: sell stops of longs and sell-stop entries of breakdown traders. Large players need that opposite-side liquidity to fill big orders: to buy a lot, they need a lot of sellers, and a run below the lows provides them.",
        },
        {
          t: "diagram",
          caption: "Real sell-side liquidity: two clean, equal lows stacked stops underneath. Price ran below them, closed back above, and rallied.",
          spec: realSpec("ssl-sweep", (r) => [level(r.lv["L"]!, "SSL (equal lows)", "down", true, r.i("A"), r.i("fk") + 2), loTag(r, "A", "low 1", "muted"), loTag(r, "B", "low 2", "muted"), loTag(r, "fk", "SSL taken", "up")]),
        },
        {
          t: "table",
          head: ["Term", "Meaning", "Why it attracts price"],
          rows: [
            ["Clean high/low", "An obvious extreme nothing has traded through since", "Everyone sees it, so everyone's stops are there"],
            ["Equal highs/lows", "Two or more extremes at the same price", "Double the stops; 'too perfect' to be real support"],
            ["Old high/low", "A previous day/week/month extreme still untouched", "Stops accumulate the longer it stands"],
          ],
        },
        { t: "callout", tone: "key", text: "Support that 'looks perfect' is often liquidity. Don't buy the second touch of equal lows blindly; wait to see if they get swept first." },
      ],
      quiz: [
        { q: "Sell-side liquidity rests…", options: ["Above highs", "Below lows", "At the open", "At the moving average"], answer: 1, why: "Sell stops of longs sit under lows." },
        { q: "Why are equal lows attractive to large players?", options: ["They're random", "Many stops cluster there, providing sellers to buy from", "Brokers require it", "They're always support"], answer: 1, why: "A big buyer needs sellers." },
        { q: "A 'clean' low is…", options: ["A low no candle has traded through since", "A low with no wick", "A green candle", "A gap"], answer: 0, why: "Untouched, obvious extremes." },
      ],
    },
    {
      id: "trendline-engineered-liquidity",
      title: "Trendline liquidity and engineered liquidity",
      summary: "Every obvious touch builds stops; the market builds those levels on purpose.",
      minutes: 5,
      terms: ["Trendline Liquidity", "Engineered Liquidity / Liquidity Engineering"],
      blocks: [
        {
          t: "p",
          text: "A clean trendline with three touches is a gift to retail traders: buy the next touch, stop just below the line. That puts a **line of sell stops** under the trendline: **trendline liquidity**. When price finally breaks the line, the stops trigger in sequence and the move accelerates.",
        },
        {
          t: "diagram",
          caption: "A real rising trendline with three clean touches. The break below it ran straight through the stops resting under the line.",
          spec: realSpec("trendline-run", (r) => [
            { k: "line", i1: r.i("a"), p1: r.lo("a"), i2: r.i("br"), p2: r.lo("a") + ((r.lo("c") - r.lo("a")) / (r.i("c") - r.i("a"))) * (r.i("br") - r.i("a")), color: "electric", text: "trendline" },
            loTag(r, "a", "1", "muted"),
            loTag(r, "b", "2", "muted"),
            loTag(r, "c", "3", "muted"),
            loTag(r, "br", "stops run", "down"),
          ]),
        },
        {
          t: "p",
          text: "**Engineered liquidity** is the idea that price itself **builds** these obvious features (equal highs, a neat trendline, a tight range) so that there is liquidity to run later. Whether or not it's deliberate, the practical lesson is the same: the more obvious a level looks, the more orders sit beyond it.",
        },
      ],
      quiz: [
        { q: "Where do trendline traders usually put stops?", options: ["Far away", "Just beyond the trendline", "At the target", "No stops"], answer: 1, why: "Which creates a line of liquidity." },
        { q: "Why do trendline breaks often accelerate?", options: ["News", "Stops under the line trigger one after another", "Low volume", "They don't"], answer: 1, why: "Stops become market orders." },
        { q: "Engineered liquidity means…", options: ["Brokers print money", "Price builds obvious levels that are run later", "A new indicator", "Hidden orders"], answer: 1, why: "Obvious features store liquidity." },
      ],
    },
    {
      id: "draw-on-liquidity",
      title: "Draw on liquidity, IRL and ERL",
      summary: "Price moves from internal liquidity (gaps) to external liquidity (highs and lows), and back.",
      minutes: 8,
      terms: ["Liquidity Run", "Draw on Liquidity (DOL) / Liquidity Draw / Liquidity Magnet", "Opposing Liquidity", "Internal Range Liquidity (IRL) / External Range Liquidity (ERL)", "Low / High Resistance Liquidity Run (LRLR / HRLR)"],
      blocks: [
        {
          t: "p",
          text: "Take a **dealing range**: the last significant swing high and swing low. **External range liquidity (ERL)** is beyond the range: the stops above the high and below the low. **Internal range liquidity (IRL)** is inside: fair value gaps and imbalances. ICT's core idea: price alternates **from ERL to IRL and from IRL to ERL**.",
        },
        {
          t: "diagram",
          caption: "Real chart. A displacement left an FVG (IRL). Price came back to fill it, then ran to the buy-side liquidity above the range high (ERL).",
          spec: realSpec("irl-erl", (r) => [
            level(r.hi("H"), "ERL: range high (buy-side)", "gold", true, r.i("H"), r.i("erl") + 2),
            zone(r.i("f"), r.i("rt") + 1, r.lv["fvgBot"]!, r.lv["fvgTop"]!, "electric", "IRL: FVG"),
            loTag(r, "low", "range low", "muted"),
            loTag(r, "rt", "IRL filled", "up"),
            hiTag(r, "erl", "ERL taken", "up"),
          ]),
        },
        {
          t: "table",
          head: ["Term", "Meaning"],
          rows: [
            ["Draw on liquidity (DOL)", "The pool price is most likely heading toward next: your target"],
            ["Liquidity run", "Price travelling from one pool to the next, taking stops on the way"],
            ["Opposing liquidity", "The pool on the other side of the range, the target after a sweep"],
            ["Low-resistance liquidity run (LRLR)", "A clean path to the target: few swings or zones in the way; moves fast"],
            ["High-resistance liquidity run (HRLR)", "Many overlapping swings and zones in the way: choppy, slow, avoid"],
          ],
        },
        { t: "callout", tone: "key", text: "Before every trade ask: 'what is the draw on liquidity?' If you can't name the pool price is going to, you don't have a target, and you probably don't have a trade." },
      ],
      quiz: [
        { q: "External range liquidity is…", options: ["FVGs inside the range", "Stops beyond the range's high and low", "The spread", "Volume"], answer: 1, why: "It's outside the dealing range." },
        { q: "Internal range liquidity is usually…", options: ["Fair value gaps inside the range", "The daily open", "Round numbers", "News"], answer: 0, why: "Imbalances inside the range." },
        { q: "A low-resistance liquidity run has…", options: ["Many obstacles", "A clean path with few swings in the way", "No liquidity", "A gap"], answer: 1, why: "Clean paths move fast." },
      ],
    },
    {
      id: "turtle-soup",
      title: "Turtle soup",
      summary: "Fading the false breakout of a 20-period extreme: trading against the Turtles.",
      minutes: 5,
      terms: ["Turtle Soup"],
      blocks: [
        {
          t: "p",
          text: "The Turtle traders bought new 20-day highs and sold new 20-day lows. Linda Bradford Raschke and Laurence Connors noticed how often those breakouts failed, and named the fade **Turtle Soup** (Street Smarts, 1995): when price makes a new 20-period low (at least a few bars after the previous one) and immediately closes back above the old low, buy.",
        },
        {
          t: "diagram",
          caption: "A real turtle soup: price broke the previous 20-candle low, then closed back above it. The breakdown sellers were trapped.",
          spec: realSpec("turtle-soup", (r) => [level(r.lv["prevLow"]!, "previous 20-period low", "gold", true, r.i("prev"), r.i("k") + 3), loTag(r, "prev", "old low", "muted"), loTag(r, "k", "turtle soup", "up")]),
        },
        {
          t: "list",
          ordered: true,
          items: ["Find a 20-period low that is at least 4 candles old.", "Price trades below it (a new 20-period low).", "Enter when price is back above the old low (same or next candle).", "Stop below the new low; target the range's opposite side."],
        },
        { t: "callout", tone: "tip", text: "ICT uses 'turtle soup' for any sweep of an old high/low followed by a reversal. It's the same idea: the breakout traders become the liquidity." },
      ],
      quiz: [
        { q: "Turtle soup fades…", options: ["Moving average crosses", "False breaks of 20-period extremes", "Gaps", "News"], answer: 1, why: "It trades against failed Turtle breakouts." },
        { q: "The bullish entry comes when…", options: ["Price makes a new low", "Price is back above the old low", "RSI is 70", "Volume drops"], answer: 1, why: "The failure is the signal." },
        { q: "Where is the stop?", options: ["Below the new low", "Above the old high", "No stop", "At entry"], answer: 0, why: "If the new low breaks again, the idea failed." },
      ],
    },
    {
      id: "judas-swing",
      title: "The Judas swing",
      summary: "The early-session fake move that betrays traders before the real move of the day.",
      minutes: 6,
      terms: ["Judas Swing", "Judas Swing time window"],
      blocks: [
        {
          t: "p",
          text: "The **Judas swing** is a false move early in the session that runs one way, takes the obvious stops, then reverses into the day's real direction. On forex it usually forms between **midnight and about 05:00 New York time** (the end of Asia and the London open). On a bullish day, price first drops **below the midnight open**, then rallies and closes near the high.",
        },
        {
          t: "diagram",
          caption: `A real bullish day on ${jd.source.split(" · ")[1]}: the London drop below the midnight open was the Judas swing; New York then ran to the high.`,
          spec: realSpec("judas", (r) => [
            level(r.lv["open"]!, "midnight open", "gold", true, r.i("open"), r.candles.length - 1),
            vline(r.i("open"), "00:00", "muted"),
            vline(r.i("lon"), "05:00", "muted"),
            vline(r.i("ny"), "07:00 NY", "muted"),
            loTag(r, "low", "Judas swing", "down"),
            hiTag(r, "high", "day's real move", "up"),
          ]),
        },
        { t: "list", items: ["Bullish bias + price below the midnight open in London = look for the Judas low to form.", "Bearish bias + price above the midnight open = look for the Judas high.", "Confirmation: a market structure shift back through the open on a lower timeframe."] },
        { t: "callout", tone: "warn", text: "Judas swings only make sense with a higher-timeframe bias. Without one, an early drop is just a drop." },
      ],
      quiz: [
        { q: "On a bullish day, the Judas swing is…", options: ["An early rally", "An early drop below the open before the real rally", "The daily close", "A gap"], answer: 1, why: "It fakes the wrong direction first." },
        { q: "The forex Judas window is roughly…", options: ["00:00–05:00 New York", "12:00–13:00 New York", "Friday afternoon", "Any time"], answer: 0, why: "Late Asia into the London open." },
        { q: "The reference price for the Judas swing is…", options: ["The weekly high", "The midnight (00:00 NY) open", "The 200 MA", "The spread"], answer: 1, why: "Price trades against the open first." },
      ],
    },
    {
      id: "previous-highs-lows",
      title: "Previous day, week and month highs and lows",
      summary: "Yesterday's and last week's extremes are the most-watched liquidity on any chart.",
      minutes: 6,
      terms: ["Previous Day High / Low (PDH / PDL)", "Previous Week High / Low (PWH / PWL)", "Previous Month High / Low"],
      blocks: [
        {
          t: "p",
          text: "Every trader sees **yesterday's high and low (PDH/PDL)** and **last week's high and low (PWH/PWL)**. Stops and breakout orders gather just beyond them. A common daily pattern: price runs PDH (or PDL), fails to hold beyond it, and reverses toward the other side.",
        },
        {
          t: "diagram",
          caption: `A real day on ${pdh.source.split(" · ")[1]} (1-hour candles): yesterday on the left. Today price ran above the previous day's high, failed, and fell toward the previous day's low.`,
          spec: realSpec("pdh-sweep", (r) => [vline(r.i("open"), "new day", "muted"), level(r.lv["PH"]!, "PDH", "down", true), level(r.lv["PL"]!, "PDL", "up", true), hiTag(r, "sweep", "PDH swept", "down")]),
        },
        {
          t: "diagram",
          caption: `The same idea one timeframe up, on ${pwh.source.split(" · ")[1]} (4-hour candles): last week on the left, this week's run above the previous week's high, then the drop.`,
          spec: realSpec("pwh-sweep", (r) => [vline(r.i("open"), "new week", "muted"), level(r.lv["PH"]!, "PWH", "down", true), level(r.lv["PL"]!, "PWL", "up", true), hiTag(r, "sweep", "PWH swept", "down")]),
        },
        {
          t: "table",
          head: ["Level", "Timeframe to mark it on", "Used for"],
          rows: [
            ["PDH / PDL", "1h or 15m", "Intraday targets and sweep reversals"],
            ["PWH / PWL", "4h or 1h", "Swing targets; the weekly profile"],
            ["Previous month H/L", "Daily", "Position trades; big reversals"],
          ],
        },
      ],
      quiz: [
        { q: "PDH stands for…", options: ["Previous day high", "Price delivery high", "Premium daily high", "Pivot daily high"], answer: 0, why: "Yesterday's high." },
        { q: "A run above PDH that closes back below often leads to…", options: ["Continuation up", "A move toward PDL", "Nothing", "A gap"], answer: 1, why: "Opposing liquidity is the next draw." },
        { q: "Where do stops gather around PWH?", options: ["Just above it", "Far below", "At the open", "Nowhere"], answer: 0, why: "Shorts' stops and breakout buys sit above." },
      ],
    },
  ],
};

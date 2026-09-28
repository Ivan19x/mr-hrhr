import type { DiagramSpec, Module, Note } from "./types";
import { closeUp, real } from "./real";

const hl = (i: number, p: number, text: string, color: "up" | "down" | "gold" = "gold", pos: "above" | "below" = "above") =>
  ({ k: "label" as const, i, p, text, color, pos });

/** Close-up of a real 2–3 candle pattern ending at point k, with a label and optional extra notes. */
function combo(id: string, text: string, color: "up" | "down" | "gold", where: "above" | "below", extra: (k: number, c: DiagramSpec & { candles: import("./build").OHLC[] }) => Note[] = () => []): DiagramSpec {
  const c = closeUp(id, "k", 9, 4);
  const cd = c.candles[c.k]!;
  const lo = Math.min(cd[2], c.candles[c.k - 1]![2]);
  const hi = Math.max(cd[1], c.candles[c.k - 1]![1]);
  return { ...c, height: 180, notes: [hl(c.k, where === "above" ? hi : lo, text, color, where), ...extra(c.k, c)] };
}

export const M05_COMBOS: Module = {
  id: "candle-combos",
  n: 5,
  title: "Two-Candle Combos",
  tagline: "What happens when two candles tell one story, plus the classic three-candle reversals.",
  icon: "🔗",
  lessons: [
    {
      id: "engulfing",
      title: "Bullish and bearish engulfing",
      summary: "The second body swallows the first. Control has flipped.",
      minutes: 5,
      blocks: [
        {
          t: "p",
          text: "An **engulfing** pattern is two candles of opposite colour where the **second body completely covers the first body**. It says: the side that was losing has not only stopped the move, it has wiped out the entire previous period.",
        },
        {
          t: "gallery",
          items: [
            {
              title: "Bullish engulfing",
              tone: "up",
              text: "After a decline: small red, then a big green body that covers it. Buyers took over.",
              spec: combo("engulfing-bull", "engulfing", "up", "below"),
            },
            {
              title: "Bearish engulfing",
              tone: "down",
              text: "After a rally: green, then a bigger red body that covers it. Sellers took over.",
              spec: combo("engulfing-bear", "engulfing", "down", "above"),
            },
          ],
        },
        { t: "spot", items: ["Opposite colours", "Candle 2's body covers candle 1's body (wicks don't need to)", "Appears after a clear move, ideally at support/resistance", "The bigger candle 2 is vs candle 1, the stronger"] },
        { t: "callout", tone: "tip", text: "Classic entry: buy/sell at the close of the engulfing candle, stop beyond its wick." },
      ],
      quiz: [
        { q: "In a bullish engulfing, candle 2 must…", options: ["Be red", "Have a green body covering candle 1's body", "Have no wicks", "Gap down"], answer: 1, why: "The green body engulfs the red body." },
        { q: "A bearish engulfing is most powerful…", options: ["At support after a fall", "At resistance after a rally", "In the middle of a range", "On weekends"], answer: 1, why: "Sellers taking over where they already defend." },
        { q: "Must the wicks also be engulfed?", options: ["Yes", "No, the bodies are what count", "Only the lower wick", "Only in forex"], answer: 1, why: "The standard definition uses bodies." },
      ],
    },
    {
      id: "harami",
      title: "Harami (inside body)",
      summary: "A big candle, then a small one inside it: the move has stalled.",
      minutes: 4,
      blocks: [
        {
          t: "p",
          text: "**Harami** means 'pregnant' in Japanese: a big 'mother' candle followed by a small 'baby' whose body fits **inside** the mother's body. The strong move suddenly stopped. It's weaker than an engulfing and needs confirmation.",
        },
        {
          t: "gallery",
          items: [
            { title: "Bullish harami", tone: "up", text: "Big red, then small green inside it. Selling paused.", spec: combo("harami-bull", "harami", "up", "below") },
            { title: "Bearish harami", tone: "down", text: "Big green, then small red inside it. Buying paused.", spec: combo("harami-bear", "harami", "down", "above") },
          ],
        },
        { t: "callout", tone: "key", text: "**Harami cross**: when the baby is a doji. Even stronger indecision after a big move." },
      ],
      quiz: [
        { q: "In a harami, the second body is…", options: ["Bigger than the first", "Inside the first body", "The same colour always", "Gapped away"], answer: 1, why: "The baby sits inside the mother's body." },
        { q: "Compared with engulfing, harami is…", options: ["Stronger", "Weaker; needs confirmation", "Identical", "Only bullish"], answer: 1, why: "It shows a pause, not a takeover." },
        { q: "A harami cross has a second candle that is a…", options: ["Marubozu", "Doji", "Hammer", "Gap"], answer: 1, why: "Cross = doji." },
      ],
    },
    {
      id: "tweezers",
      title: "Tweezer tops and bottoms",
      summary: "Two candles hitting the exact same high or low: a level being defended.",
      minutes: 3,
      blocks: [
        {
          t: "gallery",
          items: [
            { title: "Tweezer bottom", tone: "up", text: "Two lows at the same price. Sellers failed twice at one level.", spec: combo("tweezer-bottom", "same low", "up", "below", (k, c) => [{ k: "hline", p: c.candles[k]![2], color: "up", dash: true, i1: k - 3, i2: k + 2 }]) },
            { title: "Tweezer top", tone: "down", text: "Two highs at the same price. Buyers failed twice at one level.", spec: combo("tweezer-top", "same high", "down", "above", (k, c) => [{ k: "hline", p: c.candles[k]![1], color: "down", dash: true, i1: k - 3, i2: k + 2 }]) },
          ],
        },
        { t: "spot", items: ["Matching highs (top) or lows (bottom), within a tiny tolerance", "Usually opposite colours", "After a trend, at a key level"] },
      ],
      quiz: [
        { q: "A tweezer bottom shows…", options: ["Two matching lows: a defended level", "Two matching highs", "A gap", "Strong selling"], answer: 0, why: "Sellers failed at the same price twice." },
        { q: "Where does a tweezer top form?", options: ["After a fall", "After a rise", "Anywhere", "Only on the daily chart"], answer: 1, why: "Tops end rallies." },
        { q: "Tweezer stop loss placement (top)?", options: ["Below the lows", "Just above the matching highs", "At the close", "None"], answer: 1, why: "If the double-tested high breaks, the pattern failed." },
      ],
    },
    {
      id: "piercing-dark-cloud",
      title: "Piercing line and dark cloud cover",
      summary: "A gap against the trend that gets pushed back past the midpoint.",
      minutes: 4,
      blocks: [
        {
          t: "gallery",
          items: [
            {
              title: "Piercing line (bullish)",
              tone: "up",
              text: "Red candle, then a green that opens below the low and closes above the MIDDLE of the red body.",
              spec: combo("piercing", "piercing", "up", "below", (k, c) => {
                const p = c.candles[k - 1]!;
                return [{ k: "hline", p: (p[0] + p[3]) / 2, text: "midpoint", color: "gold", dash: true, i1: k - 1, i2: k }];
              }),
            },
            {
              title: "Dark cloud cover (bearish)",
              tone: "down",
              text: "Green candle, then a red that opens above the high and closes below the MIDDLE of the green body.",
              spec: combo("dark-cloud", "dark cloud", "down", "above", (k, c) => {
                const p = c.candles[k - 1]!;
                return [{ k: "hline", p: (p[0] + p[3]) / 2, text: "midpoint", color: "gold", dash: true, i1: k - 1, i2: k }];
              }),
            },
          ],
        },
        {
          t: "p",
          text: "The midpoint rule is what matters: closing past halfway into the previous body means the counter-move was serious. If candle 2 covers the whole body, it becomes an engulfing.",
        },
        { t: "callout", tone: "tip", text: "True gaps are rare in 24-hour markets like forex, so these appear mostly on stocks/indices or after weekends. The midpoint idea still applies." },
      ],
      quiz: [
        { q: "A piercing line must close…", options: ["Anywhere green", "Above the midpoint of the red body", "Below the red low", "Exactly at the open"], answer: 1, why: "The midpoint rule defines it." },
        { q: "Dark cloud cover is…", options: ["Bullish", "Bearish", "Neutral", "A continuation pattern"], answer: 1, why: "Sellers push deep into the prior green body." },
        { q: "If candle 2 covers the entire first body, it's a…", options: ["Harami", "Engulfing", "Doji", "Tweezer"], answer: 1, why: "Full coverage = engulfing." },
      ],
    },
    {
      id: "inside-outside-bar",
      title: "Inside bars and outside bars",
      summary: "Compression before expansion, and the bar that swallows everything.",
      minutes: 4,
      blocks: [
        {
          t: "p",
          text: "**Inside bar**: the whole second candle (high AND low) sits within the first candle's range. The market is **coiling**. Traders place orders just beyond the mother bar's high and low and take whichever side breaks.",
        },
        {
          t: "diagram",
          caption: "A real mother bar, inside bar, then a breakout above the mother's high in the trend direction.",
          spec: (() => {
            const r = real("inside-bar");
            const k = r.i("k");
            const m = r.candles[k - 1]!;
            return {
              candles: r.candles,
              source: r.source,
              notes: [
                { k: "hline" as const, p: m[1], text: "mother high", color: "up" as const, dash: true, i1: k - 1 },
                { k: "hline" as const, p: m[2], text: "mother low", color: "down" as const, dash: true, i1: k - 1 },
                hl(k, r.lo("k"), "inside", "gold", "below"),
              ],
            };
          })(),
        },
        {
          t: "p",
          text: "**Outside bar**: the second candle's range completely covers the first (higher high AND lower low). A burst of volatility. The direction it closes shows who won the fight.",
        },
      ],
      quiz: [
        { q: "An inside bar's high and low are…", options: ["Outside the previous range", "Within the previous candle's range", "Equal to the open", "Random"], answer: 1, why: "It's fully contained." },
        { q: "Common inside-bar trade?", options: ["Sell immediately", "Enter on a break of the mother bar's high or low", "Wait a week", "Never trade it"], answer: 1, why: "The breakout shows the new direction." },
        { q: "An outside bar has…", options: ["A lower high", "A higher high AND a lower low than the prior candle", "No body", "No wicks"], answer: 1, why: "It swallows the previous range." },
      ],
    },
    {
      id: "three-candle",
      title: "Bonus: three-candle reversals",
      summary: "Morning star, evening star, three soldiers and three crows.",
      minutes: 5,
      blocks: [
        {
          t: "gallery",
          items: [
            { title: "Morning star (bullish)", tone: "up", text: "Big red → small indecision candle → big green closing into the first body.", spec: combo("morning-star", "morning star", "up", "below") },
            { title: "Evening star (bearish)", tone: "down", text: "Big green → small star at the top → big red closing into the first body.", spec: combo("evening-star", "evening star", "down", "above") },
            { title: "Three white soldiers", tone: "up", text: "Three strong greens, each closing higher, small wicks. Buyers taking over.", spec: combo("three-soldiers", "soldiers", "up", "above") },
            { title: "Three black crows", tone: "down", text: "Three strong reds, each closing lower. Sellers taking over.", spec: combo("three-crows", "crows", "down", "below") },
          ],
        },
        { t: "callout", tone: "key", text: "Every multi-candle pattern is just the buyers-vs-sellers story told over more rounds. If you can read each candle, you can read any pattern, even ones without a name." },
      ],
      quiz: [
        { q: "The middle candle of a morning star is…", options: ["Huge and red", "Small, showing indecision", "A marubozu", "Missing"], answer: 1, why: "The 'star' shows the selling stalled." },
        { q: "Three black crows signal…", options: ["Strong buying", "Strong selling", "Indecision", "A range"], answer: 1, why: "Three decisive red candles." },
        { q: "An evening star appears…", options: ["At a bottom", "At a top", "Mid-trend only", "Never on daily charts"], answer: 1, why: "It's a bearish reversal after a rise." },
      ],
    },
  ],
};

// ---------------------------------------------------------------- Module 6
const trendR = real("trend-up");
const trendCloses = trendR.closes;
const trendCandles = trendR.candles;
const volR = real("trend-up-volume");

export const M06_CHARTS: Module = {
  id: "reading-charts",
  n: 6,
  title: "Reading a Chart",
  tagline: "What you're actually looking at when you open a chart.",
  icon: "📊",
  lessons: [
    {
      id: "opening-a-chart",
      title: "Your first look at a chart",
      summary: "A guided tour of every part of a trading chart.",
      minutes: 5,
      blocks: [
        { t: "p", text: "Open any platform (MT5, TradingView, your broker's app) and you'll see the same building blocks. Tap each number to learn what it is." },
        { t: "widget", name: "chartTour" },
        {
          t: "callout",
          tone: "tip",
          text: "First thing to do on any new chart: zoom OUT. Find the big direction and the obvious levels before you look at the latest candles.",
        },
      ],
      quiz: [
        { q: "The vertical axis on the right shows…", options: ["Time", "Price", "Volume", "Your balance"], answer: 1, why: "Price scale is on the right; time runs along the bottom." },
        { q: "The timeframe setting (M5, H1, D1) controls…", options: ["How long each candle represents", "The broker", "The spread", "Leverage"], answer: 0, why: "H1 = each candle is one hour." },
        { q: "What should you do first on a new chart?", options: ["Trade the last candle", "Zoom out and find the big picture", "Add ten indicators", "Change colours"], answer: 1, why: "Context before detail." },
      ],
    },
    {
      id: "chart-types",
      title: "Line, bar, candle and Heikin Ashi",
      summary: "Four ways to draw the same prices.",
      minutes: 4,
      blocks: [
        {
          t: "gallery",
          items: [
            { title: "Line chart", tone: "electric", text: "Connects closing prices only. Clean for spotting the big shape and key levels.", spec: { line: trendCloses, height: 150, source: trendR.source.replace("Real chart · ", "") } },
            { title: "Candlestick chart", tone: "up", text: "The same real prices with open, high, low, close. The standard for trading.", spec: { candles: trendCandles, height: 150, source: trendR.source.replace("Real chart · ", "") } },
          ],
        },
        {
          t: "table",
          head: ["Type", "Shows", "Best for"],
          rows: [
            ["Line", "Closes only", "Big-picture shape, clean support/resistance"],
            ["OHLC bar", "Same data as candles, drawn with ticks", "Traders who prefer less colour"],
            ["Candlestick", "OHLC with bodies & wicks", "Reading buyer/seller battles (most popular)"],
            ["Heikin Ashi", "Averaged candles", "Seeing trend direction smoothly; NOT exact prices"],
          ],
        },
        { t: "callout", tone: "warn", text: "Heikin Ashi candles use averaged prices, so their open/close aren't real traded prices. Never place exact entries or stops from them." },
      ],
      quiz: [
        { q: "A line chart connects…", options: ["Highs", "Closes", "Opens", "Volumes"], answer: 1, why: "Close-to-close." },
        { q: "Which chart type shows averaged, smoothed candles?", options: ["Line", "Heikin Ashi", "OHLC bar", "Renko"], answer: 1, why: "Heikin Ashi averages prices." },
        { q: "Most traders read price with…", options: ["Candlesticks", "Pie charts", "Line only", "Tables"], answer: 0, why: "Candles show the full battle." },
      ],
    },
    {
      id: "timeframes",
      title: "Timeframes and top-down analysis",
      summary: "Monthly to one-minute, and how to use several together.",
      minutes: 5,
      blocks: [
        {
          t: "table",
          head: ["Code", "One candle =", "Typical use"],
          rows: [
            ["M1 / M5", "1 / 5 minutes", "Scalping entries"],
            ["M15 / M30", "15 / 30 minutes", "Day-trade entries"],
            ["H1 / H4", "1 / 4 hours", "Day & swing trade structure"],
            ["D1", "1 day", "Swing trading direction"],
            ["W1 / MN", "1 week / 1 month", "Long-term trend & major levels"],
          ],
        },
        { t: "h", text: "Top-down analysis (the pro routine)" },
        {
          t: "flow",
          steps: [
            { title: "Higher timeframe (D1/H4)", text: "Which way is the trend? Where are the big support/resistance zones?" },
            { title: "Middle timeframe (H1)", text: "Is price pulling back into a zone? Is structure lining up with the higher trend?" },
            { title: "Lower timeframe (M15/M5)", text: "Find the precise trigger: a BOS, engulfing, or pin bar at the zone. Place a tight, logical stop." },
          ],
        },
        { t: "callout", tone: "key", text: "Rule of thumb: trade in the direction of the higher timeframe, time the entry on the lower one. A ratio of about 4–6× between timeframes works well (D1 → H4 → H1, or H4 → H1 → M15)." },
      ],
      quiz: [
        { q: "H4 means each candle is…", options: ["4 minutes", "4 hours", "4 days", "4 trades"], answer: 1, why: "H = hour." },
        { q: "In top-down analysis, the higher timeframe gives you…", options: ["The exact entry", "The trend and key zones", "Your broker", "The spread"], answer: 1, why: "Direction and context come from above." },
        { q: "Where do you usually find the precise entry trigger?", options: ["Monthly chart", "A lower timeframe", "News headlines", "Indicators only"], answer: 1, why: "Lower timeframes refine entries." },
      ],
    },
    {
      id: "volume",
      title: "Volume: the fuel behind moves",
      summary: "How much traded, and why it confirms (or doubts) a move.",
      minutes: 4,
      blocks: [
        {
          t: "diagram",
          caption: "Real traded volume under a real uptrend. Look for bigger volume bars on the pushes up than on the pullbacks.",
          spec: { candles: volR.candles, volume: volR.volume!, height: 190, source: volR.source },
        },
        {
          t: "list",
          items: [
            "**Rising price + rising volume**: strong, genuine move.",
            "**Rising price + falling volume**: the move is running out of fuel.",
            "**Breakout on high volume**: more believable than a breakout on low volume.",
            "**Huge volume spike + long wick**: often a climax / exhaustion.",
          ],
        },
        {
          t: "callout",
          tone: "tip",
          text: "Forex has no central exchange, so 'volume' on FX charts is **tick volume** (the number of price changes). It's still a useful proxy for activity.",
        },
      ],
      quiz: [
        { q: "A breakout on very low volume is…", options: ["Extra reliable", "More suspicious", "Impossible", "Always a fake"], answer: 1, why: "No fuel behind it, so be careful." },
        { q: "Volume on forex charts is usually…", options: ["Exact traded volume", "Tick volume (number of price updates)", "Open interest", "The spread"], answer: 1, why: "No central exchange, so it's a proxy." },
        { q: "Healthy uptrend volume pattern?", options: ["High on pullbacks, low on rallies", "High on rallies, lower on pullbacks", "Always flat", "Zero"], answer: 1, why: "Buyers are active on the pushes." },
      ],
    },
    {
      id: "sessions",
      title: "Trading sessions",
      summary: "When the market is busy: Sydney, Tokyo, London, New York.",
      minutes: 4,
      blocks: [
        {
          t: "table",
          head: ["Session", "GMT (approx.)", "East Africa Time (EAT)", "Character"],
          rows: [
            ["Sydney", "22:00 – 07:00", "01:00 – 10:00", "Quiet; AUD/NZD active"],
            ["Tokyo", "00:00 – 09:00", "03:00 – 12:00", "JPY pairs; often a range"],
            ["London", "08:00 – 17:00", "11:00 – 20:00", "Most volume; big moves and breakouts"],
            ["New York", "13:00 – 22:00", "16:00 – 01:00", "USD news; strong moves"],
            ["London–NY overlap", "13:00 – 17:00", "16:00 – 20:00", "The busiest, most liquid window"],
          ],
        },
        {
          t: "list",
          items: [
            "The **Asian range** (quiet night hours) often forms the high and low that London attacks.",
            "Major US data (like NFP or CPI) usually lands at **13:30 or 14:30 GMT** (16:30 or 17:30 EAT, depending on daylight saving).",
            "Times shift by an hour when the UK and US change clocks.",
          ],
        },
        { t: "callout", tone: "tip", text: "More liquidity means tighter spreads and cleaner moves. Many strategies only trade London and New York hours." },
      ],
      quiz: [
        { q: "The busiest forex window is…", options: ["Sydney open", "Tokyo lunch", "London–New York overlap", "Weekend"], answer: 2, why: "Two biggest centres open at once." },
        { q: "The Asian session is often…", options: ["The most volatile", "A quieter range", "Closed", "News-driven"], answer: 1, why: "Lower volume, so price often ranges." },
        { q: "Why prefer liquid sessions?", options: ["Tighter spreads, cleaner moves", "Higher leverage", "Free trades", "No risk"], answer: 0, why: "More participants = better prices." },
      ],
    },
  ],
};

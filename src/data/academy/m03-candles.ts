import type { Module, Note } from "./types";
import type { OHLC } from "./build";
import { closeUp, real, realSpec } from "./real";

// Anatomy stays an idealised drawing; everything else below is a real chart.
const bull: OHLC = [100, 108, 97, 106];
const bear: OHLC = [106, 109, 98, 100];

// Sixteen real 15-minute BTC candles, and the four 1-hour candles they make.
const tf = real("tf-15m");
const m15 = tf.candles;
const h1: OHLC[] = [0, 1, 2, 3].map((q) => {
  const part = m15.slice(q * 4, q * 4 + 4);
  return [part[0]![0], Math.max(...part.map((c) => c[1])), Math.min(...part.map((c) => c[2])), part[3]![3]];
});

/** Real single candle shown on its own (for the buyers-vs-sellers gallery). */
const one = (id: string) => {
  const r = real(id);
  return { candles: [r.candles[r.i("k")]!], height: 150, source: r.source.replace("Real chart · ", "") };
};

/** Close-up of a real pattern with a label on the key candle. */
const pattern = (id: string, text: string, color: "up" | "down" | "gold", where: "above" | "below", extra: Note[] = []) => {
  const c = closeUp(id, "k", 8, 4);
  const cd = c.candles[c.k]!;
  return { ...c, height: 180, notes: [{ k: "label" as const, i: c.k, p: where === "above" ? cd[1] : cd[2], text, color, pos: where }, ...extra] };
};

export const M03_CANDLES: Module = {
  id: "candles",
  n: 3,
  title: "Candlestick Anatomy",
  tagline: "Every candle is a battle between buyers and sellers. Learn to read the result.",
  icon: "🕯️",
  lessons: [
    {
      id: "candle-ohlc",
      title: "Open, high, low, close",
      summary: "The four prices inside every candle, and how body and wicks are drawn.",
      minutes: 5,
      blocks: [
        {
          t: "p",
          text: "A **candlestick** summarises all trading in one period (1 minute, 1 hour, 1 day…) using four prices, known as **OHLC**:",
        },
        {
          t: "list",
          items: [
            "**Open**: the first traded price of the period.",
            "**High**: the highest price reached.",
            "**Low**: the lowest price reached.",
            "**Close**: the last price when the period ended.",
          ],
        },
        {
          t: "diagram",
          caption: "Bullish candle (left): close above open. Bearish candle (right): close below open.",
          spec: {
            candles: [bull, bear],
            height: 260,
            pad: 0.08,
            notes: [
              { k: "label", i: 0, p: 106, text: "Close 106", pos: "left", color: "up" },
              { k: "label", i: 0, p: 100, text: "Open 100", pos: "left", color: "up" },
              { k: "label", i: 0, p: 108, text: "High 108", pos: "above", color: "muted" },
              { k: "label", i: 0, p: 97, text: "Low 97", pos: "below", color: "muted" },
              { k: "bracket", i: 0, p1: 100, p2: 106, text: "body", color: "up" },
              { k: "label", i: 1, p: 106, text: "Open 106", pos: "left", color: "down" },
              { k: "label", i: 1, p: 100, text: "Close 100", pos: "left", color: "down" },
              { k: "bracket", i: 1, p1: 106, p2: 109, text: "upper wick", color: "gold" },
              { k: "bracket", i: 1, p1: 98, p2: 100, text: "lower wick", color: "gold" },
            ],
          },
        },
        {
          t: "list",
          items: [
            "**Body**: the thick part between open and close.",
            "**Wicks** (also called shadows or tails): thin lines to the high and low.",
            "**Green / bullish**: close > open. Price finished higher than it started.",
            "**Red / bearish**: close < open. Price finished lower than it started.",
          ],
        },
        { t: "widget", name: "candleLab" },
      ],
      quiz: [
        { q: "A candle opens at 50 and closes at 47. It's…", options: ["Bullish", "Bearish", "A doji", "Impossible"], answer: 1, why: "Close below open = bearish (red)." },
        { q: "The thin line above the body shows…", options: ["The open", "The high reached", "Volume", "The spread"], answer: 1, why: "The upper wick runs to the period's high." },
        { q: "Which four prices build a candle?", options: ["Bid, ask, spread, pip", "Open, high, low, close", "Entry, SL, TP, risk", "Monday to Thursday"], answer: 1, why: "OHLC." },
      ],
    },
    {
      id: "buyers-sellers",
      title: "Buyers vs sellers: the story in a candle",
      summary: "Read a candle as a tug-of-war and tell who won the period.",
      minutes: 5,
      blocks: [
        {
          t: "p",
          text: "Think of every candle as a **round in a fight**. Buyers (bulls) push price up; sellers (bears) push it down. The open is where the round starts, the close is where it ends, and the wicks show how far each side managed to push before being pushed back.",
        },
        {
          t: "gallery",
          items: [
            { title: "Buyers dominated", tone: "up", text: "Opened near the low, closed near the high. Sellers barely showed up.", spec: one("marubozu-bull") },
            { title: "Sellers dominated", tone: "down", text: "Opened near the high, closed near the low. Buyers never fought back.", spec: one("marubozu-bear") },
            { title: "Buyers attacked, sellers won", tone: "down", text: "Price rallied high, but sellers slammed it back down. A long upper wick means buyers were rejected.", spec: one("shooting-star") },
            { title: "Sellers attacked, buyers won", tone: "up", text: "Price dropped hard, but buyers bought everything and lifted it back. A long lower wick means sellers were rejected.", spec: one("hammer") },
            { title: "Draw", tone: "muted", text: "Both sides pushed, neither won. Open ≈ close: indecision.", spec: one("doji") },
          ],
        },
        {
          t: "callout",
          tone: "key",
          text: "Ask three questions of every candle: Who opened in control? Who pushed hardest (wicks)? Who closed in control (body and close position)?",
        },
        {
          t: "p",
          text: "**Close location** matters most. A green candle that closes in the top 25% of its range shows buyers in full control. A green candle that closes in the middle, with a big upper wick, shows buyers are tiring even though they technically won.",
        },
      ],
      quiz: [
        { q: "A long lower wick tells you…", options: ["Sellers won easily", "Sellers pushed down but buyers rejected the lows", "Nothing", "The market is closed"], answer: 1, why: "Price went low but didn't stay there: buyers defended." },
        { q: "Which candle shows the strongest buyers?", options: ["Green, closes at its high, small wicks", "Green with a huge upper wick", "Doji", "Red with a long lower wick"], answer: 0, why: "Full body closing at the high = total control." },
        { q: "Open ≈ close with wicks both sides means…", options: ["Strong trend", "Indecision", "Guaranteed reversal", "Gap"], answer: 1, why: "Neither side won the round." },
      ],
    },
    {
      id: "wicks",
      title: "Reading wicks (shadows)",
      summary: "Wicks are rejected prices. Where and how long they are tells you where the pressure is.",
      minutes: 6,
      blocks: [
        {
          t: "p",
          text: "A wick is a price the market **visited but refused to accept** by the close. That makes wicks some of the most honest information on the chart.",
        },
        {
          t: "list",
          items: [
            "**Upper wick**: buyers pushed up there but sellers overpowered them. It shows **selling pressure / rejection of higher prices**.",
            "**Lower wick**: sellers pushed down there but buyers overpowered them. It shows **buying pressure / rejection of lower prices**.",
            "**Wick length vs body**: a wick 2× or more the body size is a strong rejection.",
            "**Wicks on both sides**: a volatile, undecided period.",
          ],
        },
        {
          t: "diagram",
          caption: "A real chart: price keeps wicking into the same floor but never closes below it. Buyers are defending that level.",
          spec: realSpec("wick-defense", (r) => [
            { k: "zone", i1: 0, i2: r.candles.length - 1, p1: r.lv["floor"]! - (r.hi("t0") - r.lo("t0")) * 0.08, p2: r.lv["floor"]! + (r.hi("t0") - r.lo("t0")) * 0.25, color: "up", text: "buyers defend here" },
            ...Object.keys(r.pts).filter((k) => k.startsWith("t")).map((k) => ({ k: "arrow" as const, i: r.i(k), p: r.lo(k), dir: "up" as const, color: "up" as const })),
          ]),
        },
        {
          t: "callout",
          tone: "tip",
          text: "Wicks matter most at **key levels** (support, resistance, previous highs/lows). A long wick in the middle of nowhere is just noise.",
        },
        {
          t: "p",
          text: "Pro tip: when a wick pokes **above a previous high** and the candle closes back below it, buyers who bought the breakout and sellers whose stops were above that high all just got taken out. That's called a **liquidity sweep**, and it often comes before a move the other way.",
        },
      ],
      quiz: [
        { q: "A long upper wick at resistance suggests…", options: ["Buyers are strong", "Sellers rejected higher prices", "The trend will surely continue up", "Low volume"], answer: 1, why: "Price tried higher and was pushed back: selling pressure." },
        { q: "When is a wick most meaningful?", options: ["Anywhere", "At a key level like support/resistance", "Only on Mondays", "Only on 1-minute charts"], answer: 1, why: "Context gives the rejection meaning." },
        { q: "Price wicks above an old high then closes below it. This is called…", options: ["A breakout", "A liquidity sweep", "A gap", "A marubozu"], answer: 1, why: "It grabbed the stops above the high, then failed." },
      ],
    },
    {
      id: "body-momentum",
      title: "Body size and momentum",
      summary: "Growing bodies mean conviction; shrinking bodies warn of exhaustion.",
      minutes: 4,
      blocks: [
        {
          t: "p",
          text: "The **body** shows how far price actually travelled from open to close. Big bodies = conviction and momentum. Small bodies = hesitation.",
        },
        {
          t: "diagram",
          caption: "A real chart losing steam: each green body is smaller than the last, then sellers step in.",
          spec: realSpec("momentum-fade", (r) => {
            const k = r.i("k");
            return [
              { k: "label", i: k - 4, p: r.candles[k - 4]![1], text: "big", pos: "above", color: "up" },
              { k: "label", i: k - 2, p: r.candles[k - 2]![1], text: "smaller", pos: "above", color: "gold" },
              { k: "label", i: k - 1, p: r.candles[k - 1]![1], text: "tiny", pos: "above", color: "gold" },
              { k: "arrow", i: k, p: r.candles[k]![1], dir: "down", color: "down", text: "sellers" },
            ];
          }),
        },
        {
          t: "list",
          items: [
            "**Expanding bodies** in the trend direction → momentum is building; trend likely continues.",
            "**Shrinking bodies** + growing wicks → momentum fading; watch for a pause or reversal.",
            "**A huge body against the trend** → the other side has arrived with force.",
          ],
        },
      ],
      quiz: [
        { q: "Bodies getting smaller in an uptrend suggest…", options: ["Stronger buying", "Fading momentum", "A guaranteed crash", "Nothing"], answer: 1, why: "Buyers are making less progress each period." },
        { q: "A big red body after many green candles means…", options: ["Sellers arrived with force", "Buyers are stronger", "The chart is broken", "Low volatility"], answer: 0, why: "A large move against the trend shows real selling." },
        { q: "The body measures the distance between…", options: ["High and low", "Open and close", "Bid and ask", "Two candles"], answer: 1, why: "Wicks go to the high/low; the body spans open to close." },
      ],
    },
    {
      id: "timeframes-candles",
      title: "One candle, many candles: timeframes",
      summary: "A 1-hour candle is just four 15-minute candles squeezed together.",
      minutes: 4,
      blocks: [
        {
          t: "p",
          text: "Every timeframe shows the **same price action**, just grouped differently. The open of an hour candle is the open of its first 15-minute candle; the close is the close of the fourth; the high and low are the extremes of all four.",
        },
        {
          t: "gallery",
          items: [
            { title: "Sixteen real 15-minute candles", tone: "electric", text: "A dip, a two-hour rally, then a pullback.", spec: { candles: m15, height: 170, source: tf.source.replace("Real chart · ", "") } },
            { title: "…are the same as four 1-hour candles", tone: "up", text: "Red hour, two green hours, red hour: the exact same move, grouped by the hour.", spec: { candles: h1, height: 170, source: tf.source.replace("Real chart · ", "").replace("15-minute", "1-hour (rebuilt)") } },
          ],
        },
        {
          t: "callout",
          tone: "key",
          text: "A long wick on a higher timeframe is a whole move on a lower timeframe. That's why pros check the higher timeframe first (see Reading a Chart → Timeframes).",
        },
      ],
      quiz: [
        { q: "The close of a 1-hour candle equals…", options: ["The close of its last 5-minute candle", "The average price", "The open of the next day", "The high"], answer: 0, why: "It's the last traded price of the hour." },
        { q: "How many 15-minute candles make a 4-hour candle?", options: ["4", "8", "16", "24"], answer: 2, why: "240 ÷ 15 = 16." },
        { q: "A long lower wick on the daily chart is, on the 1-hour chart…", options: ["Invisible", "A drop followed by a recovery", "A gap", "A doji"], answer: 1, why: "The wick is price that went down and came back." },
      ],
    },
  ],
};

export const M04_SINGLE: Module = {
  id: "single-candles",
  n: 4,
  title: "Single-Candle Signals",
  tagline: "Marubozu, doji, hammer, shooting star… what each shape means and where it matters.",
  icon: "🔍",
  lessons: [
    {
      id: "marubozu",
      title: "Marubozu: total control",
      summary: "A full body with (almost) no wicks. One side owned the whole period.",
      minutes: 3,
      blocks: [
        {
          t: "gallery",
          items: [
            { title: "Bullish marubozu", tone: "up", text: "Opened at the low, closed at the high. Buyers controlled every second.", spec: pattern("marubozu-bull", "marubozu", "up", "above") },
            { title: "Bearish marubozu", tone: "down", text: "Opened at the high, closed at the low. Pure selling.", spec: pattern("marubozu-bear", "marubozu", "down", "below") },
          ],
        },
        {
          t: "list",
          items: [
            "**Meaning**: strong momentum and commitment in the body's direction.",
            "**In a trend**: continuation is likely.",
            "**Breaking a level**: a marubozu closing through support/resistance is a convincing breakout.",
          ],
        },
        { t: "spot", items: ["Body is ≥ 90% of the whole candle range", "Tiny or no wicks", "Often much larger than the candles before it"] },
      ],
      quiz: [
        { q: "A marubozu has…", options: ["Long wicks", "Almost no wicks, full body", "No body", "Two bodies"], answer: 1, why: "It's all body." },
        { q: "A bullish marubozu through resistance suggests…", options: ["A fake breakout", "A convincing breakout", "Indecision", "Low volume"], answer: 1, why: "Buyers closed at the highs, beyond the level." },
        { q: "A bearish marubozu opens near the…", options: ["Low", "High", "Middle", "Previous close only"], answer: 1, why: "It opens at the high and closes at the low." },
      ],
    },
    {
      id: "doji",
      title: "The doji family",
      summary: "Open equals close: indecision. The wicks tell you which kind.",
      minutes: 5,
      blocks: [
        {
          t: "p",
          text: "A **doji** has an open and close that are (almost) the same, so the body is a thin line. Nobody won the period. After a strong trend, a doji means the trend's owners **couldn't push any further**, which is an early warning.",
        },
        {
          t: "gallery",
          items: [
            { title: "Standard doji", tone: "muted", text: "Wicks both sides, open = close. Pause / indecision after a move.", spec: pattern("doji", "doji", "gold", "above") },
            { title: "Long-legged doji", tone: "muted", text: "Big wicks both sides. Violent indecision.", spec: pattern("doji-long", "long-legged", "gold", "above") },
            { title: "Dragonfly doji", tone: "up", text: "Long lower wick, open/close at the high. Sellers rejected at the lows.", spec: pattern("doji-dragonfly", "dragonfly", "up", "below") },
            { title: "Gravestone doji", tone: "down", text: "Long upper wick, open/close at the low. Buyers rejected at the highs.", spec: pattern("doji-gravestone", "gravestone", "down", "above") },
          ],
        },
        {
          t: "diagram",
          caption: "A real gravestone doji at the top of an uptrend, followed by sellers taking over.",
          spec: realSpec("doji-gravestone", (r) => [
            { k: "label", i: r.i("k"), p: r.hi("k"), text: "gravestone", pos: "above", color: "down" },
            { k: "arrow", i: r.i("k") + 2, p: r.candles[r.i("k") + 2]![1], dir: "down", color: "down", text: "confirmation" },
          ]),
        },
        { t: "callout", tone: "warn", text: "A doji alone isn't a sell or buy signal. Wait for the next candle to confirm the direction." },
      ],
      quiz: [
        { q: "A doji's defining feature is…", options: ["Huge body", "Open ≈ close", "No wicks", "Always green"], answer: 1, why: "The body is almost nonexistent." },
        { q: "A dragonfly doji at support is…", options: ["Bearish", "Bullish (sellers rejected)", "Meaningless", "A gap"], answer: 1, why: "The long lower wick shows buyers pushed price back to the open." },
        { q: "After a doji you should…", options: ["Trade immediately", "Wait for confirmation", "Close all trades", "Double your risk"], answer: 1, why: "Indecision needs a follow-through candle to pick a side." },
      ],
    },
    {
      id: "hammer-hanging-man",
      title: "Hammer and hanging man",
      summary: "Same shape, opposite meanings. Location decides.",
      minutes: 5,
      blocks: [
        {
          t: "p",
          text: "Shape: **small body near the top, long lower wick (at least 2× the body), little or no upper wick.**",
        },
        {
          t: "gallery",
          items: [
            {
              title: "Hammer (after a DOWNtrend)",
              tone: "up",
              text: "Sellers drove price down, buyers smashed it back up. Bullish reversal signal. Stop goes below the wick.",
              spec: pattern("hammer", "hammer", "up", "below"),
            },
            {
              title: "Hanging man (after an UPtrend)",
              tone: "down",
              text: "Same shape at the top. Sellers showed up for the first time. Bearish warning, needs a red confirmation.",
              spec: pattern("hanging-man", "hanging man", "down", "above"),
            },
          ],
        },
        { t: "spot", items: ["Lower wick ≥ 2× the body", "Body in the upper third of the range", "Tiny upper wick", "Hammer: at the bottom of a fall. Hanging man: at the top of a rise"] },
        { t: "callout", tone: "key", text: "Candle shapes don't have fixed meanings. **Context** (where the candle appears) is the meaning." },
      ],
      quiz: [
        { q: "A hammer appears after…", options: ["An uptrend", "A downtrend", "A gap up", "Any time"], answer: 1, why: "It's a bullish reversal at the bottom of a fall." },
        { q: "Where does the stop loss go on a hammer long?", options: ["Above the body", "Below the lower wick", "At the open", "No stop needed"], answer: 1, why: "If price breaks the wick low, the rejection failed." },
        { q: "Hammer vs hanging man: what's different?", options: ["The shape", "The location/context", "The colour must differ", "Nothing"], answer: 1, why: "Identical shape, opposite trend location." },
      ],
    },
    {
      id: "inverted-hammer-shooting-star",
      title: "Inverted hammer and shooting star",
      summary: "Long upper wicks: rejection from above.",
      minutes: 4,
      blocks: [
        { t: "p", text: "Shape: **small body near the bottom, long upper wick (≥ 2× body), little or no lower wick.**" },
        {
          t: "gallery",
          items: [
            {
              title: "Shooting star (after an UPtrend)",
              tone: "down",
              text: "Buyers pushed to new highs and got completely rejected. One of the strongest bearish single candles at resistance.",
              spec: pattern("shooting-star", "shooting star", "down", "above"),
            },
            {
              title: "Inverted hammer (after a DOWNtrend)",
              tone: "up",
              text: "Buyers tested higher for the first time. Bullish hint, needs a green confirmation candle.",
              spec: pattern("inverted-hammer", "inverted hammer", "up", "above"),
            },
          ],
        },
        { t: "spot", items: ["Upper wick ≥ 2× the body", "Body in the lower third", "Shooting star: at the top of a rally, ideally at resistance"] },
      ],
      quiz: [
        { q: "A shooting star shows…", options: ["Buyers rejected at the highs", "Sellers rejected at the lows", "Indecision only", "A gap"], answer: 0, why: "The long upper wick is failed buying." },
        { q: "Inverted hammer appears after…", options: ["Uptrend", "Downtrend", "A range only", "News"], answer: 1, why: "It's the bullish version at the bottom." },
        { q: "Best location for a shooting star sell?", options: ["Middle of a range", "At resistance after a rally", "After a crash", "Anywhere"], answer: 1, why: "Rejection at a level sellers already defend." },
      ],
    },
    {
      id: "spinning-top",
      title: "Spinning tops",
      summary: "Small body, wicks on both sides: the trend is catching its breath.",
      minutes: 3,
      blocks: [
        {
          t: "diagram",
          caption: "A real spinning top after a strong move: momentum pauses, and the next strong candle shows who wins.",
          spec: realSpec("spinning-top", (r) => [
            { k: "zone", i1: r.i("k"), i2: r.i("k"), p1: r.lo("k"), p2: r.hi("k"), color: "gold", text: "pause" },
          ]),
        },
        {
          t: "list",
          items: [
            "Body is small (roughly under a third of the range), with wicks above and below.",
            "Different from a doji only by degree: it has a visible body.",
            "Meaning: balance. Not a signal by itself, but a warning that the current move is tiring.",
          ],
        },
      ],
      quiz: [
        { q: "A spinning top signals…", options: ["Strong momentum", "Balance / hesitation", "Guaranteed reversal", "A liquidity sweep"], answer: 1, why: "Neither side made real progress." },
        { q: "What separates a spinning top from a doji?", options: ["Colour", "It has a small but visible body", "Volume", "Nothing"], answer: 1, why: "Doji: open ≈ close. Spinning top: small body." },
        { q: "After spinning tops, what confirms direction?", options: ["The next strong candle", "Another spinning top", "Time of day", "Nothing"], answer: 0, why: "A decisive candle shows who took control." },
      ],
    },
    {
      id: "pin-bar",
      title: "The pin bar (price-action traders' favourite)",
      summary: "Any candle with a long 'nose' rejecting a key level.",
      minutes: 4,
      blocks: [
        {
          t: "p",
          text: "A **pin bar** is the price-action name for any strong rejection candle: a wick (the 'nose') at least **two thirds of the range**, with a small body at the other end. It points **away** from where price is likely to go.",
        },
        {
          t: "diagram",
          caption: "A real bullish pin bar at the low of a decline. Entry above the pin's high, stop below the nose.",
          spec: realSpec("pin-bar", (r) => {
            const k = r.i("k");
            const span = r.hi("k") - r.lo("k");
            return [
              { k: "label", i: k, p: r.lo("k"), text: "pin bar", pos: "below", color: "up" },
              { k: "hline", p: r.hi("k"), text: "entry above pin high", color: "electric", i1: k },
              { k: "hline", p: r.lo("k") - span * 0.08, text: "stop below nose", color: "down", i1: k },
            ];
          }),
        },
        { t: "spot", items: ["Nose ≥ 2/3 of the candle", "Nose pokes through a level and closes back inside", "Stands out from the surrounding candles", "Aligned with the higher-timeframe trend = best"] },
      ],
      quiz: [
        { q: "A pin bar's nose points…", options: ["The way price will go", "Toward the rejected prices", "Always up", "Always down"], answer: 1, why: "The nose is rejection. Price tends to go the other way." },
        { q: "Minimum nose length for a pin bar?", options: ["1/10 of the range", "About 2/3 of the range", "Equal to the body", "No rule"], answer: 1, why: "A dominant wick is what makes it a pin." },
        { q: "Where is the logical stop on a bullish pin bar?", options: ["Above the body", "Below the nose", "At the close", "At the next resistance"], answer: 1, why: "If the rejected low breaks, the idea is wrong." },
      ],
    },
  ],
};

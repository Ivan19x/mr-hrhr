import type { Module } from "./types";
import { real } from "./real";

// Real chart sections (see scripts/extract-examples.ts).
const sw = real("liquidity-sweep"); // equal highs swept, then a drop
const ob = real("ob-fvg"); // last down candle → displacement with a gap → return → rally
const pd = real("premium-discount"); // impulse, pullback into discount, continuation
const bo = real("breakout-retest-2");
const fk = real("fakeout");

export const M10_TERMS: Module = {
  id: "terms",
  n: 10,
  title: "Trading Terms on the Chart",
  tagline: "Liquidity, order blocks, fair value gaps, premium & discount: what they are and exactly how to spot them.",
  icon: "🗺️",
  lessons: [
    {
      id: "liquidity",
      title: "Liquidity and stop hunts",
      summary: "Where the orders are, and why price loves to grab them.",
      minutes: 6,
      blocks: [
        {
          t: "p",
          text: "In trading slang, **liquidity** means clusters of resting orders. Buy-stops (from shorts' stop losses and breakout buyers) sit **above highs**; sell-stops sit **below lows**. Big players need that liquidity to fill large orders. So price is often drawn to these areas, takes the orders (a **sweep** or stop hunt), and then reverses.",
        },
        {
          t: "diagram",
          caption: "A real sweep: two equal highs attract buy-stops. Price wicks above them, closes back below, and sells off.",
          spec: {
            candles: sw.candles,
            source: sw.source,
            notes: [
              { k: "hline", p: sw.lv["L"]!, text: "equal highs = liquidity", color: "gold", dash: true, i1: sw.i("A"), i2: sw.i("fk") },
              { k: "dot", i: sw.i("A"), p: sw.hi("A"), color: "gold" },
              { k: "dot", i: sw.i("B"), p: sw.hi("B"), color: "gold" },
              { k: "arrow", i: sw.i("fk"), p: sw.hi("fk"), dir: "down", color: "down", text: "sweep" },
            ],
          },
        },
        {
          t: "spot",
          items: [
            "**Equal highs / equal lows**: two or more touches at the same price (retail 'double top' traders put stops just beyond).",
            "Previous day / week / session highs and lows.",
            "Obvious trendline touches (stops sit just below the line).",
            "The sweep candle: a **wick** beyond the level with a **close** back inside.",
          ],
        },
        { t: "callout", tone: "key", text: "Don't put your stop exactly where everyone else does (right at the equal high/low). Give it room beyond the liquidity, or wait for the sweep and trade the reversal." },
      ],
      quiz: [
        { q: "Buy-stop liquidity usually rests…", options: ["Below lows", "Above highs", "At the open", "In the middle of ranges"], answer: 1, why: "Shorts' stops and breakout buy orders sit above highs." },
        { q: "A liquidity sweep candle typically has…", options: ["A close beyond the level", "A wick beyond the level and a close back inside", "No wick", "No volume"], answer: 1, why: "It takes the orders and fails to hold." },
        { q: "Equal highs are attractive to price because…", options: ["They're pretty", "Many stops cluster above them", "Brokers like them", "They're support"], answer: 1, why: "Pooled orders = liquidity." },
      ],
    },
    {
      id: "order-blocks",
      title: "Supply, demand and order blocks",
      summary: "The candle where big money loaded up before a strong move.",
      minutes: 6,
      blocks: [
        {
          t: "p",
          text: "A **demand zone** is an area where buying overwhelmed selling so strongly that price rocketed away. A **supply zone** is the bearish version. In Smart Money Concepts, the precise version is the **order block (OB)**: the **last opposite-coloured candle before an impulsive move** that breaks structure.",
        },
        {
          t: "diagram",
          caption: "A real bullish order block: the last red candle before an explosive rally. Price returned to it later and bounced.",
          spec: {
            candles: ob.candles,
            source: ob.source,
            notes: [
              { k: "zone", i1: ob.i("ob"), i2: ob.i("rt") + 2, p1: ob.lv["obBot"]!, p2: ob.lv["obTop"]!, color: "up", text: "bullish order block" },
              { k: "arrow", i: ob.i("rt"), p: ob.lo("rt"), dir: "up", color: "up", text: "return & bounce" },
            ],
          },
        },
        {
          t: "list",
          items: [
            "Valid OBs cause **displacement** (big, fast candles) and usually a **BOS**.",
            "The first return to an OB is the strongest; each extra touch weakens it.",
            "Entry: inside the OB (often its 50% level, the 'mean threshold'). Stop: just beyond the OB.",
            "**Breaker block**: an OB that failed (price broke through it). It often flips roles like support/resistance.",
          ],
        },
      ],
      quiz: [
        { q: "A bullish order block is…", options: ["The first green candle of the rally", "The last red candle before a strong rally", "Any big candle", "A doji"], answer: 1, why: "Last opposite candle before displacement." },
        { q: "What makes an OB valid?", options: ["Colour only", "It caused displacement and broke structure", "It's on a Monday", "Low volume"], answer: 1, why: "The move away proves big orders." },
        { q: "The strongest reaction usually comes on…", options: ["The first return", "The fifth touch", "Never", "Weekends"], answer: 0, why: "Remaining orders get used up with each touch." },
      ],
    },
    {
      id: "fair-value-gaps",
      title: "Fair Value Gaps (imbalances)",
      summary: "A 3-candle gap where price moved too fast, and often comes back to fill.",
      minutes: 5,
      blocks: [
        {
          t: "p",
          text: "A **Fair Value Gap (FVG)** forms when one candle moves so fast that the wicks of the candles on either side don't overlap. Only one side (buyers or sellers) traded there, so it's an **imbalance**. Price often returns to 'rebalance' it before continuing.",
        },
        {
          t: "diagram",
          caption: "A real bullish FVG: the gap between candle 1's HIGH and candle 3's LOW. Price came back into it and continued up.",
          spec: {
            candles: ob.candles,
            source: ob.source,
            notes: [
              { k: "zone", i1: ob.i("fvg1"), i2: ob.i("rt") + 2, p1: ob.lv["fvgBot"]!, p2: ob.lv["fvgTop"]!, color: "electric", text: "FVG" },
              { k: "label", i: ob.i("fvg1"), p: ob.lo("fvg1"), text: "1", pos: "below", color: "muted" },
              { k: "label", i: ob.i("fvg1") + 1, p: ob.lo("fvg1"), text: "2", pos: "below", color: "muted" },
              { k: "label", i: ob.i("fvg3"), p: ob.lo("fvg3"), text: "3", pos: "below", color: "muted" },
            ],
          },
        },
        {
          t: "spot",
          items: [
            "Look at 3 candles in a row. The middle one is big.",
            "**Bullish FVG**: candle 3's low is ABOVE candle 1's high.",
            "**Bearish FVG**: candle 3's high is BELOW candle 1's low.",
            "The zone between them is the gap. Mark it with the FVG box tool in the game.",
          ],
        },
        { t: "callout", tone: "tip", text: "An FVG sitting on top of an order block is a high-confluence entry zone." },
      ],
      quiz: [
        { q: "A bullish FVG exists when…", options: ["Candle 3's low > candle 1's high", "Candle 2 is red", "Candle 1's low > candle 3's high", "All candles overlap"], answer: 0, why: "No overlap between wick 1 and wick 3." },
        { q: "Why does price often return to an FVG?", options: ["Brokers force it", "To rebalance an area where only one side traded", "Random", "Because of volume"], answer: 1, why: "It's an inefficiency." },
        { q: "How many candles define an FVG?", options: ["1", "2", "3", "5"], answer: 2, why: "The gap between candle 1 and candle 3." },
      ],
    },
    {
      id: "premium-discount",
      title: "Premium, discount and equilibrium",
      summary: "Buy cheap, sell expensive, measured on the current swing.",
      minutes: 4,
      blocks: [
        {
          t: "diagram",
          caption: "A real swing split in half. Above 50% is premium (expensive), below is discount (cheap). Here the pullback reached discount, then the uptrend continued.",
          spec: (() => {
            const lo = pd.lo("A");
            const hi = pd.hi("B");
            const eq = (lo + hi) / 2;
            const b = pd.i("B");
            const end = pd.candles.length - 1;
            return {
              candles: pd.candles,
              source: pd.source,
              notes: [
                { k: "zone" as const, i1: b, i2: end, p1: eq, p2: hi, color: "down" as const, text: "premium: sell zone" },
                { k: "zone" as const, i1: b, i2: end, p1: lo, p2: eq, color: "up" as const, text: "discount: buy zone" },
                { k: "hline" as const, p: eq, text: "equilibrium 50%", color: "gold" as const, dash: true, i1: pd.i("A") },
                { k: "dot" as const, i: pd.i("C"), p: pd.lo("C"), color: "up" as const, text: "pullback in discount", pos: "below" as const },
              ],
            };
          })(),
        },
        {
          t: "list",
          items: [
            "Draw the range from the swing low to the swing high (like a Fibonacci tool).",
            "**Discount** (below 50%): better prices for buyers.",
            "**Premium** (above 50%): better prices for sellers.",
            "In an uptrend, only buy pullbacks that reach discount. Buying in premium gives a worse risk-to-reward.",
          ],
        },
      ],
      quiz: [
        { q: "Equilibrium is at…", options: ["0%", "50% of the swing", "61.8%", "The high"], answer: 1, why: "Halfway = fair value." },
        { q: "In an uptrend you prefer to buy in…", options: ["Premium", "Discount", "Anywhere", "Only at the high"], answer: 1, why: "Cheaper entries mean better RR." },
        { q: "Premium zones are best for…", options: ["Buying", "Selling", "Nothing", "Holding forever"], answer: 1, why: "Sell high." },
      ],
    },
    {
      id: "breakout-fakeout",
      title: "Breakouts, fakeouts and retests",
      summary: "How to tell a real break from a trap.",
      minutes: 5,
      blocks: [
        {
          t: "gallery",
          items: [
            {
              title: "Real breakout + retest",
              tone: "up",
              text: "Strong close above resistance, a pullback to retest it as support, then continuation.",
              spec: { candles: bo.candles, height: 180, source: bo.source.replace("Real chart · ", ""), notes: [{ k: "hline", p: bo.lv["L"]!, text: "resistance", color: "gold", dash: true }, { k: "arrow", i: bo.i("rt"), p: bo.lo("rt"), dir: "up", color: "up", text: "retest" }] },
            },
            {
              title: "Fakeout (bull trap)",
              tone: "down",
              text: "Pokes above resistance, can't hold, closes back inside, then collapses.",
              spec: { candles: fk.candles, height: 180, source: fk.source.replace("Real chart · ", ""), notes: [{ k: "hline", p: fk.lv["L"]!, text: "resistance", color: "gold", dash: true }, { k: "arrow", i: fk.i("fk"), p: fk.hi("fk"), dir: "down", color: "down", text: "trap" }] },
            },
          ],
        },
        {
          t: "table",
          head: ["Clue", "Real breakout", "Fakeout"],
          rows: [
            ["Close", "Decisively beyond the level", "Wick beyond, close back inside"],
            ["Candle", "Big body, small wicks", "Long wick against the break"],
            ["Volume", "Rising", "Weak"],
            ["Follow-through", "Next candles continue", "Quick return into the range"],
            ["Retest", "Old level holds from the other side", "Level fails immediately"],
          ],
        },
        { t: "callout", tone: "tip", text: "Safer approach: don't chase the breakout candle. Wait for the retest and a confirmation candle, and accept that you'll sometimes miss a move." },
      ],
      quiz: [
        { q: "A retest after a breakout is…", options: ["Price returning to test the broken level from the other side", "A new range", "A fakeout", "A gap"], answer: 0, why: "Old resistance tested as support." },
        { q: "A bull trap closes…", options: ["Above resistance and continues", "Back below resistance after poking above", "At the high", "With huge volume up"], answer: 1, why: "It fails to hold the break." },
        { q: "The safest breakout entry is usually…", options: ["The breakout candle", "After a retest with confirmation", "Before the break", "Never"], answer: 1, why: "Confirmation filters traps." },
      ],
    },
    {
      id: "confluence",
      title: "Confluence and invalidation",
      summary: "Stack reasons in one zone, and know exactly what proves you wrong.",
      minutes: 4,
      blocks: [
        {
          t: "p",
          text: "**Confluence** is when several independent reasons point to the same price and direction. Each one alone is weak; together they make a high-probability zone.",
        },
        {
          t: "table",
          head: ["Example confluence for a BUY", "Points"],
          rows: [
            ["Higher-timeframe uptrend", "+1"],
            ["Pullback into discount (< 50%)", "+1"],
            ["Bullish order block or demand zone", "+1"],
            ["Unfilled bullish FVG in the zone", "+1"],
            ["61.8% Fibonacci level", "+1"],
            ["Liquidity sweep of a recent low", "+1"],
            ["Bullish engulfing / pin bar confirmation", "+1"],
          ],
        },
        {
          t: "p",
          text: "**Invalidation** is the price where your idea is simply wrong: for a buy at an order block, a close below the OB. Your **stop loss belongs just beyond the invalidation**, never at a random round number or a fixed pip count.",
        },
        { t: "callout", tone: "key", text: "Before every trade write two lines: 'I'm buying because… (confluence)' and 'I'm wrong if… (invalidation)'. The MR_HRHR questions train exactly this." },
      ],
      quiz: [
        { q: "Confluence means…", options: ["One strong signal", "Several independent reasons agreeing", "High leverage", "A crowded chat room"], answer: 1, why: "Multiple factors line up." },
        { q: "Where should a stop loss go?", options: ["A fixed 10 pips", "Just beyond the invalidation point", "At breakeven immediately", "Nowhere"], answer: 1, why: "It exits when the idea is proven wrong." },
        { q: "Invalidation for a buy at support is…", options: ["A close below support", "Any red candle", "Price rising", "The spread widening"], answer: 0, why: "Support failing kills the idea." },
      ],
    },
  ],
};

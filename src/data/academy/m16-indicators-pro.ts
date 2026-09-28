import type { Module, Note } from "./types";
import { real, realSpec, visible } from "./real";
import { rsi, sma } from "./build";
import { adx, anchoredVwap, cci, donchian, hiTag, ichimoku, keltner, level, loTag, obv, psar, stochastic, supertrend, vline, williamsR, zone } from "./adv";

// 200-period moving average on real daily data (warm-up candles hold the first 200).
const m2 = real("ma200");
const ma200 = visible(m2, sma(m2.all.map((c) => c[3]), 200));
const ma50 = visible(m2, sma(m2.all.map((c) => c[3]), 50));

// Oscillators on a real range.
const st = real("stoch-range");
const stoch = stochastic(st.all);
const stK = visible(st, stoch.k);
const stD = visible(st, stoch.d);
const stCci = visible(st, cci(st.all));
const stWr = visible(st, williamsR(st.all));
const stRsi = rsi(st.all.map((c) => c[3]));
const stochRsi = visible(
  st,
  stRsi.map((_, i) => {
    if (i < 27) return null;
    const w = stRsi.slice(i - 13, i + 1) as number[];
    const hi = Math.max(...w), lo = Math.min(...w);
    return hi === lo ? 50 : ((stRsi[i]! - lo) / (hi - lo)) * 100;
  }),
);

const ax = real("adx-trend");
const A = adx(ax.all);
const ic = real("ichimoku");
const I = ichimoku(ic.all);
const sf = real("supertrend-flip");
const sar = visible(sf, psar(sf.all));
const sup = visible(sf, supertrend(sf.all));

const ob = real("obv-accumulation");
const obvLine = obv(ob.candles, ob.volume ?? []);
let adAcc = 0;
const adLine = ob.candles.map(([, h, l, c], i) => (adAcc += h === l ? 0 : (((c - l) - (h - c)) / (h - l)) * (ob.volume?.[i] ?? 0)));

const dc = real("donchian-breakout");
const K = keltner(dc.all);
const Dn = donchian(dc.all);

const pv = real("pivots-day");
const pvOpen = pv.i("open");
const pvLines: Note[] = (["R2", "R1", "P", "S1", "S2"] as const).map((k) => level(pv.lv[k]!, k, k === "P" ? "gold" : k.startsWith("R") ? "down" : "up", true, pvOpen, pv.candles.length - 1));

const vw = real("anchored-vwap");
const avwap = anchoredVwap(vw.candles, vw.volume ?? [], vw.i("A"));

const smt = real("smt");
const alt = smt.alt!;

export const M16_INDICATORS_PRO: Module = {
  id: "indicators-pro",
  n: 16,
  title: "Indicators II",
  tagline: "The 200 MA, oscillators, trend-strength tools, Ichimoku, trailing systems, volume lines, channels, pivots, VWAP and SMT divergence.",
  icon: "📊",
  lessons: [
    {
      id: "ma-200",
      title: "The 200 moving average",
      summary: "The line institutions use to separate bull markets from bear markets.",
      minutes: 5,
      terms: ["200 moving average"],
      blocks: [
        {
          t: "p",
          text: "The **200-period simple moving average** (on the daily chart, about 10 months of trading) is the most-watched long-term trend filter. Above a rising 200 MA = long-term bull market; below a falling one = bear market. Funds, the financial press and many algorithms reference it, which is exactly why price reacts around it.",
        },
        {
          t: "diagram",
          caption: "A real daily chart: after months below it, price reclaimed the 200 MA and then held above it.",
          spec: realSpec("ma200", (r) => [vline(r.i("cross"), "reclaim", "gold")], { overlays: [{ values: ma200, color: "gold", label: "200 MA" }, { values: ma50, color: "electric", label: "50 MA", dash: true }] }),
        },
        {
          t: "table",
          head: ["Signal", "Meaning"],
          rows: [
            ["Price above a rising 200 MA", "Long-term uptrend: favour buys"],
            ["Price below a falling 200 MA", "Long-term downtrend: favour sells"],
            ["50 MA crosses above 200 MA", "Golden cross (lagging, but widely reported)"],
            ["50 MA crosses below 200 MA", "Death cross"],
          ],
        },
        { t: "callout", tone: "tip", text: "Use the 200 MA as a filter, not a trigger: 'only look for longs above it'. Price often whipsaws around it before committing." },
      ],
      quiz: [
        { q: "About how long is 200 daily candles?", options: ["2 weeks", "About 10 months of trading", "5 years", "1 day"], answer: 1, why: "≈ 252 trading days a year." },
        { q: "Price below a falling 200 MA suggests…", options: ["A long-term downtrend", "A strong uptrend", "Nothing", "A gap"], answer: 0, why: "It's the classic bear-market filter." },
        { q: "Best use of the 200 MA?", options: ["Exact entry trigger", "Big-picture trend filter", "Stop placement only", "Volume measure"], answer: 1, why: "It tells you which side to favour." },
      ],
    },
    {
      id: "stochastic-cci-williams",
      title: "Stochastic, Stochastic RSI, CCI and Williams %R",
      summary: "Four ways to ask one question: where did price close within its recent range?",
      minutes: 7,
      terms: ["Stochastic / Stochastic RSI", "CCI / Williams %R"],
      blocks: [
        {
          t: "p",
          text: "The **Stochastic oscillator** (George Lane, 1950s) measures where the close sits inside the last 14 candles' high–low range: 100 = at the high, 0 = at the low. %K is that value (smoothed), %D is a 3-period average of %K. Above 80 = overbought, below 20 = oversold. It shines in **ranges**.",
        },
        {
          t: "diagram",
          caption: "A real range with the Stochastic (14, 3, 3). Turns from above 80 lined up with the range top, turns from below 20 with the range bottom.",
          spec: realSpec("stoch-range", (r) => [level(r.lv["top"]!, "range top", "down"), level(r.lv["bot"]!, "range bottom", "up")], {
            pane: { label: "Stochastic %K / %D", min: 0, max: 100, series: [{ values: stK, color: "electric" }, { values: stD, color: "gold", dash: true }], levels: [{ v: 80, text: "80" }, { v: 20, text: "20" }] },
          }),
        },
        {
          t: "diagram",
          caption: "Same real chart. Stochastic RSI applies the stochastic formula to RSI instead of price: faster and more sensitive.",
          spec: realSpec("stoch-range", () => [], { pane: { label: "Stochastic RSI", min: 0, max: 100, series: [{ values: stochRsi, color: "purple" }], levels: [{ v: 80, text: "80" }, { v: 20, text: "20" }] }, height: 160 }),
        },
        {
          t: "diagram",
          caption: "Same real chart with CCI (20). CCI measures distance from the average price in units of average deviation; ±100 are the usual extremes.",
          spec: realSpec("stoch-range", () => [], { pane: { label: "CCI (20)", series: [{ values: stCci, color: "gold" }], levels: [{ v: 100, text: "+100" }, { v: -100, text: "−100" }, { v: 0, text: "0" }] }, height: 160 }),
        },
        {
          t: "diagram",
          caption: "Williams %R (14) is the Stochastic upside down: 0 at the high, −100 at the low. Above −20 = overbought, below −80 = oversold.",
          spec: realSpec("stoch-range", () => [], { pane: { label: "Williams %R (14)", min: -100, max: 0, series: [{ values: stWr, color: "electric" }], levels: [{ v: -20, text: "−20" }, { v: -80, text: "−80" }] }, height: 160 }),
        },
        {
          t: "table",
          head: ["Oscillator", "Range", "Overbought / oversold", "Best in"],
          rows: [
            ["Stochastic", "0 to 100", "80 / 20", "Ranges"],
            ["Stochastic RSI", "0 to 100", "80 / 20", "Short-term timing"],
            ["CCI", "Unbounded", "+100 / −100", "Spotting new trends (strong breaks beyond ±100)"],
            ["Williams %R", "−100 to 0", "−20 / −80", "Ranges"],
          ],
        },
        { t: "callout", tone: "warn", text: "In a strong trend all four stay 'overbought' or 'oversold' for a long time. Selling just because the Stochastic is above 80 in an uptrend is a classic losing trade." },
      ],
      quiz: [
        { q: "A Stochastic reading of 95 means…", options: ["The close is near the bottom of the recent range", "The close is near the top of the recent range", "Volume is high", "A trend change is certain"], answer: 1, why: "It measures the close's position in the range." },
        { q: "Williams %R of −90 is…", options: ["Overbought", "Oversold", "Neutral", "Impossible"], answer: 1, why: "Below −80 is oversold." },
        { q: "Where do these oscillators work best?", options: ["In strong trends", "In ranges", "On news", "On gaps"], answer: 1, why: "In trends they stay pinned at extremes." },
      ],
    },
    {
      id: "adx-dmi",
      title: "ADX and DMI: trend strength",
      summary: "Is there a trend worth trading at all? ADX answers that; +DI and −DI give the direction.",
      minutes: 5,
      terms: ["ADX / DMI"],
      blocks: [
        {
          t: "p",
          text: "J. Welles Wilder's **Directional Movement Index** (1978) has three lines. **+DI** measures upward movement, **−DI** downward movement, and **ADX** measures how strong the trend is, **regardless of direction**. ADX below 20 = no trend (range); above 25 and rising = a trend is in force.",
        },
        {
          t: "diagram",
          caption: `A real chart: ADX rose through 25 after a quiet period, with ${(ax.lv["dir"] ?? 1) > 0 ? "+DI above −DI" : "−DI above +DI"}, and a strong trend followed.`,
          spec: realSpec("adx-trend", (r) => [vline(r.i("cross"), "ADX > 25", "gold")], {
            pane: {
              label: "ADX (gold) · +DI (green) · −DI (red)",
              min: 0,
              series: [{ values: visible(ax, A.adx), color: "gold" }, { values: visible(ax, A.pdi), color: "up" }, { values: visible(ax, A.mdi), color: "down" }],
              levels: [{ v: 25, text: "25" }, { v: 20, text: "20" }],
            },
          }),
        },
        {
          t: "list",
          items: ["**ADX < 20**: range. Use range strategies, fade the edges.", "**ADX rising above 25**: trend. Use pullback and breakout strategies.", "**+DI above −DI**: buyers dominate; **−DI above +DI**: sellers dominate.", "**ADX falling from a high level**: the trend is losing strength (not necessarily reversing)."],
        },
      ],
      quiz: [
        { q: "ADX measures…", options: ["Direction", "Trend strength regardless of direction", "Volume", "Volatility of the spread"], answer: 1, why: "Direction comes from +DI/−DI." },
        { q: "ADX at 15 suggests…", options: ["A strong trend", "A weak trend or range", "A crash", "A gap"], answer: 1, why: "Below 20 = no meaningful trend." },
        { q: "+DI above −DI means…", options: ["Sellers dominate", "Buyers dominate", "No trend", "ADX is falling"], answer: 1, why: "Upward movement is bigger." },
      ],
    },
    {
      id: "ichimoku",
      title: "Ichimoku Cloud",
      summary: "A complete trend system on one chart: two lines, a cloud and a lagging close.",
      minutes: 7,
      terms: ["Ichimoku Cloud"],
      blocks: [
        {
          t: "p",
          text: "**Ichimoku Kinko Hyo** ('one-glance equilibrium chart') was developed by Goichi Hosoda and published in 1969. All its lines are **midpoints** (highest high + lowest low, divided by 2) of different look-backs:",
        },
        {
          t: "table",
          head: ["Line", "Formula", "Use"],
          rows: [
            ["Tenkan-sen (conversion)", "Midpoint of the last 9 candles", "Fast trend line"],
            ["Kijun-sen (base)", "Midpoint of the last 26 candles", "Slower trend line; pullback level"],
            ["Senkou Span A", "(Tenkan + Kijun) ÷ 2, plotted 26 candles ahead", "Cloud edge"],
            ["Senkou Span B", "Midpoint of 52 candles, plotted 26 ahead", "Cloud edge (slower)"],
            ["Chikou Span", "Today's close plotted 26 candles back", "Confirms vs past price"],
          ],
        },
        {
          t: "diagram",
          caption: "A real breakout above the cloud after a long stretch below it; the cloud then turned green and supported the trend.",
          spec: realSpec("ichimoku", (r) => [vline(r.i("br"), "above the cloud", "gold")], {
            overlays: [{ values: visible(ic, I.tenkan), color: "electric", label: "Tenkan" }, { values: visible(ic, I.kijun), color: "gold", label: "Kijun" }],
            clouds: [{ a: visible(ic, I.spanA), b: visible(ic, I.spanB) }],
          }),
        },
        { t: "list", items: ["Price above the cloud = bullish; below = bearish; inside = no trade.", "Green cloud (Span A above B) = bullish bias ahead; red = bearish.", "Tenkan crossing above Kijun above the cloud = strong buy signal.", "A thick cloud is strong support/resistance; a thin one is easy to break."] },
      ],
      quiz: [
        { q: "What are all Ichimoku lines based on?", options: ["Closing averages", "Midpoints of high and low over a look-back", "Volume", "RSI"], answer: 1, why: "(highest high + lowest low) ÷ 2." },
        { q: "Price inside the cloud means…", options: ["Strong trend", "No clear trend: stand aside", "Buy", "Sell"], answer: 1, why: "The cloud is the equilibrium zone." },
        { q: "Senkou spans are plotted…", options: ["26 candles ahead", "26 candles back", "At the current candle", "Randomly"], answer: 0, why: "The cloud is projected forward." },
      ],
    },
    {
      id: "psar-supertrend",
      title: "Parabolic SAR and Supertrend",
      summary: "Trailing-stop indicators that flip sides when the trend flips.",
      minutes: 5,
      terms: ["Parabolic SAR / Supertrend"],
      blocks: [
        {
          t: "p",
          text: "**Parabolic SAR** ('stop and reverse', Wilder 1978) prints dots below price in an uptrend and above it in a downtrend. The dots speed up toward price as the trend extends (acceleration 0.02, rising by 0.02 at each new extreme up to 0.20). When price touches the dots, they flip to the other side.",
        },
        { t: "diagram", caption: "Parabolic SAR on a real chart: dots above price during the decline, then a flip below price that trailed the new uptrend.", spec: realSpec("supertrend-flip", (r) => [vline(r.i("flip"), "flip", "gold")], { overlays: [{ values: sar, color: "gold", dots: true }] }) },
        {
          t: "p",
          text: "**Supertrend** (ATR period 10, multiplier 3 is common) draws one line: ATR × 3 below price in an uptrend, above it in a downtrend. It only flips when price **closes** through it, so it whipsaws less than SAR.",
        },
        { t: "diagram", caption: "Supertrend on the same real chart.", spec: realSpec("supertrend-flip", () => [], { overlays: [{ values: sup, color: "electric", label: "Supertrend" }] }) },
        { t: "callout", tone: "tip", text: "Both are excellent trailing stops in trends and terrible in ranges, where they flip back and forth. Pair them with ADX: only follow flips when ADX says there's a trend." },
      ],
      quiz: [
        { q: "SAR stands for…", options: ["Stop and reverse", "Simple average range", "Signal and rate", "Support and resistance"], answer: 0, why: "Wilder's name for it." },
        { q: "Supertrend flips when price…", options: ["Touches it with a wick", "Closes through it", "Makes a doji", "Gaps"], answer: 1, why: "It uses closes, so fewer whipsaws." },
        { q: "Where do both indicators struggle?", options: ["Strong trends", "Sideways ranges", "Daily charts", "Stocks"], answer: 1, why: "They flip repeatedly in chop." },
      ],
    },
    {
      id: "obv-ad-line",
      title: "OBV and the Accumulation/Distribution line",
      summary: "Volume-weighted trend lines that can reveal buying before price moves.",
      minutes: 5,
      terms: ["OBV / Accumulation-Distribution line"],
      blocks: [
        {
          t: "p",
          text: "**On-Balance Volume** (Joe Granville, 1963) adds the whole candle's volume when it closes up and subtracts it when it closes down. The **Accumulation/Distribution line** (Marc Chaikin) is smarter: it weights each candle's volume by **where it closed in its range** (close near the high = mostly buying).",
        },
        {
          t: "diagram",
          caption: "A real range: price went nowhere, but OBV and A/D climbed (volume was heavier on up candles). Price then broke out upward.",
          spec: realSpec("obv-accumulation", (r) => [zone(r.i("a"), r.i("b"), Math.min(...r.candles.slice(r.i("a"), r.i("b") + 1).map((c) => c[2])), r.lv["top"]!, "muted", "flat price"), hiTag(r, "br", "breakout", "up")], {
            pane: { label: "OBV (blue) · A/D line (gold)", series: [{ values: obvLine, color: "electric" }, { values: adLine, color: "gold" }] },
          }),
        },
        { t: "list", items: ["OBV rising while price is flat = accumulation (quiet buying).", "OBV falling while price is flat or rising = distribution.", "A new OBV high before price makes one is an early bullish tell."] },
        { t: "callout", tone: "warn", text: "Forex has no central volume: MT4/MT5 show tick volume (number of price changes). Volume indicators are most reliable on stocks, futures and exchange-traded crypto." },
      ],
      quiz: [
        { q: "OBV adds volume when…", options: ["The candle closes up", "The candle closes down", "Volume is high", "Always"], answer: 0, why: "Up close → add, down close → subtract." },
        { q: "OBV rising while price is flat suggests…", options: ["Distribution", "Accumulation", "Nothing", "A gap"], answer: 1, why: "Buying volume is dominating quietly." },
        { q: "The A/D line weights volume by…", options: ["Time of day", "Where the candle closed in its range", "The spread", "RSI"], answer: 1, why: "The close location value." },
      ],
    },
    {
      id: "keltner-donchian",
      title: "Keltner and Donchian channels",
      summary: "An ATR envelope and the breakout channel the Turtle traders used.",
      minutes: 5,
      terms: ["Keltner / Donchian channels"],
      blocks: [
        {
          t: "p",
          text: "**Keltner Channels** put bands a multiple of **ATR** around an EMA (commonly 20 EMA ± 2 × ATR). Unlike Bollinger Bands (standard deviation), they widen smoothly with volatility. **Donchian Channels** (Richard Donchian) are simply the highest high and lowest low of the last N candles. The famous Turtle traders bought 20-day Donchian breakouts.",
        },
        {
          t: "diagram",
          caption: "A real 20-period Donchian breakout (dashed channel) with Keltner Channels: the close above the channel started a strong trend.",
          spec: realSpec("donchian-breakout", (r) => [hiTag(r, "br", "20-bar breakout", "up")], {
            overlays: [
              { values: visible(dc, Dn.upper), color: "gold", dash: true, label: "Donchian high" },
              { values: visible(dc, Dn.lower), color: "gold", dash: true },
              { values: visible(dc, K.upper), color: "purple" },
              { values: visible(dc, K.mid), color: "electric", label: "20 EMA" },
              { values: visible(dc, K.lower), color: "purple" },
            ],
          }),
        },
        {
          t: "table",
          head: ["Channel", "Built from", "Typical use"],
          rows: [
            ["Keltner", "EMA ± ATR multiple", "Trend filter; closes outside = strong momentum; squeeze with Bollinger inside Keltner"],
            ["Donchian", "Highest high / lowest low of N candles", "Breakout entries (20), trailing exits (10)"],
            ["Bollinger", "SMA ± standard deviations", "Volatility squeeze and mean reversion"],
          ],
        },
      ],
      quiz: [
        { q: "Keltner bands are built from…", options: ["Standard deviation", "ATR around an EMA", "Volume", "Pivots"], answer: 1, why: "EMA ± k × ATR." },
        { q: "A 20-period Donchian upper band is…", options: ["The 20-candle average", "The highest high of the last 20 candles", "The close", "A Fibonacci level"], answer: 1, why: "It's a pure high/low channel." },
        { q: "Who famously traded Donchian breakouts?", options: ["The Turtle traders", "Warren Buffett", "Dow", "Elliott"], answer: 0, why: "Richard Dennis's Turtles used 20/55-day breakouts." },
      ],
    },
    {
      id: "pivot-points",
      title: "Pivot points",
      summary: "Floor-trader levels calculated from yesterday's high, low and close.",
      minutes: 5,
      terms: ["Pivot points"],
      blocks: [
        {
          t: "p",
          text: "Floor traders computed the day's levels before the open. **Pivot (P) = (High + Low + Close) ÷ 3** of the previous day. Then **R1 = 2P − Low**, **S1 = 2P − High**, **R2 = P + (High − Low)**, **S2 = P − (High − Low)**. Because thousands of traders see the same numbers, price often reacts at them.",
        },
        {
          t: "diagram",
          caption: `A real day on ${pv.source.split(" · ")[1]}: yesterday's candles on the left; today's pivot levels on the right, with a reaction at ${pv.pts["kind"]! > 0 ? "R1" : "S1"}.`,
          spec: realSpec("pivots-day", (r) => [vline(pvOpen, "new day (17:00 NY)", "muted"), ...pvLines, r.pts["kind"]! > 0 ? hiTag(r, "touch", "R1 reaction", "down") : loTag(r, "touch", "S1 reaction", "up")]),
        },
        { t: "list", items: ["Opening above P = bullish bias for the day; below P = bearish.", "R1/S1 are the first reaction levels; R2/S2 are for trend days.", "Weekly and monthly pivots use the previous week's/month's high, low and close."] },
        { t: "callout", tone: "tip", text: "Forex pivots are usually calculated on the New York close (17:00 NY), which is why the new day starts there in this chart." },
      ],
      quiz: [
        { q: "The pivot point P equals…", options: ["(Open + Close) ÷ 2", "(High + Low + Close) ÷ 3 of the previous day", "Today's open", "The 20 EMA"], answer: 1, why: "The classic floor pivot." },
        { q: "R1 equals…", options: ["2P − Low", "2P − High", "P + High", "High − Low"], answer: 0, why: "First resistance." },
        { q: "Opening below P suggests…", options: ["Bullish bias", "Bearish bias", "No information", "A gap"], answer: 1, why: "Below the pivot favours sellers." },
      ],
    },
    {
      id: "vwap",
      title: "VWAP and anchored VWAP",
      summary: "The average price paid, weighted by volume: the benchmark big traders are judged against.",
      minutes: 6,
      terms: ["VWAP / Anchored VWAP"],
      blocks: [
        {
          t: "p",
          text: "**VWAP (volume-weighted average price)** = Σ(typical price × volume) ÷ Σ volume, reset every session. It is the average price everyone paid today. Institutions are measured against it (buying below VWAP is a 'good fill'), so it acts as a magnet and as dynamic support/resistance.",
        },
        {
          t: "p",
          text: "An **anchored VWAP** starts from a candle you choose: a major low, a breakout, an earnings day. It shows the average price of everyone who bought since that event, so whether they are in profit (price above it) or underwater (below it).",
        },
        {
          t: "diagram",
          caption: "A real anchored VWAP from a swing low. The pullback found support right at the average buyer's price, then price rallied.",
          spec: realSpec("anchored-vwap", (r) => [loTag(r, "A", "anchor", "gold"), loTag(r, "touch", "AVWAP support", "up")], { overlays: [{ values: avwap, color: "gold", label: "AVWAP" }], ...(vw.volume ? { volume: vw.volume } : {}) }),
        },
        { t: "list", items: ["Above VWAP: buyers since the anchor are in profit and tend to defend it.", "Below VWAP: they are underwater and may sell into it on rallies.", "Common anchors: the session open, the week's open, a major swing, earnings or news candles."] },
      ],
      quiz: [
        { q: "VWAP is weighted by…", options: ["Time", "Volume", "RSI", "Spread"], answer: 1, why: "Each price counts by how much traded there." },
        { q: "Standard VWAP resets…", options: ["Never", "Every session", "Every week only", "At every candle"], answer: 1, why: "Anchored VWAP is the version you start yourself." },
        { q: "Price above an anchored VWAP from a low means…", options: ["Buyers since that low are in profit on average", "Everyone is losing", "Nothing", "A gap"], answer: 0, why: "It's their average entry." },
      ],
    },
    {
      id: "smt-divergence",
      title: "SMT divergence",
      summary: "When two correlated markets disagree at a high or low, one of them is lying.",
      minutes: 6,
      terms: ["SMT Divergence"],
      blocks: [
        {
          t: "p",
          text: "**Smart Money Technique (SMT) divergence** compares two markets that normally move together, such as EUR/USD and GBP/USD, or the S&P 500 and NASDAQ. If one makes a **lower low** while the other makes a **higher low** at the same time, the sweep in the first market was likely a stop run, not real weakness.",
        },
        {
          t: "diagram",
          caption: `Real ${smt.source.split(" · ")[1]} (top): the second low went LOWER than the first.`,
          spec: realSpec("smt", (r) => [{ k: "line", i1: r.i("A"), p1: r.lo("A"), i2: r.i("B"), p2: r.lo("B"), color: "down", text: "lower low" }, loTag(r, "A", "low 1", "muted"), loTag(r, "B", "low 2", "down")], { height: 180 }),
        },
        {
          t: "diagram",
          caption: `${alt.label} over the same hours (bottom): the second low was HIGHER. That disagreement is the SMT divergence, and both pairs rallied.`,
          spec: {
            candles: alt.candles,
            height: 180,
            source: `Real chart · ${alt.label} · same hours`,
            notes: [
              { k: "line", i1: smt.i("A"), p1: Math.min(...alt.candles.slice(smt.i("A") - 1, smt.i("A") + 2).map((c) => c[2])), i2: smt.i("B"), p2: Math.min(...alt.candles.slice(smt.i("B") - 1, smt.i("B") + 2).map((c) => c[2])), color: "up", text: "higher low" },
            ],
          },
        },
        {
          t: "table",
          head: ["Pair of markets", "Relationship"],
          rows: [["EUR/USD vs GBP/USD", "Positive: both vs the dollar"], ["S&P 500 vs NASDAQ 100", "Positive"], ["EUR/USD vs DXY", "Negative: compare a low in one with a high in the other"], ["BTC vs ETH", "Positive"]],
        },
      ],
      quiz: [
        { q: "SMT divergence compares…", options: ["Price and RSI", "Two correlated markets", "Volume and price", "Two timeframes"], answer: 1, why: "It's inter-market." },
        { q: "EUR/USD makes a lower low, GBP/USD a higher low. This hints…", options: ["Strong bearish continuation", "The EUR/USD low may be a stop run: bullish", "Nothing", "A gap"], answer: 1, why: "The stronger market didn't confirm." },
        { q: "For EUR/USD vs DXY you compare…", options: ["Two lows", "A low in one with a high in the other", "Volumes", "Opens"], answer: 1, why: "They move opposite each other." },
      ],
    },
  ],
};

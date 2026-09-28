import type { Module, Note } from "./types";
import MACRO from "../real/macro.json";
import { real, realSpec, swings } from "./real";
import { hiTag, level, loTag, pctFrom, vline, zone } from "./adv";

// Bullish order flow on a real uptrend: every higher low held at a demand zone.
const of = real("order-flow");
const ofNotes: Note[] = swings(of).flatMap((s) => {
  if (s.kind === "H") return [hiTag(of, s.name, "HH", "up")];
  // Last down candle into the higher low = the bullish order block that held.
  const j = [0, 1, 2, 3].map((d) => s.i - d).find((k) => k >= 0 && of.candles[k]![3] < of.candles[k]![0]) ?? s.i;
  return [zone(j, Math.min(of.candles.length - 1, s.i + 3), of.candles[j]![2], of.candles[j]![1], "up"), loTag(of, s.name, "OB held", "up")];
});

const ip = real("ipda");
const now = ip.i("now");
const ipLevels: Note[] = [20, 40, 60].flatMap((d) => {
  const w = ip.candles.slice(Math.max(0, now - d), now);
  return [level(Math.max(...w.map((c) => c[1])), `${d}-day high`, d === 60 ? "gold" : "muted", true, Math.max(0, now - d), now), level(Math.min(...w.map((c) => c[2])), `${d}-day low`, "muted", true, Math.max(0, now - d), now)];
});

const corr = (a: number[], b: number[]) => {
  const ra = a.slice(1).map((x, k) => Math.log(x / a[k]!));
  const rb = b.slice(1).map((x, k) => Math.log(x / b[k]!));
  const ma = ra.reduce((s, x) => s + x, 0) / ra.length, mb = rb.reduce((s, x) => s + x, 0) / rb.length;
  let ab = 0, aa = 0, bb = 0;
  ra.forEach((x, k) => ((ab += (x - ma) * (rb[k]! - mb)), (aa += (x - ma) ** 2), (bb += (rb[k]! - mb) ** 2)));
  return (ab / Math.sqrt(aa * bb)).toFixed(2);
};
const I = MACRO.inter;
const cot = MACRO.cot as [string, number, number, number][];

export const M22_INSTITUTIONAL: Module = {
  id: "institutional",
  n: 22,
  title: "Institutional and Market-Maker Concepts",
  tagline: "Order flow, IPDA look-back ranges, the market maker models, accumulation and distribution, intermarket analysis and the COT report.",
  icon: "🏦",
  lessons: [
    {
      id: "institutional-order-flow",
      title: "Institutional order flow",
      summary: "Reading which side big players are on from which zones keep holding.",
      minutes: 6,
      terms: ["Order Flow / Institutional Order Flow", "Bullish / Bearish Order Flow"],
      blocks: [
        {
          t: "p",
          text: "In ICT's language, **order flow** is the direction institutions are pushing price, read from **which PD arrays are respected**. In **bullish order flow**, bullish order blocks and FVGs hold on every pullback and each higher low forms at one. When a bullish zone **fails** (price closes through it), order flow may be changing.",
        },
        { t: "diagram", caption: "Real bullish order flow: each higher low formed at a bullish order block that held.", spec: realSpec("order-flow", () => ofNotes) },
        {
          t: "table",
          head: ["Order flow", "What holds", "What breaks"],
          rows: [["Bullish", "Bullish OBs, FVGs, higher lows", "Highs (buy-side liquidity taken)"], ["Bearish", "Bearish OBs, FVGs, lower highs", "Lows (sell-side liquidity taken)"], ["Shifting", "The first opposite zone holds", "The last protected swing"]],
        },
      ],
      quiz: [
        { q: "Bullish order flow means…", options: ["Bearish zones hold", "Bullish zones keep holding on pullbacks", "Volume is falling", "The spread widens"], answer: 1, why: "Respected bullish arrays." },
        { q: "An early sign order flow is changing?", options: ["A bullish zone fails (closed through)", "A new high", "A green candle", "RSI 50"], answer: 0, why: "Failure of the zones that used to hold." },
        { q: "In bullish order flow, what gets taken?", options: ["Sell-side below lows", "Buy-side above highs", "Nothing", "Only gaps"], answer: 1, why: "Price keeps running highs." },
      ],
    },
    {
      id: "ipda",
      title: "IPDA and the 20/40/60-day look-back",
      summary: "ICT's model of algorithmic price delivery, and the ranges it looks back on.",
      minutes: 6,
      terms: ["Interbank Price Delivery Algorithm (IPDA) / Algorithmic Price Delivery", "IPDA Data Ranges (20/40/60 days)"],
      blocks: [
        {
          t: "p",
          text: "ICT describes price as delivered by an **Interbank Price Delivery Algorithm (IPDA)** that moves between liquidity (old highs and lows) and inefficiency (FVGs). Whether or not such an algorithm exists as described, the useful, testable part is the **look-back**: the highs and lows of the last **20, 40 and 60 trading days** are the liquidity pools most likely to be targeted.",
        },
        {
          t: "diagram",
          caption: `Real daily chart: the 20/40/60-day highs and lows measured from the marked day. Price ran the 60-day high, then reversed.`,
          spec: realSpec("ipda", (r) => [...ipLevels, vline(now, "look-back from here", "muted"), hiTag(r, "now", "60-day high taken", "down")]),
        },
        {
          t: "list",
          items: ["Every day, note the 20/40/60-day highs and lows on the daily chart.", "The nearest untouched one in your bias direction is a strong candidate for the draw on liquidity.", "ICT also looks forward 20/40/60 days after quarterly shifts (early in each quarter)."],
        },
      ],
      quiz: [
        { q: "IPDA look-back ranges are…", options: ["5/10/15 days", "20/40/60 trading days", "1 year only", "Hours"], answer: 1, why: "About 1, 2 and 3 months." },
        { q: "What do those ranges give you?", options: ["Entry candles", "Likely liquidity targets", "Indicator settings", "Spreads"], answer: 1, why: "Their highs and lows are liquidity." },
        { q: "The practical part of IPDA for a trader is…", options: ["Believing in a secret algorithm", "Using the look-back highs/lows as targets", "Ignoring liquidity", "Trading randomly"], answer: 1, why: "It's testable on real charts." },
      ],
    },
    {
      id: "market-maker-models",
      title: "Market maker buy and sell models",
      summary: "A complete reversal story: engineering liquidity, the smart money reversal, then the return.",
      minutes: 8,
      terms: ["Market Maker Buy / Sell Model (MMBM / MMSM)", "Market Maker Model Stages", "Smart Money Reversal (SMR)"],
      blocks: [
        {
          t: "p",
          text: "The **market maker buy model (MMBM)** is ICT's map of a full bullish reversal. It starts from an **original consolidation**, sells off in stages (the 'sell program') making lower highs and lows that **engineer liquidity**, reaches a higher-timeframe discount array where the **smart money reversal (SMR)** happens, then climbs back up in stages (the 'buy program') to the original consolidation. The **MMSM** is the mirror image.",
        },
        {
          t: "diagram",
          caption: "A real market maker buy model: sell program with lower highs, the smart money reversal, a market structure shift, and a buy program back to where it started.",
          spec: realSpec("mmbm", (r) => [
            level(r.hi("H0"), "original consolidation", "gold", true, r.i("H0"), r.i("back") + 2),
            hiTag(r, "H0", "start", "gold"),
            hiTag(r, "H1", "LH", "down"),
            hiTag(r, "H2", "LH", "down"),
            loTag(r, "L1", "LL", "down"),
            loTag(r, "L2", "LL", "down"),
            loTag(r, "L3", "SMR", "up"),
            hiTag(r, "mss", "MSS", "up"),
            hiTag(r, "back", "back to start", "up"),
          ]),
        },
        {
          t: "flow",
          steps: [
            { title: "1. Original consolidation", text: "The range where it starts; later the target." },
            { title: "2. Sell side of the curve", text: "Stair-steps lower; each lower high stores buy stops, each lower low stores sell stops." },
            { title: "3. Smart money reversal", text: "At a higher-timeframe discount array, sell-side is taken and price shifts structure up." },
            { title: "4. Buy side of the curve", text: "Stair-steps back up, re-taking the lower highs one by one, to the original consolidation." },
          ],
        },
      ],
      quiz: [
        { q: "Where does an MMBM ultimately target?", options: ["A new low", "The original consolidation", "The 200 MA", "Nowhere"], answer: 1, why: "It returns to where the sell program began." },
        { q: "The smart money reversal happens…", options: ["At the top", "At a higher-timeframe discount array after sell-side is taken", "At the open", "Randomly"], answer: 1, why: "The turn at the bottom." },
        { q: "Why are the lower highs in the sell program important?", options: ["They hold buy stops that the buy program later takes", "They're decoration", "They're gaps", "They're news"], answer: 0, why: "Engineered liquidity for the return." },
      ],
    },
    {
      id: "accumulation-distribution",
      title: "Accumulation, distribution, reaccumulation and redistribution",
      summary: "How big players build and unload positions inside ranges.",
      minutes: 6,
      terms: ["Accumulation / Distribution", "Reaccumulation / Redistribution"],
      blocks: [
        {
          t: "p",
          text: "Large players can't buy everything at once without moving price. They **accumulate** over time inside a range at the bottom, then let price rise. At the top they **distribute** (sell to latecomers) inside another range. A **reaccumulation** is a range in the middle of an uptrend where more buying happens before the trend continues; a **redistribution** is the bearish equivalent.",
        },
        {
          t: "diagram",
          caption: "A real reaccumulation: a strong rally, a sideways range that held above the rally's midpoint, then continuation.",
          spec: realSpec("reaccumulation", (r) => [zone(r.i("a"), r.i("b"), r.lv["bot"]!, r.lv["top"]!, "electric", "reaccumulation"), hiTag(r, "br", "continuation", "up")]),
        },
        {
          t: "table",
          head: ["Range", "Where", "Resolves"],
          rows: [["Accumulation", "After a decline", "Up (new trend)"], ["Reaccumulation", "Mid-uptrend", "Up (continuation)"], ["Distribution", "After a rally", "Down (new trend)"], ["Redistribution", "Mid-downtrend", "Down (continuation)"]],
        },
        { t: "callout", tone: "tip", text: "You rarely know which one it is until it breaks. The Wyckoff module teaches the events (springs, upthrusts, tests) that give it away earlier." },
      ],
      quiz: [
        { q: "Accumulation happens…", options: ["At tops", "In a range after a decline", "Only on news", "Never"], answer: 1, why: "Building longs quietly at the bottom." },
        { q: "A reaccumulation range usually resolves…", options: ["Down", "Up, continuing the trend", "Sideways forever", "In a gap"], answer: 1, why: "It's a pause in an uptrend." },
        { q: "Why do big players need ranges?", options: ["To fill large orders without moving price too much", "Brokers require it", "For fun", "They don't"], answer: 0, why: "Size needs time and liquidity." },
      ],
    },
    {
      id: "intermarket-analysis",
      title: "Intermarket analysis: the dollar, yields and risk",
      summary: "How currencies, bonds, stocks and volatility move against or with each other, on real data.",
      minutes: 8,
      terms: ["Intermarket Analysis / Bond Yields Relationship", "Correlation / Dollar Index (DXY)", "Risk-On / Risk-Off"],
      blocks: [
        {
          t: "p",
          text: "The **US Dollar Index (DXY)** measures the dollar against six currencies, and **EUR makes up about 58%** of it. So EUR/USD and DXY are near mirror images. Below, both are shown as % change over the same real year.",
        },
        {
          t: "diagram",
          caption: `EUR/USD (white) vs DXY (red), % change, ${I.eurDxy.from} to ${I.eurDxy.to}. Correlation of daily returns: ${corr(I.eurDxy.a, I.eurDxy.b)}.`,
          spec: { line: pctFrom(I.eurDxy.a), overlays: [{ values: pctFrom(I.eurDxy.b), color: "down", label: "DXY" }], source: "Real daily closes · EUR/USD vs DXY" },
        },
        {
          t: "p",
          text: "**Risk-on vs risk-off**: when investors are confident they buy stocks and high-yield assets (risk-on); when they're afraid they buy safe havens (US Treasuries, the yen, the Swiss franc, often gold) and volatility jumps (risk-off). The **VIX** (the S&P 500's expected volatility, the 'fear index') rises when stocks fall.",
        },
        {
          t: "diagram",
          caption: `S&P 500 (white) vs VIX (red), % change, ${I.spxVix.from} to ${I.spxVix.to}. Correlation of daily returns: ${corr(I.spxVix.a, I.spxVix.b)}.`,
          spec: { line: pctFrom(I.spxVix.a), overlays: [{ values: pctFrom(I.spxVix.b).map((v) => v / 5), color: "down", label: "VIX ÷ 5" }], source: "Real daily closes · S&P 500 vs VIX" },
        },
        {
          t: "p",
          text: "**Bond yields** drive currencies: higher US yields attract capital to the dollar. USD/JPY in particular tracks the US 10-year yield, because Japanese rates stayed near zero for years.",
        },
        {
          t: "diagram",
          caption: `USD/JPY (white) vs the US 10-year yield (gold), % change, ${I.jpyTnx.from} to ${I.jpyTnx.to}. Correlation of daily returns: ${corr(I.jpyTnx.a, I.jpyTnx.b)}.`,
          spec: { line: pctFrom(I.jpyTnx.a), overlays: [{ values: pctFrom(I.jpyTnx.b).map((v) => v / 3), color: "gold", label: "US10Y ÷ 3" }], source: "Real daily closes · USD/JPY vs US 10Y" },
        },
        {
          t: "table",
          head: ["Relationship", "Usual direction"],
          rows: [["EUR/USD vs DXY", "Opposite"], ["Gold vs DXY", "Usually opposite"], ["USD/JPY vs US yields", "Same"], ["S&P 500 vs VIX", "Opposite"], ["Stocks in risk-off", "Down, with JPY/CHF/Treasuries up"]],
        },
        { t: "callout", tone: "warn", text: "Correlations drift and sometimes flip for months. Re-check them; never assume last year's relationship holds today." },
      ],
      quiz: [
        { q: "About what share of DXY is the euro?", options: ["10%", "About 58%", "100%", "25%"], answer: 1, why: "The euro dominates the basket." },
        { q: "In risk-off, which usually rises?", options: ["High-yield stocks", "Safe havens and the VIX", "Emerging-market currencies", "Nothing"], answer: 1, why: "Money flees to safety." },
        { q: "USD/JPY tends to move with…", options: ["US bond yields", "The VIX", "Bitcoin", "Oil only"], answer: 0, why: "The yield gap drives it." },
      ],
    },
    {
      id: "cot-dark-pools",
      title: "The COT report, dark pools and HFT",
      summary: "What large futures traders hold, and the hidden or ultra-fast side of the market.",
      minutes: 7,
      terms: ["COT report", "Dark pools / HFT"],
      blocks: [
        {
          t: "p",
          text: "Every Friday the US regulator (CFTC) publishes the **Commitments of Traders (COT)** report: positions as of Tuesday for every major futures market. The key groups are **commercials** (hedgers: businesses offsetting real exposure) and **non-commercials** (large speculators: funds). Extreme speculative positioning often appears near turning points.",
        },
        {
          t: "diagram",
          caption: `Real COT data for euro futures (${cot[0]?.[0]} to ${cot[cot.length - 1]?.[0]}). Top: EUR/USD weekly close. Bottom: large speculators' net position (long minus short contracts).`,
          spec: {
            line: cot.map((r) => r[3]),
            height: 160,
            source: "CFTC Commitments of Traders · Euro FX",
            pane: { label: "Non-commercial net contracts", bars: { values: cot.map((r) => r[1]) }, levels: [{ v: 0, text: "0" }] },
          },
        },
        {
          t: "list",
          items: ["Speculators net long and rising with price = trend confirmation.", "Speculators at a multi-year extreme = crowded trade; reversal risk.", "Commercials are usually on the other side of speculators; they hedge."],
        },
        {
          t: "p",
          text: "**Dark pools** are private venues where institutions trade large blocks of shares without showing orders publicly first, reducing market impact. **High-frequency trading (HFT)** firms use very fast computers, often located next to exchange servers, to make markets and exploit tiny price differences in microseconds. Together they explain why the visible order book shows only part of the real supply and demand.",
        },
      ],
      quiz: [
        { q: "Who publishes the COT report?", options: ["The CFTC", "Your broker", "The ECB", "Binance"], answer: 0, why: "The US Commodity Futures Trading Commission." },
        { q: "Non-commercials are…", options: ["Hedgers", "Large speculators", "Retail only", "Central banks"], answer: 1, why: "Funds trading for profit." },
        { q: "A dark pool is…", options: ["A scam", "A private venue for large block trades", "A crypto wallet", "A type of candle"], answer: 1, why: "Hidden liquidity." },
      ],
    },
  ],
};

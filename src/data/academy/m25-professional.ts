import type { Module } from "./types";
import MACRO from "../real/macro.json";
import { mulberry32 } from "@/engine/transform";
import { real, realSpec } from "./real";
import { level, loTag, pctFrom, vline } from "./adv";

// Order book snapshot (real Binance BTC/USDT depth at download time).
const depth = MACRO.depth as { t: number; bids: [number, number][]; asks: [number, number][] } | null;
const depthRows: string[][] = depth
  ? [
      ...depth.asks.slice(0, 6).reverse().map(([p, q]) => ["", "", p.toFixed(2), q.toFixed(4)]),
      ...depth.bids.slice(0, 6).map(([p, q]) => [q.toFixed(4), p.toFixed(2), "", ""]),
    ]
  : [];
const depthTime = depth ? new Date(depth.t * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "";

// Risk of ruin by simulation: chance of a 50% drawdown within 300 trades (seeded, so stable).
function ruin(win: number, rr: number, risk: number, runs = 300, trades = 300): number {
  const rnd = mulberry32(Math.round(win * 1000 + rr * 100 + risk * 10000));
  let ruined = 0;
  for (let r = 0; r < runs; r++) {
    let eq = 1;
    let peak = 1;
    for (let t = 0; t < trades; t++) {
      eq *= rnd() < win ? 1 + risk * rr : 1 - risk;
      peak = Math.max(peak, eq);
      if (eq <= peak * 0.5) {
        ruined++;
        break;
      }
    }
  }
  return Math.round((ruined / runs) * 100);
}
const RISKS = [0.01, 0.02, 0.05, 0.1];
const ruinRows = [
  { w: 0.4, rr: 2 },
  { w: 0.5, rr: 1.5 },
  { w: 0.55, rr: 1 },
].map(({ w, rr }) => [`${w * 100}% wins, 1:${rr}`, ...RISKS.map((k) => `${ruin(w, rr, k)}%`)]);

const nfp = real("nfp");
const I = MACRO.inter;
const C = MACRO.correlation;
const funding = MACRO.funding as [string, number, number][];
const lq = real("liquidation-cascade");

export const M25_PROFESSIONAL: Module = {
  id: "professional",
  n: 25,
  title: "The Professional Trader",
  tagline: "Advanced orders and the DOM, prop firms, performance maths, correlation risk, the news, interest rates, futures and crypto derivatives.",
  icon: "💼",
  lessons: [
    {
      id: "stop-limit-dom-prop",
      title: "Stop-limit orders, the DOM and prop firms",
      summary: "Controlling your fill price, reading the live order book, and trading a firm's capital.",
      minutes: 7,
      terms: ["Stop-limit order", "Depth of Market (DOM)", "Funded Account / Prop Firm"],
      blocks: [
        {
          t: "p",
          text: "A **stop-limit order** has two prices: when the **stop** price is touched, a **limit** order is placed at the limit price. It protects you from slippage (you never pay worse than the limit), but in a fast move or a gap it may **not fill at all**. That's why protective stops are usually plain stop (market) orders.",
        },
        {
          t: "p",
          text: "The **depth of market (DOM)**, or order book ladder, shows resting limit orders at each price: sellers' asks above, buyers' bids below. Below is a real snapshot of the BTC/USDT book on Binance.",
        },
        ...(depth
          ? [
              {
                t: "table" as const,
                head: ["Bid size (BTC)", "Bid price", "Ask price", "Ask size (BTC)"],
                rows: depthRows,
              },
              { t: "p" as const, text: `Real BTC/USDT order book, Binance, ${depthTime}. The gap between the best bid and best ask is the spread; the sizes show how much could trade at each price before it moves.` },
            ]
          : []),
        {
          t: "p",
          text: "A **prop firm** (proprietary trading firm) lets you trade its capital after passing an **evaluation** (a 'challenge') under strict risk rules. You keep most of the profit; the firm keeps the rest and the evaluation fees.",
        },
        {
          t: "table",
          head: ["Typical rule", "Common value", "Why it matters"],
          rows: [
            ["Profit target", "8–10% (phase 1), ~5% (phase 2)", "Forces you to be profitable, not lucky"],
            ["Max daily loss", "~5% of the starting balance", "One bad day can end the account"],
            ["Max total drawdown", "~10%", "Your real stop-loss on the whole account"],
            ["Profit split", "70–90% to the trader", "Paid only after passing"],
          ],
        },
        { t: "callout", tone: "warn", text: "Rules differ between firms and change often; read them in full. Most challenges fail on the daily-loss rule, which is why risk per trade of 0.5–1% matters even more here." },
      ],
      quiz: [
        { q: "A stop-limit order's main risk is…", options: ["Too much slippage", "Not getting filled in a fast move or gap", "Higher spread", "None"], answer: 1, why: "The limit may be skipped." },
        { q: "The DOM shows…", options: ["Past trades only", "Resting bids and asks at each price", "News", "Indicators"], answer: 1, why: "The live order book ladder." },
        { q: "The rule that fails most prop challenges is often…", options: ["The profit split", "The max daily loss", "The platform", "The spread"], answer: 1, why: "One oversized loss ends it." },
      ],
    },
    {
      id: "performance-metrics",
      title: "Profit factor, Sharpe ratio, risk of ruin and Kelly",
      summary: "The numbers professionals use to judge a strategy, and to size it without blowing up.",
      minutes: 9,
      terms: ["Profit factor / Sharpe ratio", "Risk of ruin / Kelly criterion"],
      blocks: [
        {
          t: "table",
          head: ["Metric", "Formula", "Good sign"],
          rows: [
            ["Profit factor", "Gross profit ÷ gross loss", "Above 1.5 (1.0 = breakeven)"],
            ["Expectancy", "Win% × avg win − loss% × avg loss", "Positive, in R"],
            ["Sharpe ratio", "(Return − risk-free rate) ÷ standard deviation of returns", "Above 1 (annualised)"],
            ["Max drawdown", "Largest peak-to-trough fall of equity", "Small relative to return"],
          ],
        },
        {
          t: "p",
          text: "**Risk of ruin** is the chance a strategy with a real edge still hits a devastating drawdown because of position size. The table below is a simulation (300 accounts × 300 trades each) of the chance of a **50% drawdown** for three profitable strategies at different risk per trade:",
        },
        { t: "table", head: ["Strategy", "Risk 1%", "Risk 2%", "Risk 5%", "Risk 10%"], rows: ruinRows },
        {
          t: "p",
          text: "The **Kelly criterion** gives the bet size that maximises long-run growth: **f* = W − (1 − W) ÷ R**, where W is the win rate and R the win/loss ratio. With W = 55% and R = 1.5, f* = 0.55 − 0.45 ÷ 1.5 = **25%** of the account per trade. That is mathematically optimal and practically insane: drawdowns at full Kelly are brutal and your real edge is uncertain.",
        },
        { t: "callout", tone: "key", text: "Professionals use a fraction of Kelly (a quarter or less) or simply fixed 0.5–1% risk. Same edge, far smaller chance of ruin: compare the 1% and 10% columns above." },
      ],
      quiz: [
        { q: "Profit factor of 1.0 means…", options: ["Great strategy", "Breakeven: gross wins equal gross losses", "Losing everything", "No trades"], answer: 1, why: "Wins ÷ losses = 1." },
        { q: "Kelly for W = 50%, R = 2 is…", options: ["50%", "25%", "10%", "0%"], answer: 1, why: "0.5 − 0.5 ÷ 2 = 0.25." },
        { q: "Why do pros use a fraction of Kelly?", options: ["Full Kelly causes brutal drawdowns and edges are uncertain", "It's illegal", "Brokers limit it", "Kelly is wrong maths"], answer: 0, why: "Survival beats optimal growth on paper." },
      ],
    },
    {
      id: "correlation-risk-narrative",
      title: "Correlation risk, hedging and the narrative",
      summary: "Why three trades can be one trade, and the story that ties your analysis together.",
      minutes: 7,
      terms: ["Correlation risk / Hedging", "Narrative"],
      blocks: [
        {
          t: "p",
          text: "Buying EUR/USD, GBP/USD and selling DXY at 1% risk each is not three trades: it's roughly **one 3% bet against the dollar**. **Correlation risk** is hidden double exposure. Below: real correlations of daily returns over the last year (+1 = move together, −1 = move opposite).",
        },
        { t: "matrix", names: C.names, m: C.m, caption: `Real daily-return correlations, ${C.from} to ${C.to}. Green = positive, red = negative; stronger colour = stronger relationship.` },
        {
          t: "p",
          text: "**Hedging** is taking an offsetting position to reduce risk: a fund long stocks might buy index puts; an exporter might sell a currency forward. For a trader, reducing size or avoiding stacked correlated trades is usually cleaner than opening a hedge.",
        },
        {
          t: "p",
          text: "The **narrative** is the higher-timeframe story that makes your trade make sense: 'the weekly swept last month's low and shifted structure; the daily is heading for the old high at X; today should expand toward it'. If you can't tell the story in two sentences, your analysis isn't finished.",
        },
      ],
      quiz: [
        { q: "Long EUR/USD and long GBP/USD at 1% each is closer to…", options: ["Two independent trades", "About 2% risk on one dollar view", "No risk", "A hedge"], answer: 1, why: "They're highly correlated." },
        { q: "A correlation of −0.9 means…", options: ["They move together", "They move strongly opposite", "No relationship", "Random"], answer: 1, why: "Negative = opposite." },
        { q: "The narrative is…", options: ["A news headline", "The higher-timeframe story behind the trade", "An indicator", "A broker report"], answer: 1, why: "Context before entries." },
      ],
    },
    {
      id: "news-economic-calendar",
      title: "The economic calendar and high-impact news",
      summary: "NFP, CPI, FOMC and the other releases that move markets, and how a real release looks.",
      minutes: 8,
      terms: ["Economic Calendar", "High-Impact News", "NFP / CPI / PPI / FOMC / Interest Rate Decision", "GDP / PMI / Retail sales / Jobless claims"],
      blocks: [
        {
          t: "p",
          text: "The **economic calendar** lists every scheduled release with its time, the forecast and the previous value. Markets move on the **surprise**: the actual number versus the forecast. **High-impact** releases can move a major pair 50–100+ pips in minutes, widen spreads and cause slippage.",
        },
        {
          t: "table",
          head: ["Release", "What it measures", "When (New York time)"],
          rows: [
            ["NFP (non-farm payrolls)", "US jobs added last month + unemployment rate", "First Friday of the month, 08:30"],
            ["CPI", "Consumer inflation", "Monthly, around mid-month, 08:30"],
            ["PPI", "Producer (wholesale) inflation", "Monthly, 08:30"],
            ["FOMC decision", "Fed interest rate + statement", "8 times a year, 14:00 (press conference 14:30)"],
            ["GDP", "Economic growth", "Quarterly (advance estimate), 08:30"],
            ["ISM manufacturing PMI", "Business activity survey (50 = neutral)", "First business day, 10:00"],
            ["Retail sales", "Consumer spending", "Monthly, around mid-month, 08:30"],
            ["Jobless claims", "New unemployment filings", "Every Thursday, 08:30"],
          ],
        },
        {
          t: "diagram",
          caption: `A real NFP release on ${nfp.source.split(" · ")[1]} (1-hour candles): the 08:00 candle containing the 08:30 release was several times the normal size.`,
          spec: realSpec("nfp", (r) => [vline(r.i("news"), "NFP 08:30", "gold"), loTag(r, "news", "news candle", "gold")]),
        },
        {
          t: "list",
          items: ["Check the calendar every morning (Forex Factory, Investing.com, your broker).", "Close or protect trades before high-impact news, or be flat.", "Don't enter in the first minutes: spreads widen and the first move often reverses.", "Central bank decisions (Fed, ECB, BoE, BoJ) set the tone for weeks."],
        },
      ],
      quiz: [
        { q: "NFP is released…", options: ["Every Monday", "First Friday of the month at 08:30 NY", "Quarterly", "At midnight"], answer: 1, why: "US jobs report." },
        { q: "Markets react most to…", options: ["The number alone", "The surprise vs the forecast", "The weather", "Nothing"], answer: 1, why: "Expectations are already priced in." },
        { q: "The FOMC statement is at…", options: ["08:30 NY", "14:00 NY", "09:30 NY", "17:00 NY"], answer: 1, why: "Press conference at 14:30." },
      ],
    },
    {
      id: "rates-carry-qe",
      title: "Interest rates: carry trades, the yield curve and QE",
      summary: "The biggest force in currency markets, explained with real yield data.",
      minutes: 7,
      terms: ["Carry trade / Yield curve / Quantitative easing"],
      blocks: [
        {
          t: "p",
          text: "Money flows toward higher interest rates. A **carry trade** borrows a low-yield currency (for years, the Japanese yen) to buy a high-yield one, earning the rate difference daily (the positive swap). It works while markets are calm and unwinds violently in panics, when everyone repays yen at once.",
        },
        {
          t: "diagram",
          caption: `Real data: USD/JPY (white) vs the US 10-year yield (gold), % change, ${I.jpyTnx.from} to ${I.jpyTnx.to}. Higher US yields make holding dollars against yen more attractive.`,
          spec: { line: pctFrom(I.jpyTnx.a), overlays: [{ values: pctFrom(I.jpyTnx.b).map((v) => v / 3), color: "gold", label: "US10Y ÷ 3" }], source: "Real daily closes · USD/JPY vs US 10Y" },
        },
        {
          t: "table",
          head: ["Concept", "Meaning", "Market effect"],
          rows: [
            ["Yield curve", "Yields across maturities (2-year vs 10-year…)", "Normal: long rates higher. Inverted (2Y > 10Y): markets expect cuts; historically a recession warning"],
            ["Rate hike", "Central bank raises its policy rate", "Usually strengthens the currency"],
            ["Quantitative easing (QE)", "Central bank buys bonds with new reserves", "Lowers yields, usually weakens the currency, supports stocks"],
            ["Quantitative tightening (QT)", "Central bank lets bonds roll off / sells", "The opposite"],
          ],
        },
      ],
      quiz: [
        { q: "A carry trade borrows…", options: ["A high-yield currency", "A low-yield currency to buy a high-yield one", "Stocks", "Gold"], answer: 1, why: "Earn the rate difference." },
        { q: "An inverted yield curve means…", options: ["Short-term yields above long-term yields", "Long-term above short-term", "No yields", "Stocks up"], answer: 0, why: "E.g. 2Y above 10Y." },
        { q: "QE usually…", options: ["Raises yields", "Lowers yields and weakens the currency", "Has no effect", "Closes markets"], answer: 1, why: "More bond buying, lower yields." },
      ],
    },
    {
      id: "futures-crypto-derivatives",
      title: "Futures and crypto derivatives",
      summary: "Contango, backwardation, rollover and open interest; perpetuals, funding and liquidations.",
      minutes: 8,
      terms: ["Futures basics: contango, backwardation, rollover, open interest", "Crypto derivatives: perpetuals, funding rate, liquidations"],
      blocks: [
        {
          t: "table",
          head: ["Term", "Meaning"],
          rows: [
            ["Futures contract", "An agreement to buy/sell at a set price on a future date"],
            ["Contango", "Futures price above spot (normal when storage/financing costs exist)"],
            ["Backwardation", "Futures price below spot (tight supply now)"],
            ["Rollover", "Closing the expiring contract and opening the next one"],
            ["Open interest", "Number of contracts still open: rising OI with price = new money joining the trend"],
          ],
        },
        {
          t: "p",
          text: "Crypto exchanges invented the **perpetual future**: no expiry. To keep its price near spot, longs and shorts pay each other a **funding rate** (on Binance every 8 hours). Positive funding = longs pay shorts, so the crowd is long. Below: real BTC funding (daily average) under the BTC price.",
        },
        {
          t: "diagram",
          caption: `Real BTC/USDT perpetual funding rate, ${funding[0]?.[0]} to ${funding[funding.length - 1]?.[0]}: bars = average funding per 8 hours (%), line = BTC price.`,
          spec: { line: funding.map((f) => f[2]), height: 160, source: "Binance · BTCUSDT perpetual", pane: { label: "Funding rate % per 8h", bars: { values: funding.map((f) => f[1]) }, levels: [{ v: 0.01, text: "0.01% (base)" }] } },
        },
        {
          t: "p",
          text: "Leverage creates **liquidations**: when a leveraged position's margin runs out, the exchange force-closes it at market. Clusters of liquidations cascade: forced selling pushes price lower, triggering more liquidations, then the move snaps back once they're done.",
        },
        {
          t: "diagram",
          caption: "A real liquidation cascade: a giant candle on several times normal volume, with a long wick as forced selling exhausted itself.",
          spec: realSpec("liquidation-cascade", (r) => [loTag(r, "k", "liquidations", "down"), level(r.lo("k"), "cascade low", "muted", true, r.i("k"), r.candles.length - 1)], lq.volume ? { volume: lq.volume } : {}),
        },
        { t: "callout", tone: "warn", text: "Very high positive funding plus rising open interest means a crowded long trade: the fuel for a long-liquidation cascade." },
      ],
      quiz: [
        { q: "Contango means…", options: ["Futures below spot", "Futures above spot", "No futures", "A candle"], answer: 1, why: "Normal carry-cost structure." },
        { q: "Positive funding on a perpetual means…", options: ["Shorts pay longs", "Longs pay shorts", "Nobody pays", "The exchange pays"], answer: 1, why: "The crowd is long." },
        { q: "A liquidation cascade is…", options: ["A slow trend", "Forced closes triggering more forced closes", "A dividend", "An FVG"], answer: 1, why: "Leverage unwinding at once." },
      ],
    },
  ],
};

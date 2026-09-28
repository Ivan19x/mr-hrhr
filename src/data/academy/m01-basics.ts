import type { Module } from "./types";
import { path } from "./build";
import { real, swings } from "./real";

// Real trends: buy at an early swing low, sell at the last swing high (and the reverse).
const up = real("trend-up");
const upSw = swings(up);
const upBuy = upSw.find((s) => s.kind === "L")!;
const upSell = [...upSw].reverse().find((s) => s.kind === "H")!;
const dn = real("trend-down");
const dnSw = swings(dn);
const dnSell = dnSw.find((s) => s.kind === "H")!;
const dnBuy = [...dnSw].reverse().find((s) => s.kind === "L")!;

export const M01_BASICS: Module = {
  id: "basics",
  n: 1,
  title: "Trading 101",
  tagline: "What trading actually is, before any chart.",
  icon: "📘",
  lessons: [
    {
      id: "what-is-trading",
      title: "What is trading?",
      summary: "Buying and selling to profit from price changes, and why prices move at all.",
      minutes: 5,
      blocks: [
        {
          t: "p",
          text: "**Trading** is buying and selling something (a currency, a share, gold, bitcoin) to profit from a **change in its price**. You don't need the thing itself. You need the price to move in the direction you bet on, by more than it cost you to take the bet.",
        },
        {
          t: "p",
          text: "Prices move because of **supply and demand**. At every moment some people want to buy and some want to sell. When buyers are more eager (they accept higher prices), price rises. When sellers are more eager (they accept lower prices), price falls. News, interest rates, company earnings and fear are just reasons people become more eager on one side.",
        },
        {
          t: "diagram",
          caption: "A trader buys low, the price rises, and they sell higher. The profit is the difference.",
          spec: {
            candles: up.candles,
            source: up.source,
            notes: [
              { k: "arrow", i: upBuy.i, p: up.lo(upBuy.name), dir: "up", color: "up", text: "BUY" },
              { k: "arrow", i: upSell.i, p: up.hi(upSell.name), dir: "down", color: "down", text: "SELL" },
              { k: "bracket", i: upSell.i, p1: up.lo(upBuy.name), p2: up.hi(upSell.name), text: "profit", color: "up" },
            ],
          },
        },
        { t: "h", text: "Trading vs investing" },
        {
          t: "table",
          head: ["", "Trading", "Investing"],
          rows: [
            ["Holding time", "Minutes to weeks", "Months to decades"],
            ["Goal", "Profit from price swings", "Own growing assets"],
            ["Main tool", "Charts & risk management", "Company / economic value"],
            ["Direction", "Can profit from rises AND falls", "Mostly profits from rises"],
          ],
        },
        { t: "h", text: "Trading styles" },
        {
          t: "list",
          items: [
            "**Scalping**: seconds to minutes, many small trades.",
            "**Day trading**: all trades closed the same day.",
            "**Swing trading**: holds for days to weeks to catch one 'swing'.",
            "**Position trading**: weeks to months, following big trends.",
          ],
        },
        {
          t: "callout",
          tone: "warn",
          text: "Most beginners lose money, not because trading is impossible, but because they risk too much and trade without a plan. This course teaches the plan first.",
        },
      ],
      quiz: [
        {
          q: "What makes a price go up?",
          options: ["The broker decides", "Buyers are more eager than sellers", "The chart pattern", "Time passing"],
          answer: 1,
          why: "Price is where buyers and sellers agree. Eager buyers accept higher prices, so price rises.",
        },
        {
          q: "A swing trader typically holds a trade for…",
          options: ["Seconds", "Days to weeks", "Decades", "Exactly one hour"],
          answer: 1,
          why: "Swing trading aims to catch one price swing, which usually takes days to weeks.",
        },
        {
          q: "Can a trader profit when prices fall?",
          options: ["No, never", "Yes, by selling first (going short)", "Only with stocks", "Only on weekends"],
          answer: 1,
          why: "Short selling lets you profit from falling prices. You'll learn it two lessons from now.",
        },
      ],
    },
    {
      id: "markets",
      title: "The markets you can trade",
      summary: "Forex, stocks, indices, commodities and crypto: what moves each one and when they're open.",
      minutes: 6,
      blocks: [
        { t: "p", text: "A **market** is a place (physical or electronic) where one type of asset changes hands. Each market has its own hours, drivers and personality." },
        {
          t: "table",
          head: ["Market", "What you trade", "Example", "Moved by", "Hours"],
          rows: [
            ["Forex (FX)", "One currency against another", "EUR/USD", "Interest rates, economy, central banks", "24h Mon–Fri"],
            ["Stocks", "Shares of a company", "Apple (AAPL)", "Earnings, news, sector", "Exchange hours"],
            ["Indices", "A basket of top stocks", "S&P 500, NASDAQ 100", "Overall economy, sentiment", "Mostly exchange hours"],
            ["Commodities", "Raw materials", "Gold (XAU/USD), Oil", "Supply shocks, dollar, geopolitics", "Nearly 24h"],
            ["Crypto", "Digital currencies", "BTC/USD", "Adoption, liquidity, hype", "24/7"],
            ["Bonds", "Government / company debt", "US 10-year", "Interest rates, inflation", "Exchange / OTC"],
          ],
        },
        { t: "h", text: "Reading a currency pair" },
        {
          t: "p",
          text: "In **EUR/USD = 1.0850**, EUR is the **base** currency and USD is the **quote** currency. It means 1 euro costs 1.0850 US dollars. If you buy EUR/USD you are buying euros and selling dollars, so you profit if the euro strengthens.",
        },
        {
          t: "list",
          items: [
            "**Majors**: pairs with USD and another big economy (EUR/USD, GBP/USD, USD/JPY). The most liquid and cheapest to trade.",
            "**Minors / crosses**: big currencies without USD (EUR/GBP, GBP/JPY).",
            "**Exotics**: a major with an emerging currency (USD/ZAR, USD/KES). Wider spreads and bigger jumps.",
          ],
        },
        {
          t: "callout",
          tone: "tip",
          text: "MR_HRHR hides the asset name on game charts on purpose: the skills (structure, candles, risk) are the same in every market.",
        },
      ],
      quiz: [
        {
          q: "In GBP/USD, which is the base currency?",
          options: ["USD", "GBP", "Both", "Neither"],
          answer: 1,
          why: "The first currency is the base. GBP/USD shows how many dollars one pound costs.",
        },
        {
          q: "Which market trades 24/7, including weekends?",
          options: ["Forex", "Stocks", "Crypto", "Indices"],
          answer: 2,
          why: "Crypto never closes. Forex runs 24 hours but only Monday to Friday.",
        },
        {
          q: "Why are major pairs usually cheapest to trade?",
          options: ["They are regulated", "They are the most liquid, so spreads are tight", "They move the least", "Brokers like them"],
          answer: 1,
          why: "Huge volume means many buyers and sellers at every price, which keeps the spread (the cost) small.",
        },
      ],
    },
    {
      id: "long-short",
      title: "Going long and going short",
      summary: "Profit from rising prices by buying, and from falling prices by selling first.",
      minutes: 5,
      blocks: [
        { t: "p", text: "**Long** (buy): you buy now and sell later. You profit if price **rises**." },
        { t: "p", text: "**Short** (sell): you sell now and buy back later. You profit if price **falls**. With a broker you don't need to own the asset first: the broker handles the borrowing behind the scenes, or you trade a contract (CFD/future) that simply pays the price difference." },
        {
          t: "gallery",
          items: [
            {
              title: "Long trade",
              tone: "up",
              text: "Buy low, sell higher: the rise is your profit.",
              spec: {
                candles: up.candles,
                source: up.source,
                height: 170,
                notes: [
                  { k: "hline", p: up.lo(upBuy.name), text: "buy", color: "up", i1: upBuy.i },
                  { k: "hline", p: up.hi(upSell.name), text: "sell", color: "gold", i1: upBuy.i },
                ],
              },
            },
            {
              title: "Short trade",
              tone: "down",
              text: "Sell high, buy back lower: the fall is your profit.",
              spec: {
                candles: dn.candles,
                source: dn.source,
                height: 170,
                notes: [
                  { k: "hline", p: dn.hi(dnSell.name), text: "sell", color: "down", i1: dnSell.i },
                  { k: "hline", p: dn.lo(dnBuy.name), text: "buy back", color: "gold", i1: dnSell.i },
                ],
              },
            },
          ],
        },
        {
          t: "table",
          head: ["Position", "You make money when…", "You lose money when…"],
          rows: [
            ["Long (buy)", "Price goes up", "Price goes down"],
            ["Short (sell)", "Price goes down", "Price goes up"],
          ],
        },
        { t: "callout", tone: "key", text: "Profit = (exit − entry) × size for a long, and (entry − exit) × size for a short." },
      ],
      quiz: [
        {
          q: "You short at 50 and buy back at 45. Result per unit?",
          options: ["−5", "+5", "0", "+45"],
          answer: 1,
          why: "Short profit = entry − exit = 50 − 45 = +5.",
        },
        {
          q: "You are long and price falls. You are…",
          options: ["Making money", "Losing money", "Unaffected", "Automatically short"],
          answer: 1,
          why: "A long position profits only when price rises.",
        },
        {
          q: "Do you need to own an asset to short it with a broker?",
          options: ["Yes, always", "No, the broker/contract handles it", "Only for crypto", "Only on demo accounts"],
          answer: 1,
          why: "Brokers let you open a short directly, using borrowed assets or contracts like CFDs.",
        },
      ],
    },
    {
      id: "bid-ask-spread",
      title: "Bid, ask and the spread",
      summary: "Every market has two prices. The gap between them is your first cost.",
      minutes: 4,
      blocks: [
        { t: "p", text: "At any moment a market shows two prices:" },
        {
          t: "list",
          items: [
            "**Bid**: the highest price a buyer is currently willing to pay. You **sell** at the bid.",
            "**Ask** (or offer): the lowest price a seller currently accepts. You **buy** at the ask.",
            "**Spread** = ask − bid. It's the cost of crossing from one side to the other.",
          ],
        },
        {
          t: "diagram",
          caption: "Charts usually plot the bid. A buy fills at the (higher) ask, so every trade starts slightly negative.",
          spec: {
            line: path([[0, 100], [10, 100.6], [20, 100.2], [30, 100.9]], 0.15, 9),
            notes: [
              { k: "hline", p: 101.05, text: "ASK 101.05 (you buy here)", color: "up", dash: true },
              { k: "hline", p: 100.9, text: "BID 100.90 (you sell here)", color: "down", dash: true },
              { k: "bracket", i: 29, p1: 100.9, p2: 101.05, text: "spread", color: "gold", side: "left" },
            ],
          },
        },
        {
          t: "p",
          text: "Example: EUR/USD bid 1.08500 / ask 1.08512. The spread is 1.2 pips. If you buy and instantly sell, you lose 1.2 pips. Price must move in your favour by more than the spread before you're in profit.",
        },
        {
          t: "callout",
          tone: "warn",
          text: "Spreads widen when liquidity is thin: around big news, at the daily rollover (about 00:00 server time), and on exotic pairs. A stop loss placed too tight can be hit just by the spread widening.",
        },
      ],
      quiz: [
        { q: "You want to BUY. Which price do you get?", options: ["Bid", "Ask", "Mid", "Last close"], answer: 1, why: "Buyers take the seller's asking price." },
        { q: "Bid 1.2000, ask 1.2003. The spread is…", options: ["0.3 pips", "3 pips", "30 pips", "0.03 pips"], answer: 1, why: "0.0003 is 3 pips on a 4-decimal pair." },
        { q: "When do spreads usually widen?", options: ["During calm, busy hours", "Around major news and low liquidity", "Never", "Only on stocks"], answer: 1, why: "Fewer willing buyers/sellers at each price = wider gap." },
      ],
    },
    {
      id: "pips-lots-leverage",
      title: "Pips, lots, leverage and margin",
      summary: "How position size, leverage and margin decide how much a move is worth.",
      minutes: 7,
      blocks: [
        { t: "h", text: "Pips and points" },
        {
          t: "p",
          text: "A **pip** is the standard unit of price movement in forex: 0.0001 for most pairs (EUR/USD 1.0850 → 1.0851 is +1 pip) and 0.01 for JPY pairs. Many brokers quote a 5th decimal, a **pipette** (1/10 of a pip). Stocks, indices and gold move in **points** (e.g. +1.00).",
        },
        { t: "h", text: "Lots: how big your trade is" },
        {
          t: "table",
          head: ["Lot", "Units of base currency", "Value of 1 pip on EUR/USD"],
          rows: [
            ["Standard (1.00)", "100,000", "≈ $10"],
            ["Mini (0.10)", "10,000", "≈ $1"],
            ["Micro (0.01)", "1,000", "≈ $0.10"],
          ],
        },
        { t: "h", text: "Leverage and margin" },
        {
          t: "p",
          text: "**Leverage** lets you control a big position with a small deposit. At 1:100, $1,000 of your money controls $100,000. The deposit the broker locks is called **margin**. Leverage multiplies profits AND losses by the same amount.",
        },
        {
          t: "table",
          head: ["", "No leverage", "1:100 leverage"],
          rows: [
            ["Your money", "$1,000", "$1,000"],
            ["Position size", "$1,000", "$100,000 (1 lot)"],
            ["Price moves 1% for you", "+$10 (+1%)", "+$1,000 (+100%)"],
            ["Price moves 1% against you", "−$10 (−1%)", "−$1,000 (account wiped)"],
          ],
        },
        {
          t: "list",
          items: [
            "**Free margin**: money not locked in open trades.",
            "**Margin level** = equity ÷ used margin × 100%.",
            "**Margin call**: the broker warns you when margin level falls to a threshold (often 100%).",
            "**Stop out**: the broker force-closes your trades (often at 50%) so you can't lose more than your balance.",
          ],
        },
        {
          t: "callout",
          tone: "key",
          text: "Leverage doesn't change how much you should risk. Pros decide the loss they accept first (like 1% of the account), then size the position to match. See Pro Techniques → Position sizing.",
        },
      ],
      quiz: [
        { q: "EUR/USD moves from 1.1000 to 1.1025. How many pips?", options: ["2.5", "25", "250", "0.25"], answer: 1, why: "0.0025 ÷ 0.0001 = 25 pips." },
        { q: "With 1:50 leverage, $2,000 margin controls…", options: ["$2,000", "$40,000", "$100,000", "$50"], answer: 2, why: "$2,000 × 50 = $100,000." },
        { q: "What does a stop out do?", options: ["Opens new trades", "Force-closes trades when margin runs out", "Raises your leverage", "Pays swap"], answer: 1, why: "It protects the broker (and you) from a negative balance." },
      ],
    },
    {
      id: "order-types",
      title: "Order types",
      summary: "Market, limit and stop orders, plus stop loss and take profit.",
      minutes: 6,
      blocks: [
        {
          t: "table",
          head: ["Order", "What it does", "When to use"],
          rows: [
            ["Market", "Fills now at the best available price", "You want in immediately"],
            ["Buy limit", "Buy BELOW the current price", "Buy a pullback into support"],
            ["Sell limit", "Sell ABOVE the current price", "Sell a rally into resistance"],
            ["Buy stop", "Buy ABOVE the current price", "Buy a breakout"],
            ["Sell stop", "Sell BELOW the current price", "Sell a breakdown"],
            ["Stop loss (SL)", "Closes a losing trade at your chosen price", "Every trade"],
            ["Take profit (TP)", "Closes a winning trade at your target", "Lock in the plan"],
            ["Trailing stop", "An SL that follows price as it moves your way", "Riding trends"],
          ],
        },
        {
          t: "diagram",
          caption: "Where each pending order sits relative to the current price.",
          spec: {
            line: path([[0, 100], [12, 103], [20, 101.5], [28, 102]], 0.3, 4),
            notes: [
              { k: "hline", p: 105, text: "SELL LIMIT (sell a rally)", color: "down", dash: true },
              { k: "hline", p: 103.8, text: "BUY STOP (buy the breakout)", color: "up", dash: true },
              { k: "hline", p: 102, text: "current price", color: "electric" },
              { k: "hline", p: 100.4, text: "BUY LIMIT (buy the dip)", color: "up", dash: true },
              { k: "hline", p: 99, text: "SELL STOP (sell the breakdown)", color: "down", dash: true },
            ],
          },
        },
        {
          t: "callout",
          tone: "warn",
          text: "**Slippage**: in fast markets a stop or market order can fill worse than the price you set, because nobody was available exactly at your price. Limit orders never slip, but they may not fill at all.",
        },
      ],
      quiz: [
        { q: "You want to buy only if price drops to support below. Use a…", options: ["Buy stop", "Buy limit", "Sell stop", "Market order"], answer: 1, why: "Buy limit = buy lower than the current price." },
        { q: "You want to buy only if price breaks above resistance. Use a…", options: ["Buy stop", "Buy limit", "Sell limit", "Take profit"], answer: 0, why: "Buy stop = buy higher than the current price, triggered by the breakout." },
        { q: "Which order type can suffer slippage?", options: ["Limit", "Stop / market", "Neither", "Only take profit"], answer: 1, why: "Stop and market orders fill at the next available price." },
      ],
    },
  ],
};

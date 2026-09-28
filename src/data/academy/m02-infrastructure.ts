import type { Module } from "./types";

export const M02_INFRASTRUCTURE: Module = {
  id: "backbone",
  n: 2,
  title: "How the Market Works",
  tagline: "Brokers, exchanges, banks and liquidity: the backbone behind every chart.",
  icon: "🏛️",
  lessons: [
    {
      id: "what-brokers-do",
      title: "What a broker actually does",
      summary: "Why you can't trade directly, and how brokers make their money.",
      minutes: 6,
      blocks: [
        {
          t: "p",
          text: "Exchanges and the big bank-to-bank currency market don't accept individual people. Members need licences, huge capital and direct technology links. A **broker** is a licensed firm that is (or connects to) a member and lets you trade through them.",
        },
        { t: "h", text: "What you get from a broker" },
        {
          t: "list",
          items: [
            "**An account** that holds your money (ideally in a segregated account, separate from the broker's own funds).",
            "**A trading platform** (MT4, MT5, cTrader, TradingView or their own app) that shows prices and sends your orders.",
            "**Execution**: your order is filled, either internally or by passing it on to the wider market.",
            "**Leverage / credit**: the ability to open positions bigger than your deposit.",
            "**Price data**: the live bid/ask stream you see on your chart.",
          ],
        },
        { t: "h", text: "How brokers make money" },
        {
          t: "table",
          head: ["Income", "How it works"],
          rows: [
            ["Spread", "They quote you a slightly wider bid/ask than they get and keep the difference."],
            ["Commission", "A fixed fee per lot (common on raw-spread / ECN accounts)."],
            ["Swap / rollover", "Overnight interest charged (or paid) for holding leveraged positions past the daily cut-off."],
            ["Client losses (B-book)", "Some brokers take the other side of client trades. When clients lose, the broker gains."],
            ["Other fees", "Inactivity, withdrawal or currency-conversion fees."],
          ],
        },
        {
          t: "callout",
          tone: "tip",
          text: "Your real trading cost = spread + commission + swap. Two brokers with the same spread can cost very different amounts once commission and swaps are included.",
        },
      ],
      quiz: [
        { q: "Why do retail traders need a broker?", options: ["It's tradition", "Exchanges and interbank markets only accept licensed members", "Charts need them", "To pay taxes"], answer: 1, why: "Only members connect directly. Brokers give individuals access." },
        { q: "What is a swap?", options: ["Changing brokers", "Overnight interest on a leveraged position", "A type of candle", "A chart pattern"], answer: 1, why: "Holding past the daily rollover costs (or pays) interest." },
        { q: "What does 'segregated funds' protect?", options: ["Your profits from tax", "Your deposit from the broker's own debts", "You from losses", "Your password"], answer: 1, why: "Client money is kept apart from company money." },
      ],
    },
    {
      id: "broker-models",
      title: "Broker models: market maker, STP, ECN",
      summary: "Who is on the other side of your trade?",
      minutes: 7,
      blocks: [
        {
          t: "p",
          text: "When you click BUY, somebody has to sell to you. **Who** that is depends on the broker's execution model.",
        },
        {
          t: "table",
          head: ["Model", "Who takes the other side", "Pricing", "Watch out for"],
          rows: [
            ["Market Maker (Dealing Desk, 'B-book')", "The broker itself", "Fixed or wide spreads, no commission", "Conflict of interest: your loss is their gain; requotes"],
            ["STP (Straight-Through Processing)", "Passed to the broker's liquidity providers (banks)", "Variable spreads with a markup", "Markup hidden inside the spread"],
            ["ECN (Electronic Communication Network)", "Other participants in a shared order pool", "Raw spreads + commission", "Commission per lot; variable spreads"],
            ["DMA (Direct Market Access)", "Your order goes straight to the exchange order book", "Exchange prices + fees", "Usually for stocks/futures; higher minimums"],
          ],
        },
        {
          t: "p",
          text: "Many real brokers are **hybrid**: they keep small or consistently losing clients on the B-book (internalise) and pass large or consistently profitable clients to the A-book (liquidity providers).",
        },
        {
          t: "callout",
          tone: "key",
          text: "A market maker isn't automatically a scam. It provides instant fills. But know who you're trading against, and prefer regulated brokers with transparent execution statistics.",
        },
      ],
      quiz: [
        { q: "On an ECN account you usually pay…", options: ["Nothing", "Raw spread + commission", "Only swap", "A fixed monthly fee"], answer: 1, why: "ECN shows raw interbank-style spreads and charges a commission." },
        { q: "Which model takes the opposite side of your trade itself?", options: ["DMA", "ECN", "Market maker", "STP"], answer: 2, why: "The dealing desk is your counterparty." },
        { q: "'A-book' means the broker…", options: ["Keeps the risk", "Passes the trade to outside liquidity", "Deletes the trade", "Charges no spread"], answer: 1, why: "A-booked trades are offset with liquidity providers." },
      ],
    },
    {
      id: "market-plumbing",
      title: "What brokers are connected to",
      summary: "Exchanges, banks, liquidity providers and prime brokers: the plumbing of global markets.",
      minutes: 8,
      blocks: [
        { t: "widget", name: "marketMap" },
        { t: "h", text: "1. Exchanges (centralised markets)" },
        {
          t: "p",
          text: "Stocks and futures trade on **exchanges** such as the NYSE, Nasdaq, London Stock Exchange, CME (futures) or the Nairobi Securities Exchange. An exchange runs one central **order book** and a **matching engine** that pairs buyers with sellers. Everyone sees the same prices.",
        },
        { t: "h", text: "2. The interbank market (forex, decentralised / OTC)" },
        {
          t: "p",
          text: "Forex has **no central exchange**. It's an over-the-counter (OTC) network of banks dealing directly and through electronic venues (EBS, Refinitiv/LSEG FX). Tier-1 banks such as JPMorgan, UBS, Citi, Deutsche Bank and HSBC quote prices to each other. That's why two brokers can show slightly different EUR/USD prices at the same moment.",
        },
        { t: "h", text: "3. Liquidity providers and aggregators" },
        {
          t: "p",
          text: "A **liquidity provider (LP)** is a bank or non-bank market maker (XTX, Citadel Securities, Jump) that streams buy/sell prices. Brokers connect to several LPs through an **aggregator**, which picks the best bid and ask from all of them, and that's the price stream you see.",
        },
        { t: "h", text: "4. Prime brokers" },
        {
          t: "p",
          text: "Smaller brokers can't open accounts with every tier-1 bank. A **prime broker** (or prime-of-prime) lends them its credit so they can access bank liquidity.",
        },
        { t: "h", text: "5. Clearing houses and custodians" },
        {
          t: "p",
          text: "After a trade, a **clearing house** (central counterparty, e.g. LCH, DTCC, CME Clearing) guarantees that both sides deliver. A **custodian** safely holds the actual shares or cash. This stops one failing firm from breaking the whole system.",
        },
        {
          t: "callout",
          tone: "tip",
          text: "Crypto is different again: a crypto exchange (Binance, Coinbase) is usually the broker, the exchange AND the custodian all in one. Convenient, but all your eggs are in one basket.",
        },
      ],
      quiz: [
        { q: "Why can EUR/USD differ slightly between brokers?", options: ["Brokers make errors", "Forex is OTC with no single central price", "Charts lag", "It can't"], answer: 1, why: "Each broker aggregates quotes from its own set of liquidity providers." },
        { q: "What does a matching engine do?", options: ["Draws charts", "Pairs buy and sell orders", "Sets interest rates", "Stores passwords"], answer: 1, why: "It's the heart of an exchange: it matches orders." },
        { q: "A clearing house's job is to…", options: ["Guarantee both sides settle", "Give trading advice", "Set spreads", "Pay swaps"], answer: 0, why: "Central counterparties remove the risk of the other side failing." },
      ],
    },
    {
      id: "order-journey",
      title: "The life of an order",
      summary: "What happens in the milliseconds after you press BUY.",
      minutes: 5,
      blocks: [
        {
          t: "flow",
          steps: [
            { title: "1. You click BUY", text: "Your platform packages the order: symbol, side, size, type, SL/TP." },
            { title: "2. Broker server", text: "Risk checks: enough free margin? Allowed size? Market open?" },
            { title: "3. Routing", text: "B-book: filled internally. A-book: sent to liquidity providers or an exchange." },
            { title: "4. Matching", text: "The best available sell offers are matched to your buy. Big orders may take several price levels." },
            { title: "5. Fill confirmation", text: "Execution price comes back (possibly with slippage). Your position appears." },
            { title: "6. Clearing & settlement", text: "Stocks settle T+1 (one business day later). CFD/FX positions are settled in cash daily via rollover." },
          ],
        },
        {
          t: "p",
          text: "All of this usually takes **milliseconds**. When markets are fast, the price can change between steps 1 and 5. That difference is **slippage**. With some dealing-desk brokers you might instead get a **requote** (\"price changed, accept new price?\").",
        },
        {
          t: "callout",
          tone: "key",
          text: "Pending orders (limit/stop) and your stop loss usually live on the broker's server, so they still work when your app is closed.",
        },
      ],
      quiz: [
        { q: "What is checked on the broker's server first?", options: ["Your chart pattern", "Risk: margin, size, market hours", "Your win rate", "News"], answer: 1, why: "The broker makes sure you can afford the trade." },
        { q: "Stocks usually settle…", options: ["Instantly", "T+1", "After a month", "Never"], answer: 1, why: "Major markets moved to T+1 settlement." },
        { q: "Does your stop loss need your app to stay open?", options: ["Yes", "No, it sits on the broker's server", "Only on weekends", "Only for crypto"], answer: 1, why: "Server-side orders execute even when you're offline." },
      ],
    },
    {
      id: "order-book",
      title: "The order book and who moves price",
      summary: "Liquidity, depth, and why big orders push price.",
      minutes: 6,
      blocks: [
        { t: "p", text: "An **order book** lists all waiting limit orders: bids (buyers) below the price, asks (sellers) above it. The quantity waiting at each price is called **depth** or **liquidity**." },
        {
          t: "table",
          head: ["Bids (buyers) size", "Price", "Asks (sellers) size"],
          rows: [
            ["", "100.04", "900"],
            ["", "100.03", "400"],
            ["", "100.02", "150  ← best ask"],
            ["200  ← best bid", "100.00", ""],
            ["650", "99.99", ""],
            ["1,200", "99.98", ""],
          ],
        },
        {
          t: "p",
          text: "A **market buy** for 500 units eats the 150 at 100.02, then 350 of the 400 at 100.03. Price has **moved up** just because liquidity was consumed. That is literally how buying pressure lifts price, and why thin markets jump around.",
        },
        { t: "h", text: "Who trades?" },
        {
          t: "table",
          head: ["Participant", "Why they trade"],
          rows: [
            ["Central banks", "Policy and currency stability (can move FX massively)"],
            ["Commercial & investment banks", "Client flow, market making, their own positions"],
            ["Hedge funds & asset managers", "Speculation and big portfolio shifts ('smart money')"],
            ["Corporations", "Hedging real business needs (e.g. paying suppliers abroad)"],
            ["High-frequency traders", "Tiny profits many times per second; provide liquidity"],
            ["Retail traders (us)", "Speculation. A small share of total volume"],
          ],
        },
        {
          t: "callout",
          tone: "tip",
          text: "Big players need lots of liquidity to fill big orders. Liquidity sits where many stop losses cluster: just above highs and below lows. That idea powers the Smart Money lessons later.",
        },
      ],
      quiz: [
        { q: "Bids in the order book are…", options: ["Sellers above price", "Buyers waiting below price", "Filled trades", "Stop losses only"], answer: 1, why: "Bids are buy limit orders waiting under the current price." },
        { q: "A large market buy in a thin book will usually…", options: ["Not move price", "Push price up through several levels", "Push price down", "Be rejected"], answer: 1, why: "It consumes the cheapest offers and moves on to higher ones." },
        { q: "Who has the power to move FX markets the most in one announcement?", options: ["Retail traders", "Central banks", "Brokers", "Chart patterns"], answer: 1, why: "Interest-rate decisions reprice entire currencies." },
      ],
    },
    {
      id: "platforms-data",
      title: "Platforms, CFDs and price data",
      summary: "MT4/MT5, TradingView, what a CFD is, and demo vs live.",
      minutes: 5,
      blocks: [
        {
          t: "table",
          head: ["Platform", "Known for"],
          rows: [
            ["MetaTrader 4 / 5", "The most common forex/CFD platforms; automated trading (Expert Advisors)"],
            ["cTrader", "Clean ECN-style platform with depth of market"],
            ["TradingView", "Best-in-class charts and community; connects to many brokers"],
            ["Broker apps", "Simple mobile trading; features vary a lot"],
          ],
        },
        { t: "h", text: "CFDs: trading the price, not the thing" },
        {
          t: "p",
          text: "Most retail brokers offer **CFDs** (Contracts for Difference). You never own the share, barrel or coin. You and the broker simply settle the **difference** between the opening and closing price. That's what makes shorting, leverage and fractional sizes easy. The trade-offs: overnight swap fees and counterparty risk on the broker.",
        },
        { t: "h", text: "Demo vs live" },
        {
          t: "list",
          items: [
            "**Demo**: virtual money, real prices. Perfect for learning the platform and testing a plan.",
            "**Live**: real money. Fills, slippage and, above all, your emotions feel different.",
            "Go live only after a written plan has been profitable on demo for a meaningful sample (50–100 trades).",
          ],
        },
      ],
      quiz: [
        { q: "With a CFD you own…", options: ["The actual share", "A contract paying the price difference", "Nothing at all, it's a game", "A bond"], answer: 1, why: "CFDs settle the difference in price between open and close." },
        { q: "Which platform is known for Expert Advisors (bots)?", options: ["TradingView", "MetaTrader", "Excel", "cTrader only"], answer: 1, why: "MT4/MT5 run automated strategies called EAs." },
        { q: "When should you move from demo to live?", options: ["After one good day", "After a written plan works over a meaningful sample", "Never", "Immediately"], answer: 1, why: "A few lucky trades prove nothing. A sample does." },
      ],
    },
    {
      id: "regulation",
      title: "Regulation and staying safe",
      summary: "How to tell a real broker from a scam.",
      minutes: 5,
      blocks: [
        {
          t: "table",
          head: ["Regulator", "Country / region"],
          rows: [
            ["FCA", "United Kingdom"],
            ["ASIC", "Australia"],
            ["CySEC", "Cyprus / EU passporting"],
            ["CFTC & NFA / SEC", "United States"],
            ["CMA", "Kenya (Capital Markets Authority)"],
            ["FSCA", "South Africa"],
          ],
        },
        { t: "h", text: "Green flags" },
        {
          t: "list",
          items: [
            "Licence number you can verify on the regulator's own website.",
            "Segregated client funds and negative-balance protection.",
            "Clear fees, published spreads and execution policy.",
          ],
        },
        { t: "h", text: "Red flags" },
        {
          t: "list",
          items: [
            "\"Guaranteed\" returns or \"account managers\" who trade for you.",
            "Pressure to deposit more, or bonuses you can't withdraw.",
            "Contact via WhatsApp/Telegram 'signal groups' asking for money.",
            "Withdrawals delayed or blocked with new 'fees'.",
          ],
        },
        { t: "callout", tone: "warn", text: "No legitimate trader or broker can guarantee profits. If someone promises that, it's a scam." },
      ],
      quiz: [
        { q: "How do you verify a broker's licence?", options: ["Ask the broker", "Check the regulator's own website", "Read reviews only", "Look at their logo"], answer: 1, why: "Scammers fake licence badges. The regulator's register is the truth." },
        { q: "A 'guaranteed 30% per month' offer is…", options: ["A great deal", "A red flag", "Normal", "Regulated"], answer: 1, why: "Returns are never guaranteed in trading." },
        { q: "Negative balance protection means…", options: ["You can't lose more than your deposit", "You can't lose at all", "Free trades", "Higher leverage"], answer: 0, why: "Your account can't go below zero." },
      ],
    },
  ],
};

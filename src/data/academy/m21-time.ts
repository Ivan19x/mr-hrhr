import type { Module } from "./types";
import type { OHLC } from "./build";
import MACRO from "../real/macro.json";
import { real, realSpec } from "./real";
import { hiTag, level, loTag, vline, zone } from "./adv";

const kz = real("killzones");
const kzTop = Math.max(...kz.candles.map((c) => c[1]));
// Bands stop a little below the top so their labels clear the source badge.
const kzHi = kzTop - (kzTop - Math.min(...kz.candles.map((c) => c[2]))) * 0.12;
const kzLo = Math.min(...kz.candles.map((c) => c[2]));
const band = (a: string, b: string, text: string, color: "electric" | "gold" | "purple" | "muted") => zone(kz.i(a), kz.i(b), kzLo, kzHi, color, text);

const sb = real("silver-bullet");
const sbBull = (sb.lv["dir"] ?? 1) > 0;

const mo = real("midnight-open");
const day = mo.candles.slice(mo.i("open"));
const dailyCandle: OHLC = [day[0]![0], Math.max(...day.map((c) => c[1])), Math.min(...day.map((c) => c[2])), day[day.length - 1]![3]];

const orb = real("orb");
const orbUp = (orb.lv["dir"] ?? 1) > 0;
const wp = real("weekly-profile");
const cb = real("cbdr");

const season = MACRO.season;
const monthName = (m: number) => new Date(2000, m - 1, 1).toLocaleString("en-GB", { month: "short" });

export const M21_TIME: Module = {
  id: "time-sessions",
  n: 21,
  title: "Time and Sessions (ICT)",
  tagline: "Killzones, silver bullet and macros, the opens, opening ranges, power of three, weekly profiles, CBDR, quarterly theory and seasonality.",
  icon: "⏰",
  lessons: [
    {
      id: "killzones",
      title: "Killzones",
      summary: "The session windows where most of the day's range is made.",
      minutes: 7,
      terms: ["Killzones", "London Open / New York AM / New York PM / London Close Killzone"],
      blocks: [
        {
          t: "p",
          text: "ICT's **killzones** are the hours when big volume arrives and the day's high or low is most likely to form. All times are **New York time** (they shift with daylight saving, the clock time stays the same):",
        },
        {
          t: "table",
          head: ["Killzone", "New York time", "What typically happens"],
          rows: [
            ["Asian", "20:00 – 00:00", "Quiet range; its high/low become liquidity"],
            ["London open", "02:00 – 05:00", "First real move; often the Judas swing"],
            ["New York AM", "07:00 – 10:00", "US data (08:30), stock open (09:30): the biggest moves"],
            ["London close", "10:00 – 12:00", "Retracement of the day's move as London exits"],
            ["New York PM", "13:30 – 16:00", "Afternoon continuation or reversal"],
          ],
        },
        {
          t: "diagram",
          caption: `A real day on ${kz.source.split(" · ")[1]} (15-minute candles) with the killzones shaded. Most of the range was made inside London and New York AM.`,
          spec: realSpec("killzones", () => [band("asia", "mid", "Asia", "muted"), band("l0", "l1", "London", "electric"), band("n0", "n1", "NY AM", "gold"), band("n1", "c1", "LDN close", "muted"), zone(kz.i("p0"), kz.candles.length - 1, kzLo, kzHi, "purple", "NY PM"), vline(kz.i("mid"), "00:00", "muted")]),
        },
        { t: "callout", tone: "tip", text: "Killzones tell you WHEN to look, not WHAT to do. Combine them with bias, liquidity and a PD array." },
      ],
      quiz: [
        { q: "The London open killzone is (New York time)…", options: ["02:00–05:00", "09:30–10:00", "20:00–00:00", "13:30–16:00"], answer: 0, why: "Early London session." },
        { q: "Which killzone includes the 08:30 US data and the 09:30 stock open?", options: ["Asian", "London", "New York AM", "London close"], answer: 2, why: "07:00–10:00 NY." },
        { q: "What does the Asian session usually provide?", options: ["The biggest move", "A range whose high/low become liquidity", "News", "Nothing"], answer: 1, why: "Quiet ranges store stops." },
      ],
    },
    {
      id: "silver-bullet-macros",
      title: "The silver bullet and macros",
      summary: "One-hour windows for fair value gap entries, and ICT's 20-minute algorithm windows.",
      minutes: 7,
      terms: ["Silver Bullet / Silver Bullet Model", "Macros (algorithmic time windows)"],
      blocks: [
        {
          t: "p",
          text: "The **silver bullet** is a time-based model: in three specific hours (New York time), look for the first fair value gap that forms **toward the nearest liquidity**, enter on the retrace into it, target that liquidity.",
        },
        {
          t: "table",
          head: ["Silver bullet window", "New York time"],
          rows: [["London", "03:00 – 04:00"], ["New York AM", "10:00 – 11:00"], ["New York PM", "14:00 – 15:00"]],
        },
        {
          t: "diagram",
          caption: `A real New York AM silver bullet: a ${sbBull ? "bullish" : "bearish"} FVG formed inside 10:00–11:00, price retraced into it, and the move continued.`,
          spec: realSpec("silver-bullet", (r) => [
            zone(r.i("sb0"), r.i("sb1"), Math.min(...r.candles.map((c) => c[2])), Math.max(...r.candles.map((c) => c[1])), "muted", "10:00–11:00"),
            zone(r.i("f"), r.i("rt") + 3, r.lv["bot"]!, r.lv["top"]!, "gold", "FVG"),
            sbBull ? loTag(r, "rt", "entry", "up") : hiTag(r, "rt", "entry", "down"),
          ]),
        },
        {
          t: "p",
          text: "**Macros** are short windows (about 20 minutes) in which ICT says the price-delivery algorithm seeks liquidity or rebalances a gap. They are narrower filters inside the killzones:",
        },
        {
          t: "table",
          head: ["Macro", "New York time"],
          rows: [
            ["London 1", "02:33 – 03:00"],
            ["London 2", "04:03 – 04:30"],
            ["New York AM 1", "08:50 – 09:10"],
            ["New York AM 2", "09:50 – 10:10"],
            ["New York AM 3", "10:50 – 11:10"],
            ["New York lunch", "11:50 – 12:10"],
            ["New York PM", "13:10 – 13:40"],
            ["Last hour", "15:15 – 15:45"],
          ],
        },
        { t: "callout", tone: "warn", text: "Macros are ICT-specific ideas, not market rules. Treat them as timing filters to test in your own journal, never as signals by themselves." },
      ],
      quiz: [
        { q: "The New York AM silver bullet window is…", options: ["08:00–09:00", "10:00–11:00", "13:00–14:00", "00:00–01:00"], answer: 1, why: "10–11 AM New York." },
        { q: "In the silver bullet, you enter…", options: ["On any candle", "On the retrace into the first FVG toward liquidity", "At the open", "At the close"], answer: 1, why: "FVG entry inside the window." },
        { q: "A macro is about…", options: ["20 minutes", "4 hours", "A week", "A month"], answer: 0, why: "Short algorithmic windows." },
      ],
    },
    {
      id: "opens-opening-range",
      title: "Midnight open, true day open and opening ranges",
      summary: "The reference prices that split every day, week and month into premium and discount.",
      minutes: 6,
      terms: ["Midnight Open / True Day Open / Daily / Weekly / Monthly Open", "Midnight Opening Range / Opening Range Gap (ORG)"],
      blocks: [
        {
          t: "p",
          text: "Opening prices are the simplest bias tool. For forex and index futures ICT uses the **midnight New York open** as the **true day open**: on a bullish day you want to buy **below** it (discount); on a bearish day you want to sell **above** it. The same logic works with the **weekly open** (Sunday 18:00 NY) and **monthly open**.",
        },
        {
          t: "diagram",
          caption: "A real bullish day: the best buys were below the midnight open; the day then closed far above it.",
          spec: realSpec("midnight-open", (r) => [level(r.lv["open"]!, "midnight open (true day open)", "gold", false, r.i("open"), r.candles.length - 1), vline(r.i("open"), "00:00", "muted"), zone(r.i("open"), r.candles.length - 1, Math.min(...r.candles.map((c) => c[2])), r.lv["open"]!, "up", "discount: buy zone"), loTag(r, "low", "low of day", "up")]),
        },
        {
          t: "table",
          head: ["Reference", "What it is"],
          rows: [
            ["Midnight opening range", "The range of the first 30 minutes after 00:00 NY"],
            ["Opening range gap (ORG)", "The gap between the previous 16:15 close and the 09:30 open in index futures"],
            ["Weekly open", "The first price of the week: above it = weekly premium"],
            ["Monthly open", "The first price of the month"],
          ],
        },
      ],
      quiz: [
        { q: "ICT's true day open is…", options: ["09:30 NY", "Midnight New York", "17:00 NY", "The London close"], answer: 1, why: "00:00 NY." },
        { q: "On a bullish day, the best buys are usually…", options: ["Above the open", "Below the open", "At the close", "At the high"], answer: 1, why: "Buy in discount relative to the open." },
        { q: "The opening range gap is between…", options: ["Friday and Sunday", "The previous 16:15 close and the 09:30 open", "Two FVGs", "Asia and London"], answer: 1, why: "Index futures' overnight gap." },
      ],
    },
    {
      id: "orb-ny-open",
      title: "Opening range breakout, the 9:30 open, 8:30 news and lunch",
      summary: "How the New York session is structured, candle by candle.",
      minutes: 7,
      terms: ["Opening Range Breakout (ORB)", "9:30 Open / 8:30 News Candle", "Lunch Hour / Lunch Consolidation / Last Hour Macro"],
      blocks: [
        {
          t: "p",
          text: "US economic data (jobs, inflation, jobless claims) is released at **08:30 New York**, producing a sharp **news candle**. Stocks open at **09:30**, and the first 15–30 minutes define the **opening range**. The **opening range breakout (ORB)** trades a close beyond that range in the direction of the break.",
        },
        {
          t: "diagram",
          caption: `A real ${orb.source.split(" · ")[1]} session (15-minute candles): the first 30 minutes set the opening range; the ${orbUp ? "upside" : "downside"} break ran for most of the day.`,
          spec: realSpec("orb", (r) => [zone(0, r.i("or1"), r.lv["lo"]!, r.lv["hi"]!, "gold", "opening range"), level(r.lv["hi"]!, "OR high", "muted", true), level(r.lv["lo"]!, "OR low", "muted", true), orbUp ? hiTag(r, "br", "breakout", "up") : loTag(r, "br", "breakdown", "down"), vline(r.i("lunch"), "12:00", "muted"), vline(r.i("pm"), "15:00", "muted")]),
        },
        {
          t: "diagram",
          caption: "Another real session: lunch (12:00–13:30) was a tight consolidation, then the last hour moved strongly.",
          spec: realSpec("lunch", (r) => [zone(r.i("l0"), r.i("l1"), Math.min(...r.candles.slice(r.i("l0"), r.i("l1")).map((c) => c[2])), Math.max(...r.candles.slice(r.i("l0"), r.i("l1")).map((c) => c[1])), "muted", "lunch"), vline(r.i("p"), "last hour", "gold")]),
        },
        {
          t: "table",
          head: ["Time (NY)", "Event", "Behaviour"],
          rows: [["08:30", "US data", "Volatile candle; often a liquidity grab"], ["09:30", "Stock open", "Opening range forms"], ["10:00", "Some data (e.g. consumer confidence)", "Second push"], ["12:00–13:30", "Lunch", "Low volume, chop: avoid new trades"], ["15:00–16:00", "Last hour", "Rebalancing, closing flows"]],
        },
      ],
      quiz: [
        { q: "Major US data is released at…", options: ["07:00 NY", "08:30 NY", "12:00 NY", "16:00 NY"], answer: 1, why: "NFP, CPI, claims at 08:30." },
        { q: "ORB trades…", options: ["A fade of the open", "A close beyond the first 15–30 minute range", "The lunch hour", "Only gaps"], answer: 1, why: "Opening range breakout." },
        { q: "The New York lunch hour is usually…", options: ["The best time to trade", "Low-volume consolidation", "The news release", "The open"], answer: 1, why: "Chop: avoid." },
      ],
    },
    {
      id: "power-of-three",
      title: "Power of three (AMD)",
      summary: "Accumulation, manipulation, distribution: the story inside every daily candle.",
      minutes: 6,
      terms: ["Power of Three (PO3) / AMD"],
      blocks: [
        {
          t: "p",
          text: "ICT's **power of three** says every candle is built in three phases: **Accumulation** (a quiet range near the open), **Manipulation** (a move the wrong way that takes liquidity; the Judas swing) and **Distribution** (the real move to the close). A bullish daily candle opens, drops below the open (its lower wick), then rallies to close near the high.",
        },
        {
          t: "gallery",
          items: [
            { title: "Inside the day (15m)", spec: realSpec("midnight-open", (r) => [level(r.lv["open"]!, "open", "gold", false), loTag(r, "low", "M", "down"), hiTag(r, "high", "D", "up")]), text: "Accumulation near the open, manipulation below it, distribution up.", tone: "electric" },
            { title: "The same day as one candle", spec: { candles: [dailyCandle], height: 220, source: "Built from the 15m candles" }, text: "The lower wick is the manipulation; the body is the distribution.", tone: "gold" },
          ],
        },
        { t: "callout", tone: "key", text: "Once you expect a bullish daily candle, you want to buy during the manipulation phase, below the open: you're buying the lower wick of the day." },
      ],
      quiz: [
        { q: "AMD stands for…", options: ["Average moving distance", "Accumulation, manipulation, distribution", "Asia, Monday, Daily", "Ask minus depth"], answer: 1, why: "The three phases." },
        { q: "In a bullish daily candle, manipulation forms…", options: ["The upper wick", "The lower wick", "The body", "The gap"], answer: 1, why: "The drop below the open." },
        { q: "The PO3 buy is ideally placed…", options: ["Above the open", "Below the open, during manipulation", "At the close", "Anywhere"], answer: 1, why: "You buy the wick of the day." },
      ],
    },
    {
      id: "daily-bias-weekly-profile",
      title: "Daily bias and weekly profiles",
      summary: "The typical shapes of a trading week, and how to form a bias for the day.",
      minutes: 7,
      terms: ["Daily Bias / Weekly Profile", "Tuesday/Wednesday Weekly High/Low / Seek and Destroy Profile"],
      blocks: [
        {
          t: "p",
          text: "Your **daily bias** is the direction you expect today's candle to close. Build it top-down: the weekly and daily draw on liquidity, where price sits in the daily dealing range (premium/discount), and whether yesterday respected or rejected a PD array.",
        },
        {
          t: "p",
          text: "Weeks have shapes too. In a **classic bullish week**, Monday is quiet, the **low of the week forms on Tuesday or Wednesday** (often a sweep below Monday's low), and Wednesday to Friday expand upward. **Seek and destroy** weeks are choppy: both sides are raided, often around big news, and there's no clean trend.",
        },
        {
          t: "diagram",
          caption: `A real week on ${wp.source.split(" · ")[1]} (1-hour candles): the low of the week formed on ${wp.i("low") >= (wp.pts["wed"] ?? 999) ? "Wednesday" : "Tuesday"}, then price expanded to close near the high.`,
          spec: realSpec("weekly-profile", (r) => [
            level(r.lv["open"]!, "weekly open", "gold", true),
            ...(["mon", "tue", "wed", "thu", "fri"] as const).filter((d) => r.pts[d] !== undefined).map((d) => vline(r.i(d), d.toUpperCase(), "muted")),
            loTag(r, "low", "low of week", "up"),
          ]),
        },
        {
          t: "table",
          head: ["Weekly profile", "Shape", "What to do"],
          rows: [
            ["Classic Tuesday/Wednesday low (bullish)", "Early dip, then expansion", "Buy the Tue/Wed sweep below the weekly open"],
            ["Classic Tuesday/Wednesday high (bearish)", "Early pop, then decline", "Sell the Tue/Wed sweep above the weekly open"],
            ["Consolidation then reversal", "Quiet start, late-week turn", "Wait for Thursday"],
            ["Seek and destroy", "Both sides raided, no trend", "Reduce size or sit out"],
          ],
        },
      ],
      quiz: [
        { q: "In a classic bullish week, the low of the week often forms…", options: ["Friday", "Tuesday or Wednesday", "Sunday", "Never"], answer: 1, why: "Early-week manipulation, then expansion." },
        { q: "A seek-and-destroy week is…", options: ["A clean trend", "Choppy, with both sides raided", "A holiday", "A gap"], answer: 1, why: "Best traded lightly or not at all." },
        { q: "Daily bias is…", options: ["The indicator colour", "The direction you expect the day to close", "The spread", "The news"], answer: 1, why: "Your expectation for the daily candle." },
      ],
    },
    {
      id: "cbdr-flout",
      title: "Central bank dealers range (CBDR) and flout",
      summary: "A late-session range that projects the next day's high or low.",
      minutes: 6,
      terms: ["Central Bank Dealers Range (CBDR) / Flout"],
      blocks: [
        {
          t: "p",
          text: "The **CBDR** is the range from **14:00 to 20:00 New York** on forex. When it is small (ICT suggests under about 40 pips), its standard deviations project the next day's extremes: in a bullish day the low often forms 1–2 SD below the CBDR and the high 2–4 SD above it. If the CBDR is too wide, use the **flout**: 15:00 to 00:00, combining the CBDR with the Asian range.",
        },
        {
          t: "diagram",
          caption: `A real CBDR on ${cb.source.split(" · ")[1]}: the 14:00–20:00 range, then the next day's move measured in range-widths.`,
          spec: realSpec("cbdr", (r) => [zone(0, r.i("cb1"), r.lv["lo"]!, r.lv["hi"]!, "gold", "CBDR 14:00–20:00"), vline(r.i("cb1"), "20:00", "muted"), ...[1, 2, 3, 4].map((k) => level(r.lv["lo"]! - k * (r.lv["hi"]! - r.lv["lo"]!), `−${k} SD`, "down", true, r.i("cb1"), r.candles.length - 1)).filter((n) => n.k === "hline" && n.p > Math.min(...r.candles.map((c) => c[2])) - (r.lv["hi"]! - r.lv["lo"]!))]),
        },
        { t: "callout", tone: "tip", text: "CBDR projections are target and timing aids. They work best on quiet days before a clean expansion, and poorly around major news." },
      ],
      quiz: [
        { q: "The CBDR runs from…", options: ["14:00 to 20:00 NY", "00:00 to 05:00 NY", "09:30 to 16:00 NY", "All day"], answer: 0, why: "Late New York into the evening." },
        { q: "When the CBDR is too wide, ICT uses…", options: ["The weekly open", "The flout (15:00–00:00)", "The 200 MA", "Nothing"], answer: 1, why: "It adds the Asian range." },
        { q: "CBDR projections are measured in…", options: ["Pips only", "Multiples of the CBDR's height", "RSI points", "Minutes"], answer: 1, why: "Standard deviations of the range." },
      ],
    },
    {
      id: "quarterly-theory",
      title: "Quarterly theory and time-price cycles",
      summary: "Every period splits into four quarters: accumulation, manipulation, distribution, and continuation or reversal.",
      minutes: 6,
      terms: ["Quarterly Theory / Time and Price Theory"],
      blocks: [
        {
          t: "p",
          text: "**Quarterly theory** (popularised by Daye, building on ICT's AMD) divides every period into **four quarters**. The day starts at 18:00 New York: **Q1 18:00–00:00** (Asia), **Q2 00:00–06:00** (London), **Q3 06:00–12:00** (New York AM), **Q4 12:00–18:00** (New York PM). The start of Q2, midnight, is the **true open**.",
        },
        {
          t: "diagram",
          caption: "The same real killzone day split into quarters: Q1 accumulates, Q2 manipulates (London), Q3 distributes (New York AM).",
          spec: realSpec("killzones", (r) => [vline(0, "Q1", "muted"), vline(r.i("mid"), "Q2 · true open", "gold"), vline(Math.min(r.candles.length - 1, r.i("mid") + 24), "Q3", "muted"), vline(r.i("c1"), "Q4", "muted")]),
        },
        {
          t: "table",
          head: ["Cycle", "Quarters"],
          rows: [["Year", "Q1 Jan–Mar, Q2 Apr–Jun, Q3 Jul–Sep, Q4 Oct–Dec"], ["Month", "Four weeks"], ["Week", "Mon, Tue, Wed, Thu (Fri = the X quarter)"], ["Day", "Four 6-hour sessions from 18:00 NY"], ["Session", "Four 90-minute cycles"]],
        },
        { t: "callout", tone: "warn", text: "Quarterly theory is a framework, not a law. It's useful for expecting WHEN the manipulation and the real move tend to happen." },
      ],
      quiz: [
        { q: "In quarterly theory, the daily Q2 (London) runs…", options: ["00:00–06:00 NY", "06:00–12:00 NY", "18:00–00:00 NY", "12:00–18:00 NY"], answer: 0, why: "The true open is the start of Q2." },
        { q: "The phases are…", options: ["Accumulation, manipulation, distribution, continuation/reversal", "Open, high, low, close", "Buy, sell, hold, wait", "None"], answer: 0, why: "AMD plus the X quarter." },
        { q: "A session splits into cycles of…", options: ["90 minutes", "5 minutes", "1 day", "1 week"], answer: 0, why: "Four 90-minute quarters make 6 hours." },
      ],
    },
    {
      id: "seasonality",
      title: "Seasonality",
      summary: "Calendar tendencies measured on ten years of real S&P 500 data.",
      minutes: 5,
      terms: ["Seasonality"],
      blocks: [
        {
          t: "p",
          text: `**Seasonality** is the tendency of markets to behave differently in certain months, weeks or days. Below: the average S&P 500 return for each calendar month from ${MACRO.seasonFrom.slice(0, 4)} to ${MACRO.seasonTo.slice(0, 4)}, computed from real daily data, with how many of those years that month was positive.`,
        },
        {
          t: "bars",
          labels: season.map((s) => monthName(s.m)),
          values: season.map((s) => s.avg),
          unit: "%",
          caption: `Average monthly return of the S&P 500, ${MACRO.seasonFrom.slice(0, 4)}–${MACRO.seasonTo.slice(0, 4)} (real data). Green = positive average, red = negative.`,
        },
        {
          t: "table",
          head: ["Month", "Average return", "Positive years"],
          rows: season.map((s) => [monthName(s.m), `${s.avg >= 0 ? "+" : ""}${s.avg.toFixed(2)}%`, `${s.up} of ${s.n}`]),
        },
        { t: "callout", tone: "warn", text: "Seasonality is a mild tailwind at best. A 'good' month still loses in many years (look at the right column). Never trade it without a setup." },
      ],
      quiz: [
        { q: "Seasonality describes…", options: ["Guaranteed monthly moves", "Recurring calendar tendencies", "Weather effects only", "Broker fees"], answer: 1, why: "Tendencies, not guarantees." },
        { q: "How should you use it?", options: ["As a trade signal on its own", "As a mild bias alongside real setups", "Never", "Only on crypto"], answer: 1, why: "It's a background factor." },
        { q: "The data in this lesson comes from…", options: ["Made-up numbers", "Real S&P 500 daily history", "A survey", "A broker"], answer: 1, why: "Computed from ten years of real candles." },
      ],
    },
  ],
};

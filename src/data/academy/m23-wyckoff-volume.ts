import type { Module, Note } from "./types";
import { real, realSpec } from "./real";
import { hiTag, level, loTag, vline, volumeProfile, zone } from "./adv";

const wa = real("wyckoff-acc");
const wd = real("wyckoff-dist");
const phases = (r: ReturnType<typeof real>): Note[] => [
  vline(Math.max(0, r.i("sc") - 6), "A", "muted"),
  vline(r.i("st"), "B", "muted"),
  vline(r.i("sp") - 1, "C", "muted"),
  vline(r.i("sos"), "D", "muted"),
  vline(r.i("lps") + 2, "E", "muted"),
];

const vp = real("vp-range");
const prof = volumeProfile(vp.candles, vp.volume ?? []);

const dd = real("delta-divergence");
const delta = dd.candles.map((_, i) => 2 * (dd.takerBuy?.[i] ?? 0) - (dd.volume?.[i] ?? 0));
let cum = 0;
const cumDelta = delta.map((d) => (cum += d));
const ab = real("absorption");
const abK = ab.i("k");
const abSell = Math.round((1 - (ab.takerBuy?.[abK] ?? 0) / (ab.volume?.[abK] ?? 1)) * 100);

export const M23_WYCKOFF_VOLUME: Module = {
  id: "wyckoff-volume",
  n: 23,
  title: "Wyckoff, Volume Profile and Order Flow",
  tagline: "Wyckoff accumulation and distribution event by event, volume by price, delta and absorption.",
  icon: "📦",
  lessons: [
    {
      id: "wyckoff-accumulation",
      title: "Wyckoff accumulation",
      summary: "The classic map of a bottom: selling climax, automatic rally, spring, sign of strength.",
      minutes: 9,
      terms: ["Wyckoff Accumulation / Distribution Schematic", "Composite Man", "Phases A–E", "Preliminary Support (PS) / Selling Climax (SC)", "Automatic Rally (AR) / Secondary Test (ST)", "Spring / Upthrust / UTAD", "Sign of Strength (SOS) / Sign of Weakness (SOW)", "Last Point of Support (LPS) / Last Point of Supply (LPSY)"],
      blocks: [
        {
          t: "p",
          text: "Richard Wyckoff (early 1900s) taught traders to imagine a single **Composite Man** behind the market: a large operator who accumulates at low prices, marks price up, distributes at high prices and marks it down. His **accumulation schematic** describes how a bottom is built, event by event.",
        },
        {
          t: "diagram",
          caption: `A real accumulation on ${wa.source.split(" · ")[1]}, with volume. Selling climax, automatic rally, secondary test, spring, sign of strength and last point of support.`,
          spec: realSpec(
            "wyckoff-acc",
            (r) => [
              zone(r.i("sc"), r.i("sos"), r.lv["bot"]!, r.lv["top"]!, "muted"),
              loTag(r, "sc", "SC", "down"),
              hiTag(r, "ar", "AR", "up"),
              loTag(r, "st", "ST", "muted"),
              loTag(r, "sp", "Spring", "gold"),
              hiTag(r, "sos", "SOS", "up"),
              loTag(r, "lps", "LPS", "up"),
              ...phases(r),
            ],
            wa.volume ? { volume: wa.volume } : {},
          ),
        },
        {
          t: "table",
          head: ["Event", "What happens"],
          rows: [
            ["PS: preliminary support", "First real buying after a long decline; volume picks up"],
            ["SC: selling climax", "Panic selling on huge volume; big players absorb it"],
            ["AR: automatic rally", "Relief bounce; its high sets the top of the range"],
            ["ST: secondary test", "Price revisits the SC area on lower volume"],
            ["Spring", "A break below the range that quickly closes back inside: the last shakeout"],
            ["SOS: sign of strength", "A strong rally breaking above the range on rising volume"],
            ["LPS: last point of support", "A higher-low pullback after the SOS: the classic entry"],
          ],
        },
        {
          t: "table",
          head: ["Phase", "Contains"],
          rows: [["A", "PS, SC, AR, ST: the decline stops"], ["B", "Building the cause: tests inside the range"], ["C", "The spring (test of supply)"], ["D", "SOS and LPS: demand in control"], ["E", "Markup: the trend out of the range"]],
        },
      ],
      quiz: [
        { q: "The selling climax is…", options: ["A quiet drift", "Panic selling on huge volume", "The top of the range", "A gap up"], answer: 1, why: "Capitulation absorbed by big buyers." },
        { q: "A spring is…", options: ["A break above the range", "A false break below the range that closes back inside", "A moving average", "The AR"], answer: 1, why: "The final shakeout." },
        { q: "The classic Wyckoff entry in accumulation is…", options: ["The SC", "The LPS after the SOS", "The AR high", "Phase A"], answer: 1, why: "A higher low with demand proven." },
      ],
    },
    {
      id: "wyckoff-distribution",
      title: "Wyckoff distribution",
      summary: "The mirror image at the top: buying climax, UTAD, sign of weakness, last point of supply.",
      minutes: 7,
      terms: ["Buying Climax (BC)"],
      blocks: [
        {
          t: "p",
          text: "**Distribution** is accumulation upside down. A **buying climax (BC)** of euphoric buying on high volume, an **automatic reaction (AR)** down that sets the range floor, **secondary tests** near the high, an **upthrust after distribution (UTAD)** that breaks above the range and fails, a **sign of weakness (SOW)** breaking below the range, and a **last point of supply (LPSY)**: a weak rally that makes a lower high.",
        },
        {
          t: "diagram",
          caption: `A real distribution on ${wd.source.split(" · ")[1]}: buying climax, automatic reaction, UTAD, sign of weakness and last point of supply.`,
          spec: realSpec(
            "wyckoff-dist",
            (r) => [zone(r.i("sc"), r.i("sos"), r.lv["bot"]!, r.lv["top"]!, "muted"), hiTag(r, "sc", "BC", "up"), loTag(r, "ar", "AR", "down"), hiTag(r, "st", "ST", "muted"), hiTag(r, "sp", "UTAD", "gold"), loTag(r, "sos", "SOW", "down"), hiTag(r, "lps", "LPSY", "down"), ...phases(r)],
            wd.volume ? { volume: wd.volume } : {},
          ),
        },
        { t: "callout", tone: "key", text: "Spring and UTAD are the Wyckoff names for liquidity sweeps. Wyckoff described stop runs about a century before 'smart money concepts'." },
      ],
      quiz: [
        { q: "The buying climax happens…", options: ["At the bottom", "At the top, on euphoric high volume", "Mid-range", "On low volume"], answer: 1, why: "The distribution's first event." },
        { q: "The UTAD is…", options: ["A break above the range that fails", "A break below the range", "The AR", "The first candle"], answer: 0, why: "The upthrust after distribution." },
        { q: "The LPSY is…", options: ["A higher low", "A weak rally making a lower high after the SOW", "The BC", "A spring"], answer: 1, why: "Last point of supply: the short entry." },
      ],
    },
    {
      id: "volume-profile",
      title: "Volume profile: POC, value area, HVN and LVN",
      summary: "Volume by price shows where the market agreed on value and where it rushed through.",
      minutes: 7,
      terms: ["Volume Profile / Point of Control (POC)", "Value Area High / Low (VAH / VAL)", "High / Low Volume Node (HVN / LVN)"],
      blocks: [
        {
          t: "p",
          text: "A normal volume bar shows volume per **time**. A **volume profile** shows volume per **price**, as horizontal bars. The **point of control (POC)** is the price with the most volume. The **value area** is the band holding about **70% of the volume**; its edges are the **value area high (VAH)** and **value area low (VAL)**.",
        },
        {
          t: "diagram",
          caption: "A real volume profile of this range (bars on the right): gold = POC, blue = value area, grey = outside value.",
          spec: realSpec("vp-range", () => [level(prof.poc, "POC", "gold", false), level(prof.vah, "VAH", "electric", true), level(prof.val, "VAL", "electric", true)], { profile: prof.bins }),
        },
        {
          t: "table",
          head: ["Term", "Meaning", "How price behaves"],
          rows: [
            ["POC", "Most-traded price", "Magnet; price often returns to it"],
            ["VAH / VAL", "Edges of 70% of the volume", "Reaction levels; acceptance outside = trend"],
            ["HVN (high-volume node)", "Price area with heavy trading", "Price slows down and ranges there"],
            ["LVN (low-volume node)", "Thin price area", "Price moves through quickly; good stop/target boundaries"],
          ],
        },
        { t: "callout", tone: "tip", text: "Price that leaves value and is accepted outside (several closes beyond VAH or VAL) tends to trend. Price that pokes outside and returns tends to rotate back to the POC." },
      ],
      quiz: [
        { q: "The POC is…", options: ["The highest price", "The price with the most traded volume", "The opening price", "The VWAP"], answer: 1, why: "Point of control." },
        { q: "The value area contains about…", options: ["10% of volume", "70% of volume", "100%", "50% of candles"], answer: 1, why: "Roughly one standard deviation." },
        { q: "Price moves quickly through…", options: ["HVNs", "LVNs (thin areas)", "The POC", "The VWAP"], answer: 1, why: "Little trading happened there." },
      ],
    },
    {
      id: "delta-order-flow",
      title: "Delta, footprint charts, absorption and icebergs",
      summary: "Who was aggressive, buyers or sellers, and when passive orders soaked them up.",
      minutes: 8,
      terms: ["Delta / Cumulative Delta", "Footprint Chart", "Absorption / Exhaustion", "Iceberg Orders"],
      blocks: [
        {
          t: "p",
          text: "Every trade has a buyer and a seller, but one of them **crossed the spread** (used a market order): the aggressor. **Delta = aggressive buy volume − aggressive sell volume** per candle. **Cumulative delta** adds it up over time. The data here is real: Binance reports how much of each candle's volume was taker (aggressive) buying.",
        },
        {
          t: "diagram",
          caption: "Real delta divergence: price made a higher high, but cumulative delta did not. Aggressive buying was fading, and price dropped.",
          spec: realSpec("delta-divergence", (r) => [hiTag(r, "A", "high 1", "muted"), hiTag(r, "B", "higher high", "down")], { pane: { label: "Cumulative delta (aggressive buys − sells)", series: [{ values: cumDelta, color: "electric" }], bars: { values: delta } } }),
        },
        {
          t: "p",
          text: `**Absorption** is when heavy aggression hits a level but price doesn't move: large passive limit orders are soaking it up. In the real candle below, about ${abSell}% of a very large volume was aggressive selling, yet the candle closed in its upper half and the low held. Buyers were absorbing. **Exhaustion** is the opposite: aggression simply dries up at the end of a move.`,
        },
        {
          t: "diagram",
          caption: "A real absorption candle: huge volume, mostly aggressive selling, but the low held and price rallied.",
          spec: realSpec("absorption", (r) => [loTag(r, "k", "absorption", "up")], ab.volume ? { volume: ab.volume } : {}),
        },
        {
          t: "table",
          head: ["Tool", "Shows", "Where to get it"],
          rows: [
            ["Footprint chart", "Bid × ask volume at every price inside each candle", "Order-flow platforms (futures, crypto)"],
            ["Delta / cumulative delta", "Aggressor imbalance per candle / over time", "Futures and crypto exchanges"],
            ["Iceberg order", "A big limit order showing only a small visible size, refilling as it trades", "Spotted when a level keeps trading far more than the book shows"],
          ],
        },
        { t: "callout", tone: "warn", text: "Real order-flow data exists for centralised markets (futures, exchange crypto, stocks). Spot forex is decentralised, so its 'volume' is only tick counts." },
      ],
      quiz: [
        { q: "Delta measures…", options: ["Price change", "Aggressive buy volume minus aggressive sell volume", "Spread", "Time"], answer: 1, why: "Aggressor imbalance." },
        { q: "Absorption looks like…", options: ["Big aggression but price doesn't move", "No volume", "A gap", "A doji only"], answer: 0, why: "Passive orders soak it up." },
        { q: "An iceberg order is…", options: ["A large order showing only a small visible part", "A frozen account", "A weekend gap", "A candle"], answer: 0, why: "It refills as it gets hit." },
      ],
    },
  ],
};

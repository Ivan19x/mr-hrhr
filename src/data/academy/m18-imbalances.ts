import type { Module, Note } from "./types";
import { real, realSpec } from "./real";
import { hiTag, level, loTag, vline, zone } from "./adv";

const ff = real("first-fvg");
const ffBull = (ff.lv["dir"] ?? 1) > 0;
const sf = real("stacked-fvg");
const stackNotes: Note[] = Object.keys(sf.pts)
  .filter((k) => /^g\d$/.test(k))
  .map((k, n) => {
    const g = sf.i(k);
    return zone(g, g + 4, sf.candles[g]![1], sf.candles[g + 2]![2], n % 2 ? "purple" : "electric", `FVG ${n + 1}`);
  });

export const M18_IMBALANCES: Module = {
  id: "imbalances",
  n: 18,
  title: "Imbalances and Gaps: Deep Dive",
  tagline: "Consequent encroachment, the first presented FVG, inversions, balanced price ranges, volume imbalances, voids and opening gaps.",
  icon: "🧩",
  lessons: [
    {
      id: "consequent-encroachment",
      title: "Consequent encroachment and higher-timeframe FVGs",
      summary: "The 50% line of a gap, and why daily and weekly gaps are the targets that matter.",
      minutes: 6,
      terms: ["Consequent Encroachment (CE)", "Weekly / Daily / 4H FVG"],
      blocks: [
        {
          t: "p",
          text: "**Consequent encroachment (CE)** is the **50% level of a fair value gap**. Price often returns only to the CE, not the whole gap. For a bullish FVG, a candle that closes below the CE is a sign the gap is weakening; holding above it shows the gap is being respected.",
        },
        {
          t: "diagram",
          caption: "A real bullish FVG. Price came back exactly to its 50% level (CE), held it and continued higher.",
          spec: realSpec("fvg-ce", (r) => [zone(r.i("f"), r.i("rt") + 2, r.lv["bot"]!, r.lv["top"]!, "electric", "FVG"), level(r.lv["ce"]!, "CE 50%", "gold", true, r.i("f"), r.i("rt") + 4), loTag(r, "rt", "held CE", "up")]),
        },
        {
          t: "p",
          text: "A gap on the **weekly, daily or 4-hour** chart is a zone many more participants see than a 5-minute gap. Mark higher-timeframe FVGs first: they are the targets (draws on liquidity) and the zones where lower-timeframe entries have the best odds.",
        },
        {
          t: "table",
          head: ["Timeframe", "Role"],
          rows: [["Weekly / Daily FVG", "Target and bias zone for days to weeks"], ["4H FVG", "Swing entry zone"], ["1H / 15m FVG", "Entry refinement inside the higher-timeframe zone"]],
        },
      ],
      quiz: [
        { q: "Consequent encroachment is…", options: ["The top of an FVG", "The 50% level of an FVG", "A candle", "The daily open"], answer: 1, why: "The gap's midpoint." },
        { q: "For a bullish FVG, closes below the CE suggest…", options: ["The gap is weakening", "Stronger support", "Nothing", "A gap up"], answer: 0, why: "Holding above the CE is the healthy sign." },
        { q: "Which FVG usually matters more?", options: ["A 1-minute FVG", "A daily FVG", "They're equal", "Neither"], answer: 1, why: "More participants act on higher timeframes." },
      ],
    },
    {
      id: "first-presented-fvg",
      title: "The first presented FVG",
      summary: "The first gap after the New York open often sets the tone for the session.",
      minutes: 5,
      terms: ["First Presented FVG"],
      blocks: [
        {
          t: "p",
          text: "The **first presented fair value gap** is the first FVG that forms after a session opens, in ICT's teaching specifically after **09:30 New York** (the stock market open), within the first 30 minutes or so. It shows the first displacement of the session and is often revisited before price continues.",
        },
        {
          t: "diagram",
          caption: `A real session on ${ff.source.split(" · ")[1]}: the first FVG after 09:30 NY was ${ffBull ? "bullish" : "bearish"}; price came back to it and then extended.`,
          spec: realSpec("first-fvg", (r) => [vline(r.i("open"), "09:30 NY", "gold"), zone(r.i("f"), r.i("rt") + 2, r.lv["bot"]!, r.lv["top"]!, "electric", "first presented FVG"), ffBull ? loTag(r, "rt", "retest", "up") : hiTag(r, "rt", "retest", "down")]),
        },
        { t: "callout", tone: "tip", text: "Mark it, then wait: a retest of the first presented FVG in the direction of your daily bias is a clean, rules-based entry." },
      ],
      quiz: [
        { q: "In ICT's teaching, the first presented FVG forms after…", options: ["02:00 NY", "09:30 NY", "17:00 NY", "Midnight"], answer: 1, why: "The New York stock open." },
        { q: "Why does it matter?", options: ["It shows the session's first displacement", "It's always filled instantly", "Brokers mark it", "It doesn't"], answer: 0, why: "The first commitment of the session." },
        { q: "Best way to use it?", options: ["Chase the move", "Wait for a retest in the direction of your bias", "Fade it always", "Ignore it"], answer: 1, why: "Retest entries give defined risk." },
      ],
    },
    {
      id: "inversion-fvg",
      title: "Inversion FVG and reclaimed FVG",
      summary: "When a gap fails, it flips roles: old resistance becomes new support.",
      minutes: 6,
      terms: ["Inversion Fair Value Gap (IFVG)", "Reclaimed FVG"],
      blocks: [
        {
          t: "p",
          text: "A bearish FVG should push price down. If price instead **closes back above it**, the gap has failed, and it often **inverts**: price returns to it from above and it now acts as support. That flipped gap is an **inversion fair value gap (IFVG)**. A **reclaimed FVG** is a gap price traded through and then respected again from the original side.",
        },
        {
          t: "diagram",
          caption: "A real IFVG: a bearish gap formed, price closed back above it, then returned to it from above and bounced.",
          spec: realSpec("ifvg", (r) => [zone(r.i("f"), r.i("rt") + 3, r.lv["bot"]!, r.lv["top"]!, "purple", "bearish FVG → IFVG"), hiTag(r, "fail", "closed through", "up"), loTag(r, "rt", "support now", "up")]),
        },
        { t: "list", items: ["A body close through the gap is what inverts it (a wick is not enough).", "The retest from the other side is the entry zone; stop beyond the far edge of the gap.", "IFVGs are strongest right after a liquidity sweep: the failure shows the sweep's direction was fake."] },
      ],
      quiz: [
        { q: "An IFVG is…", options: ["A gap that held perfectly", "A gap that failed and flipped role", "A 50% level", "A weekend gap"], answer: 1, why: "Inversion = role reversal." },
        { q: "What inverts a bearish FVG?", options: ["A wick into it", "A candle body closing above it", "Low volume", "Time"], answer: 1, why: "A close through it shows failure." },
        { q: "After inversion, a bearish FVG acts as…", options: ["Resistance", "Support", "Nothing", "A target only"], answer: 1, why: "Its role flips." },
      ],
    },
    {
      id: "balanced-price-range",
      title: "Balanced price range (BPR)",
      summary: "Where a bearish gap and a bullish gap overlap: price has been delivered both ways.",
      minutes: 5,
      terms: ["Balanced Price Range (BPR)"],
      blocks: [
        {
          t: "p",
          text: "A **balanced price range** is the overlap between a **bearish FVG** and a later **bullish FVG** (or the reverse). Price moved through that zone quickly in both directions, so it's 'balanced'. The overlap often becomes a precise support/resistance zone in the direction of the latest displacement.",
        },
        {
          t: "diagram",
          caption: "A real BPR: a bearish FVG (red), then a bullish FVG (green) in the same area. Their overlap (gold) was retested and held.",
          spec: realSpec("bpr", (r) => [
            zone(r.i("bear"), r.i("bull") + 2, r.lv["bBot"]!, r.lv["bTop"]!, "down", "bearish FVG"),
            zone(r.i("bull"), r.i("rt") + 2, r.lv["uBot"]!, r.lv["uTop"]!, "up", "bullish FVG"),
            zone(r.i("bull"), r.i("rt") + 4, r.lv["bot"]!, r.lv["top"]!, "gold", "BPR"),
            loTag(r, "rt", "retest", "up"),
          ]),
        },
        { t: "callout", tone: "tip", text: "The BPR is narrower than either gap, which makes it a tighter entry with a smaller stop." },
      ],
      quiz: [
        { q: "A BPR is the overlap of…", options: ["Two bullish FVGs", "A bearish FVG and a bullish FVG", "Two order blocks", "Two candles"], answer: 1, why: "Opposite gaps overlapping." },
        { q: "Which direction does a BPR usually favour?", options: ["The latest displacement", "The first gap", "Neither", "Down always"], answer: 0, why: "The most recent delivery shows intent." },
        { q: "Why is a BPR a tight entry?", options: ["It's narrower than either gap", "It's always 50 pips", "It uses RSI", "It doesn't have a stop"], answer: 0, why: "Only the overlap counts." },
      ],
    },
    {
      id: "stacked-implied-fvg",
      title: "Stacked and implied FVGs",
      summary: "Several gaps in one displacement, and the hidden gap between big wicks.",
      minutes: 5,
      terms: ["Stacked FVGs / Nested FVGs", "Implied Fair Value Gap"],
      blocks: [
        {
          t: "p",
          text: "A strong displacement can leave **several fair value gaps in a row: stacked (nested) FVGs**. They show extreme one-sided pressure. On a pullback, the **first (highest) gap** is usually respected in a strong trend; a deeper retrace into the lower gaps means momentum is fading.",
        },
        { t: "diagram", caption: "A real displacement that left stacked fair value gaps.", spec: realSpec("stacked-fvg", () => stackNotes) },
        {
          t: "p",
          text: "An **implied FVG** exists when candles 1 and 3 technically overlap, but only through long wicks around a very large middle candle. Take the midpoints of candle 1's upper wick and candle 3's lower wick: the space between them is the implied gap. It works like a normal FVG, with less precision.",
        },
      ],
      quiz: [
        { q: "Stacked FVGs show…", options: ["Weak momentum", "Extreme one-sided pressure", "A range", "Low volume"], answer: 1, why: "Several gaps in one move." },
        { q: "In a strong trend, which stacked gap is usually respected?", options: ["The first one price meets", "The deepest one", "None", "The middle one only"], answer: 0, why: "Strong trends barely retrace." },
        { q: "An implied FVG uses…", options: ["Candle bodies only", "Wick midpoints of candles 1 and 3", "Volume", "The daily open"], answer: 1, why: "The gap is 'implied' by the wicks." },
      ],
    },
    {
      id: "volume-imbalance-void",
      title: "Volume imbalances and liquidity voids",
      summary: "Gaps between bodies, and long one-way runs price usually comes back to fill.",
      minutes: 5,
      terms: ["Volume Imbalance", "Liquidity Void (vs FVG)"],
      blocks: [
        {
          t: "p",
          text: "A **volume imbalance** is a gap between two candle **bodies** where the wicks still overlap: the open of one candle jumped past the close of the previous. It's a smaller cousin of the FVG and often gets filled to the body edge.",
        },
        { t: "diagram", caption: "A real volume imbalance: the bodies don't touch, the wicks do. Price came back to fill it and reacted.", spec: realSpec("volume-imbalance", (r) => [zone(r.i("k") - 1, r.i("rt") + 2, r.lv["bot"]!, r.lv["top"]!, "electric", "volume imbalance"), loTag(r, "rt", "filled", "up")]) },
        {
          t: "p",
          text: "A **liquidity void** is a long run of big candles in one direction with barely any overlap between them: price moved so fast that almost nothing traded on the way. Voids are bigger than a single FVG and tend to be **retraced** later, because the market seeks to trade through that price area properly.",
        },
        { t: "diagram", caption: "A real liquidity void: consecutive large candles with little overlap, later retraced deep into the move.", spec: realSpec("liquidity-void", (r) => [zone(r.i("a"), r.i("b"), r.lv["lo"]!, r.lv["hi"]!, "purple", "liquidity void"), loTag(r, "fill", "void retraced", "down")]) },
      ],
      quiz: [
        { q: "A volume imbalance is a gap between…", options: ["Wicks", "Candle bodies", "Two days", "Two markets"], answer: 1, why: "Bodies don't touch; wicks do." },
        { q: "A liquidity void is…", options: ["A single doji", "A fast one-way run with little overlap", "A range", "A gap on the weekly only"], answer: 1, why: "Price skipped through the area." },
        { q: "What usually happens to voids?", options: ["Never revisited", "Retraced later", "They become ranges", "Brokers close them"], answer: 1, why: "The market returns to trade the area." },
      ],
    },
    {
      id: "opening-gaps-ndog-nwog",
      title: "NDOG, NWOG and the event horizon",
      summary: "The gap between the close and the next open, daily and weekly, as reference levels.",
      minutes: 6,
      terms: ["New Day Opening Gap (NDOG) / New Week Opening Gap (NWOG)", "Event Horizon (PD Array)"],
      blocks: [
        {
          t: "p",
          text: "Futures and forex pause briefly each day (17:00–18:00 New York) and over the weekend. The price difference between the **close before the pause and the first open after it** is an opening gap: the **New Day Opening Gap (NDOG)** daily, and the **New Week Opening Gap (NWOG)** between Friday's close and Sunday's open. ICT treats them as reference zones, with their 50% (CE) often acting as a magnet during the week.",
        },
        {
          t: "diagram",
          caption: "A real New Week Opening Gap: Friday's close and Sunday's open left a gap. Price returned to its 50% level during the week.",
          spec: realSpec("nwog", (r) => [vline(r.i("sun"), "Sunday open", "gold"), zone(r.i("fri"), r.candles.length - 1, r.lv["bot"]!, r.lv["top"]!, "purple", "NWOG"), level(r.lv["ce"]!, "CE", "gold", true, r.i("sun"), r.candles.length - 1), hiTag(r, "back", "back to CE", "electric")]),
        },
        {
          t: "p",
          text: "The **event horizon** is the midpoint between two NWOGs that sit apart from each other (one above price, one below). ICT describes it as the line that decides which gap price is more likely to be drawn to: above the event horizon, the upper gap; below it, the lower one.",
        },
        { t: "callout", tone: "tip", text: "Keep the last few NWOGs on your chart. They're often revisited weeks later." },
      ],
      quiz: [
        { q: "The NWOG is the gap between…", options: ["Monday's open and close", "Friday's close and Sunday's open", "Two candles", "Two markets"], answer: 1, why: "It forms over the weekend." },
        { q: "Which part of an opening gap is often a magnet?", options: ["Its 50% (CE)", "Nothing", "Its top only", "The spread"], answer: 0, why: "Consequent encroachment again." },
        { q: "The event horizon sits…", options: ["At the daily open", "Midway between two separate NWOGs", "At the 200 MA", "At a round number"], answer: 1, why: "It splits the two gaps." },
      ],
    },
  ],
};

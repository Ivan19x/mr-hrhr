import type { Module } from "./types";
import { real, realSpec } from "./real";
import { hiTag, level, loTag, vline, zone } from "./adv";

const ob = real("ob-unmitigated");
const obI = ob.i("ob");
const obMid = (ob.lv["obTop"]! + ob.lv["obBot"]!) / 2;
const obBodyTop = Math.max(ob.candles[obI]![0], ob.candles[obI]![3]);

export const M19_ORDER_BLOCKS_PRO: Module = {
  id: "order-blocks-pro",
  n: 19,
  title: "The Order Block Family",
  tagline: "Unmitigated and refined blocks, breakers, mitigation, rejection, propulsion and vacuum blocks, POIs and the PD array matrix.",
  icon: "🧱",
  lessons: [
    {
      id: "unmitigated-refined-ob",
      title: "Unmitigated and refined order blocks",
      summary: "Fresh blocks have the most orders left; refining them tightens the stop.",
      minutes: 6,
      terms: ["Unmitigated Order Block", "Refined Order Block"],
      blocks: [
        {
          t: "p",
          text: "An order block is **unmitigated** until price returns to it for the first time. The idea: the institution that created the displacement still has unfilled orders there. The **first return** 'mitigates' it: those orders get filled (or the position is rebalanced). Later returns are weaker, so fresh blocks are preferred.",
        },
        {
          t: "diagram",
          caption: "A real bullish order block (last down candle before the displacement). It was unmitigated until the marked return, which held.",
          spec: realSpec("ob-unmitigated", (r) => [
            zone(obI, r.i("rt"), r.lv["obBot"]!, r.lv["obTop"]!, "up", "order block"),
            level(obMid, "mean threshold 50%", "gold", true, obI, r.i("rt") + 3),
            loTag(r, "ob", "OB", "up"),
            loTag(r, "rt", "first return: mitigated", "electric"),
          ]),
        },
        {
          t: "p",
          text: "A **refined order block** narrows the zone to cut the stop size: use the candle **body** instead of the full range, or its **50% (mean threshold)**, or drop to a lower timeframe and mark the last opposite candle inside the higher-timeframe block.",
        },
        {
          t: "table",
          head: ["Version", "Zone", "Trade-off"],
          rows: [
            ["Full OB", `Wick to wick (${ob.lv["obBot"]} – ${ob.lv["obTop"]} here)`, "Most fills, biggest stop"],
            ["Body only", `Open to close (up to ${Number(obBodyTop.toPrecision(6))} here)`, "Tighter"],
            ["Mean threshold", `50% of the candle (${Number(obMid.toPrecision(6))} here)`, "Tighter still; price should not close below it"],
            ["Lower-timeframe refinement", "The last down candle on 5m/15m inside the zone", "Smallest stop; can miss the trade"],
          ],
        },
      ],
      quiz: [
        { q: "An unmitigated order block is one…", options: ["Price has already returned to", "Price hasn't returned to since it formed", "With no wick", "On the weekly only"], answer: 1, why: "Fresh = unvisited." },
        { q: "The mean threshold is…", options: ["The OB's 50% level", "The daily open", "A moving average", "The spread"], answer: 0, why: "ICT's name for the block's midpoint." },
        { q: "Why refine an order block?", options: ["To get more signals", "To tighten the stop and improve R:R", "To avoid stops", "It's required"], answer: 1, why: "A smaller zone means a smaller stop." },
      ],
    },
    {
      id: "breaker-mitigation-blocks",
      title: "Breaker blocks, mitigation blocks and flipped OBs",
      summary: "Failed blocks that flip role once structure breaks through them.",
      minutes: 7,
      terms: ["Breaker Block", "Mitigation Block", "Reclaimed Order Block / Flip Order Block"],
      blocks: [
        {
          t: "p",
          text: "A **bullish breaker**: price makes a low, rallies to a high, then **sweeps below the first low** (a lower low), and finally rallies **above the high**. The last up candle at that high was a bearish order block that failed. Once broken, it flips: when price returns to it from above, it acts as support.",
        },
        {
          t: "diagram",
          caption: "A real bullish breaker: low, high, LOWER low (sweep), then a break above the high. The old up candle at the high became support.",
          spec: realSpec("breaker", (r) => [
            loTag(r, "L1", "low", "muted"),
            hiTag(r, "H", "high", "muted"),
            loTag(r, "L2", "lower low (sweep)", "down"),
            hiTag(r, "brk", "break", "up"),
            zone(r.i("blk"), r.i("rt") + 2, r.lv["bBot"]!, r.lv["bTop"]!, "gold", "breaker"),
            loTag(r, "rt", "retest", "up"),
          ]),
        },
        {
          t: "p",
          text: "A **mitigation block** is the same shape **without the sweep**: the second low is HIGHER than the first (price failed to make a new low), then broke the high. It's a failure swing rather than a stop run, so ICT rates it slightly weaker than a breaker.",
        },
        {
          t: "diagram",
          caption: "A real bullish mitigation block: higher low (no sweep), break of the high, then a retest of the flipped candle.",
          spec: realSpec("mitigation-block", (r) => [loTag(r, "L1", "low", "muted"), loTag(r, "L2", "higher low", "up"), hiTag(r, "brk", "break", "up"), zone(r.i("blk"), r.i("rt") + 2, r.lv["bBot"]!, r.lv["bTop"]!, "gold", "mitigation block"), loTag(r, "rt", "retest", "up")]),
        },
        {
          t: "table",
          head: ["Block", "Before the break", "Strength"],
          rows: [["Breaker", "Lower low: liquidity was swept", "Stronger"], ["Mitigation", "Higher low: a failure swing", "Weaker"], ["Reclaimed / flip OB", "Any OB price closes through and then retests from the other side", "Depends on context"]],
        },
      ],
      quiz: [
        { q: "A bullish breaker needs…", options: ["A higher low", "A lower low (sweep) before the break of the high", "No low at all", "A gap"], answer: 1, why: "The sweep is what defines it." },
        { q: "A mitigation block differs from a breaker because…", options: ["There's no sweep: the second low is higher", "It's bearish only", "It uses volume", "Nothing"], answer: 0, why: "It's a failure swing." },
        { q: "After breaking, a bearish OB can act as…", options: ["Resistance only", "Support (it flips)", "A target only", "Nothing"], answer: 1, why: "Broken blocks flip role." },
      ],
    },
    {
      id: "rejection-propulsion-vacuum",
      title: "Rejection, propulsion and vacuum blocks",
      summary: "Wick zones, launch candles and gaps from sudden volatility.",
      minutes: 6,
      terms: ["Rejection Block", "Propulsion Block", "Vacuum Block / Suspension Block"],
      blocks: [
        {
          t: "p",
          text: "A **rejection block** is built from long wicks at a swing extreme. For a bullish one, take the lowest candle bodies at the swing low down to the wick low: that wick zone is where price was aggressively rejected. When price returns into the wicks and holds, the rejection repeats.",
        },
        { t: "diagram", caption: "A real bullish rejection block: long lower wicks at the swing low. Price came back into the wick zone and bounced.", spec: realSpec("rejection-block", (r) => [zone(r.i("s") - 1, r.i("rt") + 2, r.lv["bot"]!, r.lv["top"]!, "up", "rejection block"), loTag(r, "rt", "retest", "up")]) },
        {
          t: "p",
          text: "A **propulsion block** is the candle that trades **into** an order block and then launches price away from it. It sits just above the original block, so it's a tighter, 'second-layer' entry if price comes back to it.",
        },
        {
          t: "diagram",
          caption: "Real chart: the order block (green), then the candle that dipped into it and launched price (gold). The later pullback held at that propulsion candle.",
          spec: realSpec("propulsion", (r) => [zone(r.i("ob"), r.i("p"), r.lv["obBot"]!, r.lv["obTop"]!, "up", "order block"), zone(r.i("p"), r.i("rt2") + 2, r.lv["pBot"]!, r.lv["pTop"]!, "gold", "propulsion block"), loTag(r, "rt2", "held", "up")]),
        },
        {
          t: "p",
          text: "A **vacuum block** (or suspension block) is a gap created by sudden volatility (a news release or a session open) where price simply jumped. Like any gap, it tends to be revisited. You saw real examples in the gaps lessons: the weekend NWOG is a vacuum created by the market being closed.",
        },
      ],
      quiz: [
        { q: "A rejection block is built from…", options: ["Candle bodies", "Long wicks at a swing extreme", "Volume", "The open"], answer: 1, why: "The wicks show the rejection." },
        { q: "A propulsion block is…", options: ["The candle that trades into an OB and launches price", "Any gap", "A doji", "The daily open"], answer: 0, why: "It propels price from the block." },
        { q: "A vacuum block comes from…", options: ["Slow trading", "Sudden volatility or a market pause creating a gap", "Indicators", "Round numbers"], answer: 1, why: "Price jumped, leaving empty space." },
      ],
    },
    {
      id: "poi-pd-arrays",
      title: "Points of interest and the PD array matrix",
      summary: "Ranking every zone type, and choosing which one to trade from.",
      minutes: 7,
      terms: ["Point of Interest (POI) / Extreme POI / Decisional POI", "Premium and Discount Arrays (PD Arrays) / PD Array Matrix"],
      blocks: [
        {
          t: "p",
          text: "A **point of interest (POI)** is any zone you'd consider trading from: an order block, FVG, breaker, and so on. In a leg there are usually several. The **extreme POI** is the one at the origin of the move (furthest away, safest structurally). The **decisional POI** is the first one price meets on a pullback (closest, more likely to be reached, but more likely to fail).",
        },
        {
          t: "diagram",
          caption: "Real chart with two POIs: the order block at the origin (extreme POI) and the fair value gap above it (decisional POI).",
          spec: realSpec("ob-unmitigated", (r) => [
            zone(obI, r.i("rt") + 2, r.lv["obBot"]!, r.lv["obTop"]!, "up", "extreme POI (OB)"),
            zone(r.i("fvg1"), r.i("rt") + 2, r.lv["fvgBot"]!, r.lv["fvgTop"]!, "electric", "decisional POI (FVG)"),
            vline(r.i("rt"), "pullback", "muted"),
          ]),
        },
        {
          t: "p",
          text: "ICT's **PD array matrix** lists the zone types and sorts them by whether they sit in **premium** (above 50% of the dealing range: look to sell) or **discount** (below 50%: look to buy). A bullish zone in premium is ignored; a bullish zone in discount is valid.",
        },
        {
          t: "table",
          head: ["PD arrays (roughly strongest first)", "Use in premium", "Use in discount"],
          rows: [
            ["Old high / old low (liquidity)", "Target / sweep to sell", "Target / sweep to buy"],
            ["Rejection block", "Bearish", "Bullish"],
            ["Order block", "Bearish OB", "Bullish OB"],
            ["Fair value gap", "Bearish FVG", "Bullish FVG"],
            ["Liquidity void", "Filled then sold", "Filled then bought"],
            ["Breaker / mitigation block", "Bearish", "Bullish"],
          ],
        },
        { t: "callout", tone: "key", text: "Simple filter: only buy from bullish zones in discount, only sell from bearish zones in premium, and prefer zones that line up with a higher-timeframe array." },
      ],
      quiz: [
        { q: "The extreme POI is…", options: ["The first zone on a pullback", "The zone at the origin of the move", "The daily open", "A round number"], answer: 1, why: "Furthest from price, structurally safest." },
        { q: "The decisional POI is…", options: ["The first zone price meets on a pullback", "The last zone", "The weekly high", "A moving average"], answer: 0, why: "Closest, more often reached." },
        { q: "A bullish order block in premium should be…", options: ["Bought aggressively", "Treated with suspicion or ignored", "Sold", "Doubled"], answer: 1, why: "Buy in discount, sell in premium." },
      ],
    },
  ],
};

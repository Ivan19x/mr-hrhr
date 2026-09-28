import type { Module, Note } from "./types";
import { real, realSpec, swings } from "./real";
import { hiTag, level, loTag, zone } from "./adv";

// Strong / weak swings on a real downtrend: a lower high is "strong" when the move
// from it broke the previous low; the latest low is "weak" (not yet defended).
const sw = real("strong-weak");
const seq = swings(sw);
const swNotes: Note[] = [];
let prevLow: number | null = null;
seq.forEach((s, k) => {
  if (s.kind === "L") {
    const isLast = !seq.slice(k + 1).some((q) => q.kind === "L");
    swNotes.push({ k: "label", i: s.i, p: sw.lo(s.name), text: isLast ? "weak low" : "LL", color: isLast ? "gold" : "down", pos: "below" });
    prevLow = sw.lo(s.name);
    return;
  }
  const next = seq.slice(k + 1).find((q) => q.kind === "L");
  const strong = prevLow !== null && next !== undefined && sw.lo(next.name) < prevLow;
  const lastStrong = strong && !seq.slice(k + 1).some((q, j) => q.kind === "H" && seq.slice(k + 2 + j).some((z) => z.kind === "L"));
  swNotes.push({ k: "label", i: s.i, p: sw.hi(s.name), text: lastStrong ? "protected high" : strong ? "strong high" : "LH", color: lastStrong ? "player" : strong ? "up" : "muted", pos: "above" });
});

const ce = real("compression-expansion");
const up = (ce.lv["dir"] ?? 1) > 0;
const ie = real("internal-external");
const innerNotes: Note[] = Object.keys(ie.pts)
  .filter((k) => /^i[hl]\d$/.test(k))
  .map((k) => (k[1] === "h" ? { k: "dot", i: ie.i(k), p: ie.hi(k), color: "purple", text: "iLH", pos: "above" } : { k: "dot", i: ie.i(k), p: ie.lo(k), color: "purple", text: "iLL", pos: "below" }));

export const M14_STRUCTURE_PRO: Module = {
  id: "structure-pro",
  n: 14,
  title: "Market Structure: Deep Dive",
  tagline: "Compression, psychological levels, Dow Theory, MSS, internal vs external structure, strong and weak swings, inducement and SFPs.",
  icon: "🧭",
  lessons: [
    {
      id: "compression-expansion",
      title: "Compression and expansion",
      summary: "Markets breathe: tight, quiet ranges are followed by fast, wide moves.",
      minutes: 5,
      terms: ["Expansion", "Compression"],
      blocks: [
        {
          t: "p",
          text: "Volatility moves in cycles. **Compression** is a stretch of small, overlapping candles: orders build up on both sides and nobody commits. **Expansion** is the release: big candles, a break of the tight range, and price travels far in a short time.",
        },
        {
          t: "diagram",
          caption: `A real compression: ten quiet candles, then one expansion candle broke the box ${up ? "upward" : "downward"} and kept going.`,
          spec: realSpec("compression-expansion", (r) => [zone(r.i("c0"), r.i("c1"), r.lv["lo"]!, r.lv["hi"]!, "muted", "compression"), up ? hiTag(r, "ex", "expansion", "up") : loTag(r, "ex", "expansion", "down")]),
        },
        {
          t: "spot",
          items: ["Candle ranges shrink to well under the average true range.", "Highs and lows overlap; Bollinger Bands squeeze.", "The expansion candle's range is 2–3× the compressed candles.", "It closes OUTSIDE the box (a wick outside is not enough)."],
        },
        { t: "callout", tone: "tip", text: "You can't know the direction of the release from compression alone. Use higher-timeframe bias and where the liquidity sits to pick a side, or wait for the expansion candle to close." },
      ],
      quiz: [
        { q: "Compression looks like…", options: ["Huge candles", "Small overlapping candles in a tight range", "A gap", "A long trend"], answer: 1, why: "Volatility contracts." },
        { q: "What usually follows compression?", options: ["More compression forever", "Expansion", "A market close", "Nothing"], answer: 1, why: "Volatility cycles from low to high." },
        { q: "Best confirmation of an expansion move?", options: ["A wick outside the box", "A candle CLOSE outside the box", "Low volume", "A doji"], answer: 1, why: "Closes, not wicks, confirm breaks." },
      ],
    },
    {
      id: "round-numbers",
      title: "Round numbers and psychological levels",
      summary: "Why 1.1000, 2,000 and 100,000 attract orders and reactions.",
      minutes: 4,
      terms: ["Round numbers / psychological levels"],
      blocks: [
        {
          t: "p",
          text: "People place orders at round numbers: take-profits at 1.1000, stops just under 2,000, options strikes at 100,000. Those clusters make round numbers act as **magnets** (price is drawn to them) and **barriers** (price reacts when it gets there).",
        },
        {
          t: "diagram",
          caption: `A real chart reacting again and again around the round number ${real("round-number").lv["R"]}.`,
          spec: realSpec("round-number", (r) => [level(r.lv["R"]!, `round number ${r.lv["R"]}`, "gold", false), ...Object.keys(r.pts).map((k) => ({ k: "dot", i: r.i(k), p: r.lv["R"]!, color: "electric" }) as Note)]),
        },
        {
          t: "table",
          head: ["Market", "Big round numbers", "Smaller ones"],
          rows: [
            ["EUR/USD", "1.1000, 1.2000", "1.0850, 1.0950 (the 50s)"],
            ["USD/JPY", "150.00, 160.00", "155.00"],
            ["Gold", "2,000, 2,500", "The 50s: 2,350"],
            ["BTC", "50,000, 100,000", "5,000 steps"],
          ],
        },
        { t: "callout", tone: "warn", text: "Because everyone knows them, round numbers get **overshot**: price often wicks a little past them to take the obvious stops. Don't put your stop exactly on the number." },
      ],
      quiz: [
        { q: "Why do round numbers matter?", options: ["Brokers set them", "Many traders place orders there", "They're in the news", "They never matter"], answer: 1, why: "Order clusters create reactions." },
        { q: "Where should you NOT put a stop?", options: ["Beyond a swing", "Exactly on a big round number", "Beyond an order block", "Below a range"], answer: 1, why: "The obvious level gets swept." },
        { q: "A round number acting as a magnet means…", options: ["Price avoids it", "Price tends to be drawn toward it", "It's a moving average", "It's a gap"], answer: 1, why: "Resting orders attract price." },
      ],
    },
    {
      id: "dow-theory-staircase",
      title: "Dow Theory and the staircase trend",
      summary: "The 120-year-old rules behind higher highs and higher lows.",
      minutes: 6,
      terms: ["Dow Theory", "Staircase Pattern"],
      blocks: [
        {
          t: "p",
          text: "Charles Dow's editorials in The Wall Street Journal (around 1900) became **Dow Theory**, the foundation of all trend analysis. Its six tenets:",
        },
        {
          t: "list",
          ordered: true,
          items: [
            "**The market discounts everything**: news is already in the price.",
            "**There are three trends**: primary (months to years), secondary (weeks to months), minor (days).",
            "**Primary trends have three phases**: accumulation, public participation, distribution.",
            "**Indices must confirm each other** (originally the Industrials and the Rails).",
            "**Volume confirms the trend**: it expands in the trend's direction.",
            "**A trend holds until a clear reversal signal**: a failure to make a new high, then a break of the last low.",
          ],
        },
        {
          t: "p",
          text: "The cleanest trends form a **staircase**: impulse, shallow pullback, impulse, pullback. Each step leaves a higher low to lean on. As long as the staircase holds, you trade in its direction.",
        },
        {
          t: "diagram",
          caption: "A real staircase uptrend: each step up is followed by a small pullback that holds above the previous low.",
          spec: realSpec("staircase", (r) => swings(r).map((s) => (s.kind === "H" ? hiTag(r, s.name, "HH", "up") : loTag(r, s.name, "HL", "electric")))),
        },
        { t: "callout", tone: "key", text: "Tenet 6 is today's CHoCH: the trend is assumed to continue until price fails to make a new high and then breaks the last higher low." },
      ],
      quiz: [
        { q: "How many trends does Dow Theory describe?", options: ["One", "Two", "Three", "Five"], answer: 2, why: "Primary, secondary and minor." },
        { q: "According to Dow, volume should…", options: ["Shrink in the trend's direction", "Expand in the trend's direction", "Be ignored", "Stay flat"], answer: 1, why: "Volume confirms the trend." },
        { q: "A staircase uptrend is broken when…", options: ["A pullback happens", "Price closes below the last higher low", "Volume drops", "A doji forms"], answer: 1, why: "That's the reversal signal." },
      ],
    },
    {
      id: "market-structure-shift",
      title: "Market Structure Shift (MSS)",
      summary: "A change of character delivered with displacement: the reversal signal ICT traders wait for.",
      minutes: 6,
      terms: ["Market Structure Shift (MSS) / Shift in Market Structure (SMS)"],
      blocks: [
        {
          t: "p",
          text: "A **Market Structure Shift** is a break of the last swing against the trend, done **with displacement**: a large, fast candle that closes through the level and usually leaves a fair value gap. A weak close through the level is just a CHoCH; the energy of the break is what makes it an MSS.",
        },
        {
          t: "diagram",
          caption: "A real bullish MSS: lower highs and lower lows, then a big candle closes above the last lower high and leaves a fair value gap.",
          spec: realSpec("mss", (r) => [
            hiTag(r, "H0", "H", "down"),
            loTag(r, "L1", "L", "down"),
            hiTag(r, "H2", "LH", "down"),
            loTag(r, "L3", "LL", "down"),
            level(r.hi("H2"), "last lower high", "gold", true, r.i("H2"), r.i("mss") + 3),
            hiTag(r, "mss", "MSS", "up"),
            zone(r.i("f"), r.i("f") + 2, r.hi("f"), r.candles[r.i("f") + 2]![2], "electric", "FVG"),
          ]),
        },
        {
          t: "table",
          head: ["", "CHoCH", "MSS"],
          rows: [
            ["What breaks", "The last swing against the trend", "The same"],
            ["How", "Any candle close", "A displacement candle, usually leaving an FVG"],
            ["Reliability", "Early, many false signals", "Stronger: shows intent"],
          ],
        },
        { t: "callout", tone: "tip", text: "The MSS is step 2 of the ICT 2022 model: liquidity sweep → MSS → entry in the fair value gap it left. You'll put it together in the Entry Models module." },
      ],
      quiz: [
        { q: "What turns a CHoCH into an MSS?", options: ["Time of day", "Displacement: a strong candle through the level", "A doji", "Low volume"], answer: 1, why: "The strength of the break." },
        { q: "What does a bullish MSS break?", options: ["The last lower low", "The last lower high", "A moving average", "A round number"], answer: 1, why: "It breaks the swing that kept the downtrend going." },
        { q: "What does displacement often leave behind?", options: ["A doji", "A fair value gap", "An inside bar", "A gap down"], answer: 1, why: "Fast candles leave imbalances." },
      ],
    },
    {
      id: "internal-external-structure",
      title: "Internal vs external structure, and fractals",
      summary: "Big swings, small swings, and why the same shape repeats on every timeframe.",
      minutes: 7,
      terms: ["Swing Structure", "Internal Structure / External Structure", "Major / Minor Structure", "Fractal Structure / Nested Structure"],
      blocks: [
        {
          t: "p",
          text: "**External (swing, major) structure** is made of the big swings that define the trend: the leg's origin low and the high it made. **Internal (minor) structure** is the smaller swings **inside** a leg or a pullback. A pullback in an uptrend is a small downtrend on its own: internally bearish, externally still bullish.",
        },
        {
          t: "diagram",
          caption: "Real chart. External: the leg low, the leg high and the higher low. Purple: internal lower highs and lows inside the pullback. The external BOS resumed the trend.",
          spec: realSpec("internal-external", (r) => [
            loTag(r, "A", "external low", "up"),
            hiTag(r, "B", "external high", "up"),
            loTag(r, "C", "external HL", "up"),
            level(r.hi("B"), "external BOS level", "gold", true, r.i("B"), r.i("brk") + 2),
            ...innerNotes,
          ]),
        },
        {
          t: "p",
          text: "Structure is **fractal**: zoom into one daily candle and you see a whole 1-hour trend inside it; zoom into a 1-hour pullback and it's a 5-minute downtrend. The patterns nest inside each other. That is why top-down analysis works: the higher timeframe says which internal breaks matter.",
        },
        {
          t: "table",
          head: ["Question", "Answer"],
          rows: [
            ["Which structure defines the trend?", "External (major swing highs and lows)"],
            ["When is an internal CHoCH important?", "When it happens at a higher-timeframe zone in the external direction"],
            ["What resumes the trend?", "An internal break back in the external direction, then an external BOS"],
          ],
        },
        { t: "callout", tone: "warn", text: "Classic mistake: calling a trend reversal on an internal CHoCH in the middle of a pullback. Check the external structure first." },
      ],
      quiz: [
        { q: "A pullback inside an uptrend is internally…", options: ["Bullish", "Bearish", "Flat", "Undefined"], answer: 1, why: "It makes small lower highs and lows." },
        { q: "Which structure defines the main trend?", options: ["Internal", "External (major swings)", "The last candle", "Volume"], answer: 1, why: "External swings are the trend's skeleton." },
        { q: "'Fractal structure' means…", options: ["Price is random", "The same structure repeats on every timeframe", "Only daily charts matter", "Patterns never repeat"], answer: 1, why: "Trends nest inside trends." },
      ],
    },
    {
      id: "strong-weak-protected",
      title: "Strong, weak and protected highs and lows",
      summary: "Which swings must hold for the trend, and which ones are targets.",
      minutes: 6,
      terms: ["Strong High / Weak High", "Strong Low / Weak Low", "Protected High / Protected Low", "Valid Pullback"],
      blocks: [
        {
          t: "p",
          text: "Not every swing is equal. In a downtrend, a lower high whose sell-off **broke the previous low** is a **strong high**: sellers proved themselves there. The most recent low that hasn't been defended yet is a **weak low**, an obvious target. The last strong high is the **protected high**: if price closes above it, the downtrend is over.",
        },
        { t: "diagram", caption: "A real downtrend labelled: strong highs caused new lows; the protected high must hold; the weak low is the next target.", spec: realSpec("strong-weak", () => swNotes) },
        {
          t: "table",
          head: ["Trend", "Strong (protected)", "Weak (target)"],
          rows: [
            ["Uptrend", "The higher low that led to the last higher high", "The latest high"],
            ["Downtrend", "The lower high that led to the last lower low", "The latest low"],
          ],
        },
        {
          t: "p",
          text: "A **valid pullback** is one that takes out the previous candle's extreme (in a downtrend, a candle trades above the previous candle's high). Many SMC traders only confirm a new swing after a valid pullback; small wiggles without one don't count as structure.",
        },
        { t: "callout", tone: "key", text: "Trade from strong swings toward weak ones. Put stops beyond the protected swing, and targets at the weak one." },
      ],
      quiz: [
        { q: "In a downtrend, a strong high is one that…", options: ["Is the highest ever", "Led to a break of the previous low", "Has a long wick", "Formed at a round number"], answer: 1, why: "Its sell-off broke structure." },
        { q: "What is the weak low in a downtrend?", options: ["The first low", "The most recent low: a likely target", "Any low with a wick", "The protected level"], answer: 1, why: "It hasn't been defended yet." },
        { q: "A close above the protected high in a downtrend means…", options: ["Continuation", "The downtrend is invalidated", "Nothing", "Buy the next low"], answer: 1, why: "The swing that had to hold has failed." },
      ],
    },
    {
      id: "inducement",
      title: "Inducement (IDM)",
      summary: "The early, obvious swing that lures traders in before the real move.",
      minutes: 6,
      terms: ["Inducement (IDM) / Liquidity Inducement"],
      blocks: [
        {
          t: "p",
          text: "After a break of structure, the pullback often forms a small, obvious low: the **inducement**. Traders buy it and place stops just below. Price then dips through it (sweeping those stops) into the real zone lower down, and only then continues. The inducement 'induced' traders to enter too early.",
        },
        {
          t: "diagram",
          caption: "A real inducement: the first pullback low (IDM) is swept, price reaches the deeper zone, then breaks to a new high.",
          spec: realSpec("inducement", (r) => [
            loTag(r, "A", "leg low", "up"),
            hiTag(r, "B", "high", "up"),
            level(r.lo("idm"), "IDM", "gold", true, r.i("idm"), r.i("sweep") + 2),
            loTag(r, "sweep", "IDM swept", "down"),
            loTag(r, "C", "real low", "up"),
            hiTag(r, "brk", "new high", "up"),
          ]),
        },
        {
          t: "flow",
          steps: [
            { title: "BOS", text: "Structure breaks in the trend direction." },
            { title: "IDM forms", text: "The first small pullback low appears; early buyers enter." },
            { title: "IDM swept", text: "Price dips through it, taking those stops." },
            { title: "Real zone", text: "Price reaches the order block / discount zone and turns." },
          ],
        },
        { t: "callout", tone: "tip", text: "Rule of thumb from SMC traders: 'no inducement, no entry'. Wait for the first obvious low to be taken before trusting the zone below it." },
      ],
      quiz: [
        { q: "An inducement is…", options: ["A news event", "An early, obvious minor swing that traps traders", "An indicator", "A gap"], answer: 1, why: "It lures early entries." },
        { q: "What usually happens to the inducement?", options: ["It holds forever", "It gets swept before the real move", "It becomes the trend high", "It is ignored"], answer: 1, why: "Its stops are liquidity." },
        { q: "Why wait for the IDM to be taken?", options: ["To enter at a better zone with the trap cleared", "Because it's required by brokers", "It's random", "To avoid trading"], answer: 0, why: "Entering after the sweep avoids being the liquidity." },
      ],
    },
    {
      id: "swing-failure-pattern",
      title: "Swing Failure Pattern (SFP)",
      summary: "A wick beyond a swing that closes back inside: a failed breakout on one candle.",
      minutes: 5,
      terms: ["Swing Failure Pattern (SFP)"],
      blocks: [
        {
          t: "p",
          text: "A **swing failure pattern** happens when price trades beyond a clear swing high (or low) but the candle **closes back inside**. Breakout traders bought the new high, stops above the swing were triggered, and yet the market couldn't hold there. That failure often starts a move the other way.",
        },
        { t: "diagram", caption: "A real bearish SFP: the wick goes above the old swing high and the candle closes back below it.", spec: realSpec("sfp-bear", (r) => [level(r.lv["lvl"]!, "swing high", "gold", true, r.i("s"), r.i("f") + 3), hiTag(r, "f", "SFP", "down")]) },
        { t: "diagram", caption: "A real bullish SFP: the wick goes below the old swing low, the candle closes back above it, and price rallies.", spec: realSpec("sfp-bull", (r) => [level(r.lv["lvl"]!, "swing low", "gold", true, r.i("s"), r.i("f") + 3), loTag(r, "f", "SFP", "up")]) },
        {
          t: "spot",
          items: ["A clear, older swing high/low (the more obvious, the better).", "One candle trades through it…", "…and CLOSES back on the original side.", "Stop goes beyond the SFP wick; first target is the opposite side of the range."],
        },
      ],
      quiz: [
        { q: "What defines an SFP?", options: ["A close beyond the swing", "A wick beyond the swing and a close back inside", "A gap", "Three candles"], answer: 1, why: "The failure to close beyond is the signal." },
        { q: "Where does the stop go on a bearish SFP?", options: ["Below the swing", "Above the SFP wick", "At the swing high exactly", "No stop"], answer: 1, why: "If price goes beyond the wick, the failure has failed." },
        { q: "An SFP is closely related to…", options: ["A liquidity sweep", "A moving average cross", "A Renko brick", "A dividend"], answer: 0, why: "It's a sweep of the swing's stops on one candle." },
      ],
    },
  ],
};

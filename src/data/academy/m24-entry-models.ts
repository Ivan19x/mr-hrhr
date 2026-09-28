import type { Module } from "./types";
import { real, realSpec } from "./real";
import { hiTag, level, loTag, zone } from "./adv";

const sn = real("sniper");
const snOb = sn.i("ob");
const snConf = Math.min(sn.candles.length - 1, sn.i("rt") + 1);
const m22 = real("model-2022");
const crt = real("crt");

export const M24_ENTRY_MODELS: Module = {
  id: "entry-models",
  n: 24,
  title: "Entry Models",
  tagline: "Risk vs confirmation entries, the ICT 2022 model, the unicorn, candle range theory and the named ICT models.",
  icon: "🎯",
  lessons: [
    {
      id: "risk-vs-confirmation-entry",
      title: "Risk entries, confirmation entries and sniper entries",
      summary: "Enter at the zone, or wait for proof? The trade-off every model has to choose.",
      minutes: 6,
      terms: ["Confirmation Entry / Risk Entry", "Refined Entry / Sniper Entry"],
      blocks: [
        {
          t: "p",
          text: "A **risk entry** is a limit order placed at the zone (an order block, FVG, OTE level) before price reacts: best price, smallest stop, but you get filled on every failure too. A **confirmation entry** waits for the reaction (a bullish close, a lower-timeframe MSS) before entering: fewer losses, but a worse price and sometimes a missed move.",
        },
        {
          t: "diagram",
          caption: "Real chart: a risk entry would have been a limit order at the order block's top; a confirmation entry waits for the bullish close out of the zone.",
          spec: realSpec("sniper", (r) => [
            zone(snOb, r.candles.length - 1, r.lv["obBot"]!, r.lv["obTop"]!, "up", "order block"),
            level(r.lv["obTop"]!, "risk entry (limit)", "gold", true, r.i("fvg3"), r.candles.length - 1),
            level(r.candles[snConf]![3], "confirmation entry", "electric", true, snConf, r.candles.length - 1),
            level(r.lv["obBot"]!, "stop", "down", true, snOb, r.candles.length - 1),
            loTag(r, "rt", "reaction", "up"),
          ]),
        },
        {
          t: "table",
          head: ["", "Risk entry", "Confirmation entry", "Sniper (refined) entry"],
          rows: [
            ["When", "At the zone, before any reaction", "After a signal at the zone", "At a lower-timeframe zone inside the higher-timeframe one"],
            ["Stop", "Smallest", "Larger (beyond the reaction low)", "Smallest"],
            ["Win rate", "Lower", "Higher", "Lowest"],
            ["R:R", "High", "Lower", "Highest"],
          ],
        },
        { t: "callout", tone: "key", text: "Neither is 'right'. Pick one per setup type, write it into your plan, and let your journal decide which has the better expectancy for you." },
      ],
      quiz: [
        { q: "A risk entry is…", options: ["Entering after confirmation", "A limit order at the zone before a reaction", "Doubling size", "No stop"], answer: 1, why: "It risks being filled on failures." },
        { q: "Confirmation entries typically have…", options: ["A higher win rate but worse price", "Worse win rate and better price", "No stop", "No trade-off"], answer: 0, why: "You pay for the proof." },
        { q: "A sniper entry refines the zone by…", options: ["Using a lower timeframe inside the higher-timeframe zone", "Guessing", "Using RSI", "Removing the stop"], answer: 0, why: "Smaller zone, smaller stop." },
      ],
    },
    {
      id: "ict-2022-model",
      title: "The ICT 2022 mentorship model",
      summary: "Liquidity sweep, market structure shift, fair value gap entry, opposite liquidity target.",
      minutes: 8,
      terms: ["2022 ICT Mentorship Model"],
      blocks: [
        {
          t: "p",
          text: "The model ICT taught publicly in 2022 is four steps, and everything in it is something you've already learned: (1) price **sweeps liquidity** (an old low for a buy), (2) a **market structure shift** with displacement, (3) the displacement leaves a **fair value gap**: enter when price returns to it, (4) target the **opposite liquidity**.",
        },
        {
          t: "diagram",
          caption: `A real ICT 2022 model setup: sell-side swept, MSS above the last lower high, entry in the FVG, stop below the sweep low. It reached 2R.`,
          spec: realSpec("model-2022", (r) => [
            level(r.lo("Lp"), "old low (SSL)", "muted", true, r.i("Lp"), r.i("sweep") + 1),
            loTag(r, "sweep", "1. sweep", "down"),
            level(r.hi("LH"), "last lower high", "muted", true, r.i("LH"), r.i("mss") + 1),
            hiTag(r, "mss", "2. MSS", "up"),
            zone(r.i("f"), r.i("en") + 2, r.lv["bot"]!, r.lv["top"]!, "electric", "3. FVG entry"),
            level(r.lv["sl"]!, "stop", "down", true, r.i("en"), r.candles.length - 1),
            level(r.lv["tp"]!, "4. target 2R", "up", true, r.i("en"), r.candles.length - 1),
          ]),
        },
        {
          t: "flow",
          steps: [
            { title: "Context", text: `Higher-timeframe bias and a killzone. This example is on ${m22.source.split(" · ")[1]}.` },
            { title: "Sweep", text: "An obvious low (or high) is taken." },
            { title: "MSS", text: "Displacement closes through the last swing, leaving an FVG." },
            { title: "Entry", text: "Limit order in the FVG; stop beyond the sweep extreme." },
            { title: "Target", text: "The opposite liquidity pool; partials at 2R are common." },
          ],
        },
      ],
      quiz: [
        { q: "Step 1 of the 2022 model is…", options: ["An FVG", "A liquidity sweep", "A moving average cross", "News"], answer: 1, why: "Liquidity first." },
        { q: "Where is the entry?", options: ["At the sweep low", "In the FVG left by the MSS displacement", "At the target", "At the open"], answer: 1, why: "The return to the imbalance." },
        { q: "Where is the stop?", options: ["Beyond the sweep extreme", "Inside the FVG", "No stop", "At 50%"], answer: 0, why: "If the sweep low breaks, the idea is wrong." },
      ],
    },
    {
      id: "unicorn-model",
      title: "The unicorn model",
      summary: "A breaker block overlapping a fair value gap: two reasons in one zone.",
      minutes: 6,
      terms: ["Unicorn Model"],
      blocks: [
        {
          t: "p",
          text: "ICT calls a **breaker block that overlaps a fair value gap** a **unicorn**. The breaker shows a failed swing and a liquidity sweep; the FVG shows displacement. Where they overlap, you have a tight zone with two independent reasons to react.",
        },
        {
          t: "diagram",
          caption: "A real unicorn: after the sweep and the break of the high, the breaker (gold) and the fair value gap (blue) overlapped. Price returned there and continued up.",
          spec: realSpec("unicorn", (r) => [
            loTag(r, "L2", "sweep", "down"),
            hiTag(r, "brk", "break", "up"),
            zone(r.i("blk"), r.i("rt") + 3, r.lv["bBot"]!, r.lv["bTop"]!, "gold", "breaker"),
            zone(r.i("fvg"), r.i("rt") + 3, r.lv["fBot"]!, r.lv["fTop"]!, "electric", "FVG"),
            loTag(r, "rt", "unicorn entry", "up"),
          ]),
        },
        { t: "list", items: ["Entry: the overlap of breaker and FVG.", "Stop: below the breaker (or below the sweep low for more room).", "Target: the next buy-side liquidity."] },
      ],
      quiz: [
        { q: "A unicorn is…", options: ["An FVG alone", "A breaker block overlapping an FVG", "A rare candle", "A gap"], answer: 1, why: "Two PD arrays in one zone." },
        { q: "Why is the overlap attractive?", options: ["It's wide", "Two independent reasons in a tight zone", "It never fails", "No stop needed"], answer: 1, why: "Confluence plus a tight stop." },
        { q: "The breaker part tells you…", options: ["A swing failed after a sweep", "Volume is low", "It's Friday", "Nothing"], answer: 0, why: "That's how breakers form." },
      ],
    },
    {
      id: "candle-range-theory",
      title: "Candle range theory (CRT)",
      summary: "Every candle's range is liquidity for the next: raid one side, then run to the other.",
      minutes: 6,
      terms: ["Candle Range Theory (CRT)"],
      blocks: [
        {
          t: "p",
          text: "**Candle range theory** treats one higher-timeframe candle's high and low as a range. The next candle often **raids one side** (trades beyond the low, taking its stops), **closes back inside**, and then the following candle(s) move to the **opposite side** of the range. It is a liquidity sweep seen through single candles.",
        },
        {
          t: "diagram",
          caption: `Real CRT on ${crt.source.split(" · ")[1]}: candle 1 set the range; candle 2 raided its low and closed back inside; price then reached candle 1's high.`,
          spec: realSpec("crt", (r) => [
            level(r.lv["hi"]!, "candle 1 high (target)", "up", true, r.i("c1"), r.candles.length - 1),
            level(r.lv["lo"]!, "candle 1 low", "down", true, r.i("c1"), r.candles.length - 1),
            hiTag(r, "c1", "1", "gold"),
            loTag(r, "c2", "2: raid", "down"),
            hiTag(r, "hit", "3: target hit", "up"),
          ]),
        },
        { t: "list", items: ["Use a higher timeframe candle (4h, daily) as the range.", "Entry after candle 2 closes back inside; stop beyond candle 2's extreme.", "Target: the opposite end of candle 1. Refine the entry on a lower timeframe."] },
      ],
      quiz: [
        { q: "In CRT, candle 2 usually…", options: ["Gaps away", "Raids one side of candle 1 and closes back inside", "Is a doji", "Closes beyond candle 1's opposite side"], answer: 1, why: "The raid and reclaim." },
        { q: "The CRT target is…", options: ["Candle 2's close", "The opposite side of candle 1's range", "The 200 MA", "Nothing"], answer: 1, why: "Opposite liquidity." },
        { q: "CRT is really…", options: ["A liquidity sweep seen in single candles", "An indicator", "A news strategy", "A volume tool"], answer: 0, why: "Same concept, candle scale." },
      ],
    },
    {
      id: "ict-model-library",
      title: "The named ICT models: a summary",
      summary: "Turtle soup, OTE, silver bullet, power of three, the 20-pip model and one shot one kill on one page.",
      minutes: 6,
      terms: ["Turtle Soup / OTE / Silver Bullet / Power of Three models", "20 Pip Model / One Shot One Kill (OSOK)"],
      blocks: [
        { t: "p", text: "ICT gave names to many models. They are all combinations of the same building blocks (liquidity, displacement, PD arrays, time), so here they are side by side with the lessons that teach each part:" },
        {
          t: "table",
          head: ["Model", "Core idea", "Learn it in"],
          rows: [
            ["Turtle soup", "Fade the sweep of an old high/low", "Liquidity: Turtle soup"],
            ["OTE", "Enter a pullback at 62–79% of the displacement leg", "Fibonacci: OTE"],
            ["Silver bullet", "First FVG toward liquidity in a 1-hour window", "Time: silver bullet"],
            ["Power of three", "Buy the manipulation below the open on a bullish day", "Time: power of three"],
            ["2022 model", "Sweep → MSS → FVG → opposite liquidity", "Entry models: 2022 model"],
            ["Unicorn", "Breaker + FVG overlap", "Entry models: unicorn"],
            ["20-pip model", "Aim for a modest daily target (about 20 pips on majors) from a high-probability setup, then stop for the day", "Pro: risk and performance"],
            ["One shot one kill (OSOK)", "One well-planned trade per week toward the weekly draw on liquidity", "Time: weekly profiles"],
          ],
        },
        {
          t: "diagram",
          caption: "The building blocks all appear in one real 2022-model trade: sweep, displacement, FVG, target.",
          spec: realSpec("model-2022", (r) => [loTag(r, "sweep", "liquidity", "down"), hiTag(r, "mss", "displacement", "up"), zone(r.i("f"), r.i("en") + 2, r.lv["bot"]!, r.lv["top"]!, "electric", "PD array"), hiTag(r, "tgt", "target", "up")]),
        },
        { t: "callout", tone: "tip", text: "Master ONE model before collecting more. The 20-pip and OSOK ideas are really about restraint: take the high-probability trade, reach a sensible target, stop." },
      ],
      quiz: [
        { q: "What do all ICT models share?", options: ["Secret indicators", "Liquidity, displacement, PD arrays and time", "News only", "Martingale"], answer: 1, why: "Same building blocks, different recipes." },
        { q: "One shot one kill means…", options: ["Trading every candle", "One well-planned trade per week", "No stops", "Only crypto"], answer: 1, why: "Weekly single-trade discipline." },
        { q: "The 20-pip model is mostly about…", options: ["Maximum leverage", "A modest daily target and stopping after it", "Scalping 100 trades", "News"], answer: 1, why: "Consistency over home runs." },
      ],
    },
  ],
};

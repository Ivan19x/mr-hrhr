import type { Module, Note } from "./types";
import { real, realSpec } from "./real";
import { hiTag, level, loTag, vline, zone } from "./adv";

const ot = real("ote");
const otLo = ot.lo("A"), otHi = ot.hi("B"), otLeg = otHi - otLo;
const fx = real("fib-extension");
const fxLo = fx.lo("A"), fxHi = fx.hi("B"), fxLeg = fxHi - fxLo;
const cb = real("cbdr");
const cbW = cb.lv["hi"]! - cb.lv["lo"]!;
const sdLines: Note[] = [1, 2, 2.5, 3, 4].flatMap((k) => [
  level(cb.lv["lo"]! - k * cbW, `−${k} SD`, "down", true, cb.i("cb1"), cb.candles.length - 1),
  level(cb.lv["hi"]! + k * cbW, `+${k} SD`, "up", true, cb.i("cb1"), cb.candles.length - 1),
]).filter((n) => n.k === "hline" && n.p > Math.min(...cb.candles.map((c) => c[2])) - cbW && n.p < Math.max(...cb.candles.map((c) => c[1])) + cbW);

export const M20_FIB_PRO: Module = {
  id: "fib-pro",
  n: 20,
  title: "Fibonacci: Entries and Targets",
  tagline: "The optimal trade entry, extension targets and standard deviation projections.",
  icon: "🌀",
  lessons: [
    {
      id: "optimal-trade-entry",
      title: "Optimal trade entry (OTE)",
      summary: "The 62–79% retracement zone of a swing, with 70.5% as the sweet spot.",
      minutes: 6,
      terms: ["Optimal Trade Entry (OTE)"],
      blocks: [
        {
          t: "p",
          text: "ICT's **optimal trade entry** is the zone between the **62% and 79% retracement** of an impulse leg, with **70.5%** as the midpoint. It's deep enough to be in discount (for buys) and to have shaken out early traders, but not so deep that the leg is invalidated.",
        },
        {
          t: "diagram",
          caption: "A real OTE: the pullback reached the 62–79% zone of the impulse leg, then price broke to a new high.",
          spec: realSpec("ote", (r) => [
            zone(r.i("B"), r.i("C") + 3, otHi - 0.79 * otLeg, otHi - 0.62 * otLeg, "gold", "OTE 62–79%"),
            level(otHi - 0.705 * otLeg, "70.5%", "gold", true, r.i("B"), r.i("C") + 3),
            level(otHi - 0.5 * otLeg, "50%", "muted", true, r.i("B"), r.i("C") + 3),
            loTag(r, "A", "swing low", "up"),
            hiTag(r, "B", "swing high", "up"),
            loTag(r, "C", "entry zone", "electric"),
            hiTag(r, "T", "target", "up"),
          ]),
        },
        {
          t: "list",
          ordered: true,
          items: ["Identify a displacement leg that broke structure.", "Draw Fibonacci from the leg's low to its high (for buys).", "Wait for the pullback into 62–79%, ideally overlapping an OB or FVG.", "Stop below the leg's low (100%); first target the leg's high, then extensions."],
        },
      ],
      quiz: [
        { q: "The OTE zone is…", options: ["23.6–38.2%", "62–79%", "100–127%", "0–10%"], answer: 1, why: "ICT's optimal trade entry." },
        { q: "OTE's sweet spot is about…", options: ["50%", "70.5%", "88.6%", "161.8%"], answer: 1, why: "The midpoint of 62 and 79." },
        { q: "Where is the stop for a bullish OTE?", options: ["At 50%", "Below the leg's low", "At the high", "None"], answer: 1, why: "Beyond 100%, the leg is invalid." },
      ],
    },
    {
      id: "fibonacci-extensions",
      title: "Fibonacci extensions",
      summary: "Projecting targets beyond the swing: 127.2% and 161.8%.",
      minutes: 5,
      terms: ["Fibonacci Extension"],
      blocks: [
        {
          t: "p",
          text: "Retracements find entries **inside** a swing; **extensions** find targets **beyond** it. Draw the Fibonacci tool on the leg (low to high for a buy); the 127.2% and 161.8% levels above the high are common take-profit zones where the next leg often stalls.",
        },
        {
          t: "diagram",
          caption: `A real move: after the pullback, price rallied to the ${fx.lv["ext"]! > 1.5 ? "161.8%" : "127.2%"} extension of the first leg and reversed there.`,
          spec: realSpec("fib-extension", (r) => [
            level(fxHi, "100%", "muted", true, r.i("A"), r.candles.length - 1),
            level(fxLo + 1.272 * fxLeg, "127.2%", "gold", true, r.i("A"), r.candles.length - 1),
            level(fxLo + 1.618 * fxLeg, "161.8%", "gold", true, r.i("A"), r.candles.length - 1),
            loTag(r, "A", "0%", "muted"),
            hiTag(r, "B", "100%", "muted"),
            hiTag(r, "D", "extension hit", "down"),
          ]),
        },
        { t: "table", head: ["Extension", "Typical use"], rows: [["127.2%", "First target; conservative"], ["161.8%", "Main target in strong trends"], ["200–261.8%", "Extended targets; runners only"]] },
      ],
      quiz: [
        { q: "Extensions are used for…", options: ["Entries inside the swing", "Targets beyond the swing", "Stops only", "Volume"], answer: 1, why: "They project past 100%." },
        { q: "Two common extension targets are…", options: ["23.6% and 38.2%", "127.2% and 161.8%", "50% and 61.8%", "0% and 100%"], answer: 1, why: "The classic take-profit levels." },
        { q: "For a buy, you draw the tool from…", options: ["High to low", "The leg's low to its high", "Open to close", "Any two candles"], answer: 1, why: "Then read levels above the high." },
      ],
    },
    {
      id: "sd-projections",
      title: "Standard deviation projections",
      summary: "Multiples of a reference range that mark where the day's move may end.",
      minutes: 6,
      terms: ["Standard Deviation Projections"],
      blocks: [
        {
          t: "p",
          text: "ICT's **standard deviation projections** take a reference range (a manipulation leg, the CBDR, the Asian range) and project it in multiples: 1, 2, 2.5, 3, 4 range-widths away. Those levels are where the day's expansion often stops. It's 'Fibonacci on a range': −1, −2, −2.5, −4 on the tool.",
        },
        {
          t: "diagram",
          caption: `A real example: the small range formed before the session (gold box). The next day's ${cb.lv["dnSd"]! > (cb.lv["upSd"] ?? 0) ? "low" : "high"} landed near ${Math.round(Math.max(cb.lv["dnSd"]!, cb.lv["upSd"]!) * 10) / 10} range-widths away.`,
          spec: realSpec("cbdr", (r) => [zone(0, r.i("cb1"), r.lv["lo"]!, r.lv["hi"]!, "gold", "reference range"), vline(r.i("cb1"), "range ends", "muted"), ...sdLines]),
        },
        { t: "callout", tone: "tip", text: "Projections work best when the reference range is small and the day has a clear bias. They are target zones, not reversal signals by themselves." },
      ],
      quiz: [
        { q: "SD projections are multiples of…", options: ["The ATR", "A reference range", "The spread", "The 200 MA"], answer: 1, why: "The range is the unit." },
        { q: "Common projection levels are…", options: ["1, 2, 2.5, 3 and 4", "0.1 and 0.2", "10 and 20", "Only 1"], answer: 0, why: "ICT's usual multiples." },
        { q: "Projections work best when the reference range is…", options: ["Huge", "Small, with a clear daily bias", "Missing", "On the monthly chart"], answer: 1, why: "A tight range gives precise levels." },
      ],
    },
  ],
};

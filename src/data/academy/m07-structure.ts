import type { DiagramSpec, Module, Note } from "./types";
import { real, swings, type Real } from "./real";

// ---------------------------------------------------------------- real examples
const up = real("trend-up");
const dn = real("trend-down");
const rg = real("range");

/** HH/HL (or LH/LL) labels on every swing of a real trend. */
function trendDots(r: Real, dir: 1 | -1): Note[] {
  const sw = swings(r);
  const seen = { H: false, L: false };
  return sw.map((s) => {
    const first = !seen[s.kind];
    seen[s.kind] = true;
    const text = first ? s.kind : dir === 1 ? (s.kind === "H" ? "HH" : "HL") : s.kind === "H" ? "LH" : "LL";
    const p = s.kind === "H" ? r.hi(s.name) : r.lo(s.name);
    return { k: "dot", i: s.i, p, text, color: dir === 1 ? "up" : "down", pos: s.kind === "H" ? "above" : "below" };
  });
}

const rangeNotes = (r: Real): Note[] => [
  { k: "hline", p: r.lv["top"]!, color: "down", dash: true, text: "range high" },
  { k: "hline", p: r.lv["bot"]!, color: "up", dash: true, text: "range low" },
];

const spec = (r: Real, notes: Note[], extra: Partial<DiagramSpec> = {}): DiagramSpec => ({ candles: r.candles, notes, source: r.source, ...extra });
const small = (r: Real, notes: Note[]): DiagramSpec => spec(r, notes, { height: 190, source: r.source.replace("Real chart · ", "") });

const rr = real("breakout-retest");
const tl = real("trendline");
const bc = real("bos-choch");

export const M07_STRUCTURE: Module = {
  id: "structure",
  n: 7,
  title: "Trends & Structure",
  tagline: "Higher highs, support, trendlines, BOS and CHoCH: the skeleton of every chart.",
  icon: "📈",
  lessons: [
    {
      id: "trends",
      title: "Uptrends, downtrends and ranges",
      summary: "Define a trend objectively with swing highs and lows.",
      minutes: 5,
      blocks: [
        { t: "p", text: "Markets move in waves. The turning points are **swing highs** (peaks) and **swing lows** (troughs). Their sequence defines the trend. No opinion needed." },
        {
          t: "gallery",
          items: [
            { title: "Uptrend: higher highs (HH) + higher lows (HL)", tone: "up", text: "Each peak and each dip is higher than the last. Buyers control.", spec: small(up, trendDots(up, 1)) },
            { title: "Downtrend: lower highs (LH) + lower lows (LL)", tone: "down", text: "Each rally and each drop is lower than the last. Sellers control.", spec: small(dn, trendDots(dn, -1)) },
            { title: "Range (sideways)", tone: "gold", text: "Highs and lows at similar levels. Nobody controls; price bounces between a ceiling and a floor.", spec: small(rg, rangeNotes(rg)) },
          ],
        },
        { t: "callout", tone: "key", text: "The trend is intact as long as the pattern holds. An uptrend is in danger when price makes a **lower low** (breaks the last higher low)." },
      ],
      quiz: [
        { q: "An uptrend is defined by…", options: ["Lower highs and lower lows", "Higher highs and higher lows", "Big candles", "Rising volume only"], answer: 1, why: "HH + HL." },
        { q: "What first warns an uptrend may be ending?", options: ["A new higher high", "Price breaking below the last higher low", "A green candle", "A doji"], answer: 1, why: "Breaking the last HL breaks the pattern." },
        { q: "In a range, highs and lows are…", options: ["Rising", "Falling", "At similar levels", "Random"], answer: 2, why: "Price moves sideways between two levels." },
      ],
    },
    {
      id: "support-resistance",
      title: "Support, resistance and role reversal",
      summary: "The price levels the market remembers.",
      minutes: 6,
      blocks: [
        {
          t: "list",
          items: [
            "**Support**: a price zone where buying has stopped falls before. A floor.",
            "**Resistance**: a zone where selling has stopped rallies before. A ceiling.",
            "They're **zones**, not exact lines. Draw them through the cluster of wicks and bodies.",
            "The **more touches** and the **bigger the timeframe**, the stronger the level.",
          ],
        },
        {
          t: "diagram",
          caption: "Role reversal on a real chart: resistance is tested twice, breaks, price comes back to retest it from above, and old resistance becomes new support.",
          spec: (() => {
            const L = rr.lv["L"]!;
            const band = (rr.hi("A") - rr.lo("A")) * 0.25;
            return spec(rr, [
              { k: "zone", i1: rr.i("A") - 1, i2: rr.i("br"), p1: L - band, p2: L + band, color: "down", text: "resistance" },
              { k: "zone", i1: rr.i("br"), i2: rr.candles.length - 1, p1: L - band, p2: L + band, color: "up", text: "…becomes support" },
              { k: "arrow", i: rr.i("rt"), p: rr.lo("rt"), dir: "up", color: "up", text: "retest" },
            ]);
          })(),
        },
        {
          t: "p",
          text: "Why do levels work? Traders remember them. Those who missed the first move place orders there, those who are trapped want to exit at break-even, and stop losses cluster just beyond them.",
        },
        { t: "spot", items: ["Several wicks turning at the same area", "Round numbers (1.1000, 2000.00)", "Previous day / week highs and lows", "Old resistance after a breakout (retest zone)"] },
      ],
      quiz: [
        { q: "Support is where…", options: ["Selling stopped rallies", "Buying stopped declines", "Volume is zero", "The spread is widest"], answer: 1, why: "It's a floor made by buyers." },
        { q: "After resistance breaks, it often becomes…", options: ["Irrelevant", "Support", "Stronger resistance", "A gap"], answer: 1, why: "Role reversal." },
        { q: "Levels are best drawn as…", options: ["Exact single-pip lines", "Zones", "Diagonal only", "Random"], answer: 1, why: "Markets respect areas, not exact ticks." },
      ],
    },
    {
      id: "trendlines-channels",
      title: "Trendlines and channels",
      summary: "Diagonal support and resistance that follow the trend.",
      minutes: 4,
      blocks: [
        {
          t: "diagram",
          caption: "A real rising trendline: two higher lows draw it, the third touch confirms it.",
          spec: (() => {
            const a = tl.i("a");
            const b = tl.i("b");
            const last = tl.candles.length - 1;
            const slope = (tl.lo("b") - tl.lo("a")) / (b - a);
            const at = (i: number) => tl.lo("a") + slope * (i - a);
            return spec(tl, [
              { k: "line", i1: a, p1: at(a), i2: last, p2: at(last), color: "up", text: "trendline" },
              { k: "dot", i: a, p: tl.lo("a"), color: "up", text: "1", pos: "below" },
              { k: "dot", i: b, p: tl.lo("b"), color: "up", text: "2", pos: "below" },
              { k: "dot", i: tl.i("c"), p: tl.lo("c"), color: "gold", text: "3 (confirms)", pos: "below" },
            ]);
          })(),
        },
        {
          t: "list",
          items: [
            "Uptrend line: connect at least **two higher lows**; a third touch confirms it.",
            "Downtrend line: connect at least two lower highs.",
            "A **channel** adds a parallel line on the other side. Price tends to swing between them.",
            "Don't force it: if you must cut through lots of candles, it isn't a real line.",
          ],
        },
        { t: "callout", tone: "warn", text: "A trendline break is a warning, not a reversal signal. Confirm with structure: wait for a lower low (in an uptrend) before calling the turn." },
      ],
      quiz: [
        { q: "An uptrend line connects…", options: ["Higher highs", "Higher lows", "Random candles", "Closes only"], answer: 1, why: "It sits under the rising lows." },
        { q: "How many touches confirm a trendline?", options: ["1", "At least 2, ideally 3", "10", "0"], answer: 1, why: "Two points draw it, a third confirms it." },
        { q: "A trendline break alone means…", options: ["Guaranteed reversal", "A warning. Check structure.", "Nothing", "Buy more"], answer: 1, why: "Structure confirms the change." },
      ],
    },
    {
      id: "bos-choch",
      title: "Break of Structure and Change of Character",
      summary: "The two events that confirm a trend continues, or ends.",
      minutes: 6,
      blocks: [
        {
          t: "list",
          items: [
            "**BOS (Break of Structure)**: price breaks the last swing point **in the trend's direction** (a new HH in an uptrend). The trend continues.",
            "**CHoCH (Change of Character)**: price breaks the last swing point **against the trend** (breaks the last HL in an uptrend). The first sign the trend has changed.",
          ],
        },
        {
          t: "diagram",
          caption: "A real chart: higher lows and a BOS confirm the uptrend. Then a candle closes below the last higher low (CHoCH) and the trend flips down.",
          spec: spec(bc, [
            { k: "line", i1: bc.i("H1"), p1: bc.hi("H1"), i2: bc.i("bos1"), p2: bc.hi("H1"), color: "up", text: "BOS" },
            { k: "dot", i: bc.i("L2"), p: bc.lo("L2"), color: "up", text: "HL", pos: "below" },
            { k: "dot", i: bc.i("H3"), p: bc.hi("H3"), color: "up", text: "HH", pos: "above" },
            { k: "dot", i: bc.i("L4"), p: bc.lo("L4"), color: "gold", text: "last HL", pos: "below" },
            { k: "line", i1: bc.i("L4"), p1: bc.lo("L4"), i2: bc.i("ch"), p2: bc.lo("L4"), color: "down", text: "CHoCH" },
          ]),
        },
        { t: "callout", tone: "key", text: "Use **closes**, not wicks, to confirm a break. A wick through a level that closes back inside is a sweep, not a break." },
        { t: "callout", tone: "tip", text: "This is exactly what the Break of Structure levels in the Play section train, on real charts. Try them after this lesson." },
      ],
      quiz: [
        { q: "In an uptrend, a BOS is…", options: ["Breaking the last higher low", "Breaking above the last higher high", "Any red candle", "A doji"], answer: 1, why: "A break in the trend's direction." },
        { q: "A CHoCH in an uptrend happens when price…", options: ["Makes a new high", "Breaks below the last higher low", "Stays flat", "Gaps up"], answer: 1, why: "Breaking against the trend changes its character." },
        { q: "What confirms a structure break best?", options: ["A wick", "A candle close beyond the level", "Volume alone", "Time"], answer: 1, why: "Closes show acceptance beyond the level." },
      ],
    },
    {
      id: "ranges",
      title: "Trading ranges and consolidation",
      summary: "When the trend pauses: sideways markets and how they end.",
      minutes: 4,
      blocks: [
        {
          t: "diagram",
          caption: "A real range: sell near the top, buy near the bottom. Or wait for the breakout.",
          spec: (() => {
            const top = rg.lv["top"]!;
            const bot = rg.lv["bot"]!;
            const band = (top - bot) * 0.12;
            return spec(rg, [
              { k: "zone", i1: 0, i2: rg.candles.length - 1, p1: top - band, p2: top, color: "down", text: "sell zone" },
              { k: "zone", i1: 0, i2: rg.candles.length - 1, p1: bot, p2: bot + band, color: "up", text: "buy zone" },
              { k: "hline", p: (top + bot) / 2, text: "mid (equilibrium)", color: "muted", dash: true },
            ]);
          })(),
        },
        {
          t: "list",
          items: [
            "Ranges form when buyers and sellers are balanced: after a big move, before news, in quiet sessions.",
            "The **middle** of a range is the worst place to trade: no edge, stops on both sides.",
            "Ranges end with a **breakout**. The longer the range, the bigger the eventual move.",
            "Watch for **fake breakouts**: a wick outside the range that closes back inside often sends price to the other side.",
          ],
        },
      ],
      quiz: [
        { q: "The worst place to open a trade in a range is…", options: ["Near support", "Near resistance", "The middle", "After a breakout retest"], answer: 2, why: "No edge in the middle." },
        { q: "A wick outside a range that closes back inside is…", options: ["A confirmed breakout", "Often a fake breakout", "A BOS", "A gap"], answer: 1, why: "Price was rejected outside the range." },
        { q: "Longer ranges tend to lead to…", options: ["Smaller breakouts", "Bigger breakouts", "No breakouts", "Lower volume forever"], answer: 1, why: "Built-up orders release together." },
      ],
    },
  ],
};

// ---------------------------------------------------------------- Module 8
const hs = real("head-shoulders");
const dt = real("double-top");
const db = real("double-bottom");
const ta = real("triangle-asc");
const td = real("triangle-desc");
const tsym = real("triangle-sym");
const fl = real("bull-flag");
const wd = real("rising-wedge");
const cup = real("cup-handle");

const keys = (r: Real, prefix: string) => Object.keys(r.pts).filter((k) => new RegExp(`^${prefix}\\d+$`).test(k)).sort((a, b) => r.i(a) - r.i(b));
/** Line through the first and last points of a series of swing highs (h) or lows (l), extended to `to`. */
function fitLine(r: Real, prefix: "h" | "l", to: number): Note {
  const ks = keys(r, prefix);
  const a = ks[0]!;
  const b = ks[ks.length - 1]!;
  const pa = prefix === "h" ? r.hi(a) : r.lo(a);
  const pb = prefix === "h" ? r.hi(b) : r.lo(b);
  const slope = (pb - pa) / (r.i(b) - r.i(a));
  return { k: "line", i1: r.i(a), p1: pa, i2: to, p2: pa + slope * (to - r.i(a)), color: prefix === "h" ? "down" : "up", dash: true };
}

export const M08_PATTERNS: Module = {
  id: "chart-patterns",
  n: 8,
  title: "Chart Patterns",
  tagline: "Big shapes the crowd creates: reversals, continuations, and their targets.",
  icon: "🔺",
  lessons: [
    {
      id: "head-shoulders",
      title: "Head and shoulders",
      summary: "The classic trend-reversal pattern and its measured target.",
      minutes: 6,
      blocks: [
        {
          t: "diagram",
          caption: "A real head and shoulders: left shoulder, higher head, lower right shoulder. The neckline break triggers the sell.",
          spec: spec(hs, [
            { k: "label", i: hs.i("LS"), p: hs.hi("LS"), text: "left shoulder", color: "muted" },
            { k: "label", i: hs.i("HD"), p: hs.hi("HD"), text: "head", color: "down" },
            { k: "label", i: hs.i("RS"), p: hs.hi("RS"), text: "right shoulder", color: "muted" },
            { k: "line", i1: hs.i("T1"), p1: hs.lo("T1"), i2: hs.i("br"), p2: hs.lo("T1") + ((hs.lo("T2") - hs.lo("T1")) * (hs.i("br") - hs.i("T1"))) / (hs.i("T2") - hs.i("T1")), color: "gold", text: "neckline" },
            { k: "arrow", i: hs.i("br"), p: hs.hi("br"), dir: "down", color: "down", text: "break" },
          ]),
        },
        {
          t: "list",
          items: [
            "Forms after an **uptrend**. The head is the final higher high; the right shoulder is the first **lower high**: buyers are failing.",
            "**Entry**: on a close below the neckline (or its retest from below).",
            "**Stop**: above the right shoulder.",
            "**Target**: distance from head to neckline, projected down from the break.",
            "**Inverse head and shoulders** is the bullish mirror at the bottom of a downtrend.",
          ],
        },
      ],
      quiz: [
        { q: "What triggers a head-and-shoulders sell?", options: ["The head forming", "A close below the neckline", "The left shoulder", "Any red candle"], answer: 1, why: "The neckline break confirms." },
        { q: "The measured target is…", options: ["Random", "Head-to-neckline height projected from the break", "Twice the spread", "The left shoulder"], answer: 1, why: "Classic measured move." },
        { q: "The inverse H&S is…", options: ["Bearish", "Bullish", "Neutral", "A range"], answer: 1, why: "Mirror image at a bottom." },
      ],
    },
    {
      id: "double-top-bottom",
      title: "Double tops and double bottoms",
      summary: "Two failed attempts at one level: the 'M' and the 'W'.",
      minutes: 5,
      blocks: [
        {
          t: "gallery",
          items: [
            {
              title: "Double top (M): bearish",
              tone: "down",
              text: "Two peaks at the same resistance. Sell on the break of the valley (neckline).",
              spec: small(dt, [
                { k: "hline", p: dt.lv["top"]!, color: "down", dash: true, text: "resistance", i1: dt.i("A") - 2 },
                { k: "hline", p: dt.lv["neck"]!, color: "gold", i1: dt.i("A"), text: "neckline" },
                { k: "dot", i: dt.i("A"), p: dt.hi("A"), color: "down", text: "1" },
                { k: "dot", i: dt.i("B"), p: dt.hi("B"), color: "down", text: "2" },
              ]),
            },
            {
              title: "Double bottom (W): bullish",
              tone: "up",
              text: "Two troughs at the same support. Buy on the break of the peak between them.",
              spec: small(db, [
                { k: "hline", p: db.lv["top"]!, color: "up", dash: true, text: "support", i1: db.i("A") - 2 },
                { k: "hline", p: db.lv["neck"]!, color: "gold", i1: db.i("A"), text: "neckline" },
                { k: "dot", i: db.i("A"), p: db.lo("A"), color: "up", text: "1", pos: "below" },
                { k: "dot", i: db.i("B"), p: db.lo("B"), color: "up", text: "2", pos: "below" },
              ]),
            },
          ],
        },
        { t: "spot", items: ["Two clear touches at roughly the same level", "A meaningful dip/rally between them", "Second touch often on lower momentum (smaller candles, RSI divergence)", "Confirmation = close through the neckline"] },
        { t: "callout", tone: "tip", text: "A triple top/bottom is the same idea with three touches, and even more stops sitting beyond the level." },
      ],
      quiz: [
        { q: "A double bottom looks like the letter…", options: ["M", "W", "V", "L"], answer: 1, why: "Two lows with a peak between." },
        { q: "A double top is confirmed when price…", options: ["Touches resistance twice", "Closes below the neckline", "Makes a third top", "Gaps"], answer: 1, why: "The valley break confirms it." },
        { q: "Double tops appear…", options: ["After a rise", "After a fall", "Only in ranges", "Only on crypto"], answer: 0, why: "They are bearish reversals at the top." },
      ],
    },
    {
      id: "triangles",
      title: "Triangles",
      summary: "Ascending, descending and symmetrical: pressure building before a breakout.",
      minutes: 5,
      blocks: [
        {
          t: "gallery",
          items: [
            { title: "Ascending (bullish bias)", tone: "up", text: "Flat top, rising lows. Buyers keep getting more aggressive. Usually breaks up.", spec: small(ta, [fitLine(ta, "h", ta.i("br")), fitLine(ta, "l", ta.i("br")), { k: "arrow", i: ta.i("br"), p: ta.lo("br"), dir: "up", color: "up", text: "break" }]) },
            { title: "Descending (bearish bias)", tone: "down", text: "Flat bottom, falling highs. Sellers keep getting more aggressive. Usually breaks down.", spec: small(td, [fitLine(td, "h", td.i("br")), fitLine(td, "l", td.i("br")), { k: "arrow", i: td.i("br"), p: td.hi("br"), dir: "down", color: "down", text: "break" }]) },
            { title: "Symmetrical (neutral)", tone: "gold", text: "Lower highs AND higher lows. Breaks tend to follow the prior trend.", spec: small(tsym, [fitLine(tsym, "h", tsym.i("br")), fitLine(tsym, "l", tsym.i("br"))]) },
          ],
        },
        { t: "callout", tone: "key", text: "Target: the height of the triangle's widest part, projected from the breakout. Enter on a close outside, stop inside the triangle." },
      ],
      quiz: [
        { q: "Ascending triangle: flat top and…", options: ["Falling lows", "Rising lows", "Flat lows", "No lows"], answer: 1, why: "Buyers push the lows up into flat resistance." },
        { q: "A descending triangle usually breaks…", options: ["Up", "Down", "Sideways", "Never"], answer: 1, why: "Sellers press on flat support." },
        { q: "Symmetrical triangles usually break…", options: ["Always up", "In the direction of the prior trend", "Always down", "Randomly never"], answer: 1, why: "They're usually continuation pauses." },
      ],
    },
    {
      id: "flags-pennants",
      title: "Flags and pennants",
      summary: "Short pauses after a strong move: continuation patterns.",
      minutes: 4,
      blocks: [
        {
          t: "diagram",
          caption: "A real bull flag: a sharp pole, a small pause that holds near the top, then continuation.",
          spec: spec(fl, [
            { k: "bracket", i: fl.i("e"), p1: fl.lo("s"), p2: fl.hi("e"), text: "pole", color: "up", side: "left" },
            { k: "zone", i1: fl.i("e"), i2: fl.i("fe"), p1: fl.lv["flagBot"]!, p2: fl.lv["flagTop"]!, color: "gold", text: "flag" },
            { k: "arrow", i: fl.i("br"), p: fl.lo("br"), dir: "up", color: "up", text: "breakout" },
          ]),
        },
        {
          t: "list",
          items: [
            "**Pole**: a strong, fast move (big candles, high volume).",
            "**Flag**: a small channel sloping against the pole. **Pennant**: a tiny symmetrical triangle instead.",
            "The pause should be short and shallow (ideally retracing under 50% of the pole).",
            "Bear flags and bear pennants are the mirror image in downtrends.",
          ],
        },
      ],
      quiz: [
        { q: "Flags are usually…", options: ["Reversal patterns", "Continuation patterns", "Meaningless", "Only bearish"], answer: 1, why: "They pause, then continue the pole's direction." },
        { q: "Target for a flag?", options: ["Pole length projected from the breakout", "The flag height", "Twice the spread", "Previous low"], answer: 0, why: "Measured move = the pole." },
        { q: "A healthy flag retraces…", options: ["Over 100% of the pole", "A small part (under ~50%)", "Exactly 0%", "Only in sessions"], answer: 1, why: "Deep retracements weaken the pattern." },
      ],
    },
    {
      id: "wedges",
      title: "Rising and falling wedges",
      summary: "Converging lines sloping the same way: exhaustion patterns.",
      minutes: 4,
      blocks: [
        {
          t: "diagram",
          caption: "A real rising wedge: both lines slope up but converge. Each push up gains less, then it breaks DOWN.",
          spec: spec(wd, [fitLine(wd, "h", wd.i("br")), fitLine(wd, "l", wd.i("br")), { k: "arrow", i: wd.i("br"), p: wd.hi("br"), dir: "down", color: "down", text: "break" }]),
        },
        {
          t: "list",
          items: [
            "**Rising wedge**: bearish. Buyers make higher highs but with shrinking progress.",
            "**Falling wedge**: bullish. Sellers make lower lows but with shrinking progress.",
            "Often shows momentum divergence (RSI/MACD) inside the wedge.",
          ],
        },
      ],
      quiz: [
        { q: "A rising wedge usually breaks…", options: ["Up", "Down", "Sideways", "Never"], answer: 1, why: "Upside momentum is fading." },
        { q: "How does a wedge differ from a triangle?", options: ["Both lines slope the same way", "It has no lines", "It's always flat", "No difference"], answer: 0, why: "Wedges tilt; triangles have a flat or opposite-sloping side." },
        { q: "A falling wedge is…", options: ["Bearish", "Bullish", "Neutral", "A double top"], answer: 1, why: "Selling pressure is shrinking." },
      ],
    },
    {
      id: "cup-handle",
      title: "Cup and handle",
      summary: "A rounded bottom and a small pullback before a breakout.",
      minutes: 3,
      blocks: [
        {
          t: "diagram",
          caption: "A real cup and handle: a rounded 'U' back to the old high, a shallow handle, then a breakout above the rim.",
          spec: spec(cup, [
            { k: "hline", p: cup.lv["rim"]!, text: "rim", color: "gold", dash: true },
            { k: "label", i: Math.round((cup.i("A") + cup.i("B")) / 2), p: cup.lv["bottom"]!, text: "cup", pos: "below", color: "muted" },
            { k: "label", i: Math.round((cup.i("B") + cup.i("br")) / 2), p: cup.lv["rim"]!, text: "handle", pos: "above", color: "muted" },
            { k: "arrow", i: cup.i("br"), p: cup.lo("br"), dir: "up", color: "up", text: "breakout" },
          ]),
        },
        { t: "p", text: "The rounded cup shows a slow, orderly shift from sellers to buyers. The handle shakes out weak holders one last time. Target: cup depth projected from the rim." },
      ],
      quiz: [
        { q: "The cup's bottom should be…", options: ["Sharp V", "Rounded U", "Flat line", "Gapped"], answer: 1, why: "Rounded = gradual accumulation." },
        { q: "Entry trigger?", options: ["Inside the cup", "Break above the rim after the handle", "At the handle low", "Anywhere"], answer: 1, why: "Breakout above resistance." },
        { q: "Cup and handle is typically…", options: ["Bearish", "Bullish continuation", "A double top", "Indecision"], answer: 1, why: "It resolves upward." },
      ],
    },
  ],
};

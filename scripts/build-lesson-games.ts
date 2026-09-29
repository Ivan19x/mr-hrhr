// Builds the GAME at the end of every Academy lesson: a set of real-chart levels on
// that lesson's concept. Bigger lessons get more charts (3 + 1 per syllabus term
// + 1 per 3 content blocks, up to 8).
//   node scripts/dump-lessons.mjs && node scripts/build-lesson-games.ts
// Game kinds:
//   pattern  – a detector finds the concept on real history; the player marks it
//              (candle, swings, zone or level), trades it and answers questions
//   strategy – reuse a strategy track's real setups (different charts from the track)
//   general  – real break-of-structure trades for concept lessons (brokers, psychology…)
// Questions come from the lesson's own quiz, plus a tap question on the chart.
// Rare patterns: only genuine examples of the lesson's own concept are used. If fewer
// than 3 real charts exist, the lesson has no game and stays general knowledge
// (its description and single real example), completed by its quiz.
// Output: src/data/real/lessons/m<N>.json (compact levels) + src/data/real/lessonGames.json
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { AFTER, CTX, D, SPECS, TF, bosSetups, outcome, round, type Compact, type KeyMark, type Setup, type Spec } from "./level-specs.ts";
import type { Cand, Ctx } from "./detect.ts";
import type { AnswerMark, Level, MarkType, Question } from "../src/types/game.ts";

type Quiz = { q: string; options: string[]; answer: number; why: string };
type Lesson = { id: string; title: string; module: number; moduleTitle: string; blocks: number; terms: string[]; quiz: Quiz[] };
const LESSONS: Lesson[] = JSON.parse(await readFile(new URL("./.cache/lessons.json", import.meta.url), "utf8"));

// ------------------------------------------------------------------ game table
type Dir = "buy" | "sell" | "lv:dir" | "lv:bull" | "pts:-kind" | "rev";
/** keys: "name" = the pattern candle, "name:H" / "name:L" = a swing high / low. */
type Item = {
  det: string;
  label: string;
  dir: Dir;
  keys?: string[];
  decide: string; // point name, optionally "+n" candles later
  zone?: { top: string; bot: string; from: string; to: string; type: "FVG" | "ORDER_BLOCK" };
  line?: { lv: string; from: string; to: string };
};
type Game = { kind: "pattern"; items: Item[]; also?: string[] } | { kind: "strategy"; ids: string[] } | { kind: "general" } | { kind: "knowledge" };

const S = (...ids: string[]): Game => ({ kind: "strategy", ids });
const G: Game = { kind: "general" };
/** General knowledge: description + one real example, no game. */
const K: Game = { kind: "knowledge" };
const P = (...items: Item[]): Game => ({ kind: "pattern", items });
/** Pattern game that can also draw on a strategy track's kind of setup when the pattern is rare. */
const PA = (also: string[], ...items: Item[]): Game => ({ kind: "pattern", items, also });
const pat = (det: string, label: string, dir: Dir, key = "k", decide?: string): Item => ({ det, label, dir, keys: [key], decide: decide ?? key });

const GAMES: Record<string, Game> = {
  // M1–M2: basics and market infrastructure
  "what-is-trading": S("trends"), markets: G, "long-short": S("trends"), "bid-ask-spread": G, "pips-lots-leverage": S("rr"), "order-types": S("trends"),
  "what-brokers-do": G, "broker-models": G, "market-plumbing": G, "order-journey": G, "order-book": G, "platforms-data": G, regulation: G,
  // M3–M5: candles
  "candle-ohlc": P(pat("marubozu-bull", "bullish marubozu", "buy"), pat("marubozu-bear", "bearish marubozu", "sell")),
  "buyers-sellers": P(pat("engulfing-bull", "bullish engulfing", "buy"), pat("engulfing-bear", "bearish engulfing", "sell")),
  wicks: P(pat("pin-bar", "bullish pin bar", "buy"), pat("shooting-star", "shooting star", "sell")),
  "body-momentum": P(pat("marubozu-bull", "bullish marubozu", "buy"), pat("marubozu-bear", "bearish marubozu", "sell")),
  "timeframes-candles": P(pat("hammer", "hammer", "buy"), pat("shooting-star", "shooting star", "sell")),
  marubozu: P(pat("marubozu-bull", "bullish marubozu", "buy"), pat("marubozu-bear", "bearish marubozu", "sell")),
  doji: P(pat("doji-dragonfly", "dragonfly doji", "buy"), pat("doji-gravestone", "gravestone doji", "sell"), pat("doji", "doji after a strong move", "rev")),
  "hammer-hanging-man": P(pat("hammer-game", "hammer", "buy"), pat("hanging-man-game", "hanging man", "sell")),
  "inverted-hammer-shooting-star": P(pat("inverted-hammer-game", "inverted hammer", "buy"), pat("shooting-star-game", "shooting star", "sell")),
  "spinning-top": P(pat("spinning-top", "spinning top", "rev")),
  "pin-bar": P(pat("pin-bar", "bullish pin bar", "buy")),
  engulfing: P(pat("engulfing-bull", "bullish engulfing", "buy"), pat("engulfing-bear", "bearish engulfing", "sell")),
  harami: P(pat("harami-bull", "bullish harami", "buy"), pat("harami-bear", "bearish harami", "sell")),
  tweezers: P(pat("tweezer-bottom", "tweezer bottom", "buy"), pat("tweezer-top", "tweezer top", "sell")),
  "piercing-dark-cloud": P(pat("piercing", "piercing line", "buy"), pat("dark-cloud", "dark cloud cover", "sell")),
  "inside-outside-bar": P(pat("outside-bar", "outside bar", "buy"), { det: "hikkake-bull", label: "inside bar (hikkake)", dir: "buy", keys: ["ib"], decide: "conf" }),
  "three-candle": P(pat("morning-star", "morning star", "buy"), pat("evening-star", "evening star", "sell"), pat("three-soldiers", "three white soldiers", "buy"), pat("three-crows", "three black crows", "sell")),
  // M6–M7: charts and structure
  "opening-a-chart": G, "chart-types": S("trends"), timeframes: S("mtf"), volume: S("trends"), sessions: P({ det: "london-breakout-1h", label: "London breakout of the Asian range", dir: "lv:dir", keys: ["br"], line: { lv: "hi", from: "a0", to: "a1" }, decide: "br" }),
  trends: S("trends"), "support-resistance": S("sr"),
  "trendlines-channels": P({ det: "trendline", label: "rising trendline", dir: "buy", keys: ["a:L", "b:L", "c:L"], decide: "c+3" }),
  "bos-choch": S("bos", "choch"), ranges: S("sr"),
  // M8: chart patterns
  "head-shoulders": P({ det: "head-shoulders", label: "head and shoulders", dir: "sell", keys: ["LS:H", "HD:H", "RS:H"], decide: "br" }),
  "double-top-bottom": P({ det: "double-top", label: "double top", dir: "sell", keys: ["A:H", "B:H"], decide: "br" }, { det: "double-bottom", label: "double bottom", dir: "buy", keys: ["A:L", "B:L"], decide: "br" }),
  triangles: P({ det: "triangle-asc", label: "ascending triangle", dir: "buy", keys: ["br"], decide: "br" }, { det: "triangle-desc", label: "descending triangle", dir: "sell", keys: ["br"], decide: "br" }),
  "flags-pennants": P({ det: "bull-flag", label: "bull flag breakout", dir: "buy", keys: ["br"], decide: "br" }),
  wedges: P({ det: "rising-wedge", label: "rising wedge", dir: "sell", keys: ["l0:L", "l1:L", "l2:L"], decide: "br" }),
  "cup-handle": P({ det: "cup-handle", label: "cup and handle breakout", dir: "buy", keys: ["br"], decide: "br" }),
  // M9: indicators
  "moving-averages": P(pat("golden-cross", "golden cross", "buy", "cross"), pat("ma200", "200 MA reclaim", "buy", "cross")),
  rsi: P({ det: "divergence-bull", label: "bullish RSI divergence", dir: "buy", keys: ["A:L", "B:L"], decide: "B+3" }, { det: "divergence-bear", label: "bearish RSI divergence", dir: "sell", keys: ["A:H", "B:H"], decide: "B+3" }),
  macd: P(pat("golden-cross", "golden cross", "buy", "cross")),
  bollinger: P(pat("compression-expansion", "volatility expansion", "lv:dir", "ex")),
  fibonacci: P({ det: "fib-pullback", label: "61.8% Fibonacci pullback", dir: "buy", keys: ["A:L", "B:H", "C:L"], decide: "C+3" }),
  divergence: P({ det: "divergence-bull", label: "bullish divergence", dir: "buy", keys: ["A:L", "B:L"], decide: "B+3" }, { det: "divergence-bear", label: "bearish divergence", dir: "sell", keys: ["A:H", "B:H"], decide: "B+3" }),
  "bias-checklist": S("mtf"),
  // M10–M12: smart money terms, strategies, techniques
  liquidity: P({ det: "ssl-sweep", label: "sell-side liquidity sweep", dir: "buy", line: { lv: "L", from: "A", to: "fk" }, decide: "fk" }, { det: "liquidity-sweep", label: "buy-side liquidity sweep", dir: "sell", line: { lv: "L", from: "A", to: "fk" }, decide: "fk" }),
  "order-blocks": S("orderblocks"), "fair-value-gaps": S("fvg"),
  "premium-discount": P({ det: "premium-discount", label: "buy in discount", dir: "buy", keys: ["A:L", "B:H", "C:L"], decide: "C+3" }, { det: "ote-game", label: "buy in discount (below 50%)", dir: "buy", keys: ["A:L", "B:H", "C:L"], decide: "C+3" }),
  "breakout-fakeout": P({ det: "breakout-retest", label: "breakout and retest", dir: "buy", line: { lv: "L", from: "A", to: "rt" }, decide: "rt" }, { det: "fakeout", label: "fakeout", dir: "sell", line: { lv: "L", from: "A", to: "fk" }, decide: "fk" }),
  confluence: S("confluence"),
  "strat-trend-pullback": S("trends"), "strat-breakout-retest": S("sr"), "strat-range": S("rr"), "strat-bos": S("bos"), "strat-choch-reversal": S("choch"),
  "strat-smc-ob-fvg": S("confluence"), "strat-ma-trend": P(pat("ma200", "200 MA reclaim", "buy", "cross"), pat("golden-cross", "golden cross", "buy", "cross")), "strat-rsi-divergence": S("contrev"), "strat-london-breakout": P({ det: "london-breakout-1h", label: "London breakout of the Asian range", dir: "lv:dir", keys: ["br"], line: { lv: "hi", from: "a0", to: "a1" }, decide: "br" }), "strat-top-down": S("mtf"),
  "risk-per-trade": S("rr"), "rr-expectancy": S("rr"), "trade-management": S("trends", "bos"), "trading-plan": G, psychology: G, backtesting: G,
  // M13: advanced candles and gaps
  "belt-hold-kicker": P(pat("belt-hold-bull", "bullish belt hold", "buy"), pat("kicker-bull", "bullish kicker", "buy")),
  "outside-three-inside": P(pat("outside-bar", "outside bar", "buy"), pat("three-inside-up", "three inside up", "buy")),
  "three-methods-abandoned-baby": P(pat("rising-three", "rising three methods", "buy"), pat("abandoned-baby-bull", "abandoned baby", "buy")),
  hikkake: P({ det: "hikkake-bull", label: "hikkake", dir: "buy", keys: ["ib"], decide: "conf" }),
  "price-gaps": P(pat("gap-breakaway", "breakaway gap", "buy", "gap")),
  "renko-range-bars": S("trends"),
  // M14: structure deep dive
  "compression-expansion": P(pat("compression-expansion", "expansion candle", "lv:dir", "ex")),
  "round-numbers": S("sr"), "dow-theory-staircase": S("trends"),
  "market-structure-shift": P({ det: "mss", label: "market structure shift", dir: "buy", keys: ["L3:L", "mss"], decide: "mss" }),
  "internal-external-structure": P({ det: "internal-external", label: "external higher low", dir: "buy", keys: ["A:L", "B:H", "C:L"], decide: "C+3" }),
  "strong-weak-protected": S("swings"),
  inducement: P({ det: "inducement", label: "inducement sweep", dir: "buy", keys: ["idm:L", "C:L"], decide: "C+3" }),
  "swing-failure-pattern": P(pat("sfp-bear", "bearish swing failure", "sell", "f"), pat("sfp-bull", "bullish swing failure", "buy", "f")),
  // M15: chart patterns II
  "triple-top-bottom": P({ det: "triple-top", label: "triple top", dir: "sell", keys: ["a:H", "b:H", "c:H"], decide: "br" }, { det: "triple-bottom", label: "triple bottom", dir: "buy", keys: ["a:L", "b:L", "c:L"], decide: "br" }),
  "rectangle-rounding": P(pat("rectangle", "rectangle breakout", "buy", "br"), pat("rounding-bottom", "rounding bottom breakout", "buy", "br")),
  "broadening-wedge-liquidity": P({ det: "broadening", label: "broadening top", dir: "sell", keys: ["H1:H", "H2:H", "H3:H"], decide: "br" }, { det: "rising-wedge", label: "rising wedge", dir: "sell", keys: ["l0:L", "l1:L", "l2:L"], decide: "br" }),
  "three-drives-abcd": P({ det: "three-drives", label: "three drives", dir: "sell", keys: ["D1:H", "D2:H", "D3:H"], decide: "D3+3" }, { det: "abcd", label: "bullish ABCD", dir: "buy", keys: ["B:L", "D:L"], decide: "D+3" }),
  "harmonic-patterns": P(...["gartley", "bat", "butterfly", "crab"].map((h) => ({ det: `harmonic-${h}`, label: `${h[0]!.toUpperCase()}${h.slice(1)} pattern`, dir: "lv:bull" as Dir, keys: ["D"], decide: "D+3" }))),
  "elliott-wave": P({ det: "elliott-impulse", label: "completed 5-wave impulse", dir: "sell", keys: ["w1:H", "w3:H", "w5:H"], decide: "w5+3" }),
  // M16: indicators II
  "ma-200": P(pat("ma200", "200 MA reclaim", "buy", "cross")),
  "stochastic-cci-williams": S("sr"),
  "adx-dmi": P(pat("adx-trend", "ADX trend start", "lv:dir", "cross")),
  ichimoku: P(pat("ichimoku", "break above the cloud", "buy", "br")),
  "psar-supertrend": P(pat("supertrend-flip", "SAR flip", "buy", "flip")),
  "obv-ad-line": P(pat("obv-accumulation", "OBV accumulation breakout", "buy", "br")),
  "keltner-donchian": P(pat("donchian-breakout", "Donchian breakout", "buy", "br")),
  "pivot-points": P({ det: "pivots-day", label: "pivot level reaction", dir: "pts:-kind", keys: ["touch"], decide: "touch+1" }),
  vwap: P(pat("anchored-vwap", "anchored VWAP bounce", "buy", "touch")),
  "smt-divergence": K,
  // M17: liquidity deep dive
  "sell-side-clean-old": P({ det: "ssl-sweep", label: "sell-side liquidity sweep", dir: "buy", line: { lv: "L", from: "A", to: "fk" }, decide: "fk" }, { det: "liquidity-sweep", label: "buy-side liquidity sweep", dir: "sell", line: { lv: "L", from: "A", to: "fk" }, decide: "fk" }),
  "trendline-engineered-liquidity": P({ det: "trendline-run", label: "trendline liquidity run", dir: "sell", keys: ["a:L", "b:L", "c:L"], decide: "br" }),
  "draw-on-liquidity": P({ det: "irl-erl", label: "internal range liquidity (FVG)", dir: "buy", zone: { top: "fvgTop", bot: "fvgBot", from: "f", to: "rt", type: "FVG" }, decide: "rt" }),
  "turtle-soup": P({ det: "turtle-soup", label: "turtle soup", dir: "buy", line: { lv: "prevLow", from: "prev", to: "k" }, decide: "k" }),
  "judas-swing": P({ det: "judas", label: "Judas swing low", dir: "buy", line: { lv: "open", from: "open", to: "low" }, keys: ["low"], decide: "low+4" }),
  "previous-highs-lows": P({ det: "pdh-sweep", label: "previous day high sweep", dir: "sell", line: { lv: "PH", from: "open", to: "sweep" }, decide: "sweep+1" }, { det: "pwh-sweep", label: "previous week high sweep", dir: "sell", line: { lv: "PH", from: "open", to: "sweep" }, decide: "sweep+1" }),
  // M18: imbalances
  "consequent-encroachment": P({ det: "fvg-ce", label: "fair value gap held at CE", dir: "buy", zone: { top: "top", bot: "bot", from: "f", to: "rt", type: "FVG" }, decide: "rt" }),
  "first-presented-fvg": P({ det: "first-fvg", label: "first presented FVG", dir: "lv:dir", zone: { top: "top", bot: "bot", from: "f", to: "rt", type: "FVG" }, decide: "rt" }),
  "inversion-fvg": P({ det: "ifvg", label: "inversion FVG", dir: "buy", zone: { top: "top", bot: "bot", from: "f", to: "rt", type: "FVG" }, decide: "rt" }),
  "balanced-price-range": P({ det: "bpr", label: "balanced price range", dir: "buy", zone: { top: "top", bot: "bot", from: "bull", to: "rt", type: "FVG" }, decide: "rt" }),
  "stacked-implied-fvg": S("fvg"),
  "volume-imbalance-void": P({ det: "volume-imbalance", label: "volume imbalance", dir: "buy", zone: { top: "top", bot: "bot", from: "k", to: "rt", type: "FVG" }, decide: "rt" }),
  "opening-gaps-ndog-nwog": K,
  // M19: order block family
  "unmitigated-refined-ob": P({ det: "ob-fvg-bull", label: "unmitigated bullish order block", dir: "buy", zone: { top: "obTop", bot: "obBot", from: "ob", to: "rt", type: "ORDER_BLOCK" }, decide: "rt" }, { det: "ob-fvg-bear", label: "unmitigated bearish order block", dir: "sell", zone: { top: "obTop", bot: "obBot", from: "ob", to: "rt", type: "ORDER_BLOCK" }, decide: "rt" }),
  "breaker-mitigation-blocks": P({ det: "breaker", label: "bullish breaker block", dir: "buy", zone: { top: "bTop", bot: "bBot", from: "blk", to: "rt", type: "ORDER_BLOCK" }, decide: "rt" }, { det: "mitigation-block", label: "bullish mitigation block", dir: "buy", zone: { top: "bTop", bot: "bBot", from: "blk", to: "rt", type: "ORDER_BLOCK" }, decide: "rt" }),
  "rejection-propulsion-vacuum": P({ det: "rejection-block", label: "rejection block", dir: "buy", zone: { top: "top", bot: "bot", from: "s", to: "rt", type: "ORDER_BLOCK" }, decide: "rt" }, { det: "propulsion", label: "propulsion block", dir: "buy", zone: { top: "pTop", bot: "pBot", from: "p", to: "rt2", type: "ORDER_BLOCK" }, decide: "rt2" }),
  "poi-pd-arrays": P({ det: "ob-fvg-bull", label: "discount point of interest (order block)", dir: "buy", zone: { top: "obTop", bot: "obBot", from: "ob", to: "rt", type: "ORDER_BLOCK" }, decide: "rt" }, { det: "premium-discount", label: "buy in discount", dir: "buy", keys: ["A:L", "B:H", "C:L"], decide: "C+3" }),
  // M20: Fibonacci
  "optimal-trade-entry": P({ det: "ote", label: "optimal trade entry", dir: "buy", keys: ["A:L", "B:H", "C:L"], decide: "C+3" }, { det: "ote-game", label: "pullback into the OTE zone (62–79%)", dir: "buy", keys: ["A:L", "B:H", "C:L"], decide: "C+3" }),
  "fibonacci-extensions": P({ det: "fib-extension", label: "extension target reached", dir: "sell", keys: ["A:L", "B:H", "D:H"], decide: "D+3" }),
  "sd-projections": P({ det: "fib-extension", label: "projection target reached", dir: "sell", keys: ["A:L", "B:H", "D:H"], decide: "D+3" }),
  // M21: time and sessions
  killzones: P({ det: "london-breakout-1h", label: "London breakout of the Asian range", dir: "lv:dir", keys: ["br"], line: { lv: "hi", from: "a0", to: "a1" }, decide: "br" }),
  "silver-bullet-macros": P({ det: "silver-bullet", label: "silver bullet FVG", dir: "lv:dir", zone: { top: "top", bot: "bot", from: "f", to: "rt", type: "FVG" }, decide: "rt" }),
  "opens-opening-range": P({ det: "judas", label: "buy below the midnight open", dir: "buy", line: { lv: "open", from: "open", to: "low" }, keys: ["low"], decide: "low+4" }),
  "orb-ny-open": P({ det: "orb", label: "opening range breakout", dir: "lv:dir", keys: ["br"], decide: "br" }),
  "power-of-three": P({ det: "judas", label: "manipulation below the open", dir: "buy", line: { lv: "open", from: "open", to: "low" }, keys: ["low"], decide: "low+4" }),
  "daily-bias-weekly-profile": P(pat("weekly-profile", "low of the week", "buy", "low", "low+4")),
  "cbdr-flout": K, "quarterly-theory": K, seasonality: G,
  // M22: institutional
  "institutional-order-flow": S("trends", "swings"),
  ipda: P({ det: "ipda", label: "60-day high run", dir: "sell", line: { lv: "H60", from: "now", to: "now" }, keys: ["now"], decide: "now+1" }),
  "market-maker-models": P({ det: "mmbm", label: "smart money reversal", dir: "buy", keys: ["L3:L", "mss"], decide: "mss" }),
  "accumulation-distribution": P(pat("reaccumulation", "reaccumulation breakout", "buy", "br")),
  "intermarket-analysis": G, "cot-dark-pools": G,
  // M23: Wyckoff and volume
  "wyckoff-accumulation": P({ det: "wyckoff-acc", label: "Wyckoff spring", dir: "buy", keys: ["sc:L", "sp:L"], decide: "sos" }),
  "wyckoff-distribution": P({ det: "wyckoff-dist", label: "Wyckoff UTAD", dir: "sell", keys: ["sc:H", "sp:H"], decide: "sos" }),
  "volume-profile": S("sr"),
  "delta-order-flow": P({ det: "delta-divergence", label: "delta divergence", dir: "sell", keys: ["A:H", "B:H"], decide: "B+3" }, pat("absorption", "absorption candle", "buy", "k", "k+1")),
  // M24: entry models
  "risk-vs-confirmation-entry": P({ det: "ob-fvg-bull", label: "bullish order block entry", dir: "buy", zone: { top: "obTop", bot: "obBot", from: "ob", to: "rt", type: "ORDER_BLOCK" }, decide: "rt" }, { det: "breaker", label: "breaker block entry", dir: "buy", zone: { top: "bTop", bot: "bBot", from: "blk", to: "rt", type: "ORDER_BLOCK" }, decide: "rt" }),
  "ict-2022-model": P({ det: "model-2022", label: "2022 model FVG entry", dir: "buy", keys: ["sweep:L"], zone: { top: "top", bot: "bot", from: "f", to: "en", type: "FVG" }, decide: "en" }),
  "unicorn-model": P({ det: "unicorn", label: "unicorn (breaker + FVG)", dir: "buy", zone: { top: "bTop", bot: "bBot", from: "blk", to: "rt", type: "ORDER_BLOCK" }, decide: "rt" }),
  "candle-range-theory": P(pat("crt", "candle range raid", "buy", "c2")),
  "ict-model-library": P({ det: "model-2022", label: "2022 model FVG entry", dir: "buy", keys: ["sweep:L"], zone: { top: "top", bot: "bot", from: "f", to: "en", type: "FVG" }, decide: "en" }, { det: "turtle-soup", label: "turtle soup", dir: "buy", line: { lv: "prevLow", from: "prev", to: "k" }, decide: "k" }, { det: "ote", label: "optimal trade entry", dir: "buy", keys: ["A:L", "B:H", "C:L"], decide: "C+3" }),
  // M25: the professional trader
  "stop-limit-dom-prop": G, "performance-metrics": S("rr"), "correlation-risk-narrative": G, "news-economic-calendar": G, "rates-carry-qe": G,
  "futures-crypto-derivatives": G,
};

// ------------------------------------------------------------------ candidates → setups
const detCache = new Map<string, { x: Ctx; c: Cand }[]>();
function detect(det: string) {
  let hit = detCache.get(det);
  if (!hit) {
    hit = CTX.flatMap((x) => D[det]!(x).map((c) => ({ x, c })));
    detCache.set(det, hit);
  }
  return hit;
}
const at = (c: Cand, spec: string) => {
  const [name, off] = spec.split("+");
  const v = c.pts[name!];
  return v === undefined ? undefined : c.start + v + Number(off ?? 0);
};

type Found = { s: Setup; label: string; kind: "point" | "zone" | "line" | "swings" };
function patternSetups(item: Item): Found[] {
  const out: Found[] = [];
  for (const { x, c } of detect(item.det)) {
    const k = at(c, item.decide);
    if (k === undefined || k + AFTER >= x.n || k < 40) continue;
    const atr = x.atr[k]!;
    const lv = c.lv ?? {};
    let dir: "buy" | "sell";
    if (item.dir === "buy" || item.dir === "sell") dir = item.dir;
    else if (item.dir === "lv:dir") dir = (lv["dir"] ?? 1) > 0 ? "buy" : "sell";
    else if (item.dir === "lv:bull") dir = (lv["bull"] ?? 1) > 0 ? "buy" : "sell";
    else if (item.dir === "pts:-kind") dir = (c.pts["kind"] ?? 1) > 0 ? "sell" : "buy";
    else dir = x.c[k]! - x.c[Math.max(0, k - 8)]! > 0 ? "sell" : "buy"; // "rev": against the move into it
    const marks: KeyMark[] = [];
    let lo = Infinity, hi = -Infinity;
    for (const key of item.keys ?? []) {
      const [name, t] = key.split(":");
      const i = at(c, name!);
      if (i === undefined || i > k) continue;
      const type: MarkType = t === "H" ? "SWING_HIGH" : t === "L" ? "SWING_LOW" : "PATTERN";
      marks.push({ id: `k-${name}`, type, i1: i, p1: type === "SWING_HIGH" ? x.h[i]! : type === "SWING_LOW" ? x.l[i]! : x.c[i]! });
    }
    if (item.zone) {
      const z = item.zone;
      const i1 = at(c, z.from), i2 = Math.min(k, at(c, z.to) ?? k);
      const top = lv[z.top], bot = lv[z.bot];
      if (i1 === undefined || top === undefined || bot === undefined || !(top > bot)) continue;
      marks.push({ id: "zone", type: z.type, i1, i2: Math.max(i1 + 1, i2), p1: bot, p2: top });
      lo = Math.min(lo, bot);
      hi = Math.max(hi, top);
    }
    if (item.line) {
      const L = item.line;
      const i1 = at(c, L.from), i2 = at(c, L.to);
      const p = lv[L.lv];
      if (i1 === undefined || p === undefined) continue;
      marks.push({ id: "lvl", type: "SR_LINE", i1: Math.max(0, i1 - (i1 === i2 ? 20 : 0)), i2: Math.min(k, Math.max(i2 ?? k, i1 + 1)), p1: p });
    }
    if (!marks.length) continue;
    // Stop just beyond the LAST part of the concept (e.g. the right shoulder, not the
    // head) and the candles since, with a quarter ATR of room.
    const pointKeys = marks.filter((m) => m.type !== "SR_LINE" && m.type !== "FVG" && m.type !== "ORDER_BLOCK");
    const lastKey = pointKeys.length ? Math.max(...pointKeys.map((m) => m.i1)) : Math.max(...marks.map((m) => m.i2 ?? m.i1));
    for (let i = Math.max(0, lastKey - (pointKeys.length ? 0 : 3)); i <= k; i++) {
      lo = Math.min(lo, x.l[i]!);
      hi = Math.max(hi, x.h[i]!);
    }
    const sl = dir === "buy" ? lo - 0.25 * atr : hi + 0.25 * atr;
    const first = marks[0]!;
    out.push({
      s: { x, k, dir, marks, sl, score: c.score, tap: first.type === "SR_LINE" ? k : first.i1, from: Math.min(...marks.map((m) => m.i1)) - 12 },
      label: item.label,
      kind: item.zone ? "zone" : item.line && !item.keys ? "line" : marks.every((m) => m.type === "PATTERN") ? "point" : "swings",
    });
  }
  return out;
}

const specCache = new Map<string, Setup[]>();
function strategySetups(id: string): Setup[] {
  let hit = specCache.get(id);
  if (!hit) {
    const spec = SPECS.find((s) => s.strategy === id);
    hit = spec ? spec.find() : [];
    specCache.set(id, hit);
  }
  return hit;
}
let generalCache: Setup[] | null = null;

// ------------------------------------------------------------------ chart reuse
// Never reuse a chart from a strategy track, a lesson example, or another lesson game.
const LEVEL_DIR = new URL("../src/data/real/levels/", import.meta.url);
const taken: { label: string; tf: string; t: number; span: number }[] = [];
for (const f of (await readdir(LEVEL_DIR)).filter((f) => f.endsWith(".json"))) {
  for (const l of JSON.parse(await readFile(new URL(f, LEVEL_DIR), "utf8")) as Compact[]) {
    if (l.source) taken.push({ label: l.source.label, tf: l.source.timeframe, t: l.source.decisionTime, span: Math.max(1, (l.source.to - l.source.from) / 2) });
  }
}
const examples: Record<string, { label: string; tf: string; t0: number; t1: number }> = JSON.parse(await readFile(new URL("../src/data/real/examples.json", import.meta.url), "utf8"));
for (const e of Object.values(examples)) taken.push({ label: e.label, tf: TF[e.tf] ?? e.tf, t: (e.t0 + e.t1) / 2, span: Math.max(1, (e.t1 - e.t0) / 2) });
function isTaken(s: Setup): boolean {
  const t = s.x.ds.candles[s.k]![0];
  const tf = TF[s.x.ds.tf] ?? s.x.ds.tf;
  const step = s.x.ds.tf === "15m" ? 900 : s.x.ds.tf === "1h" ? 3600 : s.x.ds.tf === "4h" ? 14400 : 86400;
  return taken.some((w) => w.label === s.x.ds.label && w.tf === tf && Math.abs(w.t - t) < w.span + 40 * step);
}
function take(s: Setup) {
  const step = s.x.ds.tf === "15m" ? 900 : s.x.ds.tf === "1h" ? 3600 : s.x.ds.tf === "4h" ? 14400 : 86400;
  taken.push({ label: s.x.ds.label, tf: TF[s.x.ds.tf] ?? s.x.ds.tf, t: s.x.ds.candles[s.k]![0], span: 45 * step });
}

// ------------------------------------------------------------------ assembly
function tier(module: number): Level["tier"] {
  return module <= 6 ? 1 : module <= 12 ? 2 : module <= 19 ? 3 : 4;
}
function quizMcq(lesson: Lesson, n: number, id: string): Question | null {
  const q = lesson.quiz[n % Math.max(1, lesson.quiz.length)];
  if (!q) return null;
  const right = q.options[q.answer]!;
  const wrong = q.options.filter((_, j) => j !== q.answer);
  const pos = (n * 3 + id.length) % q.options.length;
  const options = [...wrong];
  options.splice(pos, 0, right);
  return { id, kind: "mcq", prompt: q.q, options, correctIndex: pos };
}

function assembleLesson(lesson: Lesson, s: Setup, n: number, count: number, won: boolean, bars: number, text: { label: string; tap: string; story: string }): Compact {
  const x = s.x;
  const atr = x.atr[s.k]!;
  const earliest = Math.min(...s.marks.map((m) => m.i1));
  const start = Math.max(0, Math.min(s.from ?? earliest - 10, earliest - 5, s.k - 30), s.k - 90);
  const end = s.k + AFTER;
  const rel = (i: number) => i - start;
  const price = x.c[s.k]!;
  const pct = (m: number) => Math.max(0.01, ((m * atr) / price) * 100);
  const answerKey: AnswerMark[] = s.marks.map((m) => ({
    id: m.id,
    type: m.type,
    i1: rel(m.i1),
    ...(m.i2 !== undefined ? { i2: rel(m.i2) } : {}),
    p1: round(m.p1),
    ...(m.p2 !== undefined ? { p2: round(m.p2) } : {}),
    tolerance:
      m.type === "PATTERN" ? { candles: 1, pricePct: 100 }
      : m.type === "SR_LINE" ? { candles: 6, pricePct: pct(0.5) }
      : m.type === "BOS" ? { candles: 3, pricePct: pct(0.6) }
      : m.type === "FVG" || m.type === "ORDER_BLOCK" ? { candles: 2, pricePct: pct(0.4) }
      : { candles: 2, pricePct: pct(0.6) },
  }));
  const questions = [quizMcq(lesson, n, "q1"), quizMcq(lesson, n + 1, "q2"), { id: "q3", kind: "tap" as const, prompt: text.tap, correctCandle: rel(s.tap), toleranceCandles: 1 }].filter(
    (q): q is Question => q !== null,
  );
  const outcomeText = won
    ? `In reality price reached the 2R target ${bars} candle${bars === 1 ? "" : "s"} later.`
    : bars <= AFTER
      ? `In reality this one failed: price hit the stop ${bars} candles later. A correct read still loses sometimes, which is why every trade has a stop and small risk.`
      : "In reality price reached neither the 2R target nor the stop within the next 25 candles.";
  const difficulty: Level["difficulty"] = n < Math.ceil(count / 3) ? "easy" : n < Math.ceil((2 * count) / 3) ? "medium" : "hard";
  const first = answerKey[0]!;
  const hintP = [first.p1, first.p2 ?? first.p1];
  const rows = x.ds.candles.slice(start, end + 1);
  return {
    id: `L-${lesson.id}-${n + 1}`,
    tier: tier(lesson.module),
    strategyId: "lesson",
    lessonId: lesson.id,
    difficulty,
    rows: rows.map((r) => [round(r[1]), round(r[2]), round(r[3]), round(r[4])]),
    decisionIndex: rel(s.k),
    answerKey,
    correctDirection: s.dir,
    logicalSL: s.dir === "buy" ? { min: round(s.sl - 1.2 * atr), max: round(s.sl + 0.35 * atr) } : { min: round(s.sl - 0.35 * atr), max: round(s.sl + 1.2 * atr) },
    questions,
    explanation: `${text.story} ${outcomeText}`,
    hintArea:
      difficulty === "easy"
        ? { i1: Math.max(0, first.i1 - 1), i2: Math.min(rel(s.k), (first.i2 ?? first.i1) + 1), p1: Math.min(...hintP) - 0.4 * atr, p2: Math.max(...hintP) + 0.4 * atr }
        : undefined,
    version: 1,
    source: { label: x.ds.label, timeframe: TF[x.ds.tf] ?? x.ds.tf, from: rows[0]![0], to: rows[rows.length - 1]![0], decisionTime: x.ds.candles[s.k]![0] },
  } as Compact;
}

const valid = (s: Setup) => {
  const risk = Math.abs(s.x.c[s.k]! - s.sl);
  const atr = s.x.atr[s.k]!;
  return risk >= 0.4 * atr && risk <= 5 * atr && (s.dir === "buy" ? s.sl < s.x.c[s.k]! : s.sl > s.x.c[s.k]!);
};
function withOutcome(s: Setup) {
  const entry = s.x.c[s.k]!;
  const tp = s.dir === "buy" ? entry + 2 * (entry - s.sl) : entry - 2 * (s.sl - entry);
  return outcome(s.x, s, tp);
}

// ------------------------------------------------------------------ run
const OUT = new URL("../src/data/real/lessons/", import.meta.url);
await mkdir(OUT, { recursive: true });
const byModule = new Map<number, Compact[]>();
const index: { id: string; lessonId: string; lessonTitle: string; module: number; tier: number; difficulty: string }[] = [];
let short = 0;
const knowledge: string[] = [];

for (const lesson of LESSONS) {
  const game = GAMES[lesson.id];
  if (!game) {
    console.log(`✗ ${lesson.id}: no game defined`);
    continue;
  }
  if (game.kind === "knowledge") {
    knowledge.push(lesson.id);
    console.log(`· M${String(lesson.module).padStart(2)} ${lesson.id.padEnd(32)} general knowledge (no game)`);
    continue;
  }
  const count = Math.min(8, Math.max(3, 3 + lesson.terms.length + Math.floor(lesson.blocks / 3)));
  // Candidate pools, one per game item, taken round-robin so a lesson mixes its concepts.
  type Pool = { list: { s: Setup; won: boolean; bars: number; label: string; spec?: Spec }[]; tap: (s: Setup) => string; story: (s: Setup, label: string) => string };
  const pools: Pool[] = [];
  const dirWord = (s: Setup) => (s.dir === "buy" ? "buy" : "sell");
  if (game.kind === "pattern") {
    for (const item of game.items) {
      const found = patternSetups(item).filter((f) => valid(f.s));
      pools.push({
        list: found.map((f) => ({ s: f.s, label: f.label, ...withOutcome(f.s) })).sort((a, b) => b.s.score - a.s.score),
        tap: (s) => (item.zone ? `Tap the candle where the ${item.label} started.` : item.line && !item.keys ? "Tap the candle where price reacted at the level." : `Tap the ${item.label} candle.`.replace("candle candle", "candle")),
        story: (s, label) =>
          `This is a real **${label}**, the concept from "${lesson.title}". ${item.zone ? "Price came back into the zone" : "The setup was complete"} at the decision candle, so the trade was a **${dirWord(s)}** with the stop just ${s.dir === "buy" ? "below" : "above"} the concept and a 2R target.`,
      });
    }
    for (const id of game.also ?? []) {
      const spec = SPECS.find((s) => s.strategy === id)!;
      pools.push({
        list: strategySetups(id).filter(valid).map((s) => ({ s, spec, label: id, ...withOutcome(s) })).sort((a, b) => b.s.score - a.s.score),
        tap: (s) => spec.tapPrompt(s),
        story: (s) => spec.story(s),
      });
    }
  } else if (game.kind === "strategy") {
    for (const id of game.ids) {
      const spec = SPECS.find((s) => s.strategy === id)!;
      const found = strategySetups(id).filter(valid);
      pools.push({
        list: found.map((s) => ({ s, spec, label: id, ...withOutcome(s) })).sort((a, b) => b.s.score - a.s.score),
        tap: (s) => spec.tapPrompt(s),
        story: (s) => spec.story(s),
      });
    }
  } else {
    generalCache ??= bosSetups().filter(valid);
    pools.push({
      list: generalCache.map((s) => ({ s, label: "structure break", ...withOutcome(s) })).sort((a, b) => b.s.score - a.s.score),
      tap: () => "Tap the candle that broke structure.",
      story: (s) =>
        `A real **break of structure**: price closed ${s.dir === "buy" ? "above the last swing high" : "below the last swing low"}, so the trade was a **${dirWord(s)}** with the stop beyond the pullback. Apply what "${lesson.title}" taught to how you size and manage it.`,
    });
  }
  const levels: Compact[] = [];
  // Mostly real winners; one real loss in bigger games, to keep it honest.
  const lossSlot = count >= 6 ? count - 2 : -1;
  for (let n = 0; n < count; n++) {
    let made = false;
    for (let tries = 0; tries < pools.length && !made; tries++) {
      const pool = pools[(n + tries) % pools.length]!;
      const wantLoss = n === lossSlot;
      const pick =
        pool.list.find((f) => !isTaken(f.s) && (wantLoss ? !f.won && f.bars <= AFTER : f.won)) ?? (wantLoss ? pool.list.find((f) => !isTaken(f.s) && f.won) : undefined);
      if (!pick) continue;
      take(pick.s);
      levels.push(assembleLesson(lesson, pick.s, n, count, pick.won, pick.bars, { label: pick.label, tap: pool.tap(pick.s), story: pool.story(pick.s, pick.label) }));
      made = true;
    }
  }
  if (levels.length < 3) {
    // Too rare on real charts for a proper game: general knowledge instead.
    for (const l of levels) {
      const t = taken.findIndex((w) => w.t === l.source!.decisionTime && w.label === l.source!.label);
      if (t >= 0) taken.splice(t, 1);
    }
    knowledge.push(lesson.id);
    console.log(`· M${String(lesson.module).padStart(2)} ${lesson.id.padEnd(32)} general knowledge (only ${levels.length} real chart${levels.length === 1 ? "" : "s"})`);
    continue;
  }
  if (levels.length < count) short++;
  const mod = byModule.get(lesson.module) ?? [];
  mod.push(...levels);
  byModule.set(lesson.module, mod);
  for (const l of levels) index.push({ id: l.id, lessonId: lesson.id, lessonTitle: lesson.title, module: lesson.module, tier: l.tier, difficulty: l.difficulty });
  const wins = levels.filter((l) => /reached the 2R/.test(l.explanation)).length;
  console.log(`${levels.length === count ? "✓" : "!"} M${String(lesson.module).padStart(2)} ${lesson.id.padEnd(32)} ${levels.length}/${count} games (${wins} winners) · ${game.kind}`);
}
for (const [m, levels] of byModule) await writeFile(new URL(`m${m}.json`, OUT), JSON.stringify(levels));
// Remove module files that no longer have games.
for (const f of (await readdir(OUT)).filter((f) => f.endsWith(".json"))) if (!byModule.has(Number(f.slice(1, -5)))) await writeFile(new URL(f, OUT), "[]");
await writeFile(new URL("../src/data/real/lessonGames.json", import.meta.url), JSON.stringify(index));
console.log(`\n${index.length} lesson games for ${LESSONS.length - knowledge.length} lessons (${short} short of their target); ${knowledge.length} general-knowledge lessons: ${knowledge.join(", ")}.`);

import type { Module } from "./types";
import { bollinger, ema, macd, rsi, sma } from "./build";
import { real, visible } from "./real";

// A real market that fell, based, then turned up with a golden cross. Indicators
// are computed on the full stored history (with warm-up) and then trimmed.
const gc = real("golden-cross");
const allCloses = gc.all.map((c) => c[3]);
const longC = gc.candles;
const s20 = visible(gc, sma(allCloses, 20));
const s50 = visible(gc, sma(allCloses, 50));
const e9 = visible(gc, ema(allCloses, 9));
const r14 = visible(gc, rsi(allCloses, 14));
const mAll = macd(allCloses);
const m = { line: visible(gc, mAll.line), signal: visible(gc, mAll.signal), hist: visible(gc, mAll.hist) };
const bbAll = bollinger(allCloses, 20, 2);
const bb = { upper: visible(gc, bbAll.upper), mid: visible(gc, bbAll.mid), lower: visible(gc, bbAll.lower) };
const cross = gc.i("cross");

// Real bearish divergence: price makes a higher high, RSI a lower high.
const dv = real("divergence-bear");
const divR = visible(dv, rsi(dv.all.map((c) => c[3]), 14));
const dA = dv.i("A");
const dB = dv.i("B");

// Real Fibonacci pullback: impulse A→B, retracement to C, then a new high.
const fb = real("fib-pullback");
const fLow = fb.lo("A");
const fHigh = fb.hi("B");
const fibLevel = (r: number) => fHigh - (fHigh - fLow) * r;

export const M09_INDICATORS: Module = {
  id: "indicators",
  n: 9,
  title: "Indicators: Bullish or Bearish?",
  tagline: "Moving averages, RSI, MACD, Bollinger Bands, Fibonacci, and reading bias from them.",
  icon: "🧭",
  lessons: [
    {
      id: "moving-averages",
      title: "Moving averages and crossovers",
      summary: "Smooth out the noise and read trend direction at a glance.",
      minutes: 6,
      blocks: [
        {
          t: "p",
          text: "A **moving average (MA)** is the average closing price of the last N candles, redrawn every candle. It smooths out noise so the direction is obvious. **SMA** weights every candle equally; **EMA** weights recent candles more, so it reacts faster.",
        },
        {
          t: "diagram",
          caption: "A real chart with the 20 SMA (cyan) and 50 SMA (gold). Price below both and falling = bearish. The 20 crossing above the 50 ('golden cross') marked the shift to bullish.",
          spec: {
            candles: longC,
            source: gc.source,
            overlays: [
              { values: s20, color: "electric", label: "SMA 20" },
              { values: s50, color: "gold", label: "SMA 50" },
            ],
            notes: [{ k: "dot", i: cross, p: s50[cross] ?? longC[cross]![2], color: "up", text: "golden cross", pos: "below" }],
          },
        },
        {
          t: "table",
          head: ["Signal", "Bullish", "Bearish"],
          rows: [
            ["Price vs MA", "Price above a rising MA", "Price below a falling MA"],
            ["MA slope", "Pointing up", "Pointing down"],
            ["Crossover", "Fast crosses above slow (golden cross)", "Fast crosses below slow (death cross)"],
            ["Pullbacks", "MA acts as dynamic support", "MA acts as dynamic resistance"],
          ],
        },
        {
          t: "list",
          items: [
            "Popular settings: **9/21 EMA** (short-term), **20/50** (swing), **200** (the big-picture trend: institutions watch it).",
            "MAs **lag**: they confirm trends, they don't predict them. In ranges they whipsaw and give many false crosses.",
          ],
        },
      ],
      quiz: [
        { q: "EMA vs SMA: the EMA…", options: ["Reacts faster to recent prices", "Is slower", "Uses volume", "Ignores closes"], answer: 0, why: "It weights recent candles more." },
        { q: "A golden cross is…", options: ["Fast MA crosses below slow", "Fast MA crosses above slow", "Price touches the 200", "An RSI level"], answer: 1, why: "Bullish crossover." },
        { q: "Where do MA crossovers fail most?", options: ["Strong trends", "Sideways ranges", "Monthly charts", "Never"], answer: 1, why: "Choppy markets = false crosses." },
      ],
    },
    {
      id: "rsi",
      title: "RSI: momentum and overbought/oversold",
      summary: "A 0–100 gauge of how strong recent moves have been.",
      minutes: 6,
      blocks: [
        {
          t: "p",
          text: "The **Relative Strength Index** compares the size of recent up-moves with recent down-moves (usually over 14 candles) and scales the result from 0 to 100.",
        },
        {
          t: "diagram",
          caption: "The same real chart: RSI stays under 50 in the decline, climbs above 50 as the uptrend starts, and pushes toward 70 in the rally.",
          spec: {
            candles: longC,
            source: gc.source,
            height: 190,
            pane: {
              label: "RSI (14)",
              min: 0,
              max: 100,
              series: [{ values: r14, color: "purple" }],
              levels: [
                { v: 70, text: "70 overbought", color: "down" },
                { v: 50, text: "50", color: "muted" },
                { v: 30, text: "30 oversold", color: "up" },
              ],
            },
          },
        },
        {
          t: "table",
          head: ["RSI reading", "Meaning"],
          rows: [
            ["Above 70", "Overbought: strong up-momentum; pullback risk (NOT an automatic sell)"],
            ["Below 30", "Oversold: strong down-momentum; bounce risk (NOT an automatic buy)"],
            ["Above 50", "Bullish momentum bias"],
            ["Below 50", "Bearish momentum bias"],
          ],
        },
        { t: "callout", tone: "warn", text: "In strong trends RSI can stay overbought (or oversold) for a long time. Selling just because RSI > 70 in an uptrend is a classic beginner loss." },
      ],
      quiz: [
        { q: "RSI above 70 means…", options: ["Sell immediately", "Overbought: strong momentum, watch for pullbacks", "Oversold", "No trend"], answer: 1, why: "It's a condition, not a signal." },
        { q: "RSI holding above 50 suggests…", options: ["Bullish bias", "Bearish bias", "Nothing", "A crash"], answer: 0, why: "Up-moves outweigh down-moves." },
        { q: "The default RSI period is…", options: ["7", "14", "50", "200"], answer: 1, why: "Wilder's original setting." },
      ],
    },
    {
      id: "macd",
      title: "MACD",
      summary: "Trend and momentum from two EMAs: line, signal and histogram.",
      minutes: 5,
      blocks: [
        {
          t: "list",
          items: [
            "**MACD line** = 12 EMA − 26 EMA.",
            "**Signal line** = 9 EMA of the MACD line.",
            "**Histogram** = MACD − signal (bars above/below zero).",
          ],
        },
        {
          t: "diagram",
          caption: "Real MACD: it crosses above its signal and then above zero as the uptrend develops; histogram bars grow with momentum.",
          spec: {
            candles: longC,
            source: gc.source,
            height: 180,
            pane: {
              label: "MACD (12, 26, 9)",
              bars: { values: m.hist },
              series: [
                { values: m.line, color: "electric", label: "MACD" },
                { values: m.signal, color: "gold", label: "signal" },
              ],
              levels: [{ v: 0, text: "0", color: "muted" }],
            },
          },
        },
        {
          t: "table",
          head: ["Signal", "Meaning"],
          rows: [
            ["MACD crosses above signal", "Momentum turning bullish"],
            ["MACD crosses below signal", "Momentum turning bearish"],
            ["MACD above zero", "Fast EMA above slow EMA: uptrend bias"],
            ["Histogram shrinking", "Momentum fading, even if price still rises"],
          ],
        },
      ],
      quiz: [
        { q: "The MACD line is…", options: ["12 EMA − 26 EMA", "RSI × 2", "Price − volume", "The 200 SMA"], answer: 0, why: "Difference of two EMAs." },
        { q: "MACD above zero means…", options: ["Downtrend bias", "Uptrend bias", "No trend", "High volume"], answer: 1, why: "The fast EMA is above the slow EMA." },
        { q: "A shrinking histogram warns…", options: ["Momentum is fading", "A guaranteed reversal", "The spread is widening", "Nothing"], answer: 0, why: "The gap between MACD and signal is closing." },
      ],
    },
    {
      id: "bollinger",
      title: "Bollinger Bands and volatility",
      summary: "A moving average wrapped in volatility bands. Squeezes come before expansions.",
      minutes: 4,
      blocks: [
        {
          t: "diagram",
          caption: "Real Bollinger Bands: they narrow in the quiet base, then widen as the new trend gets going, with price riding the upper band.",
          spec: {
            candles: longC,
            source: gc.source,
            overlays: [
              { values: bb.upper, color: "muted", dash: true },
              { values: bb.mid, color: "gold", label: "20 SMA" },
              { values: bb.lower, color: "muted", dash: true },
            ],
          },
        },
        {
          t: "list",
          items: [
            "Middle band = 20 SMA; outer bands = ±2 standard deviations.",
            "**Squeeze** (narrow bands) = low volatility, often before a big move.",
            "**Band walk**: in strong trends price rides along the outer band. That's strength, not a reversal signal.",
            "In ranges, touches of the outer bands often revert to the middle.",
          ],
        },
        { t: "callout", tone: "tip", text: "**ATR (Average True Range)** measures volatility as the average candle range. Use it to size stops: e.g. stop = 1.5 × ATR beyond your level, so normal noise doesn't hit you." },
      ],
      quiz: [
        { q: "Narrow Bollinger Bands indicate…", options: ["High volatility", "Low volatility, often before a big move", "A trend reversal", "Overbought"], answer: 1, why: "A squeeze stores energy." },
        { q: "Price riding the upper band in a trend is…", options: ["A sell signal", "A sign of strength", "Impossible", "A gap"], answer: 1, why: "Band walks happen in strong trends." },
        { q: "ATR is most useful for…", options: ["Direction", "Sizing stops to volatility", "Finding patterns", "Choosing brokers"], answer: 1, why: "It measures how much price normally moves." },
      ],
    },
    {
      id: "fibonacci",
      title: "Fibonacci retracements",
      summary: "Where pullbacks tend to stop: 38.2%, 50%, 61.8%.",
      minutes: 5,
      blocks: [
        {
          t: "diagram",
          caption: "A real pullback: drawn from the swing low to the swing high, it stopped in the 61.8–70.5% 'golden zone' before the trend resumed.",
          spec: {
            candles: fb.candles,
            source: fb.source,
            notes: [
              { k: "hline", p: fibLevel(0.236), text: "23.6%", color: "muted", dash: true, i1: fb.i("B") },
              { k: "hline", p: fibLevel(0.382), text: "38.2%", color: "electric", dash: true, i1: fb.i("B") },
              { k: "hline", p: fibLevel(0.5), text: "50%", color: "electric", dash: true, i1: fb.i("B") },
              { k: "zone", i1: fb.i("B"), i2: fb.candles.length - 1, p1: fibLevel(0.618), p2: fibLevel(0.705), color: "gold", text: "61.8–70.5% golden zone" },
              { k: "dot", i: fb.i("A"), p: fLow, color: "up", text: "swing low", pos: "below" },
              { k: "dot", i: fb.i("B"), p: fHigh, color: "up", text: "swing high" },
              { k: "dot", i: fb.i("C"), p: fb.lo("C"), color: "gold", text: "pullback", pos: "below" },
            ],
          },
        },
        {
          t: "list",
          items: [
            "In an uptrend, draw from the swing **low to the high**; the levels show where a pullback may stop.",
            "Key levels: **38.2%** (shallow, strong trend), **50%** (equilibrium), **61.8%** (deep, 'golden ratio').",
            "Extensions (127.2%, 161.8%) project targets beyond the old high.",
            "Fib works best with **confluence**: a fib level that lines up with support, an order block or a trendline.",
          ],
        },
      ],
      quiz: [
        { q: "In an uptrend you draw Fibonacci from…", options: ["High to low", "Swing low to swing high", "Any two candles", "Open to close"], answer: 1, why: "Measure the up-leg, then find retracement levels." },
        { q: "The 'golden ratio' level is…", options: ["23.6%", "50%", "61.8%", "100%"], answer: 2, why: "0.618 is the golden ratio." },
        { q: "Fib levels are strongest when…", options: ["Used alone", "They line up with other levels (confluence)", "On 1-minute charts", "Never"], answer: 1, why: "Multiple reasons at one price." },
      ],
    },
    {
      id: "divergence",
      title: "Divergence: when momentum disagrees with price",
      summary: "Price makes a new high but momentum doesn't: an early warning.",
      minutes: 5,
      blocks: [
        {
          t: "diagram",
          caption: "Real bearish divergence: price made a higher high, RSI made a lower high. The push had less force, and price then fell.",
          spec: {
            candles: dv.candles,
            source: dv.source,
            height: 180,
            notes: [{ k: "line", i1: dA, p1: dv.hi("A"), i2: dB, p2: dv.hi("B"), color: "up", text: "higher high" }],
            pane: {
              label: "RSI (14)",
              min: 0,
              max: 100,
              series: [{ values: divR, color: "purple" }],
              levels: [{ v: 70, color: "down" }, { v: 30, color: "up" }],
              notes: [{ k: "line", i1: dA, p1: divR[dA] ?? 70, i2: dB, p2: divR[dB] ?? 60, color: "down", text: "lower high" }],
            },
          },
        },
        {
          t: "table",
          head: ["Type", "Price", "Indicator", "Meaning"],
          rows: [
            ["Regular bearish", "Higher high", "Lower high", "Uptrend weakening → possible reversal down"],
            ["Regular bullish", "Lower low", "Higher low", "Downtrend weakening → possible reversal up"],
            ["Hidden bullish", "Higher low", "Lower low", "Uptrend continuation"],
            ["Hidden bearish", "Lower high", "Higher high", "Downtrend continuation"],
          ],
        },
        { t: "callout", tone: "warn", text: "Divergence can last several swings. Treat it as a warning and wait for structure (a CHoCH) to confirm the turn." },
      ],
      quiz: [
        { q: "Regular bearish divergence: price makes a ___ while RSI makes a ___.", options: ["HH / LH", "LL / HL", "HL / LL", "LH / HH"], answer: 0, why: "Higher price high, weaker momentum high." },
        { q: "Divergence should be treated as…", options: ["An instant entry", "A warning to confirm with structure", "Noise", "A guarantee"], answer: 1, why: "It can persist; wait for confirmation." },
        { q: "Hidden bullish divergence suggests…", options: ["Reversal down", "Uptrend continuation", "A range", "Low volume"], answer: 1, why: "Hidden divergence favours the existing trend." },
      ],
    },
    {
      id: "bias-checklist",
      title: "Putting it together: bullish or bearish?",
      summary: "A quick checklist to read the market's bias before you trade.",
      minutes: 4,
      blocks: [
        {
          t: "diagram",
          caption: "The same real chart with a fast EMA. Every item on the checklist flipped from bearish to bullish around the base.",
          spec: { candles: longC, source: gc.source, overlays: [{ values: e9, color: "electric", label: "EMA 9" }, { values: s50, color: "gold", label: "SMA 50" }] },
        },
        {
          t: "table",
          head: ["Check", "Bullish ✅", "Bearish ❌"],
          rows: [
            ["Structure", "Higher highs & higher lows", "Lower highs & lower lows"],
            ["Last break", "BOS up / CHoCH up", "BOS down / CHoCH down"],
            ["Price vs 50/200 MA", "Above, MA rising", "Below, MA falling"],
            ["RSI", "Holding above 50", "Holding below 50"],
            ["MACD", "Above zero, above signal", "Below zero, below signal"],
            ["Candles", "Big green bodies, lower wicks at support", "Big red bodies, upper wicks at resistance"],
            ["Higher timeframe", "Uptrend", "Downtrend"],
          ],
        },
        { t: "callout", tone: "key", text: "Structure first, indicators second. Indicators are derived from price, so when they disagree with clear structure, trust structure." },
      ],
      quiz: [
        { q: "Which should you trust first?", options: ["Indicators", "Price structure", "News headlines", "Gut feeling"], answer: 1, why: "Indicators are calculated from price." },
        { q: "Price below a falling 50 MA with RSI under 50 is…", options: ["Bullish", "Bearish", "Neutral", "Impossible"], answer: 1, why: "Several bearish checks agree." },
        { q: "The most important bullish check is…", options: ["Higher highs & higher lows", "RSI above 70", "Green colour scheme", "Big volume once"], answer: 0, why: "Structure defines the trend." },
      ],
    },
  ],
};

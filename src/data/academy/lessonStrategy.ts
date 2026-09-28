// Which strategy track each lesson belongs to. A strategy's lessons are its
// tutorial: they're listed at the top of its levels page, and a lesson opens as
// soon as its strategy is unlocked on the Map.
export const LESSON_STRATEGY: Record<string, string> = {
  // Candlesticks
  "candle-ohlc": "candles", "buyers-sellers": "candles", wicks: "candles", "body-momentum": "candles", "timeframes-candles": "candles",
  marubozu: "candles", doji: "candles", "hammer-hanging-man": "candles", "inverted-hammer-shooting-star": "candles", "spinning-top": "candles", "pin-bar": "candles",
  engulfing: "candles", harami: "candles", tweezers: "candles", "piercing-dark-cloud": "candles", "inside-outside-bar": "candles", "three-candle": "candles",
  "belt-hold-kicker": "candles", "outside-three-inside": "candles", "three-methods-abandoned-baby": "candles", hikkake: "candles",
  // Tier 1
  trends: "trends", "trendlines-channels": "trends", "compression-expansion": "trends", "dow-theory-staircase": "trends",
  "support-resistance": "sr", ranges: "sr", "strat-breakout-retest": "sr", "round-numbers": "sr",
  "order-types": "sltp", "strat-trend-pullback": "sltp", "trade-management": "sltp", "moving-averages": "sltp",
  "strat-range": "rr", "risk-per-trade": "rr", "rr-expectancy": "rr", "performance-metrics": "rr",
  // Tier 2
  "internal-external-structure": "swings", "strong-weak-protected": "swings",
  "bos-choch": "bos", "strat-bos": "bos",
  "strat-choch-reversal": "choch", "market-structure-shift": "choch",
  "strat-rsi-divergence": "contrev", divergence: "contrev", rsi: "contrev",
  // Tier 3
  "fair-value-gaps": "fvg", "consequent-encroachment": "fvg", "inversion-fvg": "fvg", "balanced-price-range": "fvg", "stacked-implied-fvg": "fvg",
  "order-blocks": "orderblocks", "unmitigated-refined-ob": "orderblocks", "breaker-mitigation-blocks": "orderblocks", "rejection-propulsion-vacuum": "orderblocks",
  liquidity: "liquidity", "breakout-fakeout": "liquidity", inducement: "liquidity", "swing-failure-pattern": "liquidity", "sell-side-clean-old": "liquidity",
  "draw-on-liquidity": "liquidity", "turtle-soup": "liquidity", "previous-highs-lows": "liquidity",
  "premium-discount": "premiumdiscount", fibonacci: "premiumdiscount", "poi-pd-arrays": "premiumdiscount", "optimal-trade-entry": "premiumdiscount",
  // Tier 4
  timeframes: "mtf", "strat-top-down": "mtf", "bias-checklist": "mtf",
  sessions: "sessions", "strat-london-breakout": "sessions", killzones: "sessions", "silver-bullet-macros": "sessions", "opens-opening-range": "sessions", "power-of-three": "sessions",
  confluence: "confluence", "strat-smc-ob-fvg": "confluence", "risk-vs-confirmation-entry": "confluence", "ict-2022-model": "confluence", "unicorn-model": "confluence",
};

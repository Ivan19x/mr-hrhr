// The Analyst: a pure, rule-based review of the player's trade journal.
// It finds the best trades, where the player's edge is (and isn't), and turns
// that into concrete strategy and lesson recommendations.
import type { GameMode, Level } from "@/types/game";
import { STRATEGIES } from "@/data/curriculum";

export type TradeRecord = {
  id: string;
  at: number;
  levelId: string;
  strategyId: string;
  difficulty: Level["difficulty"];
  mode: GameMode;
  side: "buy" | "sell";
  withSetup: boolean; // traded in the direction the setup favoured
  plannedRR: number | null; // TP distance ÷ SL distance
  riskPct: number;
  usedSL: boolean;
  r: number;
  won: boolean;
  exit: "tp" | "sl" | "open" | "forfeit";
  /** First attempt at this level in this mode: the one that counts for leaderboards. */
  counted?: boolean;
  score: number | null; // null in practice mode
  marksCorrect: number;
  marksWrong: number;
  marksMissed: number;
  answersCorrect: number;
  answersTotal: number;
  decisionSecs: number | null; // pause at decision point → trade placed
};

export type Segment = { key: string; label: string; n: number; winRate: number; avgR: number; totalR: number };

export type Insight = { tone: "good" | "bad" | "info"; title: string; detail: string };

export type Recommendation = {
  title: string;
  detail: string;
  lesson?: string; // academy lesson id
  play?: { kind: "levels"; strategyId: string } | { kind: "practice" };
};

export type BestTrade = { trade: TradeRecord; reasons: string[] };

export type AnalystReport = {
  n: number;
  ready: boolean; // enough trades for real conclusions
  headline: string;
  style: { name: string; description: string };
  stats: { winRate: number; avgR: number; totalR: number; expectancy: number; markAcc: number | null; quizAcc: number | null; slRate: number; avgRR: number | null };
  best: BestTrade[];
  strengths: Insight[];
  weaknesses: Insight[];
  recommendations: Recommendation[];
  segments: { title: string; rows: Segment[] }[];
  trend: { recentAvgR: number; earlierAvgR: number; recentMarkAcc: number; earlierMarkAcc: number } | null;
};

export const MIN_TRADES = 5;

const STRATEGY_NAMES: Record<string, string> = { ...Object.fromEntries(STRATEGIES.map((s) => [s.id, s.name])), lesson: "Lesson games" };
const STRATEGY_LESSON: Record<string, string> = { bos: "strat-bos" };

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const fmtR = (r: number) => `${r >= 0 ? "+" : ""}${r.toFixed(2)}R`;

function segment(trades: TradeRecord[], key: string, label: string): Segment {
  return {
    key,
    label,
    n: trades.length,
    winRate: trades.length ? trades.filter((t) => t.won).length / trades.length : 0,
    avgR: avg(trades.map((t) => t.r)),
    totalR: trades.reduce((s, t) => s + t.r, 0),
  };
}

function groupBy(trades: TradeRecord[], fn: (t: TradeRecord) => [string, string] | null): Segment[] {
  const map = new Map<string, { label: string; list: TradeRecord[] }>();
  for (const t of trades) {
    const g = fn(t);
    if (!g) continue;
    const cur = map.get(g[0]) ?? { label: g[1], list: [] };
    cur.list.push(t);
    map.set(g[0], cur);
  }
  return [...map.entries()].map(([k, v]) => segment(v.list, k, v.label)).sort((a, b) => b.avgR - a.avgR);
}

const rrBucket = (t: TradeRecord): [string, string] | null =>
  t.plannedRR === null ? ["none", "No stop loss"] : t.plannedRR < 1.5 ? ["low", "RR under 1:1.5"] : t.plannedRR < 2.5 ? ["mid", "RR 1:1.5 – 1:2.5"] : ["high", "RR 1:2.5 or more"];

const riskBucket = (t: TradeRecord): [string, string] =>
  t.riskPct <= 1 ? ["low", "Risk ≤ 1%"] : t.riskPct <= 2 ? ["mid", "Risk 1–2%"] : ["high", "Risk over 2%"];

const speedBucket = (t: TradeRecord): [string, string] | null =>
  t.decisionSecs === null ? null : t.decisionSecs < 15 ? ["fast", "Decided in < 15 s"] : t.decisionSecs < 45 ? ["mid", "15–45 s"] : ["slow", "Took > 45 s"];

function markAcc(ts: TradeRecord[]) {
  const placed = ts.reduce((s, t) => s + t.marksCorrect + t.marksWrong, 0);
  const correct = ts.reduce((s, t) => s + t.marksCorrect, 0);
  const keys = ts.reduce((s, t) => s + t.marksCorrect + t.marksMissed, 0);
  // Accuracy = correct over everything that should or shouldn't have been marked.
  const denom = Math.max(placed, keys, 1);
  return placed + keys === 0 ? 0 : correct / denom;
}

function reasonsFor(t: TradeRecord): string[] {
  const r: string[] = [];
  if (t.won) r.push(`Won ${fmtR(t.r)}`);
  if (t.marksCorrect > 0 && t.marksWrong === 0 && t.marksMissed === 0) r.push("Every mark correct");
  else if (t.marksCorrect > 0) r.push(`${t.marksCorrect} correct mark${t.marksCorrect > 1 ? "s" : ""}`);
  if (t.answersTotal > 0 && t.answersCorrect === t.answersTotal) r.push("Perfect reasoning quiz");
  if (t.plannedRR !== null && t.plannedRR >= 2) r.push(`Planned 1:${t.plannedRR.toFixed(1)} risk-to-reward`);
  if (t.usedSL && t.riskPct <= 1) r.push(`Disciplined ${t.riskPct}% risk with a stop`);
  if (t.withSetup) r.push("Traded with the structure");
  if (t.decisionSecs !== null && t.decisionSecs < 15) r.push(`Decisive (${Math.round(t.decisionSecs)} s)`);
  return r;
}

/** Quality of a trade for the "best trades" list: result + process. */
function quality(t: TradeRecord) {
  return (
    t.r * 40 +
    t.marksCorrect * 12 -
    t.marksWrong * 10 +
    (t.answersTotal ? (t.answersCorrect / t.answersTotal) * 30 : 0) +
    (t.usedSL ? 10 : -20) +
    (t.withSetup ? 10 : 0)
  );
}

export function analyze(all: TradeRecord[]): AnalystReport {
  const trades = [...all].sort((a, b) => a.at - b.at);
  const n = trades.length;
  const ready = n >= MIN_TRADES;
  const wins = trades.filter((t) => t.won);
  const losses = trades.filter((t) => !t.won);
  const winRate = n ? wins.length / n : 0;
  const avgWin = avg(wins.map((t) => t.r));
  const avgLoss = Math.abs(avg(losses.map((t) => t.r)));
  const scored = trades.filter((t) => t.mode !== "practice");
  const quizTotal = scored.reduce((s, t) => s + t.answersTotal, 0);
  const rrs = trades.map((t) => t.plannedRR).filter((x): x is number => x !== null);

  const stats = {
    winRate,
    avgR: avg(trades.map((t) => t.r)),
    totalR: trades.reduce((s, t) => s + t.r, 0),
    expectancy: winRate * avgWin - (1 - winRate) * avgLoss,
    // Practice trades have no marks or questions, so these need scored trades.
    markAcc: scored.length ? markAcc(scored) : null,
    quizAcc: quizTotal ? scored.reduce((s, t) => s + t.answersCorrect, 0) / quizTotal : null,
    slRate: n ? trades.filter((t) => t.usedSL).length / n : 0,
    avgRR: rrs.length ? avg(rrs) : null,
  };

  const segments = [
    { title: "By direction", rows: groupBy(trades, (t) => [t.side, t.side === "buy" ? "Buys (long)" : "Sells (short)"]) },
    { title: "With vs against the setup", rows: groupBy(trades, (t) => (t.withSetup ? ["with", "With the structure"] : ["against", "Against the structure"])) },
    { title: "By planned risk-to-reward", rows: groupBy(trades, rrBucket) },
    { title: "By risk per trade", rows: groupBy(trades, riskBucket) },
    { title: "By difficulty", rows: groupBy(trades, (t) => [t.difficulty, t.difficulty[0]!.toUpperCase() + t.difficulty.slice(1)]) },
    { title: "By decision speed", rows: groupBy(trades, speedBucket) },
    { title: "By strategy", rows: groupBy(trades, (t) => [t.strategyId, STRATEGY_NAMES[t.strategyId] ?? t.strategyId]) },
  ].filter((s) => s.rows.length > 0);

  const best = [...trades]
    .filter((t) => t.r > 0 || t.marksCorrect > 0)
    .sort((a, b) => quality(b) - quality(a))
    .slice(0, 3)
    .map((trade) => ({ trade, reasons: reasonsFor(trade) }));

  const strengths: Insight[] = [];
  const weaknesses: Insight[] = [];
  const recs: Recommendation[] = [];

  const seg = (title: string, key: string) => segments.find((s) => s.title === title)?.rows.find((r) => r.key === key);

  // Direction bias.
  const buys = seg("By direction", "buy");
  const sells = seg("By direction", "sell");
  if (buys && sells && buys.n >= 2 && sells.n >= 2 && Math.abs(buys.avgR - sells.avgR) >= 0.5) {
    const [good, bad] = buys.avgR > sells.avgR ? [buys, sells] : [sells, buys];
    strengths.push({ tone: "good", title: `Your ${good.label.toLowerCase()} are stronger`, detail: `${good.label}: ${pct(good.winRate)} win rate, ${fmtR(good.avgR)} per trade vs ${fmtR(bad.avgR)} on ${bad.label.toLowerCase()}.` });
    weaknesses.push({ tone: "bad", title: `${bad.label} are costing you`, detail: `Check you read bearish and bullish structure equally well. Charts get flipped, so a sell setup is just an upside-down buy setup.` });
  }

  // Against the setup.
  const against = seg("With vs against the setup", "against");
  const withS = seg("With vs against the setup", "with");
  if (against && against.n >= 2 && against.avgR < 0) {
    weaknesses.push({ tone: "bad", title: "Trading against the structure", detail: `${against.n} trades went against what the chart showed, averaging ${fmtR(against.avgR)}. Your trades with the structure average ${withS ? fmtR(withS.avgR) : "better"}.` });
    recs.push({ title: "Read the structure before picking a side", detail: "Before every trade name the trend (HH/HL or LH/LL) and the last BOS. Only trade in that direction.", lesson: "trends" });
  } else if (withS && withS.n >= 3 && withS.avgR > 0.3) {
    strengths.push({ tone: "good", title: "You trade with the structure", detail: `${withS.n} trades in the setup's direction averaged ${fmtR(withS.avgR)}. That's the foundation of every good strategy.` });
  }

  // Risk-to-reward.
  const lowRR = seg("By planned risk-to-reward", "low");
  const highRR = seg("By planned risk-to-reward", "high") ?? seg("By planned risk-to-reward", "mid");
  if (stats.avgRR !== null && stats.avgRR < 1.5 && n >= 3) {
    weaknesses.push({ tone: "bad", title: "Targets too small for your stops", detail: `Your average planned RR is 1:${stats.avgRR.toFixed(1)}. With 1:1.5 or less you need a very high win rate just to break even.` });
    recs.push({ title: "Aim for at least 1:2 risk-to-reward", detail: "Place the target at the next liquidity (old high/low) and only take trades where it's at least twice your stop distance.", lesson: "rr-expectancy" });
  } else if (highRR && highRR.n >= 2 && highRR.avgR > 0.3) {
    strengths.push({ tone: "good", title: "Good reward-to-risk planning", detail: `${highRR.label} trades average ${fmtR(highRR.avgR)}. Your winners pay for your losers.` });
  }
  if (lowRR && highRR && lowRR.n >= 2 && highRR.n >= 2 && highRR.avgR - lowRR.avgR >= 0.5) {
    strengths.push({ tone: "info", title: "Your data proves bigger targets work", detail: `${highRR.label}: ${fmtR(highRR.avgR)} vs ${lowRR.label}: ${fmtR(lowRR.avgR)}.` });
  }

  // Stop loss discipline.
  const noSL = trades.filter((t) => !t.usedSL);
  if (noSL.length > 0) {
    weaknesses.push({ tone: "bad", title: `${noSL.length} trade${noSL.length > 1 ? "s" : ""} without a stop loss`, detail: "Without a stop, one bad trade can wipe out weeks of work. Every trade needs a planned exit." });
    recs.push({ title: "Always define your invalidation", detail: "Put the stop just beyond the swing that proves you wrong.", lesson: "confluence" });
  } else if (n >= 5) {
    strengths.push({ tone: "good", title: "Stop loss on every trade", detail: "100% stop-loss discipline. That's what keeps accounts alive." });
  }

  // Risk sizing.
  const bigRisk = trades.filter((t) => t.riskPct > 2);
  if (bigRisk.length >= 2) {
    weaknesses.push({ tone: "bad", title: "Risking too much per trade", detail: `${bigRisk.length} trades risked over 2%. Ten losses in a row at 5% would cost 40% of the account.` });
    recs.push({ title: "Risk 1% per trade", detail: "Keep risk fixed at 0.5–1% and let the position size change with the stop distance.", lesson: "risk-per-trade" });
  }
  const winRisk = avg(wins.map((t) => t.riskPct));
  const lossRisk = avg(losses.map((t) => t.riskPct));
  if (wins.length >= 2 && losses.length >= 2 && lossRisk - winRisk >= 0.75) {
    weaknesses.push({ tone: "bad", title: "You size up on your worst trades", detail: `Losing trades averaged ${lossRisk.toFixed(1)}% risk vs ${winRisk.toFixed(1)}% on winners. Bigger size often comes from low-quality, emotional entries.` });
    recs.push({ title: "Same risk on every trade", detail: "Don't let confidence (or frustration) change your size.", lesson: "psychology" });
  }

  // Marking & reasoning.
  if (scored.length >= 3 && stats.markAcc !== null) {
    if (stats.markAcc < 0.5) {
      weaknesses.push({ tone: "bad", title: "Marking accuracy is low", detail: `Only ${pct(stats.markAcc)} of your chart marks line up with the real structure.` });
      recs.push({ title: "Sharpen your structure reading", detail: "Review swing highs/lows and BOS/CHoCH, then replay the easy levels with hints on.", lesson: "bos-choch", play: { kind: "levels", strategyId: "bos" } });
    } else if (stats.markAcc >= 0.7) {
      strengths.push({ tone: "good", title: "Sharp chart reading", detail: `${pct(stats.markAcc)} marking accuracy. You see structure clearly.` });
    }
    if (stats.quizAcc !== null && quizTotal >= 6 && stats.quizAcc < 0.6) {
      weaknesses.push({ tone: "bad", title: "Your reasoning doesn't match your trades", detail: `${pct(stats.quizAcc)} quiz accuracy. Winning without knowing why is luck, and luck runs out.` });
      recs.push({ title: "Study the setup behind each trade", detail: "Re-read the strategy lesson and say the reason for each trade out loud before placing it.", lesson: "strat-bos" });
    } else if (stats.quizAcc !== null && quizTotal >= 6 && stats.quizAcc >= 0.8) {
      strengths.push({ tone: "good", title: "You know why you trade", detail: `${pct(stats.quizAcc)} of your reasoning answers are right.` });
    }
  }

  // Forfeits (leaving live levels).
  const forfeits = trades.filter((t) => t.exit === "forfeit");
  if (forfeits.length > 0) {
    weaknesses.push({ tone: "bad", title: `${forfeits.length} level${forfeits.length > 1 ? "s" : ""} abandoned mid-trade`, detail: "Walking away from a live chart costs points and, with an open trade, a full −1R. In real markets you can't unsee a position, so finish what you start." });
    recs.push({ title: "Commit to every setup you open", detail: "Only start a level when you have time to finish it.", lesson: "psychology" });
  }

  // Exits.
  const open = trades.filter((t) => t.exit === "open");
  if (open.length >= 2 && open.length / Math.max(n, 1) > 0.3) {
    weaknesses.push({ tone: "info", title: "Targets often not reached", detail: `${open.length} trades ran out of chart before hitting TP or SL. Your targets may sit beyond realistic liquidity.` });
    recs.push({ title: "Target the nearest liquidity", detail: "Place take profit at the next obvious swing high/low instead of a far-away number.", lesson: "liquidity" });
  }

  // Speed.
  const fast = seg("By decision speed", "fast");
  const slow = seg("By decision speed", "slow");
  if (fast && slow && fast.n >= 2 && slow.n >= 2) {
    if (fast.avgR - slow.avgR >= 0.5) strengths.push({ tone: "good", title: "Quick decisions work for you", detail: `Trades decided in under 15 s average ${fmtR(fast.avgR)}. Timed challenges and scalping suit your style.` });
    else if (slow.avgR - fast.avgR >= 0.5) weaknesses.push({ tone: "info", title: "Rushed trades underperform", detail: `Fast decisions average ${fmtR(fast.avgR)} vs ${fmtR(slow.avgR)} when you take your time. Slow down and run the checklist.` });
  }

  // Difficulty progress.
  const hard = seg("By difficulty", "hard");
  if (hard && hard.n >= 2 && hard.avgR > 0) strengths.push({ tone: "good", title: "Handling messy charts", detail: `Positive results on hard levels (${fmtR(hard.avgR)} per trade). Noise doesn't shake you.` });

  // Trend over time.
  let trend: AnalystReport["trend"] = null;
  if (n >= 8) {
    const half = Math.floor(n / 2);
    const early = trades.slice(0, half);
    const late = trades.slice(half);
    trend = {
      earlierAvgR: avg(early.map((t) => t.r)),
      recentAvgR: avg(late.map((t) => t.r)),
      earlierMarkAcc: markAcc(early.filter((t) => t.mode !== "practice")),
      recentMarkAcc: markAcc(late.filter((t) => t.mode !== "practice")),
    };
    if (trend.recentAvgR - trend.earlierAvgR >= 0.3) strengths.push({ tone: "good", title: "You're improving", detail: `Recent trades average ${fmtR(trend.recentAvgR)} vs ${fmtR(trend.earlierAvgR)} earlier.` });
    else if (trend.earlierAvgR - trend.recentAvgR >= 0.3) weaknesses.push({ tone: "info", title: "Recent results slipped", detail: `Recent trades average ${fmtR(trend.recentAvgR)} vs ${fmtR(trend.earlierAvgR)} earlier. Check whether you changed something (risk, rushing, direction).` });
  }

  // Style profile → strategy recommendations.
  const style = profileStyle(stats, fast, slow, withS);
  for (const r of style.strategies) recs.push(r);

  // Best strategy by results.
  const byStrat = segments.find((s) => s.title === "By strategy")?.rows ?? [];
  const topStrat = byStrat.find((s) => s.n >= 3 && s.avgR > 0 && s.key !== "lesson");
  if (topStrat) {
    recs.unshift({
      title: `Keep building on ${topStrat.label}`,
      detail: `It's your best-performing setup: ${pct(topStrat.winRate)} win rate, ${fmtR(topStrat.avgR)} per trade over ${topStrat.n} trades.`,
      ...(STRATEGY_LESSON[topStrat.key] ? { lesson: STRATEGY_LESSON[topStrat.key]! } : {}),
      play: { kind: "levels", strategyId: topStrat.key },
    });
  }

  // De-duplicate recommendations by lesson/title, keep the first 6.
  const seen = new Set<string>();
  const recommendations = recs.filter((r) => {
    const k = r.lesson ?? r.title;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 6);

  const headline = !n
    ? "No trades yet. Play a level or a practice chart and I'll start analysing."
    : !ready
      ? `${n} trade${n > 1 ? "s" : ""} logged. ${MIN_TRADES - n} more and I can give you a real read on your trading.`
      : stats.expectancy > 0.2
        ? `You have a positive edge: ${fmtR(stats.expectancy)} per trade. Protect it with consistent risk.`
        : stats.expectancy > -0.1
          ? "You're close to breakeven. A few process fixes would tip you into profit."
          : "Your results are negative right now. The good news: the causes are fixable. See below.";

  return { n, ready, headline, style: { name: style.name, description: style.description }, stats, best, strengths, weaknesses, recommendations, segments, trend };
}

function profileStyle(
  stats: AnalystReport["stats"],
  fast: Segment | undefined,
  slow: Segment | undefined,
  withS: Segment | undefined,
): { name: string; description: string; strategies: Recommendation[] } {
  const patient = (stats.avgRR ?? 0) >= 2 && stats.winRate < 0.55;
  const sniper = stats.winRate >= 0.6 && (stats.avgRR ?? 0) < 2;
  const quick = fast && slow && fast.avgR > slow.avgR;
  const trendFollower = withS && withS.avgR > 0;

  if (quick)
    return {
      name: "Fast reader",
      description: "You make your best calls quickly. You read momentum and act on it.",
      strategies: [
        { title: "Try: London session breakout", detail: "Fast, rules-based entries at the session open suit quick decision-makers.", lesson: "strat-london-breakout" },
        { title: "Try: Smart Money sweep → OB entry", detail: "Precise intraday entries after liquidity grabs.", lesson: "strat-smc-ob-fvg" },
      ],
    };
  if (patient)
    return {
      name: "Patient swing trader",
      description: "You win less often but your winners are big. Classic trend-rider profile.",
      strategies: [
        { title: "Try: Trend pullback", detail: "Join established trends at value and let winners run with a trailing stop.", lesson: "strat-trend-pullback" },
        { title: "Try: Moving-average trend following", detail: "Rules that keep you in big trends longer.", lesson: "strat-ma-trend" },
      ],
    };
  if (sniper)
    return {
      name: "Sniper",
      description: "High accuracy, modest targets. You pick good spots, so you can afford to aim further.",
      strategies: [
        { title: "Try: Breakout and retest", detail: "High-probability entries where you can still target 2R+.", lesson: "strat-breakout-retest" },
        { title: "Learn: trade management", detail: "Partial profits + trailing stops turn accurate entries into bigger wins.", lesson: "trade-management" },
      ],
    };
  if (trendFollower)
    return {
      name: "Structure follower",
      description: "Your results come from trading with the trend's structure.",
      strategies: [
        { title: "Try: BOS continuation (top-down)", detail: "Add a higher-timeframe filter to the setup that already works for you.", lesson: "strat-top-down" },
        { title: "Try: Trend pullback", detail: "Same idea, entering at value for tighter stops.", lesson: "strat-trend-pullback" },
      ],
    };
  return {
    name: "Still forming",
    description: "No clear style yet. Build a foundation in structure and risk first.",
    strategies: [
      { title: "Start with: Trend pullback", detail: "The most forgiving strategy for newer traders.", lesson: "strat-trend-pullback" },
      { title: "Practise in replay mode", detail: "Random charts, no pressure: build pattern recognition.", play: { kind: "practice" } },
    ],
  };
}

/** One-line comment shown on the review screen right after a trade. */
export function tradeNote(t: TradeRecord, history: TradeRecord[]): string {
  const prior = history.filter((h) => h.id !== t.id);
  const bestSoFar = prior.length > 0 && prior.every((h) => quality(h) < quality(t));
  if (!t.usedSL) return "No stop loss on this one. That's the habit most likely to blow up an account.";
  if (bestSoFar && t.r > 0) return `Your best trade so far: ${reasonsFor(t).slice(0, 3).join(", ").toLowerCase()}.`;
  if (!t.withSetup && t.r < 0) return "You traded against the structure. Next time, name the trend and the last BOS before choosing a side.";
  if (!t.withSetup && t.r > 0) return "You won, but against the structure. Treat this as luck, not a pattern to repeat.";
  if (t.plannedRR !== null && t.plannedRR < 1.2) return `Your planned reward was only ${t.plannedRR.toFixed(1)}× the risk. Aim for 2× so one win covers two losses.`;
  if (t.riskPct > 2) return `You risked ${t.riskPct}% here. Keep it at 1% so a losing streak can't hurt you badly.`;
  if (t.r <= -0.99 && t.marksCorrect > 0 && t.marksWrong === 0) return "Good analysis, unlucky outcome. That's normal. Keep taking this trade.";
  if (t.r > 0 && t.marksWrong === 0) return "Clean trade: right read, right side, planned exit.";
  if (t.marksWrong > t.marksCorrect) return "More wrong marks than right ones. Slow down and mark only what you're sure of.";
  return "Logged. The Analyst tab tracks how this fits your overall pattern.";
}

// Ranked Season: every week, five real charts (medium / hard / exam, across all
// strategies), identical for every player. One attempt each; the season score is
// the sum of the five first-attempt scores.
import { LEVEL_INDEX, type LevelMeta } from "@/data/levels";
import { mulberry32 } from "@/engine/transform";
import type { Profile } from "@/types/game";

const WEEK = 7 * 86400000;
// Weeks start Monday 00:00 UTC. 1970-01-05 was a Monday.
const EPOCH_MONDAY = Date.UTC(1970, 0, 5);

export function weekNumber(t = Date.now()): number {
  return Math.floor((t - EPOCH_MONDAY) / WEEK);
}

export function seasonInfo(t = Date.now()) {
  const week = weekNumber(t);
  const start = EPOCH_MONDAY + week * WEEK;
  const d = new Date(start);
  return {
    week,
    name: `Weekly Season · ${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`,
    startsAt: start,
    endsAt: start + WEEK,
  };
}

/** This week's five ranked charts (deterministic from the week number). */
export function seasonLevels(week = weekNumber()): LevelMeta[] {
  const pool = LEVEL_INDEX.filter((l) => l.difficulty === "medium" || l.difficulty === "hard" || l.difficulty === "exam");
  const rng = mulberry32(week * 2654435761);
  const picked: LevelMeta[] = [];
  const strategies = new Set<string>();
  const shuffled = pool.map((l) => ({ l, r: rng() })).sort((a, b) => a.r - b.r).map((x) => x.l);
  for (const l of shuffled) {
    if (picked.length >= 5) break;
    if (strategies.has(l.strategyId)) continue; // five different strategies
    strategies.add(l.strategyId);
    picked.push(l);
  }
  return picked;
}

export const rankedKey = (levelId: string) => `ranked:${levelId}`;

export function seasonProgress(p: Profile, week = weekNumber()) {
  const levels = seasonLevels(week);
  const rows = levels.map((l) => {
    const k = rankedKey(l.id);
    const played = (p.attempts[k] ?? 0) > 0;
    return { level: l, played, score: played ? (p.firstTry[k] ?? 0) : null };
  });
  return { rows, total: rows.reduce((s, r) => s + (r.score ?? 0), 0), played: rows.filter((r) => r.played).length };
}

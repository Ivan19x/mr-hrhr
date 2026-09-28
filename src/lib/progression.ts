// Unlock rules (UI side; the server re-checks later):
//   • The game starts at Tier 1 → Candlesticks → level 1.
//   • Inside a strategy, levels unlock one by one (finish a level to open the next).
//   • Inside a tier, strategies unlock in order (finish one to open the next).
//   • Tiers unlock with XP.
import type { Level, Profile, Strategy } from "@/types/game";
import type { LevelMeta } from "@/data/levels";
import { STRATEGIES, TIERS, RANK_STEPS, rankForXp } from "@/data/curriculum";
import { LEVELS_BY_STRATEGY, findLevelMeta } from "@/data/levels";

export const MODE_UNLOCK_RANK = { timed: 3, ranked: 6 } as const; // rank steps: Junior Analyst I, Analyst I

/** XP needed to open each tier (matches rank steps: Junior Analyst I, Analyst I, Trader I). */
export const TIER_XP: Record<number, number> = {
  1: 0,
  2: RANK_STEPS[3]!.minXp,
  3: RANK_STEPS[6]!.minXp,
  4: RANK_STEPS[9]!.minXp,
};
export const TIER_RANK_NAME: Record<number, string> = { 1: "", 2: RANK_STEPS[3]!.name, 3: RANK_STEPS[6]!.name, 4: RANK_STEPS[9]!.name };

export function levelsFor(strategyId: string): LevelMeta[] {
  return LEVELS_BY_STRATEGY[strategyId] ?? [];
}

/** A strategy is finished once its exam (the last level) is passed. */
export function strategyComplete(p: Profile, strategyId: string): boolean {
  const levels = levelsFor(strategyId);
  const exam = levels[levels.length - 1];
  return !!exam && (p.results[exam.id]?.stars ?? 0) >= 1;
}

// Tracks grew from 11 to 32 levels. The original 11 keep their ids and their old
// order, so a level a player had already opened under the old order stays open.
const ORIGINAL_ORDER = ["tutorial", "easy-1", "easy-2", "easy-3", "medium-1", "medium-2", "medium-3", "hard-1", "hard-2", "hard-3", "exam"];
function originalPredecessor(levelId: string): string | null {
  const m = /^(t\d-[a-z]+)-(.+)$/.exec(levelId);
  if (!m) return null;
  const k = ORIGINAL_ORDER.indexOf(m[2]!);
  return k > 0 ? `${m[1]}-${ORIGINAL_ORDER[k - 1]}` : null;
}

export function tierUnlocked(p: Profile, tier: number): boolean {
  return p.xp >= (TIER_XP[tier] ?? Infinity);
}

/** Playable strategies in curriculum order. */
export function playableStrategies(): Strategy[] {
  return [...STRATEGIES].filter((s) => s.playable).sort((a, b) => a.tier - b.tier);
}

/** The playable strategy in the same tier that must be finished first (if any). */
export function previousInTier(strategyId: string): Strategy | null {
  const s = strategyById(strategyId);
  if (!s) return null;
  const inTier = STRATEGIES.filter((x) => x.tier === s.tier && x.playable);
  const k = inTier.findIndex((x) => x.id === strategyId);
  return k > 0 ? inTier[k - 1]! : null;
}

export function strategyUnlocked(p: Profile, strategyId: string): boolean {
  const s = strategyById(strategyId);
  if (!s || !s.playable || !tierUnlocked(p, s.tier)) return false;
  const prev = previousInTier(strategyId);
  return !prev || strategyComplete(p, prev.id);
}

/** Why a strategy is locked (for the UI), or null if it's open. */
export function lockReason(p: Profile, strategyId: string): string | null {
  const s = strategyById(strategyId);
  if (!s) return "Unknown strategy";
  if (!s.playable) return "Coming soon";
  if (!tierUnlocked(p, s.tier)) return `Reach ${TIER_XP[s.tier]!.toLocaleString()} XP (${TIER_RANK_NAME[s.tier]})`;
  const prev = previousInTier(strategyId);
  if (prev && !strategyComplete(p, prev.id)) return `Finish ${prev.name} first`;
  return null;
}

export function tierInfo(tier: number) {
  return TIERS.find((t) => t.tier === tier)!;
}

/** Levels unlock in order: each needs the one before it completed. */
export function levelUnlocked(p: Profile, levels: LevelMeta[], index: number): boolean {
  const first = levels[0];
  if (!first || !strategyUnlocked(p, first.strategyId)) return false;
  if (index === 0) return true;
  const prev = levels[index - 1];
  if (prev && (p.results[prev.id]?.stars ?? 0) >= 1) return true;
  const me = levels[index]!;
  if (p.results[me.id]) return true;
  const old = originalPredecessor(me.id);
  return !!old && (p.results[old]?.stars ?? 0) >= 1;
}

export function strategyStars(p: Profile, strategyId: string) {
  const levels = levelsFor(strategyId);
  const earned = levels.reduce((s, l) => s + (p.results[l.id]?.stars ?? 0), 0);
  return { earned, max: levels.length * 3 };
}

/** Next level in the same strategy, or the first level of the next strategy once it is unlocked. */
export function nextLevelId(levelId: string, p?: Profile): string | null {
  const lvl = findLevelMeta(levelId);
  if (!lvl || lvl.strategyId === "lesson") return null; // lesson games: see lib/lessonProgress
  const list = levelsFor(lvl.strategyId);
  const k = list.findIndex((l) => l.id === levelId);
  if (k >= 0 && k + 1 < list.length) return list[k + 1]!.id;
  if (!p) return null;
  const order = playableStrategies();
  const next = order[order.findIndex((s) => s.id === lvl.strategyId) + 1];
  return next && strategyUnlocked(p, next.id) ? (levelsFor(next.id)[0]?.id ?? null) : null;
}

/** The level the "Continue" button opens: the first unfinished level you're allowed to play. */
export function continueLevel(p: Profile): LevelMeta {
  for (const s of playableStrategies()) {
    if (!strategyUnlocked(p, s.id)) continue;
    const open = levelsFor(s.id).find((l) => !p.results[l.id]);
    if (open) return open;
  }
  // Everything available is done: replay the last unlocked strategy's exam.
  const done = playableStrategies().filter((s) => strategyUnlocked(p, s.id));
  const last = levelsFor(done[done.length - 1]?.id ?? "candles");
  return last[last.length - 1]!;
}

export function modeUnlocked(p: Profile, mode: keyof typeof MODE_UNLOCK_RANK): boolean {
  return rankForXp(p.xp).step >= MODE_UNLOCK_RANK[mode];
}

export function strategyById(id: string): Strategy | undefined {
  return STRATEGIES.find((s) => s.id === id);
}

export const DIFFICULTY_LABEL: Record<Level["difficulty"], string> = {
  tutorial: "Tutorial",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  exam: "Exam",
};

export function levelLabel(l: { id: string; difficulty: Level["difficulty"] }): string {
  const m = /-(\d+)$/.exec(l.id);
  return m ? `${DIFFICULTY_LABEL[l.difficulty]} ${m[1]}` : DIFFICULTY_LABEL[l.difficulty];
}

/** Hard/exam levels from every strategy the player has unlocked (Timed Challenge pool). */
export function timedPool(p: Profile): LevelMeta[] {
  return playableStrategies()
    .filter((s) => strategyUnlocked(p, s.id))
    .flatMap((s) => levelsFor(s.id).filter((l) => l.difficulty === "hard" || l.difficulty === "exam"));
}

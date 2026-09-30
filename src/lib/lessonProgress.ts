// Academy progression: the Academy is part of the game, and you learn before you play.
//   • A lesson ends with its game: real-chart levels on the lesson's concept.
//   • A lesson is complete when its quiz is passed AND every game level has a star
//     (general-knowledge lessons have no game: the quiz completes them).
//   • Lessons open in Academy order; a strategy's own lessons also open (in their
//     order) as soon as that strategy is unlocked on the Map. They are its tutorial.
//   • Strategy levels need their lessons first: each level lists the lesson that
//     teaches it, and that lesson plus every earlier lesson of the strategy must be done.
// Uses the small lesson list (lessonList.json), not the lesson content, so game pages stay light.
import type { Profile } from "@/types/game";
import LESSON_LIST from "@/data/academy/lessonList.json";
import { LESSON_STRATEGY } from "@/data/academy/lessonStrategy";
import { LESSON_GAMES, type LessonGameMeta, type LevelMeta } from "@/data/levels";
import { strategyUnlocked, levelUnlocked } from "./progression";

export type LessonRef = { id: string; title: string; module: number };
export const LESSONS: LessonRef[] = LESSON_LIST as LessonRef[];
const INDEX = new Map(LESSONS.map((l, k) => [l.id, k]));

export function lessonRef(id: string): LessonRef | undefined {
  const k = INDEX.get(id);
  return k === undefined ? undefined : LESSONS[k];
}

export function lessonGames(lessonId: string): LessonGameMeta[] {
  return LESSON_GAMES[lessonId] ?? [];
}

export function quizPassed(p: Profile, lessonId: string): boolean {
  return !!p.academy[lessonId];
}

export function gamesDone(p: Profile, lessonId: string): number {
  return lessonGames(lessonId).filter((g) => (p.results[g.id]?.stars ?? 0) >= 1).length;
}

export function lessonComplete(p: Profile, lessonId: string): boolean {
  return quizPassed(p, lessonId) && gamesDone(p, lessonId) === lessonGames(lessonId).length;
}

/** A strategy's lessons, in Academy order (they are its tutorial). */
export function lessonsForStrategy(strategyId: string): LessonRef[] {
  return LESSONS.filter((l) => LESSON_STRATEGY[l.id] === strategyId);
}

export function lessonUnlocked(p: Profile, lessonId: string): boolean {
  const k = INDEX.get(lessonId);
  if (k === undefined) return false;
  if (k === 0 || quizPassed(p, lessonId)) return true;
  if (lessonComplete(p, LESSONS[k - 1]!.id)) return true;
  // Strategy lessons open in their own order once the strategy is unlocked on the Map.
  const strat = LESSON_STRATEGY[lessonId];
  if (strat && strategyUnlocked(p, strat)) {
    const own = lessonsForStrategy(strat);
    const j = own.findIndex((l) => l.id === lessonId);
    return j === 0 || lessonComplete(p, own[j - 1]!.id);
  }
  return false;
}

/** Why a lesson is locked (null if open). */
export function lessonLockReason(p: Profile, lessonId: string): string | null {
  if (lessonUnlocked(p, lessonId)) return null;
  const strat = LESSON_STRATEGY[lessonId];
  const own = strat && strategyUnlocked(p, strat) ? lessonsForStrategy(strat) : null;
  const j = own ? own.findIndex((l) => l.id === lessonId) : -1;
  const prev = own && j > 0 ? own[j - 1] : LESSONS[(INDEX.get(lessonId) ?? 0) - 1];
  if (!prev) return "Locked";
  return lessonGames(prev.id).length ? `Finish "${prev.title}" first: pass its quiz and play its game` : `Finish "${prev.title}" first: pass its quiz`;
}

export function lessonGameUnlocked(p: Profile, lessonId: string, index: number): boolean {
  if (!lessonUnlocked(p, lessonId) || !quizPassed(p, lessonId)) return false;
  if (index === 0) return true;
  const prev = lessonGames(lessonId)[index - 1];
  return !!prev && (p.results[prev.id]?.stars ?? 0) >= 1;
}

/** Next game in the same lesson (null after the last one). */
export function nextLessonGame(levelId: string): string | null {
  for (const games of Object.values(LESSON_GAMES)) {
    const k = games.findIndex((g) => g.id === levelId);
    if (k >= 0) return games[k + 1]?.id ?? null;
  }
  return null;
}

/** The lesson "Continue" should open: the first incomplete lesson that is open. */
export function nextOpenLesson(p: Profile): LessonRef | null {
  return LESSONS.find((l) => !lessonComplete(p, l.id) && lessonUnlocked(p, l.id)) ?? null;
}

// ------------------------------------------------------------------ levels need lessons
// Candlesticks levels teach one pattern each (see scripts/build-candle-levels.ts PLAN).
const CANDLE_SLOT_PATTERN: Record<string, string> = {
  "easy-1": "hammer", "easy-2": "engulfing-bull", "easy-3": "shooting-star", "easy-4": "inverted-hammer", "easy-5": "dark-cloud",
  "easy-6": "doji-dragonfly", "easy-7": "hanging-man", "easy-8": "engulfing-bull", "easy-9": "shooting-star", "easy-10": "piercing",
  "medium-1": "engulfing-bear", "medium-2": "morning-star", "medium-3": "doji-gravestone", "medium-4": "harami-bull", "medium-5": "tweezer-bottom",
  "medium-6": "evening-star", "medium-7": "three-soldiers", "medium-8": "three-crows", "medium-9": "outside-bar", "medium-10": "hammer",
  "hard-1": "pin-bar", "hard-2": "harami-bear", "hard-3": "tweezer-top", "hard-4": "tweezer-top", "hard-5": "harami-bear",
  "hard-6": "hammer", "hard-7": "engulfing-bear", "hard-8": "morning-star", "hard-9": "dark-cloud", "hard-10": "shooting-star",
};
const PATTERN_LESSON: Record<string, string> = {
  "engulfing-bull": "engulfing", "engulfing-bear": "engulfing", hammer: "hammer-hanging-man", "hanging-man": "hammer-hanging-man",
  "shooting-star": "inverted-hammer-shooting-star", "inverted-hammer": "inverted-hammer-shooting-star",
  "morning-star": "three-candle", "evening-star": "three-candle", "three-soldiers": "three-candle", "three-crows": "three-candle",
  "doji-gravestone": "doji", "doji-dragonfly": "doji", "pin-bar": "pin-bar", "harami-bull": "harami", "harami-bear": "harami",
  "tweezer-top": "tweezers", "tweezer-bottom": "tweezers", piercing: "piercing-dark-cloud", "dark-cloud": "piercing-dark-cloud", "outside-bar": "inside-outside-bar",
};

/** The lesson a strategy level is built on (that lesson and all earlier ones of the strategy must be done). */
export function levelLesson(meta: LevelMeta): string | null {
  if (meta.strategyId === "lesson" || meta.difficulty === "tutorial") return null;
  const own = lessonsForStrategy(meta.strategyId);
  if (own.length === 0) return null;
  const slot = meta.id.replace(/^t\d-[a-z]+-/, "");
  if (meta.difficulty === "exam") return own[own.length - 1]!.id;
  if (meta.strategyId === "candles") {
    const pat = CANDLE_SLOT_PATTERN[slot];
    return (pat && PATTERN_LESSON[pat]) || own[0]!.id;
  }
  // Other strategies: the core lessons before the easy levels, then the advanced
  // lessons spread over the medium and hard levels.
  const core = own.filter((l) => l.module <= 12);
  const adv = own.filter((l) => l.module > 12);
  const lastCore = (core[core.length - 1] ?? own[0])!.id;
  if (meta.difficulty === "easy" || adv.length === 0) return lastCore;
  const n = Number(/-(\d+)$/.exec(slot)?.[1] ?? 1);
  const pos = meta.difficulty === "medium" ? n : 10 + n; // 1..20
  const need = Math.ceil((pos * adv.length) / 20);
  return need === 0 ? lastCore : adv[need - 1]!.id;
}

/** The first lesson still to finish before this level opens (null = nothing to learn first). */
export function levelLessonGate(p: Profile, meta: LevelMeta): LessonRef | null {
  if (p.results[meta.id]) return null; // already played before lessons were required
  const target = levelLesson(meta);
  if (!target) return null;
  const own = lessonsForStrategy(meta.strategyId);
  const upto = own.findIndex((l) => l.id === target);
  return own.slice(0, upto + 1).find((l) => !lessonComplete(p, l.id)) ?? null;
}

/** A strategy level is open when its place in the track is reached AND its lessons are done. */
export function levelOpen(p: Profile, levels: LevelMeta[], index: number): boolean {
  return levelUnlocked(p, levels, index) && !levelLessonGate(p, levels[index]!);
}

// Academy progression: the Academy is part of the game.
//   • A lesson ends with its game: real-chart levels on the lesson's concept.
//   • A lesson is complete when its quiz is passed AND every game level has a star.
//   • Lessons open in order (finish one to open the next), and a lesson also opens
//     as soon as its strategy is unlocked on the Map (its lessons are the tutorial).
//   • A lesson's game levels open after the quiz, one after another.
import type { Profile } from "@/types/game";
import { ALL_LESSONS } from "@/data/academy";
import { LESSON_STRATEGY } from "@/data/academy/lessonStrategy";
import { LESSON_GAMES, type LessonGameMeta } from "@/data/levels";
import { strategyUnlocked } from "./progression";

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

export function lessonUnlocked(p: Profile, lessonId: string): boolean {
  const k = ALL_LESSONS.findIndex((x) => x.lesson.id === lessonId);
  if (k <= 0) return k === 0;
  if (quizPassed(p, lessonId)) return true; // studied before lessons were gated
  const strat = LESSON_STRATEGY[lessonId];
  if (strat && strategyUnlocked(p, strat)) return true;
  return lessonComplete(p, ALL_LESSONS[k - 1]!.lesson.id);
}

/** Why a lesson is locked (null if open). */
export function lessonLockReason(p: Profile, lessonId: string): string | null {
  if (lessonUnlocked(p, lessonId)) return null;
  const k = ALL_LESSONS.findIndex((x) => x.lesson.id === lessonId);
  const prev = ALL_LESSONS[k - 1]?.lesson;
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
export function nextOpenLesson(p: Profile) {
  return ALL_LESSONS.find((x) => !lessonComplete(p, x.lesson.id) && lessonUnlocked(p, x.lesson.id)) ?? null;
}

// Academy progress: best quiz score per lesson, XP for first pass.
import { getProfile, saveProfile } from "./progressService";

export const LESSON_PASS = 2 / 3;
export const LESSON_XP = 30;

/** XP for passing a lesson quiz shrinks with each attempt: 30, 15, then 5. */
export function quizXp(attempt: number): number {
  return attempt <= 1 ? LESSON_XP : attempt === 2 ? Math.round(LESSON_XP / 2) : 5;
}

/** Count a quiz attempt without a result (e.g. leaving the quiz mid-way). */
export async function registerQuizAttempt(lessonId: string): Promise<number> {
  const p = await getProfile();
  p.quizAttempts[lessonId] = (p.quizAttempts[lessonId] ?? 0) + 1;
  await saveProfile(p);
  return p.quizAttempts[lessonId]!;
}

export async function getQuizAttempts(lessonId: string): Promise<number> {
  return (await getProfile()).quizAttempts[lessonId] ?? 0;
}

/** Save a quiz result. XP only on the first pass, reduced by earlier attempts. */
export async function recordLessonQuiz(lessonId: string, score: number): Promise<{ xpGained: number; firstPass: boolean }> {
  const p = await getProfile();
  const prev = p.academy[lessonId];
  const attempt = (p.quizAttempts[lessonId] = (p.quizAttempts[lessonId] ?? 0) + 1);
  const passed = score >= LESSON_PASS;
  const firstPass = passed && !prev;
  if (passed && (!prev || score > prev.best)) {
    p.academy[lessonId] = { best: score, completedAt: prev?.completedAt ?? Date.now() };
  }
  const xpGained = firstPass ? quizXp(attempt) : 0;
  p.xp += xpGained;
  await saveProfile(p);
  return { xpGained, firstPass };
}

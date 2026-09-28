import type { Lesson, Module } from "./types";
import { M01_BASICS } from "./m01-basics";
import { M02_INFRASTRUCTURE } from "./m02-infrastructure";
import { M03_CANDLES, M04_SINGLE } from "./m03-candles";
import { M05_COMBOS, M06_CHARTS } from "./m05-combos";
import { M07_STRUCTURE, M08_PATTERNS } from "./m07-structure";
import { M09_INDICATORS } from "./m09-indicators";
import { M10_TERMS } from "./m10-terms";
import { M11_STRATEGIES } from "./m11-strategies";
import { M12_TECHNIQUES } from "./m12-techniques";

export const MODULES: Module[] = [
  M01_BASICS,
  M02_INFRASTRUCTURE,
  M03_CANDLES,
  M04_SINGLE,
  M05_COMBOS,
  M06_CHARTS,
  M07_STRUCTURE,
  M08_PATTERNS,
  M09_INDICATORS,
  M10_TERMS,
  M11_STRATEGIES,
  M12_TECHNIQUES,
];

export const ALL_LESSONS: { lesson: Lesson; module: Module; index: number }[] = MODULES.flatMap((m) =>
  m.lessons.map((lesson, index) => ({ lesson, module: m, index })),
);

export function findLesson(id: string) {
  const k = ALL_LESSONS.findIndex((x) => x.lesson.id === id);
  if (k < 0) return null;
  return { ...ALL_LESSONS[k]!, prev: ALL_LESSONS[k - 1]?.lesson ?? null, next: ALL_LESSONS[k + 1]?.lesson ?? null };
}

export const TOTAL_LESSONS = ALL_LESSONS.length;

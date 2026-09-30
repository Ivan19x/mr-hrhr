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
import { M13_CANDLES_GAPS } from "./m13-candles-gaps";
import { M14_STRUCTURE_PRO } from "./m14-structure-pro";
import { M15_PATTERNS_PRO } from "./m15-patterns-pro";
import { M16_INDICATORS_PRO } from "./m16-indicators-pro";
import { M17_LIQUIDITY_PRO } from "./m17-liquidity-pro";
import { M18_IMBALANCES } from "./m18-imbalances";
import { M19_ORDER_BLOCKS_PRO } from "./m19-order-blocks-pro";
import { M20_FIB_PRO } from "./m20-fib-pro";
import { M21_TIME } from "./m21-time";
import { M22_INSTITUTIONAL } from "./m22-institutional";
import { M23_WYCKOFF_VOLUME } from "./m23-wyckoff-volume";
import { M24_ENTRY_MODELS } from "./m24-entry-models";
import { M25_PROFESSIONAL } from "./m25-professional";

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
  M13_CANDLES_GAPS,
  M14_STRUCTURE_PRO,
  M15_PATTERNS_PRO,
  M16_INDICATORS_PRO,
  M17_LIQUIDITY_PRO,
  M18_IMBALANCES,
  M19_ORDER_BLOCKS_PRO,
  M20_FIB_PRO,
  M21_TIME,
  M22_INSTITUTIONAL,
  M23_WYCKOFF_VOLUME,
  M24_ENTRY_MODELS,
  M25_PROFESSIONAL,
];

/** Modules 1–12 are the core course; 13+ are the advanced course. */
export const CORE_MODULES = 12;

/** Lesson that teaches a syllabus / glossary term (from each lesson's `terms`). */
const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const TERM_LESSON = new Map<string, string>();
for (const m of MODULES) for (const l of m.lessons) for (const t of l.terms ?? []) TERM_LESSON.set(norm(t), l.id);
export function lessonForTerm(term: string): string | undefined {
  return TERM_LESSON.get(norm(term));
}

export const ALL_LESSONS: { lesson: Lesson; module: Module; index: number }[] = MODULES.flatMap((m) =>
  m.lessons.map((lesson, index) => ({ lesson, module: m, index })),
);

export function findLesson(id: string) {
  const k = ALL_LESSONS.findIndex((x) => x.lesson.id === id);
  if (k < 0) return null;
  return { ...ALL_LESSONS[k]!, prev: ALL_LESSONS[k - 1]?.lesson ?? null, next: ALL_LESSONS[k + 1]?.lesson ?? null };
}

export const TOTAL_LESSONS = ALL_LESSONS.length;

if (import.meta.env?.DEV) {
  import("./lessonList.json").then(({ default: list }) => {
    const a = ALL_LESSONS.map((x) => x.lesson.id).join(",");
    const b = (list as { id: string }[]).map((x) => x.id).join(",");
    if (a !== b) console.warn("[MR_HRHR] lessonList.json is out of date: run `node scripts/dump-lessons.mjs`.");
  });
}

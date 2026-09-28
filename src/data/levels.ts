// Every playable level in the game (all real market charts): the strategy tracks
// (scripts/build-all-levels.ts) and the game at the end of each Academy lesson
// (scripts/build-lesson-games.ts). Small indexes load up front; charts load when needed.
import type { Candle, Level } from "@/types/game";
import indexJson from "./real/levelIndex.json";
import lessonIndexJson from "./real/lessonGames.json";

export type LevelMeta = { id: string; strategyId: string; tier: 1 | 2 | 3 | 4; difficulty: Level["difficulty"] };

const ORDER: Level["difficulty"][] = ["tutorial", "easy", "medium", "hard", "exam"];
const slotRank = (id: string) => {
  const m = /-(\d+)$/.exec(id);
  return m ? Number(m[1]) : 0;
};

export const LEVEL_INDEX: LevelMeta[] = (indexJson as LevelMeta[])
  .slice()
  .sort((a, b) => a.tier - b.tier || ORDER.indexOf(a.difficulty) - ORDER.indexOf(b.difficulty) || slotRank(a.id) - slotRank(b.id));

export const LEVELS_BY_STRATEGY: Record<string, LevelMeta[]> = {};
for (const m of LEVEL_INDEX) (LEVELS_BY_STRATEGY[m.strategyId] ??= []).push(m);

/** The game at the end of an Academy lesson: real-chart levels on that lesson's concept. */
export type LessonGameMeta = LevelMeta & { lessonId: string; lessonTitle: string; module: number };
export const LESSON_GAMES: Record<string, LessonGameMeta[]> = {};
for (const g of lessonIndexJson as Omit<LessonGameMeta, "strategyId">[]) (LESSON_GAMES[g.lessonId] ??= []).push({ ...g, strategyId: "lesson" });
const LESSON_GAME_BY_ID = new Map(Object.values(LESSON_GAMES).flat().map((g) => [g.id, g]));

export function findLessonGame(id: string): LessonGameMeta | undefined {
  return LESSON_GAME_BY_ID.get(id);
}

export function findLevelMeta(id: string): LevelMeta | undefined {
  return LEVEL_INDEX.find((l) => l.id === id) ?? LESSON_GAME_BY_ID.get(id);
}

type Compact = Omit<Level, "candles"> & { rows: number[][] };
const files = import.meta.glob<{ default: Compact[] }>("./real/levels/*.json");
const cache = new Map<string, Level[]>();

/** Load (and cache) every level of one strategy. */
export async function loadStrategyLevels(strategyId: string): Promise<Level[]> {
  const hit = cache.get(strategyId);
  if (hit) return hit;
  const load = files[`./real/levels/${strategyId}.json`];
  if (!load) return [];
  const raw = (await load()).default;
  const levels: Level[] = raw.map(({ rows, ...rest }) => ({
    ...rest,
    candles: rows.map((r, i): Candle => ({ i, o: r[0]!, h: r[1]!, l: r[2]!, c: r[3]! })),
  }));
  cache.set(strategyId, levels);
  return levels;
}

const lessonFiles = import.meta.glob<{ default: Compact[] }>("./real/lessons/*.json");
const lessonCache = new Map<number, Level[]>();
async function loadLessonModule(module: number): Promise<Level[]> {
  const hit = lessonCache.get(module);
  if (hit) return hit;
  const load = lessonFiles[`./real/lessons/m${module}.json`];
  if (!load) return [];
  const levels = (await load()).default.map(({ rows, ...rest }) => ({ ...rest, candles: rows.map((r, i): Candle => ({ i, o: r[0]!, h: r[1]!, l: r[2]!, c: r[3]! })) }));
  lessonCache.set(module, levels);
  return levels;
}

/** Load one level by id (strategy level or lesson game). */
export async function loadLevel(id: string): Promise<Level | undefined> {
  const game = LESSON_GAME_BY_ID.get(id);
  if (game) return (await loadLessonModule(game.module)).find((l) => l.id === id);
  const meta = findLevelMeta(id);
  if (!meta) return undefined;
  return (await loadStrategyLevels(meta.strategyId)).find((l) => l.id === id);
}

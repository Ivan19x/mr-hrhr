// Every playable level in the game (all real market charts, see scripts/build-all-levels.ts).
// A small index loads up front; each strategy's charts load only when needed.
import type { Candle, Level } from "@/types/game";
import indexJson from "./real/levelIndex.json";

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

export function findLevelMeta(id: string): LevelMeta | undefined {
  return LEVEL_INDEX.find((l) => l.id === id);
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

/** Load one level by id. */
export async function loadLevel(id: string): Promise<Level | undefined> {
  const meta = findLevelMeta(id);
  if (!meta) return undefined;
  return (await loadStrategyLevels(meta.strategyId)).find((l) => l.id === id);
}

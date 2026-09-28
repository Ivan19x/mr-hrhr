// Daily challenge: one real chart per day, identical for every player.
import { LEVEL_INDEX, type LevelMeta } from "@/data/levels";

/** Today's chart: the same for every player, rotating through all medium/hard real levels. */
export async function getDailyChallenge(): Promise<{ level: LevelMeta; endsAt: number } | null> {
  if (!navigator.onLine) return null;
  const dayIndex = Math.floor(Date.now() / 86400000);
  const pool = LEVEL_INDEX.filter((l) => l.difficulty === "medium" || l.difficulty === "hard");
  const level = pool[dayIndex % pool.length]!;
  const endsAt = (Math.floor(Date.now() / 86400000) + 1) * 86400000;
  return { level, endsAt };
}

export async function getSeasonInfo() {
  const now = Date.now();
  const weekMs = 7 * 86400000;
  const endsAt = now + (weekMs - (now % weekMs));
  // Seasons start with online accounts; there is no rank until then.
  return { name: "Season 1", endsAt, yourRank: null as number | null };
}

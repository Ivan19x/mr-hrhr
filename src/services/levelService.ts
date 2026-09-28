// Level service: serves bundled level data (offline-first).
import type { Level } from "@/types/game";
import { loadLevel, loadStrategyLevels } from "@/data/levels";
import { STRATEGIES, TIERS } from "@/data/curriculum";

export async function getLevelsForStrategy(strategyId: string): Promise<Level[]> {
  return loadStrategyLevels(strategyId);
}

export async function getLevelById(id: string): Promise<Level | null> {
  return (await loadLevel(id)) ?? null;
}

export async function getStrategies() {
  return STRATEGIES;
}

export async function getTiers() {
  return TIERS;
}

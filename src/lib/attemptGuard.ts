// Tracks a level attempt that is "live" (chart paused at the decision point, result
// not yet locked in). If the player refreshes or closes the tab, the marker survives
// and the attempt is settled as a forfeit on their next visit.
import type { GameMode, Level } from "@/types/game";
import type { TradeRecord } from "@/engine/analyst";
import { currentUserSync } from "@/services/authService";
import { recordForfeit, FORFEIT_POINTS } from "@/services/progressService";
import { addTrade } from "@/services/journalService";

export type ActiveAttempt = {
  levelId: string;
  strategyId: string;
  difficulty: Level["difficulty"];
  mode: GameMode;
  correctDirection: "buy" | "sell";
  trade: { side: "buy" | "sell"; riskPct: number; usedSL: boolean } | null;
  startedAt: number;
};

const key = () => {
  const u = currentUserSync();
  return u ? `mrhrhr.activeAttempt.${u.id}` : null;
};

export function markAttempt(a: ActiveAttempt): void {
  const k = key();
  if (k) localStorage.setItem(k, JSON.stringify(a));
}

export function clearAttempt(): void {
  const k = key();
  if (k) localStorage.removeItem(k);
}

/** Record a forfeit for this attempt (score, balance, journal) and clear the marker. */
export async function forfeit(a: ActiveAttempt): Promise<{ balance: number }> {
  clearAttempt();
  const { firstAttempt, balance } = await recordForfeit(a.levelId, a.mode, a.trade);
  const rec: TradeRecord = {
    id: `${a.startedAt}-${a.levelId}-forfeit`,
    at: Date.now(),
    levelId: a.levelId,
    strategyId: a.strategyId,
    difficulty: a.difficulty,
    mode: a.mode,
    side: a.trade?.side ?? a.correctDirection,
    withSetup: a.trade ? a.trade.side === a.correctDirection : false,
    plannedRR: null,
    riskPct: a.trade?.riskPct ?? 0,
    usedSL: a.trade?.usedSL ?? false,
    r: a.trade ? -1 : 0,
    won: false,
    exit: "forfeit",
    score: FORFEIT_POINTS,
    marksCorrect: 0,
    marksWrong: 0,
    marksMissed: 0,
    answersCorrect: 0,
    answersTotal: 0,
    decisionSecs: null,
    counted: firstAttempt,
  };
  await addTrade(rec);
  return { balance };
}

/** If a previous attempt was abandoned (refresh / closed tab), settle it as a forfeit. */
export async function settleAbandonedAttempt(): Promise<ActiveAttempt | null> {
  const k = key();
  if (!k) return null;
  const raw = localStorage.getItem(k);
  if (!raw) return null;
  try {
    const a = JSON.parse(raw) as ActiveAttempt;
    await forfeit(a);
    return a;
  } catch {
    localStorage.removeItem(k);
    return null;
  }
}

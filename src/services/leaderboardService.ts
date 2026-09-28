// Leaderboards from REAL players only. Until online accounts exist, that means
// the profiles saved on this device. Scores come from each player's trade journal.
// The real backend will replace the internals with a server query.
import type { LeaderboardEntry } from "@/types/game";
import type { TradeRecord } from "@/engine/analyst";
import { currentUserSync, listAccounts } from "./authService";
import { kvGet } from "./db";

export type BoardTab = "global" | "weekly" | "daily" | "strategy" | "friends";

const DAY = 86400000;

export async function getLeaderboard(tab: BoardTab): Promise<LeaderboardEntry[]> {
  if (tab === "friends") return []; // needs online accounts
  const me = currentUserSync();
  const now = Date.now();
  const rows: (LeaderboardEntry & { tie: number })[] = [];
  for (const acc of listAccounts()) {
    const journal = (await kvGet<TradeRecord[]>(`${acc.id}:journal`)) ?? [];
    const scored = journal.filter((t) => {
      if (t.score === null) return false; // practice doesn't count
      if (!t.counted) return false; // only the first attempt at each level counts
      if (tab === "weekly") return now - t.at < 7 * DAY;
      if (tab === "daily") return t.mode === "daily" && now - t.at < DAY;
      if (tab === "strategy") return t.strategyId === "bos";
      return true;
    });
    if (scored.length === 0) continue;
    const score = scored.reduce((s, t) => s + (t.score ?? 0), 0);
    const marksPlaced = scored.reduce((s, t) => s + t.marksCorrect + t.marksWrong + t.marksMissed, 0);
    const marksOk = scored.reduce((s, t) => s + t.marksCorrect, 0);
    const qTotal = scored.reduce((s, t) => s + t.answersTotal, 0);
    const qOk = scored.reduce((s, t) => s + t.answersCorrect, 0);
    const markAcc = marksPlaced ? marksOk / marksPlaced : 0;
    const quizAcc = qTotal ? qOk / qTotal : 0;
    rows.push({
      rank: 0,
      name: acc.name,
      score,
      accuracy: Math.round(((markAcc + quizAcc) / 2) * 100),
      tie: markAcc * 1000 + quizAcc, // ties broken by marking, then quiz accuracy
      ...(me?.id === acc.id ? { isYou: true } : {}),
    });
  }
  rows.sort((a, b) => b.score - a.score || b.tie - a.tie);
  return rows.map(({ tie: _tie, ...r }, k) => ({ ...r, rank: k + 1 }));
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WifiOff, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useOnline } from "@/hooks/use-online";
import { isApp } from "@/lib/platform";
import { getLeaderboard } from "@/services/leaderboardService";
import type { LeaderboardEntry } from "@/types/game";

export const Route = createFileRoute("/leaderboards")({
  head: () => ({ meta: [{ title: "Leaderboards — MR_HRHR" }] }),
  component: LeaderboardsPage,
});

type Tab = "global" | "weekly" | "daily" | "strategy" | "friends";
const TABS: { id: Tab; label: string }[] = [
  { id: "global", label: "Global" },
  { id: "weekly", label: "Weekly" },
  { id: "daily", label: "Daily" },
  { id: "strategy", label: "Per strategy" },
  { id: "friends", label: "Friends" },
];

const MEDAL = ["text-gold", "text-slate-300", "text-amber-600"];

function LeaderboardsPage() {
  // Only the installed app can be offline; the website always shows the boards.
  const online = useOnline() || !isApp();
  const [tab, setTab] = useState<Tab>("global");
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    if (!online) return;
    setRows(null);
    getLeaderboard(tab).then(setRows);
  }, [tab, online]);

  return (
    <AppShell>
      <h1 className="text-3xl font-black">Leaderboards</h1>
      <p className="mt-1 text-muted-foreground">Ranked by total score, not raw profit. Ties are broken by marking and quiz accuracy.</p>

      <div className="mt-5 flex gap-1 overflow-x-auto rounded-lg bg-secondary p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!online ? (
        <div className="panel mt-6 flex flex-col items-center p-12 text-center">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">You're offline</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Leaderboards need a connection. Your scores are safe in the sync queue and will upload when you reconnect.
          </p>
        </div>
      ) : (
        <div className="panel mt-6 overflow-hidden">
          <div className="grid grid-cols-[3rem_1fr_5rem_5rem] gap-2 border-b border-border px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
            <span>#</span>
            <span>Trader</span>
            <span className="text-right">Score</span>
            <span className="text-right">Accuracy</span>
          </div>
          {!rows ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {tab === "friends"
                ? "Friends arrive with online accounts."
                : tab === "daily"
                  ? "Nobody has played today's Daily Challenge on this device yet."
                  : "No scored trades yet. Play a campaign level to get on the board."}
            </p>
          ) : (
            rows.map((r, k) => (
              <motion.div
                key={`${tab}-${r.rank}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: k * 0.025 }}
                className={`grid grid-cols-[3rem_1fr_5rem_5rem] items-center gap-2 border-b border-border/50 px-4 py-2.5 text-sm last:border-0 ${
                  r.isYou ? "bg-electric/10 font-semibold" : ""
                }`}
              >
                <span className={`font-num flex items-center gap-1 font-bold ${MEDAL[r.rank - 1] ?? "text-muted-foreground"}`}>
                  {r.rank <= 3 && <Trophy className="h-3.5 w-3.5" />}
                  {r.rank}
                </span>
                <span className="flex items-center gap-2 truncate">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${r.isYou ? "bg-electric text-electric-foreground" : "bg-secondary"}`}>
                    {r.name.slice(0, 2).toUpperCase()}
                  </span>
                  {r.name}
                  {r.isYou && <span className="rounded bg-electric/20 px-1.5 text-[10px] text-electric">YOU</span>}
                </span>
                <span className="font-num text-right">{r.score.toLocaleString()}</span>
                <span className="font-num text-right text-muted-foreground">{r.accuracy}%</span>
              </motion.div>
            ))
          )}
        </div>
      )}
      <p className="mt-3 text-center text-[11px] text-muted-foreground">Real players only: the profiles on this device. Worldwide rankings arrive with online accounts.</p>
    </AppShell>
  );
}

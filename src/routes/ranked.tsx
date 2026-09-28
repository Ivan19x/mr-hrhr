import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Lock, CheckCircle2, Timer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/hooks/use-profile";
import { seasonInfo, seasonProgress } from "@/services/rankedService";
import { getLeaderboard } from "@/services/leaderboardService";
import { levelLabel, modeUnlocked, strategyById, MODE_UNLOCK_RANK } from "@/lib/progression";
import { RANK_STEPS } from "@/data/curriculum";
import type { LeaderboardEntry } from "@/types/game";

export const Route = createFileRoute("/ranked")({
  head: () => ({ meta: [{ title: "Ranked Season — MR_HRHR" }] }),
  component: RankedPage,
});

function useCountdown(endsAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const s = Math.max(0, Math.floor((endsAt - now) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function RankedPage() {
  const profile = useProfile();
  const season = seasonInfo();
  const left = useCountdown(season.endsAt);
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null);
  useEffect(() => {
    getLeaderboard("season").then(setBoard);
  }, [profile]);
  if (!profile) return <AppShell>{null}</AppShell>;

  const unlocked = modeUnlocked(profile, "ranked");
  const prog = seasonProgress(profile, season.week);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">Ranked</p>
          <h1 className="text-3xl font-black">{season.name}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Five real charts from five different strategies, the same for every player this week. One attempt each. Your season score is the total of your five results.
          </p>
        </div>
        <div className="panel flex items-center gap-3 p-4">
          <Timer className="h-5 w-5 text-gold" />
          <div>
            <p className="text-xs text-muted-foreground">Season ends in</p>
            <p className="font-num font-bold">{left}</p>
          </div>
        </div>
      </div>

      {!unlocked ? (
        <div className="panel mt-8 flex flex-col items-center p-10 text-center">
          <Lock className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-semibold">Ranked unlocks at {RANK_STEPS[MODE_UNLOCK_RANK.ranked]!.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You need {RANK_STEPS[MODE_UNLOCK_RANK.ranked]!.minXp.toLocaleString()} XP. You have {profile.xp.toLocaleString()}.
          </p>
          <Link to="/map" className="mt-4 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
            Keep training
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {prog.rows.map((r, k) => {
              const s = strategyById(r.level.strategyId);
              return (
                <motion.div key={r.level.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.05 }} className="panel flex flex-col p-4">
                  <p className="font-num text-xs text-muted-foreground">Chart {k + 1}</p>
                  <p className="mt-1 font-semibold">{s?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Tier {r.level.tier} · {levelLabel(r.level)}
                  </p>
                  <div className="mt-auto pt-4">
                    {r.played ? (
                      <p className={`font-num flex items-center gap-1.5 font-bold ${(r.score ?? 0) >= 0 ? "text-up" : "text-down"}`}>
                        <CheckCircle2 className="h-4 w-4" /> {(r.score ?? 0) > 0 ? "+" : ""}
                        {r.score}
                      </p>
                    ) : (
                      <Link
                        to="/play/$levelId"
                        params={{ levelId: r.level.id }}
                        search={{ mode: "ranked" }}
                        className="block rounded-lg bg-primary py-2 text-center text-sm font-semibold text-primary-foreground"
                      >
                        Play (1 attempt)
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="panel mt-4 flex items-center justify-between p-4">
            <p className="text-sm text-muted-foreground">
              Played {prog.played}/5 · season score
            </p>
            <p className={`font-num text-2xl font-black ${prog.total >= 0 ? "text-up" : "text-down"}`}>{prog.total}</p>
          </div>
        </>
      )}

      <section className="panel mt-6 overflow-hidden">
        <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 font-semibold">
          <Trophy className="h-4 w-4 text-gold" /> This week's standings
        </h2>
        {!board ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : board.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No ranked results yet this week.</p>
        ) : (
          board.map((r) => (
            <div key={r.rank} className={`flex items-center justify-between border-b border-border/50 px-4 py-2.5 text-sm last:border-0 ${r.isYou ? "bg-electric/10 font-semibold" : ""}`}>
              <span>
                <span className="font-num mr-3 text-muted-foreground">#{r.rank}</span>
                {r.name}
              </span>
              <span className="font-num">{r.score}</span>
            </div>
          ))
        )}
        <p className="px-4 py-2 text-[11px] text-muted-foreground">Players on this device. Worldwide standings arrive with online accounts.</p>
      </section>
    </AppShell>
  );
}

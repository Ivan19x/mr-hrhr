import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RankBadge } from "@/components/RankBadge";
import { BADGE_LABELS } from "@/components/PlaySession";
import { useProfile } from "@/hooks/use-profile";
import { getStats } from "@/services/progressService";
import { getCurrentUser, type AuthUser } from "@/services/authService";
import { RANKS, RANK_STEPS, rankForXp } from "@/data/curriculum";
import { findLevelMeta as findLevel } from "@/data/levels";
import { levelLabel, strategyById } from "@/lib/progression";
import type { BadgeId } from "@/types/game";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile & Stats — MR_HRHR" }] }),
  component: ProfilePage,
});

type Stats = Awaited<ReturnType<typeof getStats>>;

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function ProfilePage() {
  const profile = useProfile();
  const [stats, setStats] = useState<Stats | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    getStats().then(setStats);
    getCurrentUser().then(setUser);
  }, [profile]);
  if (!profile || !stats) return <AppShell>{null}</AppShell>;

  const rank = rankForXp(profile.xp);
  const recent = Object.values(profile.results)
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, 6);

  const tiles = [
    { label: "Win rate", value: pct(stats.winRate) },
    { label: "Average R", value: `${stats.avgR >= 0 ? "+" : ""}${stats.avgR.toFixed(2)}R` },
    { label: "Marking accuracy", value: pct(stats.markingAccuracy) },
    { label: "Quiz accuracy", value: pct(stats.quizAccuracy) },
    { label: "Levels played", value: String(stats.trades) },
    { label: "Balance", value: `$${profile.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
  ];

  return (
    <AppShell>
      {/* Header */}
      <section className="panel flex flex-col items-center gap-5 p-6 sm:flex-row">
        <RankBadge index={rank.index} sub={rank.sub} size={88} />
        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm text-muted-foreground">{user?.name ?? "Guest Trader"}</p>
          <h1 className="text-3xl font-black">{rank.name}</h1>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <motion.div initial={{ width: 0 }} animate={{ width: `${rank.progress * 100}%` }} className="h-full bg-electric" />
          </div>
          <p className="font-num mt-1 text-xs text-muted-foreground">
            {profile.xp.toLocaleString()} XP {rank.nextName && rank.nextXp !== null ? `· ${(rank.nextXp - profile.xp).toLocaleString()} to ${rank.nextName}` : "· max rank"}
          </p>
        </div>
      </section>

      {/* Rank ladder */}
      <section className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {RANKS.map((r, k) => {
          const subs = RANK_STEPS.filter((st) => st.major === k);
          return (
            <div key={r.name} className={`flex min-w-28 flex-1 flex-col items-center rounded-lg p-2 text-center ${k === rank.index ? "bg-secondary" : ""} ${k > rank.index ? "opacity-40" : ""}`}>
              <RankBadge index={k} size={32} />
              <p className="mt-1 text-[11px] font-semibold">{r.name}</p>
              <div className="mt-1 flex gap-1">
                {subs.map((st) => (
                  <span
                    key={st.name}
                    title={`${st.name}: ${st.minXp.toLocaleString()} XP`}
                    className={`font-num rounded px-1 text-[9px] ${rank.step >= st.major * 3 + st.sub ? "bg-gold/20 text-gold" : "bg-background text-muted-foreground"}`}
                  >
                    {["I", "II", "III"][st.sub]}
                  </span>
                ))}
              </div>
              <p className="font-num mt-0.5 text-[10px] text-muted-foreground">{r.minXp.toLocaleString()} XP</p>
            </div>
          );
        })}
      </section>

      {/* Stat tiles */}
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="panel p-4">
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="font-num mt-1 text-2xl font-bold">{t.value}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Concepts */}
        <section className="panel p-5">
          <h2 className="font-semibold">Concept accuracy</h2>
          {stats.concepts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Play a few levels to see your strongest and weakest concepts.</p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {stats.strongest && <span className="rounded-full bg-up/15 px-2.5 py-1 text-up">Strongest: {stats.strongest.label}</span>}
                {stats.weakest && <span className="rounded-full bg-down/15 px-2.5 py-1 text-down">Weakest: {stats.weakest.label}</span>}
              </div>
              <div className="mt-4 space-y-3">
                {stats.concepts.map((c) => (
                  <div key={c.id}>
                    <div className="flex justify-between text-sm">
                      <span>{c.label}</span>
                      <span className="font-num text-muted-foreground">
                        {pct(c.accuracy)} <span className="text-[10px]">({c.total})</span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.accuracy * 100}%` }}
                        className={`h-full rounded-full ${c.accuracy >= 0.7 ? "bg-up" : c.accuracy >= 0.4 ? "bg-gold" : "bg-down"}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Badges */}
        <section className="panel p-5">
          <h2 className="font-semibold">Badges</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(Object.keys(BADGE_LABELS) as BadgeId[]).map((b) => {
              const earned = profile.badges.includes(b);
              const info = BADGE_LABELS[b];
              return (
                <div key={b} className={`rounded-lg border p-3 text-center ${earned ? "border-gold/50 bg-gold/10" : "border-border opacity-45 grayscale"}`}>
                  <p className="text-3xl">{info.icon}</p>
                  <p className="mt-1 text-sm font-semibold">{info.name}</p>
                  <p className="text-[11px] text-muted-foreground">{info.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Recent */}
      <section className="panel mt-4 p-5">
        <h2 className="font-semibold">Recent levels</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing yet.{" "}
            <Link to="/map" className="text-electric underline">
              Start the campaign
            </Link>
            .
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {recent.map((r) => {
              const l = findLevel(r.levelId);
              return (
                <div key={r.levelId} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{l ? `${strategyById(l.strategyId)?.name} · ${levelLabel(l)}` : r.levelId}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.completedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-num ${r.r > 0 ? "text-up" : "text-down"}`}>
                      {r.r > 0 ? "+" : ""}
                      {r.r.toFixed(1)}R
                    </span>
                    <span className="font-num w-12 text-right font-semibold">{r.score}</span>
                    <span className="flex">
                      {[1, 2, 3].map((s) => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= r.stars ? "fill-gold text-gold" : "text-muted"}`} />
                      ))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}

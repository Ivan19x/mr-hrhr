import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Map, GraduationCap, BrainCircuit, Shuffle, Timer, CalendarDays, Trophy, Lock, WifiOff, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RankBadge } from "@/components/RankBadge";
import { useProfile } from "@/hooks/use-profile";
import { useOnline } from "@/hooks/use-online";
import { isApp } from "@/lib/platform";
import { getJournal } from "@/services/journalService";
import { analyze } from "@/engine/analyst";
import { ALL_LESSONS, TOTAL_LESSONS } from "@/data/academy";
import { getCurrentUser, type AuthUser } from "@/services/authService";
import { getDailyChallenge } from "@/services/dailyChallengeService";
import { seasonInfo } from "@/services/rankedService";
import { rankForXp, RANK_STEPS } from "@/data/curriculum";
import { continueLevel, levelLabel, modeUnlocked, strategyById, timedPool, MODE_UNLOCK_RANK } from "@/lib/progression";
import { lessonComplete, levelLessonGate, nextOpenLesson } from "@/lib/lessonProgress";
import { MODULES } from "@/data/academy";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "Home — MR_HRHR" }] }),
  component: HomePage,
});

function useCountdown(endsAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  if (!endsAt) return "--:--:--";
  const s = Math.max(0, Math.floor((endsAt - now) / 1000));
  const d = Math.floor(s / 86400);
  const hms = [Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");
  return d > 0 ? `${d}d ${hms}` : hms;
}

function HomePage() {
  const profile = useProfile();
  const online = useOnline();
  const [app, setApp] = useState(false);
  const [analyst, setAnalyst] = useState<string | null>(null);
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [daily, setDaily] = useState<{ levelId: string; endsAt: number } | null>(null);
  const [season, setSeason] = useState<{ name: string; endsAt: number } | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
    setSeason(seasonInfo());
    setApp(isApp());
    getJournal().then((j) => setAnalyst(analyze(j).headline));
  }, []);
  useEffect(() => {
    getDailyChallenge().then((d) => setDaily(d ? { levelId: d.level.id, endsAt: d.endsAt } : null));
  }, [online]);

  const dailyCountdown = useCountdown(daily?.endsAt ?? (Math.floor(Date.now() / 86400000) + 1) * 86400000);
  const seasonCountdown = useCountdown(season?.endsAt ?? null);

  if (!profile) return <AppShell>{null}</AppShell>;

  const rank = rankForXp(profile.xp);
  const next = continueLevel(profile);
  const strat = strategyById(next.strategyId);
  const nextRankXp = rank.nextXp;
  const timedOk = modeUnlocked(profile, "timed");
  const nextLesson = nextOpenLesson(profile);
  const nextModule = nextLesson ? MODULES.find((m) => m.n === nextLesson.module) : undefined;
  // Learn before you play: if the next level needs a lesson, Continue opens that lesson.
  const learnFirst = levelLessonGate(profile, next);
  const lessonsDone = ALL_LESSONS.filter((x) => lessonComplete(profile, x.lesson.id)).length;
  const rankedOk = modeUnlocked(profile, "ranked");

  const startTimed = () => {
    const hard = timedPool(profile);
    if (hard.length === 0) {
      toast("Unlock a strategy's hard levels first.");
      return;
    }
    const pick = hard[Math.floor(Math.random() * hard.length)]!;
    navigate({ to: "/play/$levelId", params: { levelId: pick.id }, search: { mode: "timed" } });
  };

  return (
    <AppShell>
      {/* Greeting + rank */}
      <section className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back{user ? `, ${user.name}` : ""}</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Ready to read the tape?</h1>
        </div>
        <div className="panel flex items-center gap-4 p-4 md:w-80">
          <RankBadge index={rank.index} sub={rank.sub} size={56} />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{rank.name}</p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
              <motion.div initial={{ width: 0 }} animate={{ width: `${rank.progress * 100}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-electric" />
            </div>
            <p className="font-num mt-1 text-xs text-muted-foreground">
              {profile.xp} XP{nextRankXp ? ` / ${nextRankXp} → ${rank.nextName}` : " · max rank"}
            </p>
          </div>
        </div>
      </section>

      {/* Continue */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
        <Link
          {...(learnFirst
            ? { to: "/academy/$lessonId" as const, params: { lessonId: learnFirst.id } }
            : { to: "/play/$levelId" as const, params: { levelId: next.id }, search: { mode: "campaign" as const } })}
          className="group relative flex items-center gap-5 overflow-hidden rounded-2xl border border-electric/40 bg-gradient-to-br from-electric/15 via-card to-card p-5 md:p-7"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_30px_-4px_var(--color-electric)] transition-transform group-hover:scale-110">
            <Play className="h-6 w-6 fill-current" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-electric">{learnFirst ? "Continue: learn first" : "Continue"}</p>
            <p className="mt-0.5 text-xl font-bold">{learnFirst ? learnFirst.title : strat?.name}</p>
            <p className="text-sm text-muted-foreground">
              {learnFirst ? `Lesson for ${strat?.name} · ${levelLabel(next)}` : `Tier ${next.tier} · ${levelLabel(next)}`}
            </p>
          </div>
          <ChevronRight className="ml-auto h-6 w-6 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.section>

      {/* Academy + Analyst */}
      <section className="mt-4 grid gap-3 md:grid-cols-2">
        <Link
          to={nextLesson ? "/academy/$lessonId" : "/academy"}
          params={nextLesson ? { lessonId: nextLesson.id } : {}}
          className="panel group flex items-center gap-4 p-5 transition-colors hover:border-electric"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-electric/15">
            <GraduationCap className="h-6 w-6 text-electric" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-electric">Academy · {lessonsDone}/{TOTAL_LESSONS}</p>
            <p className="truncate font-bold">{nextLesson ? nextLesson.title : "Course complete. Review anytime"}</p>
            <p className="truncate text-sm text-muted-foreground">{nextLesson ? `Module ${nextLesson.module}: ${nextModule?.title ?? ""}` : "All lessons done"}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>
        <Link to="/analyst" className="panel group flex items-center gap-4 p-5 transition-colors hover:border-mark-player">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mark-player/15">
            <BrainCircuit className="h-6 w-6 text-mark-player" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-mark-player">Your Analyst</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">{analyst ?? "…"}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>
      </section>

      {/* Modes */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Game modes</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ModeCard icon={Map} title="Campaign" desc="Structured lessons: tutorial → easy → medium → hard → exam." tag="Scored" onClick={() => navigate({ to: "/map" })} />
          <ModeCard icon={Shuffle} title="Practice Replay" desc="Random historical charts. Trade freely, no scoring pressure." tag="No pressure" onClick={() => navigate({ to: "/practice" })} />
          <ModeCard
            icon={Timer}
            title="Timed Challenge"
            desc="Hard levels. 30 seconds to mark and enter. Under 15 s earns +25."
            tag="30 s timer"
            locked={!timedOk}
            lockText={`Reach ${RANK_STEPS[MODE_UNLOCK_RANK.timed]!.name}`}
            onClick={startTimed}
          />
          <ModeCard
            icon={CalendarDays}
            title="Daily Challenge"
            desc="One chart, same for every player. Global ranking."
            tag={`Resets ${dailyCountdown}`}
            offline={app && !online}
            onClick={() => daily && navigate({ to: "/play/$levelId", params: { levelId: daily.levelId }, search: { mode: "daily" } })}
          />
          <ModeCard
            icon={Trophy}
            title="Ranked Season"
            desc="Five real charts a week, one attempt each. Weekly standings."
            tag={`Ends ${seasonCountdown}`}
            offline={app && !online}
            locked={!rankedOk}
            lockText={`Reach ${RANK_STEPS[MODE_UNLOCK_RANK.ranked]!.name}`}
            onClick={() => navigate({ to: "/ranked" })}
          />
        </div>
      </section>
    </AppShell>
  );
}

function ModeCard({
  icon: Icon,
  title,
  desc,
  tag,
  locked,
  lockText,
  offline,
  onClick,
}: {
  icon: typeof Map;
  title: string;
  desc: string;
  tag: string;
  locked?: boolean;
  lockText?: string;
  offline?: boolean;
  onClick: () => void;
}) {
  const disabled = locked || offline;
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`panel group flex flex-col p-5 text-left transition-all ${disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5 hover:border-electric"}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          {locked ? <Lock className="h-5 w-5 text-muted-foreground" /> : offline ? <WifiOff className="h-5 w-5 text-muted-foreground" /> : <Icon className="h-5 w-5 text-electric" />}
        </div>
        <span className="font-num rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
      </div>
      <p className="mt-3 font-bold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{locked ? `🔒 ${lockText} to unlock.` : offline ? "Connect to the internet to play." : desc}</p>
    </button>
  );
}

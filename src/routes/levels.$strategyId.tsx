import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle2, Gamepad2, GraduationCap, Lock, Star, Timer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/hooks/use-profile";
import { levelLabel, levelUnlocked, levelsFor, lockReason, strategyById, strategyStars } from "@/lib/progression";
import type { Level } from "@/types/game";
import { ALL_LESSONS } from "@/data/academy";
import { LESSON_STRATEGY } from "@/data/academy/lessonStrategy";
import { gamesDone, lessonComplete, lessonGames, lessonUnlocked, quizPassed } from "@/lib/lessonProgress";

export const Route = createFileRoute("/levels/$strategyId")({
  head: () => ({ meta: [{ title: "Levels — MR_HRHR" }] }),
  component: LevelSelect,
});

const GROUP_STYLE: Record<Level["difficulty"], string> = {
  tutorial: "text-electric",
  easy: "text-up",
  medium: "text-gold",
  hard: "text-down",
  exam: "text-purple-400",
};

const GROUP_NOTE: Record<Level["difficulty"], string> = {
  tutorial: "Learn the concept with an animated example",
  easy: "Clean setups, hints on, stop loss optional",
  medium: "Some noise and fake-outs, all tools, stop loss required",
  hard: "Messy charts, entry locked until marking is done",
  exam: "Prove it: everything counts",
};

function LevelSelect() {
  const { strategyId } = Route.useParams();
  const profile = useProfile();
  const navigate = useNavigate();
  const strategy = strategyById(strategyId);
  const levels = levelsFor(strategyId);
  if (!profile) return <AppShell>{null}</AppShell>;
  if (!strategy || levels.length === 0)
    return (
      <AppShell>
        <p className="text-muted-foreground">No levels yet for this strategy.</p>
        <Link to="/map" className="text-electric underline">
          Back to map
        </Link>
      </AppShell>
    );

  const stars = strategyStars(profile, strategyId);
  const locked = lockReason(profile, strategyId);
  const groups: Level["difficulty"][] = ["tutorial", "easy", "medium", "hard", "exam"];

  return (
    <AppShell>
      <Link to="/map" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Strategy map
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-electric">Tier {strategy.tier}</p>
          <h1 className="text-3xl font-black">{strategy.name}</h1>
          <p className="mt-1 text-muted-foreground">{strategy.description}</p>
        </div>
        <div className="font-num flex items-center gap-1.5 text-lg font-bold text-gold">
          <Star className="h-5 w-5 fill-gold" /> {stars.earned} / {stars.max}
        </div>
      </div>

      {locked && (
        <p className="mt-6 rounded-lg border border-gold/40 bg-gold/5 p-3 text-sm text-gold">🔒 Locked: {locked}.</p>
      )}
      {(() => {
        const lessons = ALL_LESSONS.filter((x) => LESSON_STRATEGY[x.lesson.id] === strategyId).map((x) => x.lesson);
        if (lessons.length === 0) return null;
        const finished = lessons.filter((l) => lessonComplete(profile, l.id)).length;
        return (
          <section className="mt-8">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-electric">
              <BookOpen className="h-4 w-4" /> Tutorial: the lessons
              <span className="font-num text-[11px] font-medium normal-case text-muted-foreground">
                {finished}/{lessons.length} complete
              </span>
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">Learn it, then prove it: each lesson ends with its own game on real charts.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {lessons.map((l, k) => {
                const open = lessonUnlocked(profile, l.id);
                const done = lessonComplete(profile, l.id);
                const games = lessonGames(l.id).length;
                return (
                  <Link
                    key={l.id}
                    to="/academy/$lessonId"
                    params={{ lessonId: l.id }}
                    className={`flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm hover:border-electric ${open ? "" : "opacity-50"}`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-up" /> : open ? <span className="font-num w-4 shrink-0 text-center text-xs text-electric">{k + 1}</span> : <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="flex-1 truncate font-medium">{l.title}</span>
                    {games > 0 && (
                      <span className={`font-num flex items-center gap-1 text-[11px] ${quizPassed(profile, l.id) ? "text-electric" : "text-muted-foreground"}`}>
                        <Gamepad2 className="h-3 w-3" /> {gamesDone(profile, l.id)}/{games}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })()}

      <div className="mt-8 space-y-8">
        {groups.map((g) => {
          const inGroup = levels.map((l, idx) => ({ l, idx })).filter(({ l }) => l.difficulty === g);
          if (inGroup.length === 0) return null;
          return (
            <section key={g}>
              <h2 className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${GROUP_STYLE[g]}`}>
                {g === "tutorial" ? <BookOpen className="h-4 w-4" /> : g === "exam" ? <GraduationCap className="h-4 w-4" /> : null}
                {g}
                {(g === "hard" || g === "exam") && (
                  <span className="flex items-center gap-1 text-[11px] font-medium normal-case text-muted-foreground">
                    <Timer className="h-3 w-3" /> 30 s timer
                  </span>
                )}
              </h2>
              <p className="mb-3 text-xs text-muted-foreground">{GROUP_NOTE[g]}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {inGroup.map(({ l, idx }) => {
                  const unlocked = levelUnlocked(profile, levels, idx);
                  const res = profile.results[l.id];
                  const short = l.difficulty === "tutorial" ? "T" : l.difficulty === "exam" ? "E" : (levelLabel(l).split(" ")[1] ?? "");
                  return (
                    <motion.button
                      key={l.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      disabled={!unlocked}
                      onClick={() => navigate({ to: "/play/$levelId", params: { levelId: l.id }, search: { mode: "campaign" } })}
                      className={`panel flex flex-col items-center p-5 transition-all ${
                        unlocked ? "hover:-translate-y-0.5 hover:border-electric" : "cursor-not-allowed opacity-45"
                      } ${!res && unlocked ? "border-electric/60 shadow-[0_0_20px_-10px_var(--color-electric)]" : ""}`}
                    >
                      {unlocked ? <span className="font-num text-2xl font-black">{short}</span> : <Lock className="h-6 w-6 text-muted-foreground" />}
                      <span className="mt-1 text-xs text-muted-foreground">{levelLabel(l)}</span>
                      <div className="mt-2 flex gap-0.5">
                        {[1, 2, 3].map((s) => (
                          <Star key={s} className={`h-4 w-4 ${res && s <= res.stars ? "fill-gold text-gold" : "text-muted"}`} />
                        ))}
                      </div>
                      {res && <span className="font-num mt-1 text-[11px] text-muted-foreground">best {res.score}</span>}
                    </motion.button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}

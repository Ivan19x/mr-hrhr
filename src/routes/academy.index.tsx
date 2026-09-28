import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, ChevronRight, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/hooks/use-profile";
import { MODULES, TOTAL_LESSONS, ALL_LESSONS } from "@/data/academy";

export const Route = createFileRoute("/academy/")({
  head: () => ({ meta: [{ title: "Academy — MR_HRHR" }] }),
  component: AcademyPage,
});

function AcademyPage() {
  const profile = useProfile();
  if (!profile) return <AppShell>{null}</AppShell>;
  const done = (id: string) => !!profile.academy[id];
  const doneCount = ALL_LESSONS.filter((x) => done(x.lesson.id)).length;
  const next = ALL_LESSONS.find((x) => !done(x.lesson.id));

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-electric">MR_HRHR Academy</p>
          <h1 className="text-3xl font-black">Learn to trade, from zero</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            From what a market is and how brokers connect to it, through candles, charts, patterns and indicators, to complete strategies and pro risk management.
          </p>
        </div>
        <Link to="/glossary" className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:border-electric">
          <Search className="h-4 w-4" /> Glossary of terms
        </Link>
      </div>

      <div className="panel mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Course progress</p>
          <p className="font-num text-2xl font-bold">
            {doneCount} / {TOTAL_LESSONS} lessons
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(doneCount / TOTAL_LESSONS) * 100}%` }} className="h-full bg-electric" />
          </div>
        </div>
        {next && (
          <Link
            to="/academy/$lessonId"
            params={{ lessonId: next.lesson.id }}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-[0_0_24px_-6px_var(--color-electric)]"
          >
            <BookOpen className="h-5 w-5" />
            {doneCount === 0 ? "Start with lesson 1" : `Continue: ${next.lesson.title}`}
          </Link>
        )}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {MODULES.map((m, mi) => {
          const mDone = m.lessons.filter((l) => done(l.id)).length;
          return (
            <motion.section
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mi * 0.03 }}
              className={`panel p-5 ${mDone === m.lessons.length ? "border-up/40" : ""}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{m.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-num text-[11px] text-muted-foreground">MODULE {m.n}</p>
                  <h2 className="text-lg font-bold">{m.title}</h2>
                  <p className="text-sm text-muted-foreground">{m.tagline}</p>
                </div>
                <span className={`font-num shrink-0 text-xs ${mDone === m.lessons.length ? "text-up" : "text-muted-foreground"}`}>
                  {mDone}/{m.lessons.length}
                </span>
              </div>
              <ul className="mt-4 space-y-1">
                {m.lessons.map((l, li) => (
                  <li key={l.id}>
                    <Link
                      to="/academy/$lessonId"
                      params={{ lessonId: l.id }}
                      className="group flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
                    >
                      {done(l.id) ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-up" />
                      ) : (
                        <span className="font-num flex h-4 w-4 shrink-0 items-center justify-center text-[10px] text-muted-foreground">{li + 1}</span>
                      )}
                      <span className="flex-1 truncate">{l.title}</span>
                      <span className="text-[11px] text-muted-foreground">{l.minutes} min</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.section>
          );
        })}
      </div>
    </AppShell>
  );
}

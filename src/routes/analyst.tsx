import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Trophy, TrendingUp, TrendingDown, Info, BookOpen, Gamepad2, Shuffle, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/hooks/use-profile";
import { getJournal } from "@/services/journalService";
import { analyze, MIN_TRADES, type AnalystReport, type Insight } from "@/engine/analyst";
import { findLesson } from "@/data/academy";
import { findLevelMeta as findLevel } from "@/data/levels";
import { strategyById } from "@/lib/progression";
import { levelLabel } from "@/lib/progression";

export const Route = createFileRoute("/analyst")({
  head: () => ({ meta: [{ title: "Your Analyst — MR_HRHR" }] }),
  component: AnalystPage,
});

const pct = (x: number) => `${Math.round(x * 100)}%`;
const fmtR = (r: number) => `${r >= 0 ? "+" : ""}${r.toFixed(2)}R`;

function AnalystPage() {
  const profile = useProfile();
  const [report, setReport] = useState<AnalystReport | null>(null);
  useEffect(() => {
    getJournal().then((j) => setReport(analyze(j)));
  }, [profile]);
  if (!report) return <AppShell>{null}</AppShell>;
  const s = report.stats;

  return (
    <AppShell>
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mark-player/15">
          <BrainCircuit className="h-8 w-8 text-mark-player" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-mark-player">Your Analyst</p>
          <h1 className="text-2xl font-black md:text-3xl">{report.headline}</h1>
          <p className="mt-1 text-sm text-muted-foreground">I review every trade you take (campaign, timed, daily and practice) and tell you where your edge is.</p>
        </div>
      </div>

      {report.n === 0 ? (
        <div className="panel mt-8 flex flex-col items-center p-10 text-center">
          <p className="text-muted-foreground">Nothing to analyse yet.</p>
          <div className="mt-4 flex gap-2">
            <Link to="/levels/$strategyId" params={{ strategyId: "bos" }} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Play a level
            </Link>
            <Link to="/practice" className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold">
              Practice chart
            </Link>
          </div>
        </div>
      ) : (
        <>
          {!report.ready && (
            <div className="mt-6">
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-mark-player" style={{ width: `${(report.n / MIN_TRADES) * 100}%` }} />
              </div>
              <p className="font-num mt-1 text-xs text-muted-foreground">
                {report.n}/{MIN_TRADES} trades until your first full report. Early numbers below.
              </p>
            </div>
          )}

          {/* Stats */}
          <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Trades analysed" value={String(report.n)} />
            <Tile label="Win rate" value={pct(s.winRate)} />
            <Tile label="Expectancy" value={fmtR(s.expectancy)} tone={s.expectancy >= 0 ? "up" : "down"} sub="average R per trade" />
            <Tile label="Total" value={fmtR(s.totalR)} tone={s.totalR >= 0 ? "up" : "down"} />
            <Tile label="Marking accuracy" value={s.markAcc !== null ? pct(s.markAcc) : "—"} sub={s.markAcc === null ? "play scored levels" : undefined} />
            <Tile label="Reasoning (quiz)" value={s.quizAcc !== null ? pct(s.quizAcc) : "—"} sub={s.quizAcc === null ? "play scored levels" : undefined} />
            <Tile label="Stop-loss use" value={pct(s.slRate)} tone={s.slRate === 1 ? "up" : "down"} />
            <Tile label="Avg planned RR" value={s.avgRR !== null ? `1 : ${s.avgRR.toFixed(1)}` : "—"} />
          </section>

          {/* Style */}
          <section className="panel mt-6 flex flex-col gap-2 border-mark-player/40 p-5 md:flex-row md:items-center md:gap-6">
            <p className="text-xs font-bold uppercase tracking-widest text-mark-player">Trading style</p>
            <p className="text-xl font-black">{report.style.name}</p>
            <p className="text-sm text-muted-foreground">{report.style.description}</p>
          </section>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {/* Best trades */}
            <section className="panel p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Trophy className="h-4 w-4 text-gold" /> Your best trades
              </h2>
              {report.best.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No winning or well-marked trades yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {report.best.map(({ trade: t, reasons }, k) => {
                    const lvl = findLevel(t.levelId);
                    return (
                      <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.08 }} className="rounded-lg bg-terminal p-3">
                        <div className="flex items-center justify-between">
                          <p className="flex items-center gap-2 text-sm font-semibold">
                            <span className="font-num text-gold">#{k + 1}</span>
                            {lvl ? `${lvl.strategyId === "lesson" ? "Lesson game" : (strategyById(lvl.strategyId)?.name ?? "")} · ${levelLabel(lvl)}` : "Practice chart"}
                            <span className={`rounded px-1.5 text-[10px] font-bold uppercase ${t.side === "buy" ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>{t.side}</span>
                          </p>
                          <span className={`font-num text-sm font-bold ${t.r >= 0 ? "text-up" : "text-down"}`}>{fmtR(t.r)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {reasons.map((r) => (
                            <span key={r} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                              {r}
                            </span>
                          ))}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{new Date(t.at).toLocaleString()}</p>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Recommendations */}
            <section className="panel p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Star className="h-4 w-4 text-electric" /> What I recommend
              </h2>
              <div className="mt-3 space-y-3">
                {report.recommendations.map((r, k) => {
                  const lesson = r.lesson ? findLesson(r.lesson) : null;
                  return (
                    <div key={k} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-semibold">{r.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{r.detail}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {lesson && (
                          <Link to="/academy/$lessonId" params={{ lessonId: lesson.lesson.id }} className="flex items-center gap-1 rounded-md bg-electric/10 px-2 py-1 text-xs text-electric hover:bg-electric/20">
                            <BookOpen className="h-3.5 w-3.5" /> {lesson.lesson.title}
                          </Link>
                        )}
                        {r.play?.kind === "levels" && (
                          <Link to="/levels/$strategyId" params={{ strategyId: r.play.strategyId }} className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs hover:bg-accent">
                            <Gamepad2 className="h-3.5 w-3.5" /> Practise levels
                          </Link>
                        )}
                        {r.play?.kind === "practice" && (
                          <Link to="/practice" className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs hover:bg-accent">
                            <Shuffle className="h-3.5 w-3.5" /> Practice replay
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Strengths & weaknesses */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <InsightList title="Strengths" icon={<TrendingUp className="h-4 w-4 text-up" />} items={report.strengths} empty="Keep trading. Strengths show up after a few more trades." />
            <InsightList title="Leaks to fix" icon={<TrendingDown className="h-4 w-4 text-down" />} items={report.weaknesses} empty="No leaks detected so far. Nice discipline." />
          </div>

          {/* Trend */}
          {report.trend && (
            <section className="panel mt-4 grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
              <Tile label="Earlier avg R" value={fmtR(report.trend.earlierAvgR)} plain />
              <Tile label="Recent avg R" value={fmtR(report.trend.recentAvgR)} tone={report.trend.recentAvgR >= report.trend.earlierAvgR ? "up" : "down"} plain />
              <Tile label="Earlier marking" value={pct(report.trend.earlierMarkAcc)} plain />
              <Tile label="Recent marking" value={pct(report.trend.recentMarkAcc)} tone={report.trend.recentMarkAcc >= report.trend.earlierMarkAcc ? "up" : "down"} plain />
            </section>
          )}

          {/* Segments */}
          <section className="mt-4 grid gap-4 md:grid-cols-2">
            {report.segments.map((sg) => {
              const maxAbs = Math.max(0.5, ...sg.rows.map((r) => Math.abs(r.avgR)));
              return (
                <div key={sg.title} className="panel p-5">
                  <h3 className="text-sm font-semibold">{sg.title}</h3>
                  <div className="mt-3 space-y-2.5">
                    {sg.rows.map((r) => (
                      <div key={r.key}>
                        <div className="flex justify-between text-xs">
                          <span>
                            {r.label} <span className="text-muted-foreground">({r.n})</span>
                          </span>
                          <span className="font-num">
                            <span className="text-muted-foreground">{pct(r.winRate)} win · </span>
                            <span className={r.avgR >= 0 ? "text-up" : "text-down"}>{fmtR(r.avgR)}</span>
                          </span>
                        </div>
                        <div className="relative mt-1 h-2 rounded-full bg-secondary">
                          <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(Math.abs(r.avgR) / maxAbs) * 50}%` }}
                            className={`absolute top-0 h-full rounded-full ${r.avgR >= 0 ? "left-1/2 bg-up" : "right-1/2 bg-down"}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </AppShell>
  );
}

function Tile({ label, value, sub, tone, plain }: { label: string; value: string; sub?: string | undefined; tone?: "up" | "down"; plain?: boolean }) {
  return (
    <div className={plain ? "" : "panel p-4"}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-num mt-1 text-xl font-bold ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : ""}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function InsightList({ title, icon, items, empty }: { title: string; icon: React.ReactNode; items: Insight[]; empty: string }) {
  return (
    <section className="panel p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        {icon} {title}
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((it, k) => (
            <li key={k} className="flex gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${it.tone === "good" ? "bg-up" : it.tone === "bad" ? "bg-down" : "bg-gold"}`} />
              <div>
                <p className="text-sm font-semibold">{it.title}</p>
                <p className="text-sm text-muted-foreground">{it.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {items.some((i) => i.tone === "info") && (
        <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3" /> Yellow = worth watching, not necessarily a problem.
        </p>
      )}
    </section>
  );
}

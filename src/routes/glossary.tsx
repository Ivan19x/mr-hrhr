import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Eye, Search, LineChart, Newspaper, Lightbulb } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GLOSSARY } from "@/data/academy/glossary";
import SYLLABUS from "@/data/academy/curriculumTerms.json";
import { findLesson, lessonForTerm } from "@/data/academy";
import { RANK_STEPS } from "@/data/curriculum";

export const Route = createFileRoute("/glossary")({
  head: () => ({ meta: [{ title: "Glossary — MR_HRHR Academy" }] }),
  component: GlossaryPage,
});

type SyllabusTerm = { term: string; def: string; stage: number; stageName: string; chart: "chart" | "news" | "concept"; built: boolean };
type Entry = { term: string; def: string; spot?: string | undefined; lesson?: string | undefined; tags: string[]; stage?: number; stageName?: string; chart?: SyllabusTerm["chart"] };

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Detailed entries first, then every syllabus term not already covered.
const ENTRIES: Entry[] = (() => {
  const out: Entry[] = GLOSSARY.map((g) => ({ ...g }));
  const seen = new Set(out.map((e) => norm(e.term)));
  for (const t of SYLLABUS as SyllabusTerm[]) {
    const n = norm(t.term);
    const detailed = out.find((e) => norm(e.term) === n);
    if (detailed) {
      detailed.lesson ??= lessonForTerm(t.term);
      detailed.stage ??= t.stage;
      detailed.stageName ??= t.stageName;
      continue;
    }
    if (seen.has(n)) continue;
    seen.add(n);
    out.push({ term: t.term, def: t.def, lesson: lessonForTerm(t.term), tags: [], stage: t.stage, stageName: t.stageName, chart: t.chart });
  }
  return out.sort((a, b) => a.term.localeCompare(b.term));
})();

const TAGS = [
  { id: "all", label: "All" },
  { id: "basics", label: "Basics" },
  { id: "market", label: "Market & brokers" },
  { id: "candles", label: "Candles" },
  { id: "structure", label: "Structure" },
  { id: "smc", label: "Smart money" },
  { id: "indicator", label: "Indicators" },
  { id: "risk", label: "Risk" },
];

function GlossaryPage() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");
  const [stage, setStage] = useState(0);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ENTRIES.filter(
      (t) =>
        (tag === "all" || t.tags.includes(tag)) &&
        (!stage || t.stage === stage) &&
        (!s || t.term.toLowerCase().includes(s) || t.def.toLowerCase().includes(s)),
    );
  }, [q, tag, stage]);

  return (
    <AppShell>
      <Link to="/academy" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Academy
      </Link>
      <h1 className="mt-3 text-3xl font-black">Glossary</h1>
      <p className="mt-1 text-muted-foreground">
        All {ENTRIES.length} terms of the trading school, from the first lesson to institutional concepts: what each one means and how to spot it on a chart.
      </p>

      <div className="relative mt-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search terms: e.g. order block, spread, RSI, killzone"
          className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3 outline-none focus:border-electric"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {TAGS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTag(t.id)}
            className={`rounded-full px-3 py-1 text-xs ${tag === t.id ? "bg-electric text-electric-foreground" : "bg-secondary hover:bg-accent"}`}
          >
            {t.label}
          </button>
        ))}
        <select
          value={stage}
          onChange={(e) => setStage(Number(e.target.value))}
          className="ml-auto rounded-full border border-input bg-card px-3 py-1 text-xs"
          aria-label="Filter by stage"
        >
          <option value={0}>All stages</option>
          {RANK_STEPS.map((r, k) => (
            <option key={r.name} value={k + 1}>
              Stage {k + 1} · {r.name}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{list.length} terms</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {list.map((t) => {
          const lesson = t.lesson ? findLesson(t.lesson) : null;
          const ChartIcon = t.chart === "news" ? Newspaper : t.chart === "concept" ? Lightbulb : LineChart;
          return (
            <div key={t.term} className="panel p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{t.term}</p>
                {t.stage && (
                  <span className="font-num shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground" title={t.stageName}>
                    Stage {t.stage}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t.def}</p>
              {t.spot && (
                <p className="mt-2 flex gap-2 rounded-md bg-mark-player/10 p-2 text-xs text-muted-foreground">
                  <Eye className="h-3.5 w-3.5 shrink-0 text-mark-player" />
                  <span>
                    <span className="font-semibold text-mark-player">On the chart: </span>
                    {t.spot}
                  </span>
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                {lesson && (
                  <Link to="/academy/$lessonId" params={{ lessonId: lesson.lesson.id }} className="text-electric hover:underline">
                    Lesson: {lesson.lesson.title} →
                  </Link>
                )}
                {t.chart && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <ChartIcon className="h-3.5 w-3.5" />
                    {t.chart === "chart" ? "Seen on charts" : t.chart === "news" ? "News event" : "Concept"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {list.length === 0 && <p className="text-sm text-muted-foreground">No terms match "{q}".</p>}
      </div>
    </AppShell>
  );
}

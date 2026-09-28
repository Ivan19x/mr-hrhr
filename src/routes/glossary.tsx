import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Eye, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GLOSSARY } from "@/data/academy/glossary";
import { findLesson } from "@/data/academy";

export const Route = createFileRoute("/glossary")({
  head: () => ({ meta: [{ title: "Glossary — MR_HRHR Academy" }] }),
  component: GlossaryPage,
});

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
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return GLOSSARY.filter((t) => (tag === "all" || t.tags.includes(tag)) && (!s || t.term.toLowerCase().includes(s) || t.def.toLowerCase().includes(s)));
  }, [q, tag]);

  return (
    <AppShell>
      <Link to="/academy" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Academy
      </Link>
      <h1 className="mt-3 text-3xl font-black">Glossary</h1>
      <p className="mt-1 text-muted-foreground">Every term, what it means, and how to spot it on a chart.</p>

      <div className="relative mt-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search terms: e.g. order block, spread, RSI"
          className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3 outline-none focus:border-electric"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {TAGS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTag(t.id)}
            className={`rounded-full px-3 py-1 text-xs ${tag === t.id ? "bg-electric text-electric-foreground" : "bg-secondary hover:bg-accent"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {list.map((t) => {
          const lesson = t.lesson ? findLesson(t.lesson) : null;
          return (
            <div key={t.term} className="panel p-4">
              <p className="font-bold">{t.term}</p>
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
              {lesson && (
                <Link to="/academy/$lessonId" params={{ lessonId: lesson.lesson.id }} className="mt-2 inline-block text-xs text-electric hover:underline">
                  Lesson: {lesson.lesson.title} →
                </Link>
              )}
            </div>
          );
        })}
        {list.length === 0 && <p className="text-sm text-muted-foreground">No terms match "{q}".</p>}
      </div>
    </AppShell>
  );
}

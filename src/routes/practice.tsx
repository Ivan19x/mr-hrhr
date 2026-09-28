import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Shuffle } from "lucide-react";
import { PlaySession } from "@/components/PlaySession";
import { makePracticeLevel } from "@/data/bosLevels";
import { loadStrategyLevels } from "@/data/levels";
import { getProfile } from "@/services/progressService";
import { randomRealLevel } from "@/services/realChartService";
import { playableStrategies, strategyUnlocked } from "@/lib/progression";
import type { Level, Profile } from "@/types/game";

export const Route = createFileRoute("/practice")({
  validateSearch: (s: Record<string, unknown>): { s?: string } => (typeof s["s"] === "string" ? { s: s["s"] } : {}),
  head: () => ({ meta: [{ title: "Practice Replay — MR_HRHR" }] }),
  component: PracticePage,
});

function PracticePage() {
  const { s: strategy } = Route.useSearch();
  const navigate = useNavigate();
  const [level, setLevel] = useState<Level | null>(null);
  const [round, setRound] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);

  // A random real chart: from the chosen strategy, or the mixed bank of real setups.
  const next = useCallback(() => {
    setLevel(null);
    const pick = async (): Promise<Level> => {
      if (strategy) {
        const pool = (await loadStrategyLevels(strategy)).filter((l) => l.difficulty !== "tutorial");
        if (pool.length) {
          const l = pool[Math.floor(Math.random() * pool.length)]!;
          return { ...l, id: `practice-${l.id}` };
        }
      }
      return randomRealLevel();
    };
    pick()
      .catch(() => makePracticeLevel(Math.floor(Math.random() * 1e9)))
      .then((l) => {
        setLevel(l);
        setRound((r) => r + 1);
      });
  }, [strategy]);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);
  useEffect(() => {
    next();
  }, [next]);

  if (!profile) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;

  const unlocked = playableStrategies().filter((s) => strategyUnlocked(profile, s.id));
  const picker = (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-background px-3 py-2">
      <Link to="/home" className="shrink-0 text-muted-foreground hover:text-foreground" title="Home">
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Practice:</span>
      <button
        onClick={() => navigate({ to: "/practice", search: {} })}
        className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs ${!strategy ? "bg-electric text-electric-foreground" : "bg-secondary hover:bg-accent"}`}
      >
        <Shuffle className="h-3 w-3" /> Mixed
      </button>
      {unlocked.map((s) => (
        <button
          key={s.id}
          onClick={() => navigate({ to: "/practice", search: { s: s.id } })}
          className={`shrink-0 rounded-full px-3 py-1 text-xs ${strategy === s.id ? "bg-electric text-electric-foreground" : "bg-secondary hover:bg-accent"}`}
        >
          {s.name}
        </button>
      ))}
    </div>
  );

  if (!level)
    return (
      <div className="min-h-screen">
        {picker}
        <div className="flex h-[70vh] items-center justify-center text-muted-foreground">Loading a real chart…</div>
      </div>
    );
  return (
    <div>
      {picker}
      <PlaySession key={round} baseLevel={level} profile={profile} mode="practice" onNextChart={next} />
    </div>
  );
}

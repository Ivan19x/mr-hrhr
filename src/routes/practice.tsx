import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PlaySession } from "@/components/PlaySession";
import { makePracticeLevel } from "@/data/bosLevels";
import { getProfile } from "@/services/progressService";
import { randomRealLevel } from "@/services/realChartService";
import type { Level, Profile } from "@/types/game";

export const Route = createFileRoute("/practice")({
  head: () => ({ meta: [{ title: "Practice Replay — MR_HRHR" }] }),
  component: PracticePage,
});

function PracticePage() {
  const [level, setLevel] = useState<Level | null>(null);
  const [round, setRound] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);

  // A random real chart setup; falls back to a generated chart if files fail to load.
  const next = useCallback(() => {
    setLevel(null);
    randomRealLevel()
      .catch(() => makePracticeLevel(Math.floor(Math.random() * 1e9)))
      .then((l) => {
        setLevel(l);
        setRound((r) => r + 1);
      });
  }, []);

  useEffect(() => {
    getProfile().then(setProfile);
    next();
  }, [next]);

  if (!level || !profile)
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading a real chart…</div>;
  return <PlaySession key={round} baseLevel={level} profile={profile} mode="practice" onNextChart={next} />;
}

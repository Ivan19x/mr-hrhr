import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PlaySession } from "@/components/PlaySession";
import { getLevelById } from "@/services/levelService";
import { BLOWN_BALANCE, RECAP_XP_COST, dayKey, getProfile, recapitalise } from "@/services/progressService";
import type { GameMode, Level, Profile } from "@/types/game";

const MODES: GameMode[] = ["campaign", "timed", "daily", "ranked"];

export const Route = createFileRoute("/play/$levelId")({
  validateSearch: (s: Record<string, unknown>): { mode?: GameMode } =>
    MODES.includes(s["mode"] as GameMode) ? { mode: s["mode"] as GameMode } : {},
  head: () => ({
    meta: [
      { title: "Trading Level — MR_HRHR" },
      { name: "description", content: "Replay the chart, mark the structure, place your trade, and earn points for good analysis." },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const { levelId } = Route.useParams();
  const { mode = "campaign" } = Route.useSearch();
  const [level, setLevel] = useState<Level | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLevel(null);
    getLevelById(levelId).then((l) => (l ? setLevel(l) : setNotFound(true)));
    getProfile().then(setProfile);
  }, [levelId]);

  if (notFound)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Level not found.</p>
        <Link to="/map" className="text-primary underline">
          Back to map
        </Link>
      </div>
    );
  if (!level || !profile)
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading level…</div>;

  // A blown account can't take scored trades until it is recapitalised.
  if (profile.balance < BLOWN_BALANCE)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-4xl">💥</p>
        <p className="text-xl font-bold">Your virtual account is blown</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Balance: ${profile.balance.toFixed(0)}. Real traders who lose their capital can't keep trading. Recapitalise to $10,000 for {RECAP_XP_COST} XP, and review risk management first.
        </p>
        <div className="mt-2 flex gap-2">
          <Link to="/academy/$lessonId" params={{ lessonId: "risk-per-trade" }} className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold">
            Risk lesson
          </Link>
          <button
            onClick={async () => setProfile(await recapitalise())}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Recapitalise (−{RECAP_XP_COST} XP)
          </button>
        </div>
      </div>
    );

  // One Daily Challenge attempt per day.
  if (mode === "daily" && profile.dailyDone[dayKey()])
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-xl font-bold">You've played today's Daily Challenge</p>
        <p className="max-w-sm text-sm text-muted-foreground">Everyone gets one attempt at the same chart each day. A new one unlocks at midnight.</p>
        <Link to="/home" className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          Back home
        </Link>
      </div>
    );

  return <PlaySession key={`${levelId}-${mode}`} baseLevel={level} profile={profile} mode={mode} />;
}

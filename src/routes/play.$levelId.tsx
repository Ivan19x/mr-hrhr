import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PlaySession } from "@/components/PlaySession";
import { getLevelById } from "@/services/levelService";
import { levelUnlocked, levelsFor, lockReason, modeUnlocked } from "@/lib/progression";
import { findLessonGame } from "@/data/levels";
import { lessonGameUnlocked, lessonGames, levelLessonGate } from "@/lib/lessonProgress";
import { rankedKey } from "@/services/rankedService";
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

  // Lesson games open after the lesson's quiz, one after another.
  const game = findLessonGame(level.id);
  if (game) {
    const k = lessonGames(game.lessonId).findIndex((g) => g.id === level.id);
    if (!lessonGameUnlocked(profile, game.lessonId, k))
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-4xl">🔒</p>
          <p className="text-xl font-bold">This lesson game is locked</p>
          <p className="max-w-sm text-sm text-muted-foreground">Read the lesson and pass its quiz first, then play its charts in order.</p>
          <Link to="/academy/$lessonId" params={{ lessonId: game.lessonId }} className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
            Open the lesson
          </Link>
        </div>
      );
  }

  // Campaign levels must be unlocked in order (typing a URL doesn't skip the queue).
  if (mode === "campaign" && !game) {
    const list = levelsFor(level.strategyId);
    const idx = list.findIndex((l) => l.id === level.id);
    const learn = idx >= 0 && levelUnlocked(profile, list, idx) ? levelLessonGate(profile, list[idx]!) : null;
    if (learn)
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-4xl">📘</p>
          <p className="text-xl font-bold">Learn this first</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            This level uses what the lesson <span className="font-semibold text-foreground">{learn.title}</span> teaches. Finish the lesson (its quiz and its game), then come back.
          </p>
          <Link to="/academy/$lessonId" params={{ lessonId: learn.id }} className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
            Open the lesson
          </Link>
        </div>
      );
    if (idx >= 0 && !levelUnlocked(profile, list, idx)) {
      const reason = lockReason(profile, level.strategyId);
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-4xl">🔒</p>
          <p className="text-xl font-bold">This level is locked</p>
          <p className="max-w-sm text-sm text-muted-foreground">{reason ? `${reason}.` : "Finish the previous level first."}</p>
          <Link to="/map" className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
            Strategy map
          </Link>
        </div>
      );
    }
  }

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

  // Ranked: unlocked by rank, one attempt per chart per season.
  if (mode === "ranked" && (!modeUnlocked(profile, "ranked") || (profile.attempts[rankedKey(levelId)] ?? 0) > 0))
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-xl font-bold">{modeUnlocked(profile, "ranked") ? "You've already played this ranked chart" : "Ranked is locked"}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {modeUnlocked(profile, "ranked") ? "Each ranked chart allows one attempt per season." : "Reach Analyst I to play Ranked."}
        </p>
        <Link to="/ranked" className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          Back to Ranked
        </Link>
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

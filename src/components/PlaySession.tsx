// One playthrough of a level: replay → mark → trade → questions → result → review.
// Used by campaign, timed, daily, ranked and practice modes.
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Undo2, Trash2, Check, ArrowLeft, Star, HelpCircle, Lock, RotateCcw, ChevronRight, Shuffle, Award, BrainCircuit, CandlestickChart,
} from "lucide-react";
import { CandleChart, type DragLineId, type OverlayLine } from "@/components/CandleChart";
import { TutorialExample } from "@/components/TutorialExample";
import { RankBadge } from "@/components/RankBadge";
import { recordResult, markTutorialSeen, awardPracticeXp } from "@/services/progressService";
import { enqueue } from "@/services/syncService";
import { addTrade } from "@/services/journalService";
import { tradeNote, type TradeRecord } from "@/engine/analyst";
import { isApp } from "@/lib/platform";
import { clearAttempt, forfeit, markAttempt, type ActiveAttempt } from "@/lib/attemptGuard";
import { FORFEIT_POINTS } from "@/services/progressService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "@tanstack/react-router";
import { makeTransform, transformLevel } from "@/engine/transform";
import { computeScore, fallbackRisk } from "@/engine/scoring";
import { simulateTrade, riskRewardRatio } from "@/engine/trade";
import { matchMarks } from "@/engine/marking";
import { SPEED_MS, type ReplaySpeed } from "@/engine/replay";
import { TUTORIALS } from "@/data/tutorials";
import { loadLevel } from "@/data/levels";
import { LevelWalkthrough } from "@/components/LevelWalkthrough";
import { Diagram } from "@/components/academy/Diagram";
import { CandleFormation } from "@/components/CandleFormation";
import { closeUp } from "@/data/academy/real";
import type { TutorialStep } from "@/data/tutorials";
import { rankForXp } from "@/data/curriculum";
import { levelLabel, nextLevelId, strategyById } from "@/lib/progression";
import { sfx } from "@/lib/sound";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ActionLog, BadgeId, GameMode, Level, Mark, MarkType, Profile, ScoreBreakdown } from "@/types/game";

type Phase = "replay" | "mark" | "trade" | "questions" | "result" | "review";

const PHASES: { id: Phase; label: string }[] = [
  { id: "mark", label: "Mark" },
  { id: "trade", label: "Trade" },
  { id: "questions", label: "Questions" },
  { id: "result", label: "Result" },
];

const TOOLS: { type: MarkType; label: string; icon: string; how: string }[] = [
  { type: "PATTERN", label: "Pattern candle", icon: "◆", how: "Tap the candle that completes the pattern" },
  { type: "SWING_HIGH", label: "Swing high", icon: "▲", how: "Tap the candle that forms the peak" },
  { type: "SWING_LOW", label: "Swing low", icon: "▼", how: "Tap the candle that forms the trough" },
  { type: "BOS", label: "BOS line", icon: "↦", how: "Drag from the swing to the candle that broke it" },
  { type: "SR_LINE", label: "S/R line", icon: "─", how: "Drag across the level price keeps reacting to" },
  { type: "FVG", label: "FVG box", icon: "▭", how: "Drag a box over the gap between candles" },
  { type: "ORDER_BLOCK", label: "Order block", icon: "▮", how: "Drag a box over the last opposite candle" },
];

// Tools the lesson itself teaches (Easy levels only enable these).
/** What each mark type asks the player to do (for the instructions panel). */
const MARK_ASK: Record<MarkType, (n: number) => string> = {
  SWING_HIGH: (n) => `${n} swing high${n > 1 ? "s" : ""} (▲)`,
  SWING_LOW: (n) => `${n} swing low${n > 1 ? "s" : ""} (▼)`,
  BOS: () => "the break line (↦): drag from the swing to the breaking candle",
  SR_LINE: (n) => `${n > 1 ? `${n} levels` : "the level"} (─): drag across the price`,
  FVG: () => "the fair value gap (▭): drag a box over the gap",
  ORDER_BLOCK: () => "the order block (▮): drag a box over the candle",
  PATTERN: () => "the signal candle (◆): tap it",
};

export const BADGE_LABELS: Record<BadgeId, { name: string; desc: string; icon: string }> = {
  sniper: { name: "Sniper", desc: "5 perfect setups in a row", icon: "🎯" },
  disciplined: { name: "Disciplined", desc: "10 trades with a stop loss", icon: "🛡️" },
  first_blood: { name: "First Blood", desc: "Your first winning trade", icon: "🩸" },
  scholar: { name: "Scholar", desc: "10 perfect quizzes", icon: "🎓" },
  comeback: { name: "Comeback", desc: "Positive score on a losing trade", icon: "🔥" },
};

const TIMER_SECONDS = 30;

let markCounter = 0;
const nextMarkId = () => `m-${Date.now()}-${markCounter++}`;

/** Average candle range — used to place sensible default SL/TP lines. */
function avgRange(level: Level): number {
  const cs = level.candles.slice(0, level.decisionIndex + 1);
  return cs.reduce((s, c) => s + (c.h - c.l), 0) / cs.length;
}

function fmt(p: number): string {
  return p >= 1000 ? p.toFixed(1) : p >= 100 ? p.toFixed(2) : p >= 10 ? p.toFixed(3) : p.toFixed(5);
}

type Props = {
  baseLevel: Level;
  profile: Profile;
  mode: GameMode;
  /** Practice: called to load another random chart. */
  onNextChart?: () => void;
};

export function PlaySession({ baseLevel, profile, mode, onNextChart }: Props) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const strategy = strategyById(baseLevel.strategyId);
  const practice = mode === "practice";
  const isTutorialLevel = baseLevel.difficulty === "tutorial";

  // Tutorial: always on the tutorial level; otherwise first time only (if enabled).
  const steps = TUTORIALS[baseLevel.strategyId] ?? [];
  const showTutorial =
    !practice &&
    steps.length > 0 &&
    (isTutorialLevel || (profile.settings.tutorials && !profile.tutorialsSeen.includes(baseLevel.strategyId)));
  const [tutorialStep, setTutorialStep] = useState(showTutorial ? 0 : -1);
  // The strategy's tutorial chart drives the animated tutorial (it may be a different level).
  const [tutorialLevel, setTutorialLevel] = useState<Level>(baseLevel);
  useEffect(() => {
    if (baseLevel.difficulty === "tutorial") return;
    loadLevel(`t${baseLevel.tier}-${baseLevel.strategyId}-tutorial`).then((l) => l && setTutorialLevel(l));
  }, [baseLevel]);

  // Anti-cheat transform (random flip + rescale), seed stored in the action log.
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const level = useMemo(() => transformLevel(baseLevel, seed), [baseLevel, seed]);
  const flipped = useMemo(() => makeTransform(seed, baseLevel.candles, baseLevel.difficulty !== "tutorial").flipped, [baseLevel, seed]);

  const timed = !practice && (level.difficulty === "hard" || level.difficulty === "exam" || mode === "timed");
  const isEasy = level.difficulty === "easy" || isTutorialLevel;
  const slRequired = !isEasy && !practice;

  const [phase, setPhase] = useState<Phase>("replay");
  const [visibleCount, setVisibleCount] = useState(Math.min(8, level.decisionIndex));
  const [playing, setPlaying] = useState(tutorialStep < 0);
  const [speed, setSpeed] = useState<ReplaySpeed>(timed ? 2 : 1);

  const [marks, setMarks] = useState<Mark[]>([]);
  const [activeTool, setActiveTool] = useState<MarkType | null>(null);

  const lastClose = level.candles[level.decisionIndex]!.c;
  const unit = avgRange(level);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [entry, setEntry] = useState(lastClose);
  const [sl, setSl] = useState<number | undefined>(lastClose - unit * 2);
  const [tp, setTp] = useState<number>(lastClose + unit * 4);
  const [riskPct, setRiskPct] = useState(1);

  const [qIndex, setQIndex] = useState(0);
  const [awaitingTap, setAwaitingTap] = useState(false);

  const [resultExit, setResultExit] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [reward, setReward] = useState<{ newBadges: BadgeId[]; xpGained: number; rankedUp: boolean; xp: number; firstAttempt?: boolean; capped?: boolean } | null>(null);
  const [showRankUp, setShowRankUp] = useState(false);
  const [fineFlash, setFineFlash] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [balance, setBalance] = useState(profile.balance);
  const [analystNote, setAnalystNote] = useState<string | null>(null);

  const logRef = useRef<ActionLog>({
    levelId: level.id,
    mode,
    levelVersion: level.version,
    transformSeed: seed,
    startedAt: Date.now(),
    events: [],
    clientScore: 0,
    stars: 0,
  });
  const log = (ev: ActionLog["events"][number]) => logRef.current.events.push(ev);

  // A scored attempt is "live" from the decision point until the result is locked in.
  // Leaving while live is a forfeit (see lib/attemptGuard).
  const attemptRef = useRef<ActiveAttempt | null>(null);
  const [live, setLive] = useState(false);
  const deadlineRef = useRef<number | null>(null);

  const goToMarking = () => {
    setPlaying(false);
    setVisibleCount(level.decisionIndex + 1);
    log({ t: Date.now(), type: "decision" });
    if (!practice) {
      attemptRef.current = {
        levelId: level.id,
        strategyId: level.strategyId,
        difficulty: level.difficulty,
        mode,
        correctDirection: level.correctDirection,
        trade: null,
        startedAt: logRef.current.startedAt,
      };
      markAttempt(attemptRef.current);
      setLive(true);
    }
    // The clock runs off a real deadline, so switching tabs can't pause it.
    if (timed) deadlineRef.current = Date.now() + TIMER_SECONDS * 1000;
    setPhase(practice ? "trade" : "mark");
    // Start with the first tool ready so a click on the chart places a mark.
    if (!practice) setActiveTool(enabledTools[0] ?? null);
  };

  // Replay ticker.
  useEffect(() => {
    if (!playing) return;
    if (phase !== "replay" && phase !== "result") return;
    const iv = setInterval(() => {
      setVisibleCount((n) => {
        const target = phase === "replay" ? level.decisionIndex + 1 : level.candles.length;
        return n >= target ? n : n + 1;
      });
    }, SPEED_MS[speed]);
    return () => clearInterval(iv);
  }, [playing, phase, speed, level]);

  // Replay reached the decision point → pause and move to marking.
  useEffect(() => {
    if (phase === "replay" && visibleCount >= level.decisionIndex + 1) goToMarking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, visibleCount]);

  // 30 s timer for marking + entry on timed levels (deadline-based).
  useEffect(() => {
    if (!timed || (phase !== "mark" && phase !== "trade")) return;
    const tick = () => {
      const d = deadlineRef.current;
      if (d !== null) setTimeLeft(Math.max(0, Math.ceil((d - Date.now()) / 1000)));
    };
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [timed, phase]);

  // Time's up during marking: lock the marks and move on to the order.
  useEffect(() => {
    if (timed && timeLeft === 0 && phase === "mark") confirmMarking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, timed, phase]);

  const visibleCandles = level.candles.slice(0, visibleCount);

  // --- Marking ---
  // Easy levels only enable the tools this level needs; harder levels open every tool.
  const neededTypes = [...new Set(level.answerKey.map((a) => a.type))];
  const enabledTools: MarkType[] = isEasy ? TOOLS.map((t) => t.type).filter((t) => neededTypes.includes(t)) : TOOLS.map((t) => t.type);

  const addMark = (mark: Mark) => {
    sfx.mark();
    setMarks((ms) => [...ms, mark]);
    log({ t: Date.now(), type: "mark_add", mark });
  };

  const clampIdx = (i: number) => Math.max(0, Math.min(i, level.decisionIndex));

  const onChartTap = (i: number, _price: number) => {
    if (phase === "questions" && awaitingTap) {
      const q = level.questions[qIndex];
      if (q?.kind === "tap") {
        sfx.click();
        log({ t: Date.now(), type: "answer", questionId: q.id, value: clampIdx(i) });
        setAwaitingTap(false);
        advanceQuestion();
      }
      return;
    }
    if (phase !== "mark" || !activeTool) return;
    if (activeTool === "PATTERN") {
      const c = level.candles[clampIdx(i)]!;
      addMark({ id: nextMarkId(), type: "PATTERN", i1: c.i, p1: c.c });
      return;
    }
    if (activeTool === "SWING_HIGH" || activeTool === "SWING_LOW") {
      const c = level.candles[clampIdx(i)]!;
      addMark({ id: nextMarkId(), type: activeTool, i1: c.i, p1: activeTool === "SWING_HIGH" ? c.h : c.l });
    }
  };

  /** BOS / S/R lines. A BOS line with no clear end extends to the first candle that closes through it. */
  const onLineMark = (i1: number, i2: number, p1: number) => {
    if (phase !== "mark" || (activeTool !== "BOS" && activeTool !== "SR_LINE")) return;
    const a = clampIdx(i1);
    let b = clampIdx(i2);
    let price = p1;
    if (activeTool === "BOS") {
      // Snap to the nearest swing extreme at the start candle.
      const c = level.candles[a]!;
      price = Math.abs(p1 - c.h) < Math.abs(p1 - c.l) ? c.h : c.l;
      if (b - a < 2) {
        const crossed = level.candles
          .slice(a + 1, level.decisionIndex + 1)
          .find((k) => (price === c.h ? k.c > price : k.c < price));
        b = crossed ? crossed.i : Math.min(a + 6, level.decisionIndex);
      }
    } else if (b - a < 2) {
      b = level.decisionIndex;
    }
    addMark({ id: nextMarkId(), type: activeTool, i1: a, i2: b, p1: price });
  };

  const onBoxDrag = (i1: number, i2: number, p1: number, p2: number) => {
    if (phase !== "mark" || !activeTool) return;
    if (activeTool === "FVG" || activeTool === "ORDER_BLOCK") {
      addMark({ id: nextMarkId(), type: activeTool, i1: clampIdx(i1), i2: clampIdx(i2), p1, p2 });
    }
  };

  const undo = () => {
    const last = marks[marks.length - 1];
    if (!last) return;
    log({ t: Date.now(), type: "mark_remove", id: last.id });
    setMarks(marks.slice(0, -1));
  };
  const clearMarks = () => {
    marks.forEach((m) => log({ t: Date.now(), type: "mark_remove", id: m.id }));
    setMarks([]);
  };

  function confirmMarking() {
    setActiveTool(null);
    log({ t: Date.now(), type: "marking_done" });
    setPhase("trade");
  }

  // --- Trade ---
  const switchSide = (s: "buy" | "sell") => {
    if (s === side) return;
    // Mirror SL/TP around the entry so the lines stay on the correct sides.
    setSide(s);
    if (sl !== undefined) setSl(entry - (sl - entry));
    setTp(entry - (tp - entry));
  };

  const rr = riskRewardRatio({ side, entry, sl, tp, riskPct });
  const riskAmount = (profile.balance * riskPct) / 100;
  const potentialProfit = rr !== null ? riskAmount * rr : null;

  const tradeError: string | null = (() => {
    if (slRequired && sl === undefined) return "A stop loss is required on this level.";
    if (sl !== undefined && (side === "buy" ? sl >= entry : sl <= entry))
      return side === "buy" ? "Stop loss must be below entry for a buy." : "Stop loss must be above entry for a sell.";
    if (side === "buy" ? tp <= entry : tp >= entry)
      return side === "buy" ? "Take profit must be above entry for a buy." : "Take profit must be below entry for a sell.";
    return null;
  })();

  const onLineDrag = (id: DragLineId, price: number) => {
    if (id === "entry") setEntry(price);
    else if (id === "sl") setSl(price);
    else setTp(price);
  };

  const placeTrade = () => {
    if (tradeError) return;
    sfx.trade();
    log({ t: Date.now(), type: "trade", side, entry, sl, tp, riskPct });
    if (attemptRef.current) {
      attemptRef.current = { ...attemptRef.current, trade: { side, riskPct, usedSL: sl !== undefined } };
      markAttempt(attemptRef.current);
    }
    if (practice || level.questions.length === 0) {
      startResult();
      return;
    }
    setQIndex(0);
    setPhase("questions");
    setAwaitingTap(level.questions[0]?.kind === "tap");
  };

  // --- Questions ---
  function advanceQuestion() {
    const next = qIndex + 1;
    if (next >= level.questions.length) {
      startResult();
    } else {
      setQIndex(next);
      setAwaitingTap(level.questions[next]?.kind === "tap");
    }
  }

  const answerQuestion = (value: number | boolean) => {
    const q = level.questions[qIndex];
    if (!q) return;
    sfx.click();
    log({ t: Date.now(), type: "answer", questionId: q.id, value });
    advanceQuestion();
  };

  // --- Result ---
  const outcome = useMemo(
    () =>
      phase === "result" || phase === "review"
        ? simulateTrade(level.candles, level.decisionIndex, { side, entry, sl, tp, riskPct }, fallbackRisk(level, entry))
        : null,
    [phase, level, side, entry, sl, tp, riskPct],
  );

  function startResult() {
    const o = simulateTrade(level.candles, level.decisionIndex, { side, entry, sl, tp, riskPct }, fallbackRisk(level, entry));
    setResultExit(o.exitIndex);
    setPhase("result");
    setVisibleCount(level.decisionIndex + 1);
    setPlaying(true);
    const bd = computeScore(level, logRef.current);
    logRef.current.clientScore = bd.total;
    logRef.current.stars = bd.stars;
    setBreakdown(bd);
    lockInResult(bd, o.result);
  }

  /** Save the result the moment the questions are done; the playback is only visual. */
  function lockInResult(bd: ScoreBreakdown, exit: TradeRecord["exit"]) {
    attemptRef.current = null;
    clearAttempt();
    setLive(false);
    const events = logRef.current.events;
    const decisionAt = events.find((e) => e.type === "decision")?.t;
    const tradeAt = events.find((e) => e.type === "trade")?.t;
    const rec: TradeRecord = {
      id: `${logRef.current.startedAt}-${level.id}`,
      at: Date.now(),
      levelId: level.id,
      strategyId: level.strategyId,
      difficulty: level.difficulty,
      mode,
      side,
      withSetup: side === level.correctDirection,
      plannedRR: riskRewardRatio({ side, entry, sl, tp, riskPct }),
      riskPct,
      usedSL: sl !== undefined,
      r: bd.r,
      won: bd.won,
      exit,
      score: practice ? null : bd.total,
      marksCorrect: bd.marksCorrect,
      marksWrong: bd.marksWrong,
      marksMissed: practice ? 0 : bd.marksMissed,
      answersCorrect: bd.answersCorrect,
      answersTotal: practice ? 0 : level.questions.length,
      decisionSecs: decisionAt !== undefined && tradeAt !== undefined ? (tradeAt - decisionAt) / 1000 : null,
      counted: false,
    };
    if (!practice) {
      recordResult(level, bd, logRef.current, sl !== undefined).then((r) => {
        setReward({ newBadges: r.newBadges, xpGained: r.xpGained, rankedUp: r.rankedUp, xp: r.profile.xp, firstAttempt: r.firstAttempt });
        setBalance(r.profile.balance);
        addTrade({ ...rec, counted: r.firstAttempt }).then((list) => setAnalystNote(tradeNote(rec, list)));
      });
      // Offline sync queue exists only in the installed app.
      if (isApp()) enqueue(logRef.current);
    } else {
      awardPracticeXp(bd.won).then((r) => setReward({ newBadges: [], xpGained: r.xpGained, rankedUp: r.rankedUp, xp: r.xp, capped: r.capped }));
      addTrade(rec).then((list) => setAnalystNote(tradeNote(rec, list)));
    }
  }

  // Result playback reached the exit candle → banner and effects, then review.
  useEffect(() => {
    if (phase !== "result" || resultExit === null || visibleCount <= resultExit) return;
    setPlaying(false);
    const bd = breakdown;
    if (bd) {
      if (bd.won) sfx.win();
      else sfx.lose();
      if (!practice && bd.lines.some((l) => l.kind === "fine")) {
        setFineFlash(true);
        setTimeout(() => setFineFlash(false), 500);
      }
    }
    if (reward?.rankedUp) setShowRankUp(true);
    const t = setTimeout(() => {
      setVisibleCount(level.candles.length);
      setPhase("review");
    }, 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, visibleCount, resultExit]);

  // Stars pop in on the review screen.
  useEffect(() => {
    if (phase !== "review" || !breakdown || practice) return;
    const ts = Array.from({ length: breakdown.stars }, (_, k) => setTimeout(sfx.star, 900 + k * 220));
    return () => ts.forEach(clearTimeout);
  }, [phase, breakdown, practice]);

  const review = useMemo(() => {
    if (phase !== "review" || !breakdown) return null;
    const match = matchMarks(marks, level.answerKey);
    return {
      answerMarks: practice ? level.answerKey : match.matchedAnswers,
      missedMarks: practice ? [] : match.missed,
      wrongIds: new Set(match.wrong.map((m) => m.id)),
    };
  }, [phase, breakdown, marks, level.answerKey, practice]);

  const showOrder = phase === "trade" || phase === "questions" || phase === "result" || phase === "review";
  const lines: OverlayLine[] = showOrder
    ? [
        { id: "entry", price: entry, color: "#22d3ee", label: "Entry" },
        ...(sl !== undefined ? [{ id: "sl" as const, price: sl, color: "#ef4444", label: "SL" }] : []),
        { id: "tp", price: tp, color: "#22c55e", label: "TP" },
      ]
    : [];
  const bands = showOrder
    ? [
        ...(sl !== undefined ? [{ p1: entry, p2: sl, color: "#ef4444" }] : []),
        { p1: entry, p2: tp, color: "#22c55e" },
      ]
    : [];

  // Fill the screen below the top bar and phase pills (desktop), fixed on phones.
  const [viewH, setViewH] = useState(800);
  useEffect(() => {
    const on = () => setViewH(window.innerHeight);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const chartHeight = isMobile ? Math.max(300, Math.min(420, viewH * 0.45)) : Math.max(420, viewH - 190);
  // Leaving a live attempt (in-app navigation, browser back, refresh, closing the tab).
  const blocker = useBlocker({
    shouldBlockFn: () => live,
    enableBeforeUnload: () => live,
    withResolver: true,
  });
  const [leaving, setLeaving] = useState(false);
  // Set synchronously so the dialog closing doesn't cancel the navigation first.
  const leavingRef = useRef(false);
  const confirmLeave = async () => {
    const a = attemptRef.current;
    leavingRef.current = true;
    setLeaving(true);
    if (a) await forfeit(a);
    attemptRef.current = null;
    setLive(false);
    blocker.proceed?.();
  };

  const exitBack = () => {
    if (practice || mode === "daily" || mode === "ranked" || mode === "timed") navigate({ to: "/home" });
    else navigate({ to: "/levels/$strategyId", params: { strategyId: level.strategyId } });
  };
  const nextId = mode === "campaign" ? nextLevelId(baseLevel.id, { ...profile, xp: reward?.xp ?? profile.xp, results: { ...profile.results, [baseLevel.id]: { levelId: baseLevel.id, stars: breakdown?.stars ?? 1, score: 0, r: 0, won: false, completedAt: 0 } } }) : null;

  // --- Tutorial ---
  if (tutorialStep >= 0) {
    const step = steps[tutorialStep]!;
    const finish = () => {
      setTutorialStep(-1);
      setPlaying(true);
      markTutorialSeen(baseLevel.strategyId);
    };
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-6">
        <div className="mb-4 flex w-full max-w-2xl items-center justify-between">
          <button onClick={exitBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <p className="font-num text-xs text-electric">
            {strategy?.name.toUpperCase()} · TUTORIAL {tutorialStep + 1}/{steps.length}
          </p>
        </div>
        <motion.div key={tutorialStep} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="panel w-full max-w-2xl p-5 md:p-8">
          {step.anim ? (
            <FormationStep key={tutorialStep} anim={step.anim} />
          ) : step.walk ? (
            <LevelWalkthrough level={tutorialLevel} show={step.walk} />
          ) : step.spec ? (
            <Diagram spec={step.spec} />
          ) : (
            <TutorialExample level={tutorialLevel} step={step} />
          )}
          <h2 className="mt-5 text-2xl font-bold">{step.title}</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">{step.body}</p>
          <div className="mt-5 flex gap-1.5">
            {steps.map((_, k) => (
              <span key={k} className={`h-1.5 flex-1 rounded-full ${k <= tutorialStep ? "bg-electric" : "bg-secondary"}`} />
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <button className="text-sm text-muted-foreground hover:text-foreground" onClick={finish}>
              Skip
            </button>
            <div className="flex gap-2">
              {tutorialStep > 0 && (
                <button className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold" onClick={() => setTutorialStep(tutorialStep - 1)}>
                  Back
                </button>
              )}
              <button
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                onClick={() => (tutorialStep + 1 >= steps.length ? finish() : setTutorialStep(tutorialStep + 1))}
              >
                {tutorialStep + 1 >= steps.length ? "Start level" : "Next"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQ = level.questions[qIndex];
  const activeToolInfo = TOOLS.find((t) => t.type === activeTool);
  const title = practice
    ? "Practice Replay"
    : mode === "daily"
      ? "Daily Challenge"
      : mode === "ranked"
        ? "Ranked"
        : `${strategy?.name ?? "Level"} · ${levelLabel(baseLevel)}`;
  const phaseOrder: Phase[] = ["mark", "trade", "questions", "result"];

  return (
    <div className={`flex min-h-screen flex-col bg-background ${fineFlash ? "fine-flash shake" : ""}`}>
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-3 py-2 md:px-4">
        <button onClick={exitBack} className="text-muted-foreground hover:text-foreground" title="Exit level">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <div className="flex gap-1">
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
              {level.difficulty}
            </span>
            {mode !== "campaign" && (
              <span className="rounded bg-electric/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-electric">{mode}</span>
            )}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3 md:gap-5">
          {timed && (phase === "mark" || phase === "trade") && (
            <div className="w-20 md:w-28">
              <p className={`font-num text-right text-sm font-bold ${timeLeft < 10 ? "text-destructive" : ""}`}>{timeLeft}s</p>
              <div className="h-1.5 overflow-hidden rounded bg-secondary">
                <div
                  className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 10 ? "bg-destructive" : "bg-electric"}`}
                  style={{ width: `${(timeLeft / TIMER_SECONDS) * 100}%` }}
                />
              </div>
            </div>
          )}
          {!practice && (
            <div className="text-right">
              <p className="text-[10px] uppercase text-muted-foreground">Score</p>
              <p className="font-num text-sm font-semibold">{phase === "review" && breakdown ? breakdown.total : "—"}</p>
            </div>
          )}
          <div className="hidden text-right sm:block">
            <p className="text-[10px] uppercase text-muted-foreground">Balance</p>
            <p className="font-num text-sm font-semibold">${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </header>

      {/* Phase indicator */}
      {!practice && (
        <div className="flex items-center justify-center gap-1 border-b border-border py-2">
          {PHASES.map((p, k) => {
            const cur = phase === "review" ? "result" : phase;
            const active = cur === p.id;
            const done = phaseOrder.indexOf(cur) > k || phase === "review";
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium md:px-3 md:text-xs ${
                  active && phase !== "review" ? "bg-primary text-primary-foreground" : done ? "bg-secondary text-foreground" : "bg-secondary/50 text-muted-foreground"
                }`}
              >
                {done && <Check className="h-3 w-3" />}
                {p.label}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Marking toolbar */}
        {!practice && (
          <aside className="order-2 flex flex-row gap-1 overflow-x-auto border-t border-border bg-card p-2 md:order-1 md:w-16 md:flex-col md:border-r md:border-t-0">
            {TOOLS.map((t) => {
              const allowed = enabledTools.includes(t.type);
              const enabled = phase === "mark" && allowed;
              return (
                <button
                  key={t.type}
                  title={allowed ? `${t.label} — ${t.how}` : `${t.label} (unlocks on Medium)`}
                  disabled={!enabled}
                  onClick={() => setActiveTool(activeTool === t.type ? null : t.type)}
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${
                    activeTool === t.type
                      ? "bg-primary text-primary-foreground"
                      : enabled
                        ? "bg-secondary text-foreground hover:bg-accent"
                        : "cursor-not-allowed bg-secondary/40 text-muted-foreground/40"
                  }`}
                >
                  {t.icon}
                  {!allowed && <Lock className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5" />}
                </button>
              );
            })}
            <div className="mx-1 w-px bg-border md:mx-0 md:my-1 md:h-px md:w-auto" />
            <button onClick={undo} disabled={phase !== "mark" || marks.length === 0} title="Undo" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground disabled:opacity-40">
              <Undo2 className="h-4 w-4" />
            </button>
            <button onClick={clearMarks} disabled={phase !== "mark" || marks.length === 0} title="Clear" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground disabled:opacity-40">
              <Trash2 className="h-4 w-4" />
            </button>
          </aside>
        )}

        {/* Chart */}
        <main className="order-1 min-w-0 p-2 md:order-2 md:flex-1 md:p-4">
          <div className="panel relative overflow-hidden">
            {phase === "mark" && activeToolInfo && (
              <div className="pointer-events-none absolute left-1/2 top-10 z-30 -translate-x-1/2 whitespace-nowrap rounded-md bg-background/80 px-2.5 py-1 text-xs text-electric backdrop-blur">
                {activeToolInfo.label}: {activeToolInfo.how}
              </div>
            )}
            {phase === "questions" && awaitingTap && (
              <div className="pointer-events-none absolute left-1/2 top-10 z-30 -translate-x-1/2 whitespace-nowrap rounded-md bg-electric px-2.5 py-1 text-xs font-semibold text-electric-foreground">
                Tap a candle on the chart
              </div>
            )}
            <CandleChart
              candles={visibleCandles}
              chartColors={profile.settings.chartColors}
              marks={marks}
              answerMarks={review?.answerMarks ?? []}
              missedMarks={review?.missedMarks ?? []}
              wrongMarkIds={review?.wrongIds}
              {...(isEasy && phase === "mark" && level.hintArea ? { hintArea: level.hintArea } : {})}
              lines={lines}
              bands={bands}
              activeTool={phase === "mark" ? activeTool : phase === "questions" && awaitingTap ? "tap" : null}
              onChartTap={onChartTap}
              onBoxDrag={onBoxDrag}
              onLineMark={onLineMark}
              {...(phase === "trade" ? { onLineDrag } : {})}
              exitMarker={
                (phase === "result" || phase === "review") && outcome && resultExit !== null && visibleCount > resultExit
                  ? { i: outcome.exitIndex, price: outcome.exitPrice, color: outcome.r > 0 ? "#22c55e" : "#ef4444" }
                  : undefined
              }
              height={chartHeight}
            />

            {/* Result banner */}
            <AnimatePresence>
              {phase === "result" && breakdown && outcome && resultExit !== null && visibleCount > resultExit && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                >
                  <div className={`rounded-2xl px-10 py-6 text-center shadow-2xl ${breakdown.r > 0 ? "bg-up/90" : "bg-down/90"}`}>
                    <p className="font-num text-5xl font-black text-white">
                      {breakdown.r > 0 ? "+" : ""}
                      {breakdown.r.toFixed(1)}R
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white/90">
                      {outcome.result === "tp" ? "Take profit hit" : outcome.result === "sl" ? "Stop loss hit" : "Closed at end of data"}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Replay controls */}
          {(phase === "replay" || phase === "result") && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                onClick={() => setPlaying(!playing)}
                disabled={timed}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                title={timed ? "Replay controls are disabled on timed levels" : playing ? "Pause" : "Play"}
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              {([1, 2, 5] as ReplaySpeed[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  disabled={timed}
                  className={`font-num rounded px-2.5 py-1 text-sm ${speed === s ? "bg-secondary text-foreground" : "text-muted-foreground"} disabled:opacity-40`}
                >
                  {s}x
                </button>
              ))}
              {phase === "replay" && !timed && (
                <button onClick={goToMarking} className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
                  Skip to decision
                </button>
              )}
            </div>
          )}

          {/* Review */}
          {phase === "review" && breakdown && (
            <ReviewPanel
              level={level}
              breakdown={breakdown}
              practice={practice}
              reward={reward}
              analystNote={analystNote}
              flipped={flipped}
              onRetry={() => window.location.reload()}
              {...(nextId ? { onNext: () => navigate({ to: "/play/$levelId", params: { levelId: nextId }, search: { mode: "campaign" } }) } : {})}
              {...(onNextChart ? { onNextChart } : {})}
              onBack={exitBack}
            />
          )}
        </main>

        {/* Order panel / phase actions */}
        <aside className="order-3 w-full border-t border-border bg-card p-4 md:w-80 md:border-l md:border-t-0">
          {phase === "mark" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Mark what you see</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {isEasy ? (
                  <>
                    Mark{" "}
                    {neededTypes
                      .map((t) => MARK_ASK[t](level.answerKey.filter((a) => a.type === t).length))
                      .join(", ")}
                    . The pulsing zone is a hint.
                  </>
                ) : (
                  "Mark every signal that matters here with the tools on the left. Correct marks +30, wrong marks −20, missed marks 0."
                )}
              </p>
              {marks.length > 0 && (
                <ul className="space-y-1">
                  {marks.map((m) => (
                    <li key={m.id} className="font-num flex justify-between rounded bg-secondary px-2 py-1 text-xs">
                      <span>{TOOLS.find((t) => t.type === m.type)?.label}</span>
                      <span className="text-muted-foreground">
                        #{m.i1}
                        {m.i2 !== undefined ? `→#${m.i2}` : ""} @ {fmt(m.p1)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {marks.length === 0 && (
                <p className="rounded-md border border-dashed border-electric/50 p-2 text-xs text-electric">
                  Pick a tool on the left, then click the chart. Place at least one mark to continue.
                </p>
              )}
              <button
                onClick={confirmMarking}
                disabled={marks.length === 0}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                {timed ? "Confirm marking — unlock order panel" : "Done marking"}
              </button>
              {timed && (
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Lock className="h-3 w-3" /> Entry stays locked until marking is done.
                </p>
              )}
            </div>
          )}

          {phase === "trade" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Place your trade</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => switchSide("buy")}
                  className={`rounded-lg py-2.5 text-sm font-bold ${side === "buy" ? "bg-up text-white" : "bg-secondary text-muted-foreground"}`}
                >
                  BUY
                </button>
                <button
                  onClick={() => switchSide("sell")}
                  className={`rounded-lg py-2.5 text-sm font-bold ${side === "sell" ? "bg-down text-white" : "bg-secondary text-muted-foreground"}`}
                >
                  SELL
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Drag the lines on the chart or type prices below.</p>
              <div className="space-y-2 text-sm">
                <PriceInput label="Entry" value={entry} onChange={setEntry} />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Stop loss{slRequired ? "" : " (optional)"}
                  </span>
                  {sl !== undefined ? (
                    <div className="flex items-center gap-1">
                      <NumberBox value={sl} onChange={setSl} />
                      {!slRequired && (
                        <button onClick={() => setSl(undefined)} className="text-xs text-muted-foreground hover:text-destructive" title="Remove stop loss (−30)">
                          ✕
                        </button>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => setSl(side === "buy" ? entry - unit * 2 : entry + unit * 2)} className="text-xs text-electric hover:underline">
                      + Add stop loss
                    </button>
                  )}
                </div>
                <PriceInput label="Take profit" value={tp} onChange={setTp} />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Risk</span>
                  <span className="font-num font-semibold">
                    {riskPct}% · ${riskAmount.toFixed(0)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={riskPct}
                  onChange={(e) => setRiskPct(Number(e.target.value))}
                  className="mt-1 w-full accent-[var(--color-electric)]"
                />
              </div>
              <div className="rounded-lg bg-terminal p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk : Reward</span>
                  <span className={`font-num font-semibold ${rr !== null && rr < 1 ? "text-gold" : "text-electric"}`}>{rr !== null ? `1 : ${rr.toFixed(1)}` : "—"}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Potential profit</span>
                  <span className="font-num font-semibold text-up">{potentialProfit !== null ? `+$${potentialProfit.toFixed(0)}` : "—"}</span>
                </div>
                {sl === undefined && !practice && <p className="mt-2 text-xs text-gold">No stop loss: −30 points.</p>}
              </div>
              {tradeError && <p className="text-xs text-destructive">{tradeError}</p>}
              <button
                onClick={placeTrade}
                disabled={!!tradeError}
                className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
              >
                Place trade
              </button>
              {timed && timeLeft === 0 && <p className="text-center text-xs text-destructive">Time's up: no fast-decision bonus.</p>}
            </div>
          )}

          {phase === "questions" && currentQ && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <HelpCircle className="h-4 w-4 text-electric" /> Question {qIndex + 1} of {level.questions.length}
              </p>
              <p className="text-sm leading-relaxed">{currentQ.prompt}</p>
              {currentQ.kind === "mcq" && (
                <div className="space-y-2">
                  {currentQ.options.map((opt, k) => (
                    <button key={k} onClick={() => answerQuestion(k)} className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-left text-sm hover:border-electric">
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {currentQ.kind === "truefalse" && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => answerQuestion(true)} className="rounded-lg border border-border bg-secondary py-2.5 text-sm font-bold hover:border-up">
                    True
                  </button>
                  <button onClick={() => answerQuestion(false)} className="rounded-lg border border-border bg-secondary py-2.5 text-sm font-bold hover:border-down">
                    False
                  </button>
                </div>
              )}
              {currentQ.kind === "tap" && (
                <p className="rounded-lg border border-dashed border-electric p-3 text-center text-sm text-electric">Tap the candle on the chart</p>
              )}
              <p className="text-[11px] text-muted-foreground">Correct +40 · Wrong −50. The result plays out after the questions.</p>
            </div>
          )}

          {(phase === "replay" || phase === "result") && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground">{phase === "replay" ? "Watch the tape" : "Playing out…"}</h3>
              <p>
                {phase === "replay"
                  ? "The chart replays candle by candle. When it pauses, mark what you see."
                  : "Your trade is live. Watch whether price hits your target or your stop."}
              </p>
            </div>
          )}

          {phase === "review" && breakdown && (
            <div className="space-y-3 text-sm">
              <h3 className="font-semibold">Chart key</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-mark-player" /> Your marks</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-mark-correct" /> Correct</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-dashed border-mark-correct" /> Missed</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-mark-wrong" /> Wrong</span>
              </div>
              {!practice && (
                <>
                  <p className="text-muted-foreground">
                    Marks: {breakdown.marksCorrect} correct · {breakdown.marksWrong} wrong · {breakdown.marksMissed} missed
                  </p>
                  <p className="text-muted-foreground">
                    Answers: {breakdown.answersCorrect}/{level.questions.length} correct
                  </p>
                </>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Leave-level confirmation (forfeit) */}
      <AlertDialog open={blocker.status === "blocked"} onOpenChange={(o) => !o && !leavingRef.current && blocker.reset?.()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this level?</AlertDialogTitle>
            <AlertDialogDescription>
              The chart is live. Leaving now counts as a <strong>forfeit</strong>: {FORFEIT_POINTS} points for this attempt, no stars, no XP
              {attemptRef.current?.trade ? ", and your open trade is closed at a full −1R loss" : ""}. Only your first attempt counts for the leaderboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaving}>Keep playing</AlertDialogCancel>
            <AlertDialogAction disabled={leaving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmLeave}>
              Forfeit and leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rank-up modal */}
      <AnimatePresence>
        {showRankUp && reward && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={() => setShowRankUp(false)}>
            <motion.div initial={{ scale: 0.5, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.5 }} className="panel max-w-sm p-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">{rankForXp(reward.xp).sub === 0 ? "Rank up!" : "Promotion!"}</p>
              <div className="my-4 flex justify-center">
                <RankBadge index={rankForXp(reward.xp).index} sub={rankForXp(reward.xp).sub} size={96} />
              </div>
              <h2 className="text-3xl font-black">{rankForXp(reward.xp).name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">Your analysis is paying off. New modes may have unlocked.</p>
              <button className="mt-6 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground" onClick={() => setShowRankUp(false)}>
                Keep going
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NumberBox({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(fmt(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(fmt(value));
  }, [value]);
  return (
    <input
      type="number"
      value={text}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        setText(fmt(value));
      }}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== "" && Number.isFinite(n)) onChange(n);
      }}
      className="font-num w-28 rounded border border-input bg-background px-2 py-1 text-right"
    />
  );
}

function PriceInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <NumberBox value={value} onChange={onChange} />
    </label>
  );
}

function ReviewPanel({
  level,
  breakdown,
  practice,
  reward,
  analystNote,
  flipped,
  onRetry,
  onNext,
  onNextChart,
  onBack,
}: {
  level: Level;
  breakdown: ScoreBreakdown;
  practice: boolean;
  reward: { newBadges: BadgeId[]; xpGained: number; firstAttempt?: boolean; capped?: boolean } | null;
  analystNote: string | null;
  flipped: boolean;
  onRetry: () => void;
  onNext?: () => void;
  onNextChart?: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="panel p-5">
        {level.source && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-gold/40 bg-gold/5 p-3">
            <CandlestickChart className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
            <div className="text-sm">
              <p className="font-semibold">
                Real chart: {level.source.label} · {level.source.timeframe}
              </p>
              <p className="text-muted-foreground">
                Decision candle: {new Date(level.source.decisionTime * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {flipped ? "Shown upside-down and rescaled " : "Prices rescaled "}during play so the market couldn't be recognised.
              </p>
            </div>
          </div>
        )}
        <h3 className="font-semibold">What the chart was showing</h3>
        <p
          className="mt-2 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground"
          dangerouslySetInnerHTML={{ __html: level.explanation.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          The setup favoured a <span className={level.correctDirection === "buy" ? "text-up" : "text-down"}>{level.correctDirection.toUpperCase()}</span>.
        </p>
        {analystNote && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-4 rounded-lg border border-mark-player/40 bg-mark-player/5 p-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-mark-player">
              <BrainCircuit className="h-4 w-4" /> Analyst
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{analystNote}</p>
            <Link to="/analyst" className="mt-1 inline-block text-xs text-electric hover:underline">
              See your full analysis →
            </Link>
          </motion.div>
        )}
      </div>
      <div className="panel p-5">
        {practice ? (
          <>
            <h3 className="font-semibold">Practice result</h3>
            <p className={`font-num mt-3 text-4xl font-black ${breakdown.r > 0 ? "text-up" : "text-down"}`}>
              {breakdown.r > 0 ? "+" : ""}
              {breakdown.r.toFixed(2)}R
            </p>
            <p className="mt-1 text-sm text-muted-foreground">No scoring pressure. Green marks show the setup.</p>
            {reward && (
              <p className="font-num mt-1 text-sm font-bold text-electric">
                +{reward.xpGained} XP {reward.capped && <span className="text-xs font-normal text-muted-foreground">(daily practice XP limit reached)</span>}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button onClick={onBack} className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold">
                Home
              </button>
              {onNextChart && (
                <button onClick={onNextChart} className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
                  <Shuffle className="h-4 w-4" /> Next chart
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="font-semibold">Score breakdown</h3>
            <div className="mt-3 space-y-1.5">
              {breakdown.lines.map((l, k) => (
                <motion.div
                  key={k}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: k * 0.1 }}
                  className="flex justify-between text-sm"
                >
                  <span className="text-muted-foreground">{l.label}</span>
                  <span className={`font-num font-semibold ${l.points > 0 ? "text-up" : l.points < 0 ? "text-down" : "text-muted-foreground"}`}>
                    {l.points > 0 ? "+" : ""}
                    {l.points}
                  </span>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: breakdown.lines.length * 0.1 }}
                className="mt-2 flex justify-between border-t border-border pt-2"
              >
                <span className="font-semibold">Total</span>
                <span className={`font-num text-lg font-bold ${breakdown.total >= 0 ? "text-up" : "text-down"}`}>
                  {breakdown.total > 0 ? "+" : ""}
                  {breakdown.total}
                </span>
              </motion.div>
            </div>
            <div className="mt-4 flex items-center gap-1">
              {[1, 2, 3].map((s) => (
                <motion.span
                  key={s}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.9 + s * 0.22, type: "spring", bounce: 0.6 }}
                >
                  <Star className={`h-8 w-8 ${s <= breakdown.stars ? "fill-gold text-gold drop-shadow-[0_0_8px_var(--color-gold)]" : "text-muted"}`} />
                </motion.span>
              ))}
              {reward && (
                <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: -4 }} transition={{ delay: 1.7 }} className="font-num ml-3 text-sm font-bold text-electric">
                  +{reward.xpGained} XP
                </motion.span>
              )}
            </div>
            {reward?.firstAttempt === false && (
              <p className="mt-2 text-xs text-muted-foreground">
                Replay: 25% XP, and it doesn't change your leaderboard score. Only your first attempt at a level counts.
              </p>
            )}
            {reward && reward.newBadges.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="mt-3 space-y-1">
                {reward.newBadges.map((b) => (
                  <p key={b} className="flex items-center gap-2 rounded-md bg-gold/10 px-3 py-1.5 text-sm text-gold">
                    <Award className="h-4 w-4" /> New badge: {BADGE_LABELS[b].icon} {BADGE_LABELS[b].name}
                  </p>
                ))}
              </motion.div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={onBack} className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold">
                Levels
              </button>
              <button onClick={onRetry} className="flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold">
                <RotateCcw className="h-4 w-4" /> Retry
              </button>
              {onNext && (
                <button onClick={onNext} className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
                  Next level <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** A tutorial step that animates a real pattern forming. */
function FormationStep({ anim }: { anim: NonNullable<TutorialStep["anim"]> }) {
  const c = useMemo(() => closeUp(anim.id, "k", 12, 0), [anim.id]);
  return <CandleFormation candles={c.candles} k={c.k} len={anim.len} label={anim.label} tone={anim.tone} single={anim.single} source={c.source} />;
}

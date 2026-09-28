import { createFileRoute, Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, RotateCcw, XCircle, Gamepad2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LessonBlocks } from "@/components/academy/LessonBlocks";
import { useProfile } from "@/hooks/use-profile";
import { findLesson } from "@/data/academy";
import { strategyById } from "@/lib/progression";
import { getQuizAttempts, quizXp, recordLessonQuiz, registerQuizAttempt, LESSON_PASS } from "@/services/academyService";
import { getProfile } from "@/services/progressService";
import { mulberry32 } from "@/engine/transform";
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
import { sfx } from "@/lib/sound";
import type { QuizQ } from "@/data/academy/types";

export const Route = createFileRoute("/academy/$lessonId")({
  head: () => ({ meta: [{ title: "Lesson — MR_HRHR Academy" }] }),
  component: LessonPage,
});

// Lessons that have a playable chart game to practise on.
// Lessons with scored real-chart levels to practise on (lesson id → strategy).
const PLAYABLE: Record<string, string> = { "candle-ohlc": "candles", "buyers-sellers": "candles", "wicks": "candles", "body-momentum": "candles", "marubozu": "candles", "doji": "candles", "hammer-hanging-man": "candles", "inverted-hammer-shooting-star": "candles", "spinning-top": "candles", "pin-bar": "candles", "engulfing": "candles", "harami": "candles", "tweezers": "candles", "piercing-dark-cloud": "candles", "inside-outside-bar": "candles", "three-candle": "candles", "trends": "trends", "trendlines-channels": "trends", "strat-trend-pullback": "sltp", "support-resistance": "sr", "ranges": "sr", "strat-range": "rr", "strat-breakout-retest": "sr", "order-types": "sltp", "trade-management": "sltp", "risk-per-trade": "rr", "rr-expectancy": "rr", "bos-choch": "bos", "strat-bos": "bos", "strat-choch-reversal": "choch", "breakout-fakeout": "liquidity", "liquidity": "liquidity", "order-blocks": "orderblocks", "fair-value-gaps": "fvg", "premium-discount": "premiumdiscount", "fibonacci": "premiumdiscount", "confluence": "confluence", "strat-smc-ob-fvg": "confluence", "timeframes": "mtf", "strat-top-down": "mtf", "sessions": "sessions", "strat-london-breakout": "sessions", "compression-expansion": "trends", "dow-theory-staircase": "trends", "market-structure-shift": "choch", "internal-external-structure": "swings", "strong-weak-protected": "swings", "inducement": "liquidity", "swing-failure-pattern": "liquidity", "sell-side-clean-old": "liquidity", "draw-on-liquidity": "liquidity", "turtle-soup": "liquidity", "previous-highs-lows": "liquidity", "consequent-encroachment": "fvg", "inversion-fvg": "fvg", "balanced-price-range": "fvg", "unmitigated-refined-ob": "orderblocks", "breaker-mitigation-blocks": "orderblocks", "poi-pd-arrays": "premiumdiscount", "optimal-trade-entry": "premiumdiscount", "killzones": "sessions", "silver-bullet-macros": "sessions", "opens-opening-range": "sessions", "power-of-three": "sessions", "risk-vs-confirmation-entry": "confluence", "ict-2022-model": "confluence", "unicorn-model": "confluence", "performance-metrics": "rr" };

function LessonPage() {
  const { lessonId } = Route.useParams();
  const found = findLesson(lessonId);
  const profile = useProfile();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [lessonId]);

  if (!found)
    return (
      <AppShell>
        <p className="text-muted-foreground">Lesson not found.</p>
        <Link to="/academy" className="text-electric underline">
          Back to the Academy
        </Link>
      </AppShell>
    );
  const { lesson, module, index, prev, next } = found;
  const best = profile?.academy[lesson.id]?.best;

  return (
    <AppShell>
      <article className="mx-auto max-w-3xl">
        <Link to="/academy" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Academy
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-electric">
          {module.icon} Module {module.n} · {module.title} · Lesson {index + 1}/{module.lessons.length}
        </p>
        <h1 className="mt-1 text-3xl font-black md:text-4xl">{lesson.title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{lesson.summary}</p>
        <p className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {lesson.minutes} min
          </span>
          {best !== undefined && (
            <span className="flex items-center gap-1 text-up">
              <CheckCircle2 className="h-3.5 w-3.5" /> Completed · best {Math.round(best * 100)}%
            </span>
          )}
        </p>

        <div className="mt-8">
          <LessonBlocks blocks={lesson.blocks} />
        </div>

        {PLAYABLE[lesson.id] && (
          <Link
            to="/levels/$strategyId"
            params={{ strategyId: PLAYABLE[lesson.id]! }}
            className="mt-8 flex items-center gap-3 rounded-xl border border-electric/50 bg-electric/10 p-4 hover:bg-electric/15"
          >
            <Gamepad2 className="h-6 w-6 text-electric" />
            <div>
              <p className="font-semibold">Practise this on real charts</p>
              <p className="text-sm text-muted-foreground">Play the scored {strategyById(PLAYABLE[lesson.id]!)?.name} levels, all cut from real market charts.</p>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 text-electric" />
          </Link>
        )}

        <Quiz key={lesson.id} lessonId={lesson.id} questions={lesson.quiz} />

        <nav className="mt-10 flex justify-between gap-3 border-t border-border pt-6">
          {prev ? (
            <Link to="/academy/$lessonId" params={{ lessonId: prev.id }} className="flex max-w-[45%] items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 shrink-0" /> <span className="truncate">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to="/academy/$lessonId" params={{ lessonId: next.id }} className="flex max-w-[45%] items-center gap-2 text-right text-sm font-semibold text-electric">
              <span className="truncate">{next.title}</span> <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          )}
        </nav>
      </article>
    </AppShell>
  );
}

/** Shuffle options (and question order) differently on every attempt. */
function shuffled(questions: QuizQ[], attempt: number): QuizQ[] {
  const rng = mulberry32(attempt * 7919 + 17);
  const order = questions.map((q, k) => ({ q, k, r: rng() })).sort((a, b) => a.r - b.r);
  return order.map(({ q }) => {
    const opts = q.options.map((o, j) => ({ o, j, r: rng() })).sort((a, b) => a.r - b.r);
    return { ...q, options: opts.map((x) => x.o), answer: opts.findIndex((x) => x.j === q.answer) };
  });
}

function Quiz({ lessonId, questions: source }: { lessonId: string; questions: QuizQ[] }) {
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<number | null>(null); // attempts already used
  const [completed, setCompleted] = useState(false);
  const questions = useMemo(() => shuffled(source, attempt ?? 0), [source, attempt]);
  const [answers, setAnswers] = useState<(number | null)[]>(() => source.map(() => null));
  const [result, setResult] = useState<{ score: number; xp: number } | null>(null);
  const found = findLesson(lessonId);

  useEffect(() => {
    getQuizAttempts(lessonId).then(setAttempt);
    getProfile().then((p) => setCompleted(!!p.academy[lessonId]));
  }, [lessonId]);

  const allAnswered = answers.every((a) => a !== null);
  const correct = answers.filter((a, k) => a === questions[k]!.answer).length;
  const started = answers.some((a) => a !== null) && !result;

  // Leaving mid-quiz (after answering anything) counts as a failed attempt.
  const blocker = useBlocker({ shouldBlockFn: () => started, enableBeforeUnload: () => started, withResolver: true });
  const leavingRef = useRef(false);

  const submit = async () => {
    const score = correct / questions.length;
    const r = await recordLessonQuiz(lessonId, score);
    if (score >= LESSON_PASS) {
      sfx.win();
      setCompleted(true);
    } else sfx.lose();
    setResult({ score, xp: r.xpGained });
  };

  const retry = () => {
    setAttempt((a) => (a ?? 0) + 1);
    setAnswers(source.map(() => null));
    setResult(null);
  };

  return (
    <section className="panel mt-10 p-5 md:p-6">
      <h2 className="text-xl font-bold">Check your understanding</h2>
      <p className="text-sm text-muted-foreground">
        Get {Math.ceil(questions.length * LESSON_PASS)} of {questions.length} right to complete the lesson.
        {!completed && attempt !== null && <span className="text-electric"> Pass on this attempt for +{quizXp(attempt + 1)} XP.</span>}
        {attempt !== null && attempt > 0 && <span> Attempt {attempt + 1}. Options are reshuffled each time.</span>}
      </p>
      <div className="mt-5 space-y-6">
        {questions.map((q, k) => {
          const chosen = answers[k];
          return (
            <div key={k}>
              <p className="font-medium">
                {k + 1}. {q.q}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, j) => {
                  const picked = chosen === j;
                  const show = result !== null;
                  const isRight = j === q.answer;
                  return (
                    <button
                      key={j}
                      disabled={show}
                      onClick={() => {
                        sfx.click();
                        setAnswers((a) => a.map((x, i) => (i === k ? j : x)));
                      }}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        show && isRight
                          ? "border-up bg-up/10"
                          : show && picked
                            ? "border-down bg-down/10"
                            : picked
                              ? "border-electric bg-electric/10"
                              : "border-border bg-secondary hover:border-muted-foreground/50"
                      }`}
                    >
                      {show && isRight && <CheckCircle2 className="h-4 w-4 shrink-0 text-up" />}
                      {show && picked && !isRight && <XCircle className="h-4 w-4 shrink-0 text-down" />}
                      {opt}
                    </button>
                  );
                })}
              </div>
              {result && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-sm text-muted-foreground">
                  <span className={chosen === q.answer ? "text-up" : "text-down"}>{chosen === q.answer ? "Correct. " : "Not quite. "}</span>
                  {q.why}
                </motion.p>
              )}
            </div>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        {!result ? (
          <button
            key="submit"
            onClick={submit}
            disabled={!allAnswered}
            className="mt-6 w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-40"
          >
            {allAnswered ? "Check answers" : `Answer all ${questions.length} questions`}
          </button>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 rounded-xl bg-terminal p-5 text-center">
            <p className={`font-num text-4xl font-black ${result.score >= LESSON_PASS ? "text-up" : "text-down"}`}>
              {correct}/{questions.length}
            </p>
            <p className="mt-1 font-semibold">{result.score >= LESSON_PASS ? "Lesson complete!" : "Not yet. Review the lesson and try again."}</p>
            {result.xp > 0 && <p className="font-num mt-1 text-sm text-electric">+{result.xp} XP</p>}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                onClick={retry}
                className="flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold"
              >
                <RotateCcw className="h-4 w-4" /> Retry quiz
              </button>
              {found?.next && result.score >= LESSON_PASS && (
                <button
                  onClick={() => navigate({ to: "/academy/$lessonId", params: { lessonId: found.next!.id } })}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Next lesson <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={blocker.status === "blocked"} onOpenChange={(o) => !o && !leavingRef.current && blocker.reset?.()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave the quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              You've started answering. Leaving now counts as a failed attempt, and each extra attempt earns less XP when you finally pass.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Finish the quiz</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                leavingRef.current = true;
                await registerQuizAttempt(lessonId);
                blocker.proceed?.();
              }}
            >
              Leave anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

// Quick guided tour for new players: spotlights the main parts of the site one by
// one, in the same animated style as the tutorials. Skippable at any step, shown
// once per profile, and replayable from Settings.
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { currentUserSync } from "@/services/authService";
import { CandleFormation } from "./CandleFormation";
import { closeUp } from "@/data/academy/real";
import { RankBadge } from "./RankBadge";
import { TOTAL_LESSONS } from "@/data/academy";

const KEY = () => `mrhrhr.guideSeen.${currentUserSync()?.id ?? "_"}`;

export function guideSeen(): boolean {
  try {
    return localStorage.getItem(KEY()) === "1";
  } catch {
    return true;
  }
}
export function resetGuide() {
  try {
    localStorage.removeItem(KEY());
  } catch {
    // storage unavailable
  }
}
function markSeen() {
  try {
    localStorage.setItem(KEY(), "1");
  } catch {
    // storage unavailable
  }
}

type Step = { target?: string; title: string; body: string; art?: "candle" | "loop" | "ranks" | "welcome" };

const STEPS: Step[] = [
  {
    title: "Welcome to MR_HRHR",
    body: "A trading school you play. Every chart here is real market history. You'll learn to read it, plan trades and manage risk, and your rank grows with your skill.",
    art: "welcome",
  },
  {
    target: "/academy",
    title: "Academy: learn",
    body: `${TOTAL_LESSONS} lessons from 'what is trading' to institutional concepts, each with real chart examples and a quiz. There's also a glossary of every term and a resources page.`,
    art: "candle",
  },
  {
    target: "/map",
    title: "Play: prove it on real charts",
    body: "Start at Tier 1 · Candlesticks. Finish each level to open the next; finish a strategy to open the next one. Earn XP to unlock higher tiers.",
  },
  {
    title: "How a level works",
    body: "The chart replays and pauses at the decision point. You mark what you see, place a trade with a stop and target, answer questions about your reasoning, then watch what the real market did.",
    art: "loop",
  },
  {
    target: "/analyst",
    title: "Your Analyst",
    body: "Every trade is reviewed. The Analyst shows your best trades, where you're leaking points, and which lessons and strategies to focus on.",
  },
  {
    target: "rank",
    title: "Ranks are earned",
    body: "18 ranks from Intern I to Fund Manager III. Leaving a live level is a forfeit and only first attempts count on the leaderboards, so trade like it's real.",
    art: "ranks",
  },
];

/** Spotlight rectangle for a [data-tour] target (first visible match). */
function useTargetRect(target: string | undefined, step: number) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    const find = () => {
      if (!target) return setRect(null);
      const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`));
      const el = els.find((e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    find();
    window.addEventListener("resize", find);
    window.addEventListener("scroll", find, true);
    return () => {
      window.removeEventListener("resize", find);
      window.removeEventListener("scroll", find, true);
    };
  }, [target, step]);
  return rect;
}

export function WebGuide({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const s = STEPS[step]!;
  const rect = useTargetRect(s.target, step);
  const last = step === STEPS.length - 1;

  const finish = (start: boolean) => {
    markSeen();
    onDone();
    if (start) navigate({ to: "/play/$levelId", params: { levelId: "t1-candles-tutorial" }, search: { mode: "campaign" } });
  };

  // Escape skips the tour.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Card sits next to the spotlight (below it, or above when near the bottom), else centred.
  const card = useMemo(() => {
    // Plain coordinates (the enter animation owns the CSS transform, so no translate-centering).
    const w = Math.min(360, window.innerWidth - 32);
    const centreLeft = (window.innerWidth - w) / 2;
    if (!rect) return { top: Math.max(16, window.innerHeight / 2 - 230), left: centreLeft };
    const below = rect.bottom + 16 + 330 < window.innerHeight;
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - w / 2), window.innerWidth - w - 16);
    return below ? { top: rect.bottom + 16, left } : { top: Math.max(16, rect.top - 16 - 330), left };
  }, [rect]);

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Quick guide">
      {/* Dimmed backdrop with a spotlight hole */}
      <AnimatePresence>
        {rect ? (
          <motion.div
            key={`spot-${step}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16 }}
            className="pointer-events-none absolute rounded-xl ring-2 ring-electric"
            style={{ boxShadow: "0 0 0 9999px rgba(3,6,15,0.78)" }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          />
        ) : (
          <motion.div key="dim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[rgba(3,6,15,0.78)]" />
        )}
      </AnimatePresence>

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="panel absolute w-[360px] max-w-[calc(100vw-32px)] p-5 shadow-2xl"
        style={card}
      >
        <button onClick={() => finish(false)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" aria-label="Skip guide">
          <X className="h-4 w-4" />
        </button>
        <p className="font-num text-[11px] text-electric">
          QUICK GUIDE · {step + 1}/{STEPS.length}
        </p>
        {s.art && <GuideArt art={s.art} />}
        <h2 className="mt-2 text-lg font-bold">{s.title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
        <div className="mt-3 flex gap-1">
          {STEPS.map((_, k) => (
            <span key={k} className={`h-1 flex-1 rounded-full ${k <= step ? "bg-electric" : "bg-secondary"}`} />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={() => finish(false)} className="text-sm text-muted-foreground hover:text-foreground">
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-semibold">
                Back
              </button>
            )}
            {last ? (
              <button onClick={() => finish(true)} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
                Start Level 1
              </button>
            ) : (
              <button onClick={() => setStep(step + 1)} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
                Next
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function GuideArt({ art }: { art: NonNullable<Step["art"]> }) {
  const candle = useMemo(() => (art === "candle" ? closeUp("engulfing-bull", "k", 10, 0) : null), [art]);
  if (art === "candle" && candle)
    return (
      <div className="mt-3">
        <CandleFormation candles={candle.candles} k={candle.k} len={2} label="Bullish engulfing" tone="up" source={candle.source} />
      </div>
    );
  if (art === "loop") return <LoopArt />;
  if (art === "ranks")
    return (
      <div className="mt-3 flex items-end justify-center gap-2">
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <motion.div key={k} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.12 }}>
            <RankBadge index={k} size={24 + k * 5} />
          </motion.div>
        ))}
      </div>
    );
  // welcome: a few real-looking candles rising in
  return (
    <svg viewBox="0 0 320 90" className="mt-3 w-full rounded-lg bg-terminal">
      {[30, 42, 38, 55, 50, 64, 60, 72, 68, 80].map((h, k) => {
        const up = k % 3 !== 2;
        const col = up ? "var(--color-up)" : "var(--color-down)";
        return (
          <motion.g key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * k }}>
            <line x1={20 + k * 30} x2={20 + k * 30} y1={90 - h - 10} y2={90 - h + 22} stroke={col} strokeWidth={1.5} />
            <rect x={13 + k * 30} y={90 - h} width={14} height={16} rx={2} fill={col} />
          </motion.g>
        );
      })}
    </svg>
  );
}

function LoopArt() {
  const phases = ["Replay", "Mark", "Trade", "Questions", "Result"];
  const [k, setK] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setK((x) => (x + 1) % phases.length), 900);
    return () => clearInterval(iv);
  }, [phases.length]);
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-1.5 rounded-lg bg-terminal p-3">
      {phases.map((p, j) => (
        <motion.span
          key={p}
          animate={{ scale: j === k ? 1.08 : 1, opacity: j <= k ? 1 : 0.4 }}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${j === k ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
        >
          {p}
        </motion.span>
      ))}
    </div>
  );
}

// Animated SVG example chart for tutorials. Candles draw in one by one, then
// the step's concept layers (swings, BOS line, pullback, trade plan) fade in.
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { Level } from "@/types/game";
import type { TutorialStep } from "@/data/tutorials";

const W = 560;
const H = 260;
const PAD = 16;

export function TutorialExample({ level, step }: { level: Level; step: TutorialStep }) {
  // Key points come from the level's answer key (by id, or by mark type on newer levels).
  const bull = level.correctDirection === "buy";
  const swing =
    level.answerKey.find((a) => a.id === "k-swing") ??
    level.answerKey.find((a) => a.type === "SWING_HIGH" || a.type === "SWING_LOW") ?? { i1: 0, p1: level.candles[0]!.c };
  const bos = level.answerKey.find((a) => a.id === "k-bos") ?? level.answerKey.find((a) => a.type === "BOS");
  const breakIdx = bos?.i2 ?? level.decisionIndex;
  // The pullback: the extreme between the swing and the break (lowest low for a buy).
  const pull = level.answerKey.find((a) => a.id === "k-pull") ?? (() => {
    let i1 = Math.min(swing.i1 + 1, breakIdx);
    for (let i = swing.i1 + 1; i < breakIdx; i++) {
      const c = level.candles[i]!;
      if (bull ? c.l < level.candles[i1]!.l : c.h > level.candles[i1]!.h) i1 = i;
    }
    return { i1, p1: bull ? level.candles[i1]!.l : level.candles[i1]!.h };
  })();

  const target =
    step.revealTo === "swing"
      ? swing.i1 + 1
      : step.revealTo === "pullback"
        ? pull.i1 + 1
        : step.revealTo === "break"
          ? breakIdx + 1
          : level.candles.length;

  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount((c) => Math.min(c, target));
    const iv = setInterval(() => {
      setCount((c) => {
        if (c >= target) {
          clearInterval(iv);
          return c;
        }
        return c + 1;
      });
    }, 70);
    return () => clearInterval(iv);
  }, [target]);

  const { x, y, cw } = useMemo(() => {
    const cs = level.candles;
    const hi = Math.max(...cs.map((c) => c.h));
    const lo = Math.min(...cs.map((c) => c.l));
    const span = hi - lo || 1;
    const step = (W - PAD * 2) / cs.length;
    return {
      x: (i: number) => PAD + i * step + step / 2,
      y: (p: number) => PAD + ((hi - p) / span) * (H - PAD * 2),
      cw: Math.max(3, step * 0.6),
    };
  }, [level]);

  const done = count >= target;
  const show = (l: TutorialStep["show"][number]) => done && step.show.includes(l);
  const entry = level.candles[level.decisionIndex]!.c;
  const risk = Math.abs(entry - pull.p1);
  const tp = entry + risk * 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-terminal">
      {show("trade") && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <rect x={x(level.decisionIndex)} y={y(tp)} width={W - x(level.decisionIndex)} height={y(entry) - y(tp)} fill="var(--color-up)" opacity={0.12} />
          <rect x={x(level.decisionIndex)} y={y(entry)} width={W - x(level.decisionIndex)} height={y(pull.p1) - y(entry)} fill="var(--color-down)" opacity={0.12} />
          <line x1={x(level.decisionIndex)} x2={W} y1={y(entry)} y2={y(entry)} stroke="var(--color-electric)" strokeWidth={1.5} />
          <line x1={x(level.decisionIndex)} x2={W} y1={y(tp)} y2={y(tp)} stroke="var(--color-up)" strokeDasharray="5 4" />
          <line x1={x(level.decisionIndex)} x2={W} y1={y(pull.p1)} y2={y(pull.p1)} stroke="var(--color-down)" strokeDasharray="5 4" />
          <text x={W - 6} y={y(tp) - 4} textAnchor="end" className="font-num" fontSize={10} fill="var(--color-up)">TP 2R</text>
          <text x={W - 6} y={y(pull.p1) + 12} textAnchor="end" className="font-num" fontSize={10} fill="var(--color-down)">SL</text>
        </motion.g>
      )}
      {level.candles.slice(0, count).map((c) => {
        const up = c.c >= c.o;
        const color = up ? "var(--color-up)" : "var(--color-down)";
        return (
          <g key={c.i}>
            <line x1={x(c.i)} x2={x(c.i)} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth={1} />
            <rect x={x(c.i) - cw / 2} y={y(Math.max(c.o, c.c))} width={cw} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} fill={color} />
          </g>
        );
      })}
      {show("swings") && (
        <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
          <circle cx={x(swing.i1)} cy={y(swing.p1)} r={7} fill="var(--color-mark-player)" />
          <text x={x(swing.i1)} y={y(swing.p1) - 12} textAnchor="middle" fontSize={11} fill="var(--color-mark-player)" fontWeight={600}>
            Swing high
          </text>
        </motion.g>
      )}
      {show("pullback") && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <circle cx={x(pull.i1)} cy={y(pull.p1)} r={7} fill="var(--color-mark-player)" />
          <text x={x(pull.i1)} y={y(pull.p1) + 20} textAnchor="middle" fontSize={11} fill="var(--color-mark-player)" fontWeight={600}>
            Pullback low
          </text>
        </motion.g>
      )}
      {show("bos") && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.line
            x1={x(swing.i1)}
            y1={y(swing.p1)}
            y2={y(swing.p1)}
            initial={{ x2: x(swing.i1) }}
            animate={{ x2: x(breakIdx) }}
            transition={{ duration: 0.6 }}
            stroke="var(--color-electric)"
            strokeWidth={2}
          />
          <text x={(x(swing.i1) + x(breakIdx)) / 2} y={y(swing.p1) - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-electric)">
            BOS
          </text>
        </motion.g>
      )}
    </svg>
  );
}

// Animated walkthrough of a strategy's real tutorial chart: candles draw in one by
// one, then the answer (the marks a trader would make) appears, then the trade plan,
// and finally what the real market did next.
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import type { AnswerMark, Level } from "@/types/game";

const W = 640;
const H = 300;
const PAD = 16;

export type WalkLayer = "marks" | "trade" | "outcome";

const MARK_LABEL: Record<AnswerMark["type"], string> = {
  SWING_HIGH: "swing high",
  SWING_LOW: "swing low",
  BOS: "break",
  SR_LINE: "level",
  FVG: "fair value gap",
  ORDER_BLOCK: "order block",
  PATTERN: "signal candle",
};

export function LevelWalkthrough({ level, show, caption }: { level: Level; show: WalkLayer[]; caption?: string }) {
  const end = show.includes("outcome") ? level.candles.length : level.decisionIndex + 1;
  const [run, setRun] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Start from where the previous step left off (only the new part animates).
    setCount((c) => (c > end ? 0 : Math.max(0, Math.min(c, level.decisionIndex + 1))));
    const iv = setInterval(() => {
      setCount((c) => {
        if (c >= end) {
          clearInterval(iv);
          return c;
        }
        return c + 1;
      });
    }, 55);
    return () => clearInterval(iv);
  }, [end, run, level]);

  const { x, y, cw } = useMemo(() => {
    const cs = level.candles.slice(0, show.includes("outcome") ? level.candles.length : level.decisionIndex + 8);
    const hi = Math.max(...cs.map((c) => c.h));
    const lo = Math.min(...cs.map((c) => c.l));
    const span = hi - lo || 1;
    const n = level.candles.length;
    const step = (W - PAD * 2 - 50) / n;
    return {
      x: (i: number) => PAD + i * step + step / 2,
      y: (p: number) => PAD + 8 + ((hi - p) / span) * (H - PAD * 2 - 16),
      cw: Math.max(2.5, Math.min(12, step * 0.62)),
    };
  }, [level, show]);

  const ready = count >= Math.min(end, level.decisionIndex + 1);
  const k = level.decisionIndex;
  const entry = level.candles[k]!.c;
  const sl = (level.logicalSL.min + level.logicalSL.max) / 2;
  const tp = entry + 2 * (entry - sl);
  const buy = level.correctDirection === "buy";

  const markEl = (m: AnswerMark, j: number) => {
    const col = "var(--color-mark-correct)";
    const label = MARK_LABEL[m.type];
    switch (m.type) {
      case "SWING_HIGH":
      case "SWING_LOW": {
        const below = m.type === "SWING_LOW";
        return (
          <g key={j}>
            <circle cx={x(m.i1)} cy={y(m.p1)} r={5} fill={col} />
            <text x={x(m.i1)} y={y(m.p1) + (below ? 16 : -9)} textAnchor="middle" fontSize={10} fontWeight={700} fill={col}>
              {below ? "low" : "high"}
            </text>
          </g>
        );
      }
      case "PATTERN": {
        const c = level.candles[m.i1]!;
        return (
          <g key={j}>
            <rect x={x(m.i1) - cw / 2 - 5} y={y(c.h) - 6} width={cw + 10} height={y(c.l) - y(c.h) + 12} rx={5} fill="none" stroke={col} strokeWidth={2} strokeDasharray="4 3" />
            <text x={x(m.i1)} y={y(c.h) - 10} textAnchor="middle" fontSize={10} fontWeight={700} fill={col}>
              {label}
            </text>
          </g>
        );
      }
      case "SR_LINE":
      case "BOS": {
        const i2 = m.i2 ?? k;
        return (
          <g key={j}>
            <line x1={x(m.i1)} x2={x(i2)} y1={y(m.p1)} y2={y(m.p1)} stroke={col} strokeWidth={2} strokeDasharray={m.type === "SR_LINE" ? "6 4" : undefined} />
            <text x={(x(m.i1) + x(i2)) / 2} y={y(m.p1) - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill={col}>
              {label}
            </text>
          </g>
        );
      }
      case "FVG":
      case "ORDER_BLOCK": {
        const top = Math.max(m.p1, m.p2 ?? m.p1);
        const bot = Math.min(m.p1, m.p2 ?? m.p1);
        const i2 = m.i2 ?? k;
        const c = m.type === "FVG" ? "var(--color-electric)" : col;
        return (
          <g key={j}>
            <rect x={x(m.i1) - cw} y={y(top)} width={x(i2) - x(m.i1) + cw * 2} height={Math.max(3, y(bot) - y(top))} fill={c} opacity={0.18} stroke={c} rx={2} />
            <text x={x(m.i1) - cw + 3} y={y(top) - 5} fontSize={10} fontWeight={700} fill={c}>
              {label}
            </text>
          </g>
        );
      }
    }
  };

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-terminal">
        {level.source && (
          <text x={PAD} y={13} fontSize={9.5} fontWeight={600} fill="var(--color-gold)">
            Real chart · {level.source.label} · {level.source.timeframe}
          </text>
        )}
        {show.includes("trade") && ready && (
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <rect x={x(k)} y={Math.min(y(entry), y(tp))} width={W - 50 - x(k)} height={Math.abs(y(tp) - y(entry))} fill="var(--color-up)" opacity={0.12} />
            <rect x={x(k)} y={Math.min(y(entry), y(sl))} width={W - 50 - x(k)} height={Math.abs(y(sl) - y(entry))} fill="var(--color-down)" opacity={0.12} />
            {[
              [entry, "entry", "var(--color-electric)"],
              [sl, "stop", "var(--color-down)"],
              [tp, "2R target", "var(--color-up)"],
            ].map(([p, t, c]) => (
              <g key={t as string}>
                <line x1={x(k)} x2={W - 50} y1={y(p as number)} y2={y(p as number)} stroke={c as string} strokeWidth={1.4} strokeDasharray={t === "entry" ? undefined : "5 4"} />
                <text x={W - 48} y={y(p as number) + 3} fontSize={9.5} fontWeight={700} fill={c as string}>
                  {t as string}
                </text>
              </g>
            ))}
          </motion.g>
        )}
        {level.candles.slice(0, count).map((c) => {
          const col = c.c >= c.o ? "var(--color-up)" : "var(--color-down)";
          const faded = c.i > k;
          return (
            <g key={c.i} opacity={faded ? 0.95 : 1}>
              <line x1={x(c.i)} x2={x(c.i)} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth={1} />
              <rect x={x(c.i) - cw / 2} y={y(Math.max(c.o, c.c))} width={cw} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} fill={col} />
            </g>
          );
        })}
        {count > k && <line x1={x(k) + cw} x2={x(k) + cw} y1={PAD} y2={H - PAD} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" strokeWidth={0.8} />}
        {show.includes("marks") && ready && (
          <motion.g initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            {level.answerKey.map(markEl)}
          </motion.g>
        )}
        {show.includes("outcome") && count >= level.candles.length && (
          <motion.text initial={{ opacity: 0 }} animate={{ opacity: 1 }} x={W - 60} y={H - 10} textAnchor="end" fontSize={11} fontWeight={700} fill={buy ? "var(--color-up)" : "var(--color-down)"}>
            what really happened next →
          </motion.text>
        )}
      </svg>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-electric">{caption ?? (ready ? "" : "Replaying the real chart…")}</p>
        <button
          onClick={() => {
            setCount(0);
            setRun((r) => r + 1);
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Replay
        </button>
      </div>
    </div>
  );
}

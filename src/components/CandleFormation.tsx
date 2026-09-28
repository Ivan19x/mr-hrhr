// Animated candle formation for tutorials, using real chart candles.
// Earlier candles draw in one by one, then the key candle forms tick by tick:
// it opens, its wick stretches as one side pushes, the other side fights back,
// and it closes. A caption narrates each phase, then the pattern is ringed.
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import type { OHLC } from "@/data/academy/build";

const W = 560;
const H = 280;
const PAD = 18;
const FORM_FRAMES = 90; // frames for the key candle to form
const FRAME_MS = 33;

type Props = {
  candles: OHLC[];
  /** Index of the candle that completes the pattern (it forms live). */
  k: number;
  /** Candles in the pattern (1–3), ringed at the end. */
  len?: number;
  label: string;
  tone: "up" | "down";
  /** Show only the key candle, large (for "how a single candle forms"). */
  single?: boolean | undefined;
  source?: string | undefined;
};

/** Price path inside one candle: the extreme nearest the open comes first. */
function formationPath([o, h, l, c]: OHLC): { p: number; phase: string }[] {
  const lowFirst = o - l > h - o || (c > o && o - l >= (h - c) * 0.8);
  const legs: [number, string][] = lowFirst
    ? [
        [o, "Opens"],
        [l, "Sellers push price down…"],
        [h, "Buyers throw it back up…"],
        [c, "Closes"],
      ]
    : [
        [o, "Opens"],
        [h, "Buyers push price up…"],
        [l, "Sellers slam it back down…"],
        [c, "Closes"],
      ];
  // Split the frames across the three moves in proportion to their distance.
  const dists = [Math.abs(legs[1]![0] - legs[0]![0]), Math.abs(legs[2]![0] - legs[1]![0]), Math.abs(legs[3]![0] - legs[2]![0])];
  const total = dists.reduce((s, d) => s + d, 0) || 1;
  const out: { p: number; phase: string }[] = [];
  dists.forEach((d, seg) => {
    const n = Math.max(8, Math.round((d / total) * FORM_FRAMES));
    const [a, phase] = [legs[seg]![0], legs[seg + 1]![1]];
    const b = legs[seg + 1]![0];
    for (let f = 1; f <= n; f++) {
      const t = f / n;
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      out.push({ p: a + (b - a) * ease, phase });
    }
  });
  out.push({ p: c, phase: "Closed" });
  return out;
}

export function CandleFormation({ candles: all, k, len = 1, label, tone, single = false, source }: Props) {
  const candles = useMemo(() => (single ? [all[k]!] : all.slice(0, k + 1)), [all, k, single]);
  const key = single ? 0 : k;
  const path = useMemo(() => formationPath(candles[key]!), [candles, key]);
  const [run, setRun] = useState(0);
  const [shown, setShown] = useState(0); // fully drawn candles before the key candle
  const [frame, setFrame] = useState(-1); // forming frame of the key candle

  useEffect(() => {
    setShown(0);
    setFrame(-1);
    let n = 0;
    let f = -1;
    let formIv: ReturnType<typeof setInterval> | undefined;
    let wait: ReturnType<typeof setTimeout> | undefined;
    // Phase 1: earlier candles draw in one by one. Phase 2: the key candle forms.
    const form = () => {
      formIv = setInterval(() => {
        if (f < path.length - 1) setFrame(++f);
        else clearInterval(formIv);
      }, FRAME_MS);
    };
    const revealIv = setInterval(() => {
      if (n < key) setShown(++n);
      else {
        clearInterval(revealIv);
        wait = setTimeout(form, 350);
      }
    }, 70);
    return () => {
      clearInterval(revealIv);
      if (formIv) clearInterval(formIv);
      if (wait) clearTimeout(wait);
    };
  }, [run, key, path, single]);

  const { x, y, cw } = useMemo(() => {
    const hi = Math.max(...candles.map((c) => c[1]));
    const lo = Math.min(...candles.map((c) => c[2]));
    const span = hi - lo || 1;
    const n = single ? 1 : candles.length + 2;
    const step = (W - PAD * 2 - 60) / n;
    return {
      x: (i: number) => (single ? W / 2 - 30 : PAD + i * step + step / 2),
      y: (p: number) => PAD + 10 + ((hi - p) / span) * (H - PAD * 2 - 30),
      cw: single ? 46 : Math.max(4, Math.min(18, step * 0.62)),
    };
  }, [candles, single]);

  // The forming candle so far.
  const forming = useMemo(() => {
    if (frame < 0) return null;
    const pts = path.slice(0, frame + 1).map((s) => s.p);
    const o = candles[key]![0];
    const cur = pts[pts.length - 1]!;
    return { o, h: Math.max(o, ...pts), l: Math.min(o, ...pts), c: cur, phase: path[frame]!.phase };
  }, [frame, path, candles, key]);
  const done = frame >= path.length - 1;
  const col = (o: number, c: number) => (c >= o ? "var(--color-up)" : "var(--color-down)");

  const drawCandle = (i: number, o: number, h: number, l: number, c: number, glow = false) => (
    <g key={i}>
      <line x1={x(i)} x2={x(i)} y1={y(h)} y2={y(l)} stroke={col(o, c)} strokeWidth={single ? 3 : 1.3} />
      <rect x={x(i) - cw / 2} y={y(Math.max(o, c))} width={cw} height={Math.max(1.5, Math.abs(y(o) - y(c)))} fill={col(o, c)} rx={single ? 3 : 1} style={glow ? { filter: "drop-shadow(0 0 6px var(--color-electric))" } : undefined} />
    </g>
  );

  const ringLo = Math.min(...candles.slice(key - len + 1, key + 1).map((c) => c[2]));
  const ringHi = Math.max(...candles.slice(key - len + 1, key + 1).map((c) => c[1]));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-terminal">
        {source && (
          <text x={PAD} y={14} fontSize={9.5} fontWeight={600} fill="var(--color-gold)">
            {source}
          </text>
        )}
        {candles.slice(0, shown).map((c, i) => (i === key ? null : drawCandle(i, c[0], c[1], c[2], c[3])))}
        {forming && drawCandle(key, forming.o, forming.h, forming.l, forming.c, !done)}

        {/* Live price line and OHLC labels while forming */}
        {forming && !done && (
          <g>
            <line x1={PAD} x2={W - 60} y1={y(forming.c)} y2={y(forming.c)} stroke="var(--color-electric)" strokeDasharray="3 3" strokeWidth={0.8} />
            <rect x={W - 58} y={y(forming.c) - 8} width={52} height={16} rx={3} fill="var(--color-electric)" />
            <text x={W - 32} y={y(forming.c) + 4} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="var(--color-electric-foreground)" className="font-num">
              {forming.c.toPrecision(6)}
            </text>
          </g>
        )}
        {single && forming && (
          <g fontSize={11} fontWeight={600}>
            <text x={x(0) + cw / 2 + 10} y={y(forming.o) + 4} fill="var(--color-muted-foreground)">Open</text>
            <text x={x(0) - cw / 2 - 10} y={y(forming.h) + 4} textAnchor="end" fill="var(--color-muted-foreground)">High</text>
            <text x={x(0) - cw / 2 - 10} y={y(forming.l) + 4} textAnchor="end" fill="var(--color-muted-foreground)">Low</text>
            {done && (
              <motion.text initial={{ opacity: 0 }} animate={{ opacity: 1 }} x={x(0) + cw / 2 + 10} y={y(forming.c) + 4} fill={col(forming.o, forming.c)}>
                Close
              </motion.text>
            )}
          </g>
        )}

        {/* Pattern ring + label once the candle has closed */}
        {done && (
          <motion.g initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <rect
              x={x(key - len + 1) - cw / 2 - 7}
              y={y(ringHi) - 8}
              width={x(key) - x(key - len + 1) + cw + 14}
              height={y(ringLo) - y(ringHi) + 16}
              rx={8}
              fill="none"
              stroke={tone === "up" ? "var(--color-up)" : "var(--color-down)"}
              strokeWidth={2}
              strokeDasharray="5 3"
            />
            <text
              x={(x(key - len + 1) + x(key)) / 2}
              y={tone === "up" ? y(ringLo) + 24 : y(ringHi) - 14}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              fill={tone === "up" ? "var(--color-up)" : "var(--color-down)"}
            >
              {label}
            </text>
          </motion.g>
        )}
      </svg>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-electric">
          {frame < 0 ? (key > 0 ? "Price action so far…" : "Waiting for the open…") : forming?.phase === "Closed" ? `Closed: ${label}` : forming?.phase}
        </p>
        <button onClick={() => setRun((r) => r + 1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <RotateCcw className="h-3.5 w-3.5" /> Replay
        </button>
      </div>
    </div>
  );
}

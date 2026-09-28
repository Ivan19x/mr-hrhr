// Static SVG chart for lessons: candles or a line, overlays (MAs, bands),
// annotations (labels, levels, zones, arrows, trendlines), volume and an
// indicator pane (RSI / MACD). Theme-aware via CSS variables.
import type { DiagramSpec, Note, Pane, Series, Tone } from "@/data/academy/types";

const W = 640;
const PAD_L = 12;
const PAD_R = 64;

export const TONE: Record<Tone, string> = {
  up: "var(--color-up)",
  down: "var(--color-down)",
  electric: "var(--color-electric)",
  gold: "var(--color-gold)",
  player: "var(--color-mark-player)",
  muted: "var(--color-muted-foreground)",
  purple: "#a78bfa",
};

function range(values: (number | null | undefined)[]) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v == null || !Number.isFinite(v)) continue;
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  if (!Number.isFinite(lo)) return { lo: 0, hi: 1 };
  if (hi === lo) return { lo: lo - 1, hi: hi + 1 };
  return { lo, hi };
}

/** Enough decimals that neighbouring grid labels differ (forex needs 4–5). */
function fmt(v: number, step = 0) {
  const a = Math.abs(v);
  let dp = a >= 1000 ? 0 : a >= 10 ? 1 : 2;
  if (step > 0) dp = Math.max(dp, Math.min(6, Math.ceil(-Math.log10(step)) + 1));
  return v.toFixed(dp);
}

export function Diagram({ spec, className = "" }: { spec: DiagramSpec; className?: string }) {
  const n = spec.candles?.length ?? spec.line?.length ?? 0;
  const mainH = spec.height ?? 220;
  const volH = spec.volume ? 44 : 0;
  const paneH = spec.pane ? 96 : 0;
  const H = mainH + volH + paneH + (paneH ? 10 : 0) + 18;

  // Price range from data + notes + overlays.
  const vals: number[] = [];
  spec.candles?.forEach(([, h, l]) => vals.push(h, l));
  spec.line?.forEach((v) => vals.push(v));
  spec.overlays?.forEach((s) => s.values.forEach((v) => v != null && vals.push(v)));
  spec.notes?.forEach((nt) => {
    if ("p" in nt) vals.push(nt.p);
    if ("p1" in nt) vals.push(nt.p1);
    if ("p2" in nt) vals.push(nt.p2);
  });
  const r = range(vals);
  const pad = (r.hi - r.lo) * (spec.pad ?? 0.12);
  const lo = r.lo - pad;
  const hi = r.hi + pad;

  const plotW = W - PAD_L - PAD_R;
  const step = plotW / Math.max(n, 1);
  const x = (i: number) => PAD_L + i * step + step / 2;
  const y = (p: number) => 8 + ((hi - p) / (hi - lo)) * (mainH - 16);
  const cw = Math.max(2.5, Math.min(18, step * 0.62));

  // Price gridlines (4 levels).
  const grid = Array.from({ length: 4 }, (_, k) => lo + ((hi - lo) * (k + 0.5)) / 4);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full rounded-lg bg-terminal ${className}`} role="img">
      <defs>
        <marker id="arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="context-stroke" />
        </marker>
      </defs>
      {grid.map((g, k) => (
        <g key={k}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(g)} y2={y(g)} stroke="var(--color-border)" strokeWidth={0.6} />
          <text x={W - PAD_R + 6} y={y(g) + 3} fontSize={9} fill="var(--color-muted-foreground)" className="font-num">
            {fmt(g, (hi - lo) / 4)}
          </text>
        </g>
      ))}

      {/* Zones behind the price */}
      {spec.notes?.filter((nt) => nt.k === "zone").map((nt, k) => renderNote(nt, k, x, y, W))}

      {/* Price */}
      {spec.line && (
        <polyline
          points={spec.line.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
          fill="none"
          stroke="var(--color-foreground)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}
      {spec.candles?.map(([o, h, l, c], i) => {
        const up = c >= o;
        const col = up ? TONE.up : TONE.down;
        const top = y(Math.max(o, c));
        const bh = Math.max(1.2, Math.abs(y(o) - y(c)));
        return (
          <g key={i}>
            <line x1={x(i)} x2={x(i)} y1={y(h)} y2={y(l)} stroke={col} strokeWidth={1.3} />
            <rect x={x(i) - cw / 2} y={top} width={cw} height={bh} fill={col} rx={1} />
          </g>
        );
      })}

      {spec.overlays?.map((s, k) => renderSeries(s, k, x, y))}
      {spec.notes?.filter((nt) => nt.k !== "zone").map((nt, k) => renderNote(nt, k + 100, x, y, W))}

      {/* Volume */}
      {spec.volume &&
        (() => {
          const vmax = Math.max(...spec.volume);
          const top = mainH;
          return (
            <g>
              <text x={PAD_L} y={top + 9} fontSize={9} fill="var(--color-muted-foreground)">
                Volume
              </text>
              {spec.volume.map((v, i) => {
                const hgt = (v / vmax) * (volH - 12);
                const cndl = spec.candles?.[i];
                const up = cndl ? cndl[3] >= cndl[0] : true;
                return (
                  <rect key={i} x={x(i) - cw / 2} y={top + volH - hgt} width={cw} height={hgt} fill={up ? TONE.up : TONE.down} opacity={0.45} />
                );
              })}
            </g>
          );
        })()}

      {spec.pane && renderPane(spec.pane, mainH + volH + 10, paneH, x, W, n)}
      {spec.source && (
        <g>
          <rect x={PAD_L} y={4} width={spec.source.length * 5.1 + 12} height={15} rx={4} fill="var(--color-card)" opacity={0.85} />
          <text x={PAD_L + 6} y={14.5} fontSize={9.5} fontWeight={600} fill="var(--color-gold)">
            {spec.source}
          </text>
        </g>
      )}
    </svg>
  );
}

function renderSeries(s: Series, k: number, x: (i: number) => number, y: (p: number) => number) {
  const segs: string[][] = [];
  let cur: string[] = [];
  s.values.forEach((v, i) => {
    if (v == null) {
      if (cur.length) segs.push(cur);
      cur = [];
    } else cur.push(`${x(i)},${y(v)}`);
  });
  if (cur.length) segs.push(cur);
  const lastIdx = s.values.length - 1 - [...s.values].reverse().findIndex((v) => v != null);
  const last = s.values[lastIdx];
  return (
    <g key={`s${k}`}>
      {segs.map((pts, j) => (
        <polyline key={j} points={pts.join(" ")} fill="none" stroke={TONE[s.color]} strokeWidth={1.6} strokeDasharray={s.dash ? "4 3" : undefined} />
      ))}
      {s.label && last != null && (
        <text x={x(lastIdx) + 4} y={y(last) - 4} fontSize={9.5} fontWeight={600} fill={TONE[s.color]}>
          {s.label}
        </text>
      )}
    </g>
  );
}

function renderPane(p: Pane, top: number, h: number, x: (i: number) => number, W: number, n: number) {
  const vals: (number | null)[] = [];
  p.series?.forEach((s) => vals.push(...s.values));
  p.bars?.values.forEach((v) => vals.push(v, 0));
  p.levels?.forEach((l) => vals.push(l.v));
  const r = range(vals);
  const lo = p.min ?? r.lo - (r.hi - r.lo) * 0.1;
  const hi = p.max ?? r.hi + (r.hi - r.lo) * 0.1;
  const y = (v: number) => top + 4 + ((hi - v) / (hi - lo)) * (h - 8);
  const step = (W - PAD_L - PAD_R) / Math.max(n, 1);
  const bw = Math.max(2, step * 0.55);
  return (
    <g>
      <rect x={PAD_L} y={top} width={W - PAD_L - PAD_R} height={h} fill="var(--color-card)" opacity={0.5} rx={4} />
      <text x={PAD_L + 6} y={top + 12} fontSize={9.5} fontWeight={600} fill="var(--color-muted-foreground)">
        {p.label}
      </text>
      {p.levels?.map((l, k) => (
        <g key={k}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(l.v)} y2={y(l.v)} stroke={TONE[l.color ?? "muted"]} strokeDasharray="3 3" strokeWidth={0.8} />
          <text x={W - PAD_R + 6} y={y(l.v) + 3} fontSize={9} fill={TONE[l.color ?? "muted"]}>
            {l.text ?? fmt(l.v)}
          </text>
        </g>
      ))}
      {p.bars?.values.map((v, i) =>
        v == null ? null : (
          <rect
            key={i}
            x={x(i) - bw / 2}
            y={Math.min(y(v), y(0))}
            width={bw}
            height={Math.max(0.8, Math.abs(y(v) - y(0)))}
            fill={p.bars!.color ? TONE[p.bars!.color] : v >= 0 ? TONE.up : TONE.down}
            opacity={0.6}
          />
        ),
      )}
      {p.series?.map((s, k) => renderSeries(s, k + 50, x, y))}
      {p.notes?.map((nt, k) => renderNote(nt, k + 200, x, y, W))}
    </g>
  );
}

function renderNote(nt: Note, k: number, x: (i: number) => number, y: (p: number) => number, W: number) {
  const col = TONE[("color" in nt && nt.color) || "electric"];
  switch (nt.k) {
    case "zone": {
      const top = Math.min(y(nt.p1), y(nt.p2));
      const hgt = Math.abs(y(nt.p1) - y(nt.p2));
      const x1 = x(nt.i1) - 6;
      const x2 = x(nt.i2) + 6;
      return (
        <g key={k}>
          <rect x={x1} y={top} width={x2 - x1} height={Math.max(3, hgt)} fill={col} opacity={0.14} stroke={col} strokeOpacity={0.5} rx={2} />
          {nt.text && (
            <text x={x1 + 4} y={top - 4} fontSize={10} fontWeight={600} fill={col}>
              {nt.text}
            </text>
          )}
        </g>
      );
    }
    case "hline": {
      const x1 = nt.i1 !== undefined ? x(nt.i1) : PAD_L;
      const x2 = nt.i2 !== undefined ? x(nt.i2) : W - PAD_R;
      return (
        <g key={k}>
          <line x1={x1} x2={x2} y1={y(nt.p)} y2={y(nt.p)} stroke={col} strokeWidth={1.4} strokeDasharray={nt.dash ? "5 4" : undefined} />
          {nt.text && (
            <text x={x2 - 2} y={y(nt.p) - 4} fontSize={10} fontWeight={600} fill={col} textAnchor="end">
              {nt.text}
            </text>
          )}
        </g>
      );
    }
    case "line":
      return (
        <g key={k}>
          <line x1={x(nt.i1)} y1={y(nt.p1)} x2={x(nt.i2)} y2={y(nt.p2)} stroke={col} strokeWidth={1.6} strokeDasharray={nt.dash ? "5 4" : undefined} />
          {nt.text && (
            <text x={(x(nt.i1) + x(nt.i2)) / 2} y={(y(nt.p1) + y(nt.p2)) / 2 - 6} fontSize={10} fontWeight={600} fill={col} textAnchor="middle">
              {nt.text}
            </text>
          )}
        </g>
      );
    case "arrow": {
      const y0 = y(nt.p);
      const dy = nt.dir === "up" ? 26 : -26;
      return (
        <g key={k}>
          <line x1={x(nt.i)} x2={x(nt.i)} y1={y0 + dy} y2={y0 + (nt.dir === "up" ? 4 : -4)} stroke={col} strokeWidth={2} markerEnd="url(#arrowhead)" />
          {nt.text && (
            <text x={x(nt.i)} y={y0 + dy + (nt.dir === "up" ? 12 : -5)} fontSize={10} fontWeight={600} fill={col} textAnchor="middle">
              {nt.text}
            </text>
          )}
        </g>
      );
    }
    case "dot":
      return (
        <g key={k}>
          <circle cx={x(nt.i)} cy={y(nt.p)} r={4.5} fill={col} />
          {nt.text && (
            <text x={x(nt.i)} y={y(nt.p) + (nt.pos === "below" ? 16 : -9)} fontSize={10} fontWeight={600} fill={col} textAnchor="middle">
              {nt.text}
            </text>
          )}
        </g>
      );
    case "label": {
      const pos = nt.pos ?? "above";
      const dx = pos === "left" ? -8 : pos === "right" ? 8 : 0;
      const dy = pos === "above" ? -8 : pos === "below" ? 14 : 3;
      const anchor = pos === "left" ? "end" : pos === "right" ? "start" : "middle";
      return (
        <text key={k} x={x(nt.i) + dx} y={y(nt.p) + dy} fontSize={10.5} fontWeight={600} fill={col} textAnchor={anchor}>
          {nt.text}
        </text>
      );
    }
    case "bracket": {
      const side = nt.side ?? "right";
      const bx = x(nt.i) + (side === "right" ? 16 : -16);
      const tick = side === "right" ? -4 : 4;
      return (
        <g key={k} stroke={col} fill="none" strokeWidth={1.2}>
          <path d={`M${bx + tick} ${y(nt.p1)} H${bx} V${y(nt.p2)} H${bx + tick}`} />
          <text
            x={bx + (side === "right" ? 5 : -5)}
            y={(y(nt.p1) + y(nt.p2)) / 2 + 3}
            fontSize={10}
            fontWeight={600}
            fill={col}
            stroke="none"
            textAnchor={side === "right" ? "start" : "end"}
          >
            {nt.text}
          </text>
        </g>
      );
    }
    case "vline":
      return (
        <g key={k}>
          <line x1={x(nt.i)} x2={x(nt.i)} y1={0} y2={2000} stroke={col} strokeDasharray="3 3" strokeWidth={1} />
          {nt.text && (
            <text x={x(nt.i) + 4} y={12} fontSize={10} fontWeight={600} fill={col}>
              {nt.text}
            </text>
          )}
        </g>
      );
  }
}

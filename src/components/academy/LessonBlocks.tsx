import { Eye, Lightbulb, AlertTriangle, KeyRound } from "lucide-react";
import type { Block } from "@/data/academy/types";
import { Diagram, TONE } from "./Diagram";
import { CandleLab, ChartTour, Expectancy, MarketMap, PositionSizer, Rich } from "./widgets";

const CALLOUT = {
  tip: { icon: Lightbulb, cls: "border-electric/40 bg-electric/5", iconCls: "text-electric", label: "Tip" },
  warn: { icon: AlertTriangle, cls: "border-gold/50 bg-gold/5", iconCls: "text-gold", label: "Careful" },
  key: { icon: KeyRound, cls: "border-up/40 bg-up/5", iconCls: "text-up", label: "Key idea" },
} as const;

export function LessonBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, k) => (
        <div key={k}>
          <BlockView b={b} />
        </div>
      ))}
    </div>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case "p":
      return (
        <p className="leading-relaxed text-muted-foreground">
          <Rich text={b.text} />
        </p>
      );
    case "h":
      return <h3 className="pt-2 text-lg font-bold">{b.text}</h3>;
    case "list": {
      const Tag = b.ordered ? "ol" : "ul";
      return (
        <Tag className={`space-y-1.5 pl-5 text-muted-foreground ${b.ordered ? "list-decimal" : "list-disc"} marker:text-electric`}>
          {b.items.map((it, k) => (
            <li key={k} className="leading-relaxed">
              <Rich text={it} />
            </li>
          ))}
        </Tag>
      );
    }
    case "diagram":
      return (
        <figure>
          <Diagram spec={b.spec} />
          {b.caption && <figcaption className="mt-2 text-center text-xs text-muted-foreground">{b.caption}</figcaption>}
        </figure>
      );
    case "gallery":
      return (
        <div className={`grid gap-3 ${b.items.length === 2 || b.items.length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {b.items.map((it, k) => (
            <div key={k} className="panel overflow-hidden">
              <Diagram spec={it.spec} className="rounded-none" />
              <div className="p-3">
                <p className="text-sm font-bold" style={{ color: TONE[it.tone ?? "electric"] }}>
                  {it.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  <Rich text={it.text} />
                </p>
              </div>
            </div>
          ))}
        </div>
      );
    case "callout": {
      const c = CALLOUT[b.tone];
      const Icon = c.icon;
      return (
        <div className={`flex gap-3 rounded-lg border p-4 text-sm leading-relaxed ${c.cls}`}>
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${c.iconCls}`} />
          <p className="text-muted-foreground">
            <Rich text={b.text} />
          </p>
        </div>
      );
    }
    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                {b.head.map((h, k) => (
                  <th key={k} className="px-3 py-2 text-left font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, k) => (
                <tr key={k} className="border-t border-border">
                  {r.map((c, j) => (
                    <td key={j} className={`px-3 py-2 align-top ${j === 0 ? "font-medium" : "text-muted-foreground"}`}>
                      <Rich text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "flow":
      return (
        <ol className="relative space-y-3 border-l-2 border-electric/40 pl-5">
          {b.steps.map((s, k) => (
            <li key={k} className="relative">
              <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-electric" />
              <p className="font-semibold">{s.title}</p>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      );
    case "spot":
      return (
        <div className="rounded-lg border border-mark-player/40 bg-mark-player/5 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-mark-player">
            <Eye className="h-4 w-4" /> How to spot it on the chart
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {b.items.map((s, k) => (
              <li key={k} className="flex gap-2">
                <span className="text-mark-player">✓</span>
                <span>
                  <Rich text={s} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "bars": {
      const max = Math.max(...b.values.map((v) => Math.abs(v))) || 1;
      const neg = b.values.some((v) => v < 0);
      const H = 150;
      const zero = neg ? H / 2 : H;
      const w = 100 / b.values.length;
      return (
        <figure>
          <svg viewBox={`0 0 100 ${H + 16}`} preserveAspectRatio="none" className="h-48 w-full rounded-lg bg-terminal" role="img">
            <line x1={0} x2={100} y1={zero} y2={zero} stroke="var(--color-border)" strokeWidth={0.3} vectorEffect="non-scaling-stroke" />
            {b.values.map((v, k) => {
              const h = (Math.abs(v) / max) * (neg ? H / 2 - 8 : H - 8);
              return <rect key={k} x={k * w + w * 0.18} width={w * 0.64} y={v >= 0 ? zero - h : zero} height={Math.max(0.5, h)} fill={v >= 0 ? TONE.up : TONE.down} opacity={0.75} />;
            })}
          </svg>
          <div className="mt-1 grid text-center text-[10px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${b.values.length}, minmax(0, 1fr))` }}>
            {b.labels.map((l, k) => (
              <span key={k}>
                {l}
                <br />
                <span className={`font-num ${b.values[k]! >= 0 ? "text-up" : "text-down"}`}>
                  {b.values[k]! >= 0 ? "+" : ""}
                  {b.values[k]!.toFixed(1)}
                  {b.unit ?? ""}
                </span>
              </span>
            ))}
          </div>
          {b.caption && <figcaption className="mt-2 text-center text-xs text-muted-foreground">{b.caption}</figcaption>}
        </figure>
      );
    }
    case "matrix":
      return (
        <figure>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-center text-[11px]">
              <thead>
                <tr>
                  <th className="bg-secondary px-1 py-1" />
                  {b.names.map((n) => (
                    <th key={n} className="bg-secondary px-1 py-1 font-semibold">
                      {n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.m.map((row, i) => (
                  <tr key={i}>
                    <th className="bg-secondary px-2 py-1 text-left font-semibold">{b.names[i]}</th>
                    {row.map((v, j) => (
                      <td
                        key={j}
                        className="font-num px-1 py-1"
                        style={{ background: `color-mix(in srgb, ${v >= 0 ? TONE.up : TONE.down} ${Math.round(Math.abs(v) * 70)}%, transparent)` }}
                      >
                        {v.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {b.caption && <figcaption className="mt-2 text-center text-xs text-muted-foreground">{b.caption}</figcaption>}
        </figure>
      );
    case "widget":
      return b.name === "candleLab" ? (
        <CandleLab />
      ) : b.name === "marketMap" ? (
        <MarketMap />
      ) : b.name === "chartTour" ? (
        <ChartTour />
      ) : b.name === "positionSizer" ? (
        <PositionSizer />
      ) : (
        <Expectancy />
      );
  }
}

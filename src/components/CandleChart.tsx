// Candlestick chart (Lightweight Charts) + custom SVG overlay for marks,
// zones, hint area, and draggable entry/SL/TP lines. The overlay stays synced
// to chart time/price coordinates across zoom and scroll.
import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  ColorType,
} from "lightweight-charts";
import type { Candle, Mark } from "@/types/game";

export type ChartColors = "classic" | "colorblind" | "mono";

const COLOR_SETS: Record<ChartColors, { up: string; down: string }> = {
  classic: { up: "#22c55e", down: "#ef4444" },
  colorblind: { up: "#3b82f6", down: "#f97316" },
  mono: { up: "#e5e7eb", down: "#4b5563" },
};

export type DragLineId = "entry" | "sl" | "tp";

export type OverlayLine = { id: DragLineId; price: number; color: string; label: string };

type Props = {
  candles: Candle[]; // visible slice
  chartColors: ChartColors;
  marks?: Mark[]; // player marks (blue)
  answerMarks?: Mark[]; // review: correct key marks (green)
  missedMarks?: Mark[]; // review: missed key marks (dashed green)
  wrongMarkIds?: Set<string> | undefined; // review: player marks that were wrong (red)
  hintArea?: { i1: number; i2: number; p1: number; p2: number };
  lines?: OverlayLine[]; // entry / SL / TP draggable lines
  bands?: { p1: number; p2: number; color: string }[]; // shaded risk/reward bands
  activeTool?: string | null;
  onChartTap?: (candleIndex: number, price: number) => void;
  onBoxDrag?: (i1: number, i2: number, p1: number, p2: number) => void;
  /** Line tools (BOS, S/R): drag from the start candle to the end candle. */
  onLineMark?: (i1: number, i2: number, p1: number) => void;
  /** Candle indexes to spotlight (e.g. the exit candle on result playback). */
  exitMarker?: { i: number; price: number; color: string } | undefined;
  onLineDrag?: (id: DragLineId, price: number) => void;
  height?: number;
};

export function CandleChart({
  candles,
  chartColors,
  marks = [],
  answerMarks = [],
  missedMarks = [],
  wrongMarkIds,
  hintArea,
  lines = [],
  bands = [],
  activeTool,
  onChartTap,
  onBoxDrag,
  onLineMark,
  onLineDrag,
  exitMarker,
  height = 420,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);
  const dragRef = useRef<
    | { kind: "box"; x0: number; y0: number }
    | { kind: "hline"; x0: number; y0: number }
    | { kind: "line"; id: DragLineId }
    | null
  >(null);
  const [dragBox, setDragBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [dragLine, setDragLine] = useState<{ x0: number; y0: number; x1: number } | null>(null);
  const lastLenRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Fit all candles until the player zooms or scrolls; then respect their view.
  const autoFitRef = useRef(true);
  // Hovered candle for the OHLC legend (null = show the latest candle).
  const [hover, setHover] = useState<number | null>(null);
  // Axis sizes: the marking overlay must not cover the price / time axes,
  // so they can still be dragged to stretch the chart like on broker platforms.
  const [axes, setAxes] = useState({ right: 60, bottom: 28 });

  // Coordinates settle after the chart repaints, so redraw on the next frame too.
  const redraw = useCallback(() => {
    setTick((t) => t + 1);
    requestAnimationFrame(() => {
      setTick((t) => t + 1);
      const chart = chartRef.current;
      if (chart) {
        const right = chart.priceScale("right").width();
        const bottom = chart.timeScale().height();
        setAxes((a) => (a.right === right && a.bottom === bottom ? a : { right, bottom }));
      }
    });
  }, []);

  // Create chart once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8b93a7",
        fontFamily: "JetBrains Mono, monospace",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(139,147,167,0.07)" },
        horzLines: { color: "rgba(139,147,167,0.07)" },
      },
      timeScale: {
        borderVisible: true,
        borderColor: "rgba(139,147,167,0.25)",
        rightOffset: 5,
        minBarSpacing: 3,
        // Candle numbers only — real dates and asset names are never shown.
        tickMarkFormatter: (time: number) => `#${time}`,
      },
      localization: { timeFormatter: (time: number) => `Candle #${time}` },
      rightPriceScale: { borderVisible: true, borderColor: "rgba(139,147,167,0.25)", scaleMargins: { top: 0.08, bottom: 0.08 } },
      crosshair: {
        mode: 0, // free crosshair, like TradingView
        vertLine: { labelVisible: true, color: "rgba(139,147,167,0.5)", labelBackgroundColor: "#334155" },
        horzLine: { labelVisible: true, color: "rgba(139,147,167,0.5)", labelBackgroundColor: "#334155" },
      },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: COLOR_SETS[chartColors].up,
      downColor: COLOR_SETS[chartColors].down,
      wickUpColor: COLOR_SETS[chartColors].up,
      wickDownColor: COLOR_SETS[chartColors].down,
      borderUpColor: COLOR_SETS[chartColors].up,
      borderDownColor: COLOR_SETS[chartColors].down,
      borderVisible: true,
    });
    chart.subscribeCrosshairMove((param) => {
      setHover(param.time === undefined ? null : Number(param.time));
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height });
      redraw();
    });
    ro.observe(el);
    chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Height changes.
  useEffect(() => {
    chartRef.current?.applyOptions({ height });
    redraw();
  }, [height, redraw]);

  // Colors changes.
  useEffect(() => {
    seriesRef.current?.applyOptions({
      upColor: COLOR_SETS[chartColors].up,
      downColor: COLOR_SETS[chartColors].down,
      wickUpColor: COLOR_SETS[chartColors].up,
      wickDownColor: COLOR_SETS[chartColors].down,
      borderUpColor: COLOR_SETS[chartColors].up,
      borderDownColor: COLOR_SETS[chartColors].down,
    });
  }, [chartColors]);

  // Data changes.
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    // Decimal places that suit the price (forex needs 5, BTC needs 1).
    const ref = candles[candles.length - 1]?.c ?? 1;
    const precision = ref >= 1000 ? 1 : ref >= 100 ? 2 : ref >= 10 ? 3 : 5;
    series.applyOptions({ priceFormat: { type: "price", precision, minMove: 10 ** -precision } });
    series.setData(
      candles.map((c) => ({ time: c.i as unknown as import("lightweight-charts").Time, open: c.o, high: c.h, low: c.l, close: c.c })),
    );
    const grew = candles.length - lastLenRef.current;
    if (lastLenRef.current === 0 || grew < 0) autoFitRef.current = true;
    if (autoFitRef.current) chart.timeScale().fitContent();
    else if (grew > 0) {
      // Keep the player's zoom level and slide along with the new candles.
      const r = chart.timeScale().getVisibleLogicalRange();
      if (r) chart.timeScale().setVisibleLogicalRange({ from: r.from + grew, to: r.to + grew });
    }
    lastLenRef.current = candles.length;
    redraw();
  }, [candles, redraw]);

  const fitAll = useCallback(() => {
    autoFitRef.current = true;
    chartRef.current?.timeScale().fitContent();
  }, []);

  /** Keep a visible range inside the data (plus a little room on the right). */
  const clampRange = (from: number, to: number) => {
    const last = Math.max(0, lastLenRef.current - 1);
    const span = to - from;
    if (from < -1) {
      to += -1 - from;
      from = -1;
    }
    if (to > last + 12) {
      from -= to - (last + 12);
      to = last + 12;
    }
    return { from: Math.max(-1, from), to: Math.max(from + span, to) };
  };

  /** Zoom around a pixel x (default: right edge). factor > 1 zooms out. */
  const zoom = useCallback((factor: number, anchorX?: number) => {
    const ts = chartRef.current?.timeScale();
    const r = ts?.getVisibleLogicalRange();
    if (!ts || !r) return;
    const n = lastLenRef.current;
    const anchor = anchorX !== undefined ? Number(ts.coordinateToLogical(anchorX) ?? r.to) : r.to;
    const from = anchor - (anchor - r.from) * factor;
    const to = anchor + (r.to - anchor) * factor;
    // Zoomed all the way out: show every candle filling the width, like a broker chart.
    if (to - from >= n + 5) return fitAll();
    if (to - from < 10) return; // max zoom-in: about 10 candles across
    autoFitRef.current = false;
    ts.setVisibleLogicalRange(clampRange(from, to));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitAll]);

  const pan = useCallback((bars: number) => {
    const ts = chartRef.current?.timeScale();
    const r = ts?.getVisibleLogicalRange();
    if (!ts || !r) return;
    autoFitRef.current = false;
    ts.setVisibleLogicalRange(clampRange(r.from + bars, r.to + bars));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wheel = zoom at the cursor, shift+wheel = scroll. Handled here (capture) so it
  // works the same while a marking tool is active and the overlay covers the chart.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const r = chartRef.current?.timeScale().getVisibleLogicalRange();
        const span = r ? r.to - r.from : 50;
        pan(((e.shiftKey ? e.deltaY : e.deltaX) / 100) * span * 0.1);
      } else {
        zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left);
      }
    };
    // Dragging the chart itself (no tool active) also counts as taking control of the view.
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof HTMLCanvasElement) autoFitRef.current = false;
    };
    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    el.addEventListener("pointerdown", onDown, { capture: true });
    return () => {
      el.removeEventListener("wheel", onWheel, { capture: true });
      el.removeEventListener("pointerdown", onDown, { capture: true });
    };
  }, [zoom, pan]);

  // Coordinate helpers.
  const xOf = (i: number): number | null => {
    const chart = chartRef.current;
    if (!chart) return null;
    const x = chart.timeScale().logicalToCoordinate(i as unknown as import("lightweight-charts").Logical);
    return x === null ? null : Number(x);
  };
  const yOf = (p: number): number | null => {
    const y = seriesRef.current?.priceToCoordinate(p);
    return y === null || y === undefined ? null : Number(y);
  };
  const priceAt = (y: number): number | null => {
    const p = seriesRef.current?.coordinateToPrice(y);
    return p === null || p === undefined ? null : Number(p);
  };
  const indexAt = (x: number): number | null => {
    const chart = chartRef.current;
    if (!chart) return null;
    const l = chart.timeScale().coordinateToLogical(x);
    if (l === null) return null;
    return Math.round(Number(l));
  };

  const isBoxTool = activeTool === "FVG" || activeTool === "ORDER_BLOCK";
  const isLineTool = activeTool === "BOS" || activeTool === "SR_LINE";

  // Pointer interactions on the overlay.
  const onPointerDown = (e: React.PointerEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Line drag handles take priority (checked via data attr on target).
    const target = e.target as HTMLElement;
    const lineId = target.dataset["lineId"] as DragLineId | undefined;
    if (lineId) {
      dragRef.current = { kind: "line", id: lineId };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    if (isBoxTool) {
      dragRef.current = { kind: "box", x0: x, y0: y };
      setDragBox({ x0: x, y0: y, x1: x, y1: y });
      overlayRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    if (isLineTool) {
      dragRef.current = { kind: "hline", x0: x, y0: y };
      setDragLine({ x0: x, y0: y, x1: x });
      overlayRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    if (activeTool && onChartTap) {
      const i = indexAt(x);
      const p = priceAt(y);
      if (i !== null && p !== null) onChartTap(i, p);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // The overlay hides the chart from the mouse, so drive the crosshair + legend ourselves.
    const hi = indexAt(x);
    const hp = priceAt(y);
    if (hi !== null && hp !== null && chartRef.current && seriesRef.current) {
      chartRef.current.setCrosshairPosition(hp, hi as unknown as import("lightweight-charts").Time, seriesRef.current);
      setHover(hi);
    }
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.kind === "box") {
      setDragBox({ x0: drag.x0, y0: drag.y0, x1: x, y1: y });
    } else if (drag.kind === "hline") {
      setDragLine({ x0: drag.x0, y0: drag.y0, x1: x });
    } else if (drag.kind === "line" && onLineDrag) {
      const p = priceAt(y);
      if (p !== null) onLineDrag(drag.id, p);
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.kind === "box" && dragBox && onBoxDrag) {
      const i1 = indexAt(Math.min(dragBox.x0, dragBox.x1));
      const i2 = indexAt(Math.max(dragBox.x0, dragBox.x1));
      const p1 = priceAt(Math.min(dragBox.y0, dragBox.y1));
      const p2 = priceAt(Math.max(dragBox.y0, dragBox.y1));
      if (i1 !== null && i2 !== null && p1 !== null && p2 !== null && i2 > i1) {
        onBoxDrag(i1, i2, p1, p2);
      }
    }
    if (drag?.kind === "hline" && dragLine && onLineMark) {
      const i1 = indexAt(Math.min(dragLine.x0, dragLine.x1));
      const i2 = indexAt(Math.max(dragLine.x0, dragLine.x1));
      const p1 = priceAt(dragLine.y0);
      if (i1 !== null && i2 !== null && p1 !== null) onLineMark(i1, i2, p1);
    }
    setDragBox(null);
    setDragLine(null);
  };

  // Render one mark as SVG.
  const renderMark = (m: Mark, color: string, dashed = false, keyPrefix = "m") => {
    const x1 = xOf(m.i1);
    const y1 = yOf(m.p1);
    if (x1 === null || y1 === null) return null;
    const key = `${keyPrefix}-${m.id}`;
    const common = { stroke: color, strokeWidth: 2, strokeDasharray: dashed ? "6 4" : undefined };
    if (m.type === "FVG" || m.type === "ORDER_BLOCK") {
      const x2 = m.i2 !== undefined ? xOf(m.i2) : null;
      const y2 = m.p2 !== undefined ? yOf(m.p2) : null;
      if (x2 === null || y2 === null) return null;
      return (
        <rect
          key={key}
          {...common}
          x={Math.min(x1, x2)}
          y={Math.min(y1, y2)}
          width={Math.abs(x2 - x1)}
          height={Math.max(3, Math.abs(y2 - y1))}
          fill={color + "22"}
        />
      );
    }
    if (m.type === "BOS" || m.type === "SR_LINE") {
      const x2 = m.i2 !== undefined ? xOf(m.i2) : null;
      const endX = x2 ?? (containerRef.current?.clientWidth ?? 400);
      return <line key={key} {...common} x1={x1} y1={y1} x2={Math.max(endX, x1 + 30)} y2={y1} />;
    }
    if (m.type === "PATTERN") {
      const cd = candles.find((k) => k.i === m.i1);
      const yt = cd ? yOf(cd.h) : null;
      const yb = cd ? yOf(cd.l) : null;
      if (yt === null || yb === null) return null;
      return (
        <rect key={key} x={x1 - 9} y={yt - 7} width={18} height={Math.max(14, yb - yt + 14)} rx={7} fill={color + "18"} stroke={color} strokeWidth={2} strokeDasharray={dashed ? "5 3" : undefined} />
      );
    }
    // Points
    return (
      <g key={`${keyPrefix}-${m.id}`}>
        <circle cx={x1} cy={y1} r={6} fill={color} opacity={0.9} />
        <circle cx={x1} cy={y1} r={10} fill="none" stroke={color} strokeWidth={1.5} opacity={0.5} />
      </g>
    );
  };

  const hintRect = (() => {
    if (!hintArea) return null;
    const x1 = xOf(hintArea.i1);
    const x2 = xOf(hintArea.i2);
    const y1 = yOf(Math.max(hintArea.p1, hintArea.p2));
    const y2 = yOf(Math.min(hintArea.p1, hintArea.p2));
    if (x1 === null || x2 === null || y1 === null || y2 === null) return null;
    return (
      <rect
        className="hint-pulse"
        x={x1}
        y={y1}
        width={Math.max(8, x2 - x1)}
        height={Math.max(8, y2 - y1)}
        fill="var(--color-electric)"
        opacity={0.25}
        rx={4}
      />
    );
  })();

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <div ref={containerRef} className="absolute inset-0" />
      {/* OHLC legend (hovered candle, or the latest one) */}
      {(() => {
        const c = candles.find((k) => k.i === hover) ?? candles[candles.length - 1];
        if (!c) return null;
        const prev = candles.find((k) => k.i === c.i - 1);
        const ch = prev ? ((c.c - prev.c) / prev.c) * 100 : 0;
        const ref = c.c;
        const dp = ref >= 1000 ? 1 : ref >= 100 ? 2 : ref >= 10 ? 3 : 5;
        const col = c.c >= c.o ? COLOR_SETS[chartColors].up : COLOR_SETS[chartColors].down;
        return (
          <div className="font-num pointer-events-none absolute left-2 top-2 z-20 flex flex-wrap gap-x-3 rounded bg-background/70 px-2 py-1 text-[11px] backdrop-blur">
            <span className="text-muted-foreground">#{c.i}</span>
            {(
              [
                ["O", c.o],
                ["H", c.h],
                ["L", c.l],
                ["C", c.c],
              ] as [string, number][]
            ).map(([k, v]) => (
              <span key={k}>
                <span className="text-muted-foreground">{k} </span>
                <span style={{ color: col }}>{v.toFixed(dp)}</span>
              </span>
            ))}
            <span style={{ color: col }}>
              {ch >= 0 ? "+" : ""}
              {ch.toFixed(2)}%
            </span>
          </div>
        );
      })()}
      {/* Zoom controls */}
      <div className="absolute left-2 z-20 flex overflow-hidden rounded-md border border-border bg-card/90 text-sm shadow backdrop-blur" style={{ bottom: axes.bottom + 8 }}>
        {(
          [
            ["−", "Zoom out", () => zoom(1.35)],
            ["+", "Zoom in", () => zoom(1 / 1.35)],
            ["⤢", "Fit all candles", fitAll],
          ] as [string, string, () => void][]
        ).map(([label, title, fn]) => (
          <button key={title} type="button" title={title} onClick={fn} className="font-num h-8 w-9 border-r border-border text-base last:border-r-0 hover:bg-secondary">
            {label}
          </button>
        ))}
      </div>
      <div
        ref={overlayRef}
        // z-index: the chart library stacks its own canvases at z-index 2.
        // It stops at the axes so they stay draggable.
        className="absolute left-0 top-0 z-10"
        style={{
          right: axes.right,
          bottom: axes.bottom,
          touchAction: activeTool ? "none" : "auto",
          cursor: activeTool ? "crosshair" : "default",
          // With no tool active, let the chart receive zoom / scroll gestures.
          pointerEvents: activeTool ? "auto" : "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          chartRef.current?.clearCrosshairPosition();
          setHover(null);
        }}
      >
        <svg className="h-full w-full" style={{ pointerEvents: "none" }}>
          {hintRect}
          {bands.map((b, k) => {
            const y1 = yOf(b.p1);
            const y2 = yOf(b.p2);
            if (y1 === null || y2 === null) return null;
            return (
              <rect
                key={k}
                x={0}
                y={Math.min(y1, y2)}
                width="100%"
                height={Math.abs(y2 - y1)}
                fill={b.color}
                opacity={0.12}
              />
            );
          })}
          {answerMarks.map((m) => renderMark(m, "#22c55e", false, "ans"))}
          {missedMarks.map((m) => renderMark(m, "#22c55e", true, "miss"))}
          {marks.map((m) => renderMark(m, wrongMarkIds?.has(m.id) ? "#ef4444" : "#3b82f6"))}
          {dragLine && (
            <line
              x1={Math.min(dragLine.x0, dragLine.x1)}
              x2={Math.max(dragLine.x0, dragLine.x1, Math.min(dragLine.x0, dragLine.x1) + 4)}
              y1={dragLine.y0}
              y2={dragLine.y0}
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
          )}
          {exitMarker &&
            (() => {
              const x = xOf(exitMarker.i);
              const y = yOf(exitMarker.price);
              if (x === null || y === null) return null;
              return (
                <g>
                  <circle cx={x} cy={y} r={14} fill="none" stroke={exitMarker.color} strokeWidth={2} className="hint-pulse" />
                  <circle cx={x} cy={y} r={5} fill={exitMarker.color} />
                </g>
              );
            })()}
          {dragBox && (
            <rect
              x={Math.min(dragBox.x0, dragBox.x1)}
              y={Math.min(dragBox.y0, dragBox.y1)}
              width={Math.abs(dragBox.x1 - dragBox.x0)}
              height={Math.abs(dragBox.y1 - dragBox.y0)}
              fill="#3b82f622"
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}
        </svg>
        {/* Draggable order lines (HTML for easy pointer capture) */}
        {lines.map((l) => {
          const y = yOf(l.price);
          if (y === null) return null;
          return (
            <div key={l.id} className="absolute left-0 right-0" style={{ top: y }}>
              <div style={{ borderTop: `2px ${l.id === "entry" ? "solid" : "dashed"} ${l.color}` }} />
              <button
                data-line-id={l.id}
                className="font-num absolute right-2 -top-3 rounded px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: l.color, color: "#0b0e17", pointerEvents: "auto", cursor: "ns-resize" }}
              >
                {l.label} {l.price.toFixed(2)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

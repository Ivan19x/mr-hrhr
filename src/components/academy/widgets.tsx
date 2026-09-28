// Interactive lesson widgets: CandleLab, MarketMap, ChartTour, PositionSizer, Expectancy.
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Diagram } from "./Diagram";
import { real } from "@/data/academy/real";
import { mulberry32 } from "@/engine/transform";

/** Renders **bold** segments. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, k) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={k} className="font-semibold text-foreground">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={k}>{p}</span>
        ),
      )}
    </>
  );
}

function WidgetFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-electric/40 bg-card p-4 md:p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-electric">⚡ Try it: {title}</p>
      {children}
    </div>
  );
}

// ------------------------------------------------------------------ CandleLab
type Four = { o: number; h: number; l: number; c: number };

const PRESETS: { name: string; v: Four }[] = [
  { name: "Bullish marubozu", v: { o: 20, h: 81, l: 19, c: 80 } },
  { name: "Doji", v: { o: 50, h: 75, l: 25, c: 50.5 } },
  { name: "Hammer", v: { o: 70, h: 78, l: 20, c: 76 } },
  { name: "Shooting star", v: { o: 32, h: 85, l: 25, c: 28 } },
  { name: "Spinning top", v: { o: 47, h: 72, l: 28, c: 53 } },
  { name: "Bearish candle", v: { o: 70, h: 76, l: 30, c: 36 } },
];

function describe({ o, h, l, c }: Four) {
  const range = Math.max(h - l, 0.0001);
  const body = Math.abs(c - o);
  const upper = h - Math.max(o, c);
  const lower = Math.min(o, c) - l;
  const bull = c >= o;
  const bodyPct = body / range;
  let name = bull ? "Bullish candle" : "Bearish candle";
  let meaning = bull ? "Buyers finished in control of the period." : "Sellers finished in control of the period.";
  if (bodyPct < 0.08) {
    if (lower > 0.6 * range) [name, meaning] = ["Dragonfly doji", "Sellers pushed down hard but buyers dragged price all the way back. Bullish at support."];
    else if (upper > 0.6 * range) [name, meaning] = ["Gravestone doji", "Buyers pushed up but sellers dragged price all the way back. Bearish at resistance."];
    else [name, meaning] = ["Doji", "Open and close are the same: nobody won. Indecision."];
  } else if (bodyPct > 0.9) {
    [name, meaning] = [bull ? "Bullish marubozu" : "Bearish marubozu", bull ? "Total buyer control from open to close. Strong momentum." : "Total seller control from open to close. Strong momentum."];
  } else if (lower >= 2 * body && upper <= body * 0.6) {
    [name, meaning] = ["Hammer / hanging man shape", "Long lower wick: lower prices were rejected. A hammer after a fall (bullish), a hanging man after a rise (warning)."];
  } else if (upper >= 2 * body && lower <= body * 0.6) {
    [name, meaning] = ["Shooting star / inverted hammer shape", "Long upper wick: higher prices were rejected. A shooting star after a rise (bearish), an inverted hammer after a fall."];
  } else if (bodyPct < 0.33 && upper > body * 0.5 && lower > body * 0.5) {
    [name, meaning] = ["Spinning top", "Small body with wicks both sides: balance and hesitation."];
  }
  const closeLoc = (c - l) / range;
  return {
    name,
    meaning,
    stats: [
      ["Body", `${Math.round(bodyPct * 100)}% of range`],
      ["Upper wick", `${Math.round((upper / range) * 100)}%`],
      ["Lower wick", `${Math.round((lower / range) * 100)}%`],
      ["Close location", closeLoc > 0.75 ? "top quarter (buyers strong)" : closeLoc < 0.25 ? "bottom quarter (sellers strong)" : "middle"],
    ] as [string, string][],
    bull,
  };
}

export function CandleLab() {
  const [v, setV] = useState<Four>({ o: 35, h: 82, l: 22, c: 70 });
  const set = (k: keyof Four, val: number) => {
    const n = { ...v, [k]: val };
    // Keep the candle valid: high above open/close, low below.
    if (k === "h") n.h = Math.max(val, n.o, n.c);
    if (k === "l") n.l = Math.min(val, n.o, n.c);
    if (k === "o" || k === "c") {
      n.h = Math.max(n.h, n.o, n.c);
      n.l = Math.min(n.l, n.o, n.c);
    }
    setV(n);
  };
  const d = describe(v);
  const y = (p: number) => 10 + (100 - p) * 2.2;
  const col = d.bull ? "var(--color-up)" : "var(--color-down)";
  return (
    <WidgetFrame title="Candle builder">
      <div className="grid gap-5 md:grid-cols-[180px_1fr]">
        <svg viewBox="0 0 180 240" className="mx-auto h-60 w-44 rounded-lg bg-terminal">
          <line x1={90} x2={90} y1={y(v.h)} y2={y(v.l)} stroke={col} strokeWidth={3} />
          <rect x={65} y={y(Math.max(v.o, v.c))} width={50} height={Math.max(2, Math.abs(y(v.o) - y(v.c)))} fill={col} rx={3} />
          {(
            [
              ["H", v.h],
              ["L", v.l],
              ["O", v.o],
              ["C", v.c],
            ] as [string, number][]
          ).map(([k, p]) => (
            <g key={k}>
              <line x1={122} x2={134} y1={y(p)} y2={y(p)} stroke="var(--color-muted-foreground)" />
              <text x={138} y={y(p) + 4} fontSize={11} fill="var(--color-muted-foreground)" className="font-num">
                {k}
              </text>
            </g>
          ))}
        </svg>
        <div>
          {(
            [
              ["o", "Open"],
              ["h", "High"],
              ["l", "Low"],
              ["c", "Close"],
            ] as [keyof Four, string][]
          ).map(([k, label]) => (
            <label key={k} className="mb-2 flex items-center gap-3 text-sm">
              <span className="w-12 text-muted-foreground">{label}</span>
              <input type="range" min={0} max={100} step={0.5} value={v[k]} onChange={(e) => set(k, Number(e.target.value))} className="flex-1 accent-[var(--color-electric)]" />
              <span className="font-num w-10 text-right">{v[k].toFixed(0)}</span>
            </label>
          ))}
          <div className="mt-3 rounded-lg bg-terminal p-3">
            <p className="font-bold" style={{ color: col }}>
              {d.name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{d.meaning}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {d.stats.map(([a, b]) => (
                <p key={a}>
                  <span className="text-muted-foreground">{a}:</span> {b}
                </p>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.name} onClick={() => setV(p.v)} className="rounded-full bg-secondary px-2.5 py-1 text-xs hover:bg-accent">
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}

// ------------------------------------------------------------------ MarketMap
type MapNode = { id: string; x: number; y: number; label: string; sub: string; text: string; color: string };

const NODES: MapNode[] = [
  { id: "you", x: 60, y: 150, label: "You", sub: "retail trader", color: "var(--color-electric)", text: "You see prices and send orders through an app. You never connect to the market directly." },
  { id: "platform", x: 180, y: 150, label: "Platform", sub: "MT5 / TradingView / app", color: "var(--color-electric)", text: "Software that displays the broker's price feed and sends your orders to the broker's server." },
  { id: "broker", x: 310, y: 150, label: "Broker", sub: "licensed intermediary", color: "var(--color-gold)", text: "Checks your margin, then either fills you internally (B-book) or routes the order onward (A-book / STP / ECN / DMA)." },
  { id: "bbook", x: 310, y: 50, label: "Internalised", sub: "B-book / dealing desk", color: "var(--color-down)", text: "The broker takes the other side itself. Instant fills, but the broker profits when clients lose." },
  { id: "agg", x: 450, y: 110, label: "Aggregator", sub: "best bid/ask from many LPs", color: "var(--color-gold)", text: "Combines prices from many liquidity providers and routes each order to the best one." },
  { id: "prime", x: 450, y: 215, label: "Prime broker", sub: "credit access", color: "var(--color-muted-foreground)", text: "Lends its credit so smaller brokers can trade with tier-1 banks." },
  { id: "lp", x: 590, y: 70, label: "Liquidity providers", sub: "banks & non-bank MMs", color: "var(--color-up)", text: "Tier-1 banks (JPMorgan, UBS, Citi…) and firms like XTX or Citadel Securities stream buy/sell quotes." },
  { id: "interbank", x: 590, y: 160, label: "Interbank / ECNs", sub: "EBS, LSEG FX (OTC)", color: "var(--color-up)", text: "The decentralised FX market: banks trading with each other directly and on electronic venues." },
  { id: "exchange", x: 590, y: 250, label: "Exchanges", sub: "NYSE, Nasdaq, CME, NSE", color: "var(--color-up)", text: "Central order books with matching engines for stocks and futures. Everyone sees one price." },
  { id: "clearing", x: 720, y: 250, label: "Clearing & custody", sub: "LCH, DTCC, custodians", color: "var(--color-muted-foreground)", text: "Guarantees both sides settle (central counterparty) and safely holds the securities and cash." },
];

const EDGES: [string, string][] = [
  ["you", "platform"],
  ["platform", "broker"],
  ["broker", "bbook"],
  ["broker", "agg"],
  ["broker", "prime"],
  ["agg", "lp"],
  ["agg", "interbank"],
  ["prime", "interbank"],
  ["prime", "exchange"],
  ["broker", "exchange"],
  ["exchange", "clearing"],
];

export function MarketMap() {
  const [sel, setSel] = useState("broker");
  const node = NODES.find((n) => n.id === sel)!;
  const at = (id: string) => NODES.find((n) => n.id === id)!;
  return (
    <WidgetFrame title="Tap a box to see how the market connects">
      <div className="overflow-x-auto">
        <svg viewBox="0 0 790 300" className="min-w-[640px] w-full">
          {EDGES.map(([a, b]) => {
            const A = at(a);
            const B = at(b);
            const active = sel === a || sel === b;
            return (
              <line
                key={a + b}
                x1={A.x}
                y1={A.y}
                x2={B.x}
                y2={B.y}
                stroke={active ? "var(--color-electric)" : "var(--color-border)"}
                strokeWidth={active ? 2.5 : 1.5}
                strokeDasharray={active ? undefined : "4 4"}
              />
            );
          })}
          {NODES.map((n) => (
            <g key={n.id} onClick={() => setSel(n.id)} className="cursor-pointer">
              <rect
                x={n.x - 58}
                y={n.y - 24}
                width={116}
                height={48}
                rx={10}
                fill="var(--color-terminal)"
                stroke={sel === n.id ? n.color : "var(--color-border)"}
                strokeWidth={sel === n.id ? 2.5 : 1}
              />
              <text x={n.x} y={n.y - 3} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={n.color}>
                {n.label}
              </text>
              <text x={n.x} y={n.y + 13} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">
                {n.sub}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={sel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 rounded-lg bg-terminal p-3 text-sm">
          <span className="font-bold" style={{ color: node.color }}>
            {node.label}:{" "}
          </span>
          <span className="text-muted-foreground">{node.text}</span>
        </motion.div>
      </AnimatePresence>
    </WidgetFrame>
  );
}

// ------------------------------------------------------------------ ChartTour
const tourReal = real("trend-up-volume");
const tourCandles = tourReal.candles;
const tourCloses = tourReal.closes;
const TOUR = [
  { n: 1, x: 8, y: 6, title: "Symbol & timeframe", text: "Top-left shows WHAT you're looking at (e.g. EURUSD) and each candle's timeframe (e.g. H1 = one hour per candle). Change timeframes with the toolbar buttons." },
  { n: 2, x: 93, y: 30, title: "Price axis", text: "The vertical scale on the right. Higher on the chart = higher price." },
  { n: 3, x: 50, y: 92, title: "Time axis", text: "Runs along the bottom, oldest on the left, newest on the right. The last candle is still forming until its period ends." },
  { n: 4, x: 90, y: 14, title: "Current price line", text: "The horizontal line with a label on the price axis shows the latest bid price. Some platforms also draw the ask line just above it." },
  { n: 5, x: 30, y: 45, title: "Candles", text: "Each candle is one period's battle: open, high, low, close. Green = closed up, red = closed down." },
  { n: 6, x: 30, y: 78, title: "Volume / indicator panel", text: "Below the price you often see volume bars or indicators like RSI and MACD in their own panel." },
  { n: 7, x: 70, y: 6, title: "Tools & indicators", text: "Drawing tools (lines, boxes, Fibonacci) and indicator menus. In MR_HRHR these are the marking tools on the left." },
];

export function ChartTour() {
  const [sel, setSel] = useState(1);
  const cur = TOUR.find((t) => t.n === sel)!;
  const vol = tourReal.volume ?? tourCandles.map(() => 1);
  const last = tourCloses[tourCloses.length - 1]!;
  return (
    <WidgetFrame title="Chart tour">
      <div className="relative overflow-hidden rounded-lg border border-border">
        <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-1.5 text-xs">
          <span className="font-num font-bold">{tourReal.source.split(" · ")[1]}</span>
          {["M5", "M15", "H1", "H4", "D1"].map((t) => (
            <span key={t} className={`font-num rounded px-1.5 ${t === ({ "1-hour": "H1", "4-hour": "H4", daily: "D1", "15-minute": "M15" } as Record<string, string>)[tourReal.source.split(" · ")[2]!] ? "bg-electric text-electric-foreground" : "text-muted-foreground"}`}>
              {t}
            </span>
          ))}
          <span className="ml-auto text-muted-foreground">✎ ƒx ▭ ⌖</span>
        </div>
        <Diagram spec={{ candles: tourCandles, volume: vol, notes: [{ k: "hline", p: last, color: "electric", text: last.toFixed(last > 100 ? 1 : 4) }] }} className="rounded-none" />
        {TOUR.map((t) => (
          <button
            key={t.n}
            onClick={() => setSel(t.n)}
            className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold shadow-lg transition-transform ${
              sel === t.n ? "scale-125 bg-gold text-black" : "bg-electric text-electric-foreground hover:scale-110"
            }`}
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
          >
            {t.n}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-terminal p-3 text-sm">
        <span className="font-bold text-gold">
          {cur.n}. {cur.title}:{" "}
        </span>
        <span className="text-muted-foreground">{cur.text}</span>
      </div>
    </WidgetFrame>
  );
}

// ------------------------------------------------------------------ PositionSizer
const INSTRUMENTS = [
  { id: "eurusd", label: "EUR/USD", unit: 0.0001, unitName: "pip", perLot: 10, dp: 5, entry: 1.085, stop: 1.082 },
  { id: "usdjpy", label: "USD/JPY", unit: 0.01, unitName: "pip", perLot: 6.7, dp: 3, entry: 150.2, stop: 149.8 },
  { id: "xauusd", label: "Gold (XAU/USD)", unit: 1, unitName: "$1 move", perLot: 100, dp: 2, entry: 2350, stop: 2338 },
  { id: "us500", label: "S&P 500 (CFD)", unit: 1, unitName: "point", perLot: 1, dp: 1, entry: 5200, stop: 5180 },
];

export function PositionSizer() {
  const [inst, setInst] = useState(INSTRUMENTS[0]!);
  const [balance, setBalance] = useState(1000);
  const [risk, setRisk] = useState(1);
  const [entry, setEntry] = useState(inst.entry);
  const [stop, setStop] = useState(inst.stop);
  const riskMoney = (balance * risk) / 100;
  const dist = Math.abs(entry - stop) / inst.unit;
  const lots = dist > 0 ? riskMoney / (dist * inst.perLot) : 0;
  return (
    <WidgetFrame title="Position size calculator">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {INSTRUMENTS.map((i) => (
          <button
            key={i.id}
            onClick={() => {
              setInst(i);
              setEntry(i.entry);
              setStop(i.stop);
            }}
            className={`rounded-full px-3 py-1 text-xs ${inst.id === i.id ? "bg-electric text-electric-foreground" : "bg-secondary hover:bg-accent"}`}
          >
            {i.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumField label="Account balance ($)" value={balance} onChange={setBalance} step={100} />
        <NumField label="Risk per trade (%)" value={risk} onChange={setRisk} step={0.25} />
        <NumField label="Entry price" value={entry} onChange={setEntry} step={inst.unit} />
        <NumField label="Stop loss price" value={stop} onChange={setStop} step={inst.unit} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-terminal p-3 text-center">
        <div>
          <p className="text-[11px] text-muted-foreground">Money at risk</p>
          <p className="font-num text-lg font-bold text-down">${riskMoney.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Stop distance</p>
          <p className="font-num text-lg font-bold">
            {dist.toFixed(1)} <span className="text-xs">{inst.unitName}s</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Position size</p>
          <p className="font-num text-lg font-bold text-electric">{lots.toFixed(2)} lots</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Formula: ${riskMoney.toFixed(2)} ÷ ({dist.toFixed(1)} {inst.unitName}s × ${inst.perLot} per {inst.unitName} per lot). Values per lot are approximate. Check your broker's contract specs.
      </p>
    </WidgetFrame>
  );
}

function NumField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  return (
    <label className="text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => e.target.value !== "" && onChange(Number(e.target.value))}
        className="font-num mt-1 w-full rounded-lg border border-input bg-background px-3 py-1.5"
      />
    </label>
  );
}

// ------------------------------------------------------------------ Expectancy
export function Expectancy() {
  const [win, setWin] = useState(40);
  const [rr, setRr] = useState(2.5);
  const exp = (win / 100) * rr - (1 - win / 100);
  const curve = useMemo(() => {
    const rng = mulberry32(7);
    let eq = 0;
    return Array.from({ length: 100 }, () => {
      eq += rng() < win / 100 ? rr : -1;
      return eq;
    });
  }, [win, rr]);
  return (
    <WidgetFrame title="Expectancy simulator">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-muted-foreground">Win rate: {win}%</span>
          <input type="range" min={10} max={90} value={win} onChange={(e) => setWin(Number(e.target.value))} className="mt-1 w-full accent-[var(--color-electric)]" />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Average win: {rr.toFixed(1)}R (loss = 1R)</span>
          <input type="range" min={0.3} max={5} step={0.1} value={rr} onChange={(e) => setRr(Number(e.target.value))} className="mt-1 w-full accent-[var(--color-electric)]" />
        </label>
      </div>
      <p className={`font-num mt-3 text-center text-2xl font-black ${exp > 0 ? "text-up" : "text-down"}`}>
        {exp >= 0 ? "+" : ""}
        {exp.toFixed(2)}R per trade
      </p>
      <p className="mb-2 text-center text-xs text-muted-foreground">One simulated run of 100 trades (in R):</p>
      <Diagram spec={{ line: curve, height: 150, notes: [{ k: "hline", p: 0, color: "muted", dash: true, text: "start" }] }} />
    </WidgetFrame>
  );
}

import type { OHLC } from "./build";

export type Tone = "up" | "down" | "electric" | "gold" | "player" | "muted" | "purple";

export type Note =
  | { k: "label"; i: number; p: number; text: string; pos?: "above" | "below" | "left" | "right"; color?: Tone }
  | { k: "hline"; p: number; text?: string; color?: Tone; dash?: boolean; i1?: number; i2?: number }
  | { k: "line"; i1: number; p1: number; i2: number; p2: number; color?: Tone; dash?: boolean; text?: string }
  | { k: "zone"; i1: number; i2: number; p1: number; p2: number; color?: Tone; text?: string }
  | { k: "arrow"; i: number; p: number; dir: "up" | "down"; color?: Tone; text?: string }
  | { k: "dot"; i: number; p: number; color?: Tone; text?: string; pos?: "above" | "below" }
  | { k: "bracket"; i: number; p1: number; p2: number; text: string; color?: Tone; side?: "left" | "right" }
  | { k: "vline"; i: number; text?: string; color?: Tone };

export type Series = { values: (number | null)[]; color: Tone; label?: string; dash?: boolean; /** Draw as dots (e.g. Parabolic SAR). */ dots?: boolean };

export type Pane = {
  label: string;
  series?: Series[];
  bars?: { values: (number | null)[]; color?: Tone };
  min?: number;
  max?: number;
  levels?: { v: number; text?: string; color?: Tone }[];
  notes?: Note[];
};

export type DiagramSpec = {
  candles?: OHLC[];
  /** Line chart instead of candles (chart-pattern shapes). */
  line?: number[];
  overlays?: Series[];
  notes?: Note[];
  volume?: number[];
  pane?: Pane;
  height?: number;
  /** Extra price padding above/below the data (fraction of range). */
  pad?: number;
  /** Shown in the corner, e.g. "Real chart · BTC/USDT · 4-hour · Mar 2026". */
  source?: string;
  /** Volume-by-price bars drawn from the right edge (volume profile). */
  profile?: { p1: number; p2: number; v: number; color?: Tone }[];
  /** Shaded area between two series (e.g. the Ichimoku cloud): green where a ≥ b, red otherwise. */
  clouds?: { a: (number | null)[]; b: (number | null)[] }[];
};

export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "list"; items: string[]; ordered?: boolean }
  | { t: "diagram"; spec: DiagramSpec; caption?: string }
  | { t: "gallery"; items: { title: string; spec: DiagramSpec; text: string; tone?: Tone }[] }
  | { t: "callout"; tone: "tip" | "warn" | "key"; text: string }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "flow"; steps: { title: string; text: string }[] }
  | { t: "spot"; items: string[] }
  | { t: "widget"; name: "candleLab" | "marketMap" | "chartTour" | "positionSizer" | "expectancy" }
  /** Simple bar chart of labelled values (e.g. average return per month). */
  | { t: "bars"; labels: string[]; values: number[]; unit?: string; caption?: string }
  /** Heat-map of a square matrix (e.g. correlations from −1 to +1). */
  | { t: "matrix"; names: string[]; m: number[][]; caption?: string };

export type QuizQ = { q: string; options: string[]; answer: number; why: string };

export type Lesson = {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  blocks: Block[];
  quiz: QuizQ[];
  /** Glossary / syllabus terms this lesson teaches (links the glossary to the lesson). */
  terms?: string[];
};

export type Module = {
  id: string;
  n: number;
  title: string;
  tagline: string;
  icon: string;
  lessons: Lesson[];
};

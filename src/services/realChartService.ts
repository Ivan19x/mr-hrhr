// Practice mode: a bank of real Break of Structure setups, pre-cut from market
// history by scripts/extract-examples.ts (only the ~100 candles each setup needs).
// Loaded lazily so it doesn't weigh down the first page load.
import type { Level } from "@/types/game";
import { setupToLevel, type Dataset, type Row, type Setup } from "@/engine/setups";

type BankItem = {
  label: string;
  tf: string;
  dir: "bull" | "bear";
  atr: number;
  t: [number, number, number]; // first candle, break candle, last candle (unix s)
  rows: number[][];
  swing: number;
  pull: number;
  prev: number;
  brk: number;
  won: boolean;
  bars: number;
};

let bank: BankItem[] | null = null;
let lastPick = -1;

async function loadBank(): Promise<BankItem[]> {
  if (!bank) bank = (await import("@/data/real/practiceBank.json")).default as unknown as BankItem[];
  return bank;
}

function toLevel(b: BankItem, n: number): Level {
  const step = (b.t[2] - b.t[0]) / Math.max(1, b.rows.length - 1);
  const candles: Row[] = b.rows.map((r, k) => [Math.round(b.t[0] + k * step), r[0]!, r[1]!, r[2]!, r[3]!]);
  const ds: Dataset = { id: `bank-${n}`, label: b.label, tf: b.tf, source: "bank", candles };
  const bull = b.dir === "bull";
  const entry = candles[b.brk]![4];
  const pullPrice = bull ? candles[b.pull]![3] : candles[b.pull]![2];
  const sl = bull ? pullPrice - 0.25 * b.atr : pullPrice + 0.25 * b.atr;
  const risk = Math.abs(entry - sl);
  const setup: Setup = {
    datasetId: ds.id,
    dir: b.dir,
    swing: b.swing,
    pull: b.pull,
    prevSwing: b.prev,
    brk: b.brk,
    atr: b.atr,
    entry,
    sl,
    tp: bull ? entry + 2 * risk : entry - 2 * risk,
    won: b.won,
    barsToExit: b.bars,
    clarity: 0,
    displacement: 0,
    noise: 0,
  };
  const level = setupToLevel(ds, setup, `practice-${n}`, "medium");
  if (level.source) level.source.decisionTime = b.t[1];
  return level;
}

/** A random real setup (never the same one twice in a row). */
export async function randomRealLevel(): Promise<Level> {
  const list = await loadBank();
  let k = Math.floor(Math.random() * list.length);
  if (k === lastPick) k = (k + 1) % list.length;
  lastPick = k;
  return toLevel(list[k]!, k);
}

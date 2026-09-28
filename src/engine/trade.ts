// Trade simulation: play the outcome candles forward until SL or TP is hit.
import type { Candle } from "@/types/game";

export type TradeInput = {
  side: "buy" | "sell";
  entry: number;
  sl?: number | undefined;
  tp: number;
  riskPct: number;
};

export type TradeOutcome = {
  result: "tp" | "sl" | "open";
  exitIndex: number; // candle index where the exit happened (or last candle)
  exitPrice: number;
  r: number; // realized R multiple (1R = amount risked)
};

export function simulateTrade(
  candles: Candle[],
  decisionIndex: number,
  trade: TradeInput,
  /** Risk per unit used to measure R when the trade has no stop loss. */
  fallbackRisk = 0,
): TradeOutcome {
  const riskPerUnit = trade.sl !== undefined ? Math.abs(trade.entry - trade.sl) : fallbackRisk;

  for (let k = decisionIndex + 1; k < candles.length; k++) {
    const c = candles[k]!;
    if (trade.side === "buy") {
      // Conservative: check SL before TP when both are inside one candle.
      if (trade.sl !== undefined && c.l <= trade.sl) {
        return { result: "sl", exitIndex: k, exitPrice: trade.sl, r: -1 };
      }
      if (c.h >= trade.tp) {
        const r = riskPerUnit > 0 ? (trade.tp - trade.entry) / riskPerUnit : 0;
        return { result: "tp", exitIndex: k, exitPrice: trade.tp, r };
      }
    } else {
      if (trade.sl !== undefined && c.h >= trade.sl) {
        return { result: "sl", exitIndex: k, exitPrice: trade.sl, r: -1 };
      }
      if (c.l <= trade.tp) {
        const r = riskPerUnit > 0 ? (trade.entry - trade.tp) / riskPerUnit : 0;
        return { result: "tp", exitIndex: k, exitPrice: trade.tp, r };
      }
    }
  }

  const last = candles[candles.length - 1]!;
  const pnl =
    trade.side === "buy" ? last.c - trade.entry : trade.entry - last.c;
  const r = riskPerUnit > 0 ? pnl / riskPerUnit : 0;
  return { result: "open", exitIndex: last.i, exitPrice: last.c, r };
}

export function riskRewardRatio(trade: TradeInput): number | null {
  if (trade.sl === undefined) return null;
  const risk = Math.abs(trade.entry - trade.sl);
  if (risk === 0) return null;
  const reward = Math.abs(trade.tp - trade.entry);
  return reward / risk;
}

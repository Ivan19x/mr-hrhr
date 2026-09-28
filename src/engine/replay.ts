// Replay helpers: stepping a candle series forward at a given speed.
import type { Candle } from "@/types/game";

export type ReplaySpeed = 1 | 2 | 5;

export const SPEED_MS: Record<ReplaySpeed, number> = { 1: 600, 2: 300, 5: 120 };

export function sliceTo(candles: Candle[], index: number): Candle[] {
  return candles.slice(0, Math.min(index + 1, candles.length));
}

export function isSwingHigh(candles: Candle[], i: number, w = 2): boolean {
  if (i < w || i >= candles.length - w) return false;
  for (let k = 1; k <= w; k++) {
    if (candles[i]!.h <= candles[i - k]!.h || candles[i]!.h <= candles[i + k]!.h) return false;
  }
  return true;
}

export function isSwingLow(candles: Candle[], i: number, w = 2): boolean {
  if (i < w || i >= candles.length - w) return false;
  for (let k = 1; k <= w; k++) {
    if (candles[i]!.l >= candles[i - k]!.l || candles[i]!.l >= candles[i + k]!.l) return false;
  }
  return true;
}

// Replay helpers: stepping a candle series forward at a given speed.

export type ReplaySpeed = 1 | 2 | 5;

export const SPEED_MS: Record<ReplaySpeed, number> = { 1: 600, 2: 300, 5: 120 };

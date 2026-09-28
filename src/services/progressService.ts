// Progress service: profile, XP, stars, badges, stats — persisted in IndexedDB.
// Merge rule: keep the best result per level.
import type { ActionLog, BadgeId, Level, Mark, Profile, ScoreBreakdown } from "@/types/game";
import { matchMarks } from "@/engine/marking";
import { rankForXp } from "@/data/curriculum";
import { kvGet, kvSet, kvDel, userKey } from "./db";

export const DEFAULT_PROFILE: Profile = {
  xp: 0,
  balance: 10000,
  results: {},
  badges: [],
  tutorialsSeen: [],
  perfectSetupStreak: 0,
  slTradeCount: 0,
  perfectQuizCount: 0,
  totals: {
    levels: 0,
    wins: 0,
    sumR: 0,
    marksCorrect: 0,
    marksPlaced: 0,
    answersCorrect: 0,
    answersTotal: 0,
  },
  concepts: {},
  academy: {},
  attempts: {},
  firstTry: {},
  quizAttempts: {},
  practiceXp: { day: "", xp: 0 },
  dailyDone: {},
  recaps: 0,
  friends: [],
  settings: { sound: true, theme: "dark", chartColors: "classic", tutorials: true },
};

function freshDefault(): Profile {
  return structuredClone(DEFAULT_PROFILE);
}

export async function getProfile(): Promise<Profile> {
  const p = await kvGet<Profile>(userKey("profile"));
  if (!p) return freshDefault();
  const d = freshDefault();
  return {
    ...d,
    ...p,
    totals: { ...d.totals, ...p.totals },
    concepts: { ...p.concepts },
    academy: { ...p.academy },
    attempts: { ...p.attempts },
    firstTry: { ...p.firstTry },
    quizAttempts: { ...p.quizAttempts },
    practiceXp: p.practiceXp ?? d.practiceXp,
    dailyDone: { ...p.dailyDone },
    friends: [...(p.friends ?? [])],
    settings: { ...d.settings, ...p.settings },
  };
}

export async function saveProfile(p: Profile): Promise<void> {
  await kvSet(userKey("profile"), p);
  notify(p);
}

export async function resetProgress(): Promise<void> {
  const settings = (await getProfile()).settings;
  await kvDel(userKey("profile"));
  const p = freshDefault();
  p.settings = settings;
  await saveProfile(p);
}

// Simple change subscription so the header/rank badge refresh after a level.
type Listener = (p: Profile) => void;
const listeners = new Set<Listener>();
export function subscribeProfile(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify(p: Profile) {
  listeners.forEach((fn) => fn(p));
}

function award(p: Profile, badge: BadgeId): boolean {
  if (p.badges.includes(badge)) return false;
  p.badges.push(badge);
  return true;
}

function bump(p: Profile, concept: string, ok: boolean) {
  const c = (p.concepts[concept] ??= { correct: 0, total: 0 });
  c.total += 1;
  if (ok) c.correct += 1;
}

/** Record a completed level. Returns the updated profile and newly earned badges. */
/** Today's key in local time, e.g. "2026-09-28". */
export function dayKey(t = Date.now()): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const REPLAY_XP_SHARE = 0.25;
export const PRACTICE_XP_DAILY_CAP = 200;
export const FORFEIT_POINTS = -100;
export const BLOWN_BALANCE = 1000;
export const RECAP_XP_COST = 250;

const attemptKey = (mode: string | undefined, levelId: string) => `${mode ?? "campaign"}:${levelId}`;

/** Registers an attempt; returns whether it is the first one (the one that counts). */
function registerAttempt(p: Profile, key: string, score: number): boolean {
  const first = !p.attempts[key];
  p.attempts[key] = (p.attempts[key] ?? 0) + 1;
  if (first) p.firstTry[key] = score;
  return first;
}

export async function recordResult(
  level: Level,
  breakdown: ScoreBreakdown,
  log: ActionLog,
  usedStopLoss: boolean,
): Promise<{ profile: Profile; newBadges: BadgeId[]; xpGained: number; rankedUp: boolean; firstAttempt: boolean }> {
  const p = await getProfile();
  const before = new Set(p.badges);
  const xpBefore = p.xp;
  const firstAttempt = registerAttempt(p, attemptKey(log.mode, level.id), breakdown.total);
  if (log.mode === "daily") p.dailyDone[dayKey()] = true;

  // Merge rule: keep the best result per level (by stars, then score).
  const prev = p.results[level.id];
  const better =
    !prev || breakdown.stars > prev.stars || (breakdown.stars === prev.stars && breakdown.total > prev.score);
  if (better) {
    p.results[level.id] = {
      levelId: level.id,
      stars: breakdown.stars,
      score: breakdown.total,
      r: breakdown.r,
      won: breakdown.won,
      completedAt: Date.now(),
    };
  }

  // Replays teach, but can't be farmed: only the first attempt earns full XP.
  const fullXp = Math.max(10, Math.round(breakdown.total / 2)) + breakdown.stars * 20;
  const xpGained = firstAttempt ? fullXp : Math.round(fullXp * REPLAY_XP_SHARE);
  p.xp += xpGained;

  // Virtual balance moves by the amount risked times the R result.
  const trade = log.events.find((e) => e.type === "trade");
  if (trade && trade.type === "trade") {
    const risked = (p.balance * trade.riskPct) / 100;
    p.balance = Math.max(0, Math.round((p.balance + risked * breakdown.r) * 100) / 100);
  }

  // Aggregate stats.
  const t = p.totals;
  t.levels += 1;
  if (breakdown.won) t.wins += 1;
  t.sumR += breakdown.r;
  t.marksCorrect += breakdown.marksCorrect;
  t.marksPlaced += breakdown.marksCorrect + breakdown.marksWrong;
  t.answersCorrect += breakdown.answersCorrect;
  t.answersTotal += breakdown.answersCorrect + breakdown.answersWrong;

  // Per-concept accuracy: every answer-key mark counts as a chance to spot it.
  const marks = new Map<string, Mark>();
  for (const ev of log.events) {
    if (ev.type === "mark_add") marks.set(ev.mark.id, ev.mark);
    else if (ev.type === "mark_remove") marks.delete(ev.id);
  }
  const match = matchMarks([...marks.values()], level.answerKey);
  for (const a of match.matchedAnswers) bump(p, a.type, true);
  for (const a of match.missed) bump(p, a.type, false);
  for (const m of match.wrong) bump(p, m.type, false);
  for (let k = 0; k < breakdown.answersCorrect; k++) bump(p, "QUIZ", true);
  for (let k = 0; k < breakdown.answersWrong; k++) bump(p, "QUIZ", false);
  bump(p, "RISK", usedStopLoss && breakdown.r > -1.01);

  // Badges
  const perfectSetup = breakdown.won && breakdown.marksWrong === 0 && breakdown.marksMissed === 0;
  p.perfectSetupStreak = perfectSetup ? p.perfectSetupStreak + 1 : 0;
  if (p.perfectSetupStreak >= 5) award(p, "sniper");
  if (usedStopLoss) {
    p.slTradeCount += 1;
    if (p.slTradeCount >= 10) award(p, "disciplined");
  }
  if (breakdown.won) award(p, "first_blood");
  if (breakdown.answersWrong === 0 && breakdown.answersCorrect > 0) {
    p.perfectQuizCount += 1;
    if (p.perfectQuizCount >= 10) award(p, "scholar");
  }
  if (!breakdown.won && breakdown.total > 0) award(p, "comeback");

  await saveProfile(p);
  return {
    profile: p,
    newBadges: p.badges.filter((b) => !before.has(b)),
    xpGained,
    rankedUp: rankForXp(p.xp).step > rankForXp(xpBefore).step,
    firstAttempt,
  };
}

/**
 * Leaving a live level (after the chart paused at the decision point) is a forfeit:
 * −100 points for that attempt, no stars, no XP, the perfect-setup streak resets,
 * and if a trade was already placed the risked amount is lost (−1R).
 */
export async function recordForfeit(
  levelId: string,
  mode: string | undefined,
  trade: { riskPct: number } | null,
): Promise<{ firstAttempt: boolean; balance: number }> {
  const p = await getProfile();
  const firstAttempt = registerAttempt(p, attemptKey(mode, levelId), FORFEIT_POINTS);
  if (mode === "daily") p.dailyDone[dayKey()] = true;
  p.perfectSetupStreak = 0;
  if (trade) p.balance = Math.max(0, Math.round((p.balance - (p.balance * trade.riskPct) / 100) * 100) / 100);
  p.totals.levels += 1;
  if (trade) p.totals.sumR -= 1;
  await saveProfile(p);
  return { firstAttempt, balance: p.balance };
}

/** Follow / unfollow another profile on this device. */
export async function toggleFriend(id: string): Promise<Profile> {
  const p = await getProfile();
  p.friends = p.friends.includes(id) ? p.friends.filter((f) => f !== id) : [...p.friends, id];
  await saveProfile(p);
  return p;
}

/** Recapitalise a blown account back to $10,000 in exchange for XP. */
export async function recapitalise(): Promise<Profile> {
  const p = await getProfile();
  p.balance = DEFAULT_PROFILE.balance;
  p.xp = Math.max(0, p.xp - RECAP_XP_COST);
  p.recaps += 1;
  await saveProfile(p);
  return p;
}

export async function markTutorialSeen(strategyId: string): Promise<void> {
  const p = await getProfile();
  if (!p.tutorialsSeen.includes(strategyId)) {
    p.tutorialsSeen.push(strategyId);
    await saveProfile(p);
  }
}

export async function updateSettings(s: Profile["settings"]): Promise<Profile> {
  const p = await getProfile();
  p.settings = s;
  await saveProfile(p);
  return p;
}

export const CONCEPT_LABELS: Record<string, string> = {
  SWING_HIGH: "Swing highs",
  SWING_LOW: "Swing lows",
  BOS: "Break of Structure",
  FVG: "Fair Value Gaps",
  ORDER_BLOCK: "Order Blocks",
  SR_LINE: "Support & Resistance",
  PATTERN: "Candlestick patterns",
  QUIZ: "Trade reasoning",
  RISK: "Risk management",
};

/** Aggregate stats for the Profile screen. */
export async function getStats() {
  const p = await getProfile();
  const t = p.totals;
  const concepts = Object.entries(p.concepts)
    .filter(([, c]) => c.total > 0)
    .map(([id, c]) => ({ id, label: CONCEPT_LABELS[id] ?? id, accuracy: c.correct / c.total, total: c.total }))
    .sort((a, b) => b.accuracy - a.accuracy);
  return {
    profile: p,
    trades: t.levels,
    winRate: t.levels ? t.wins / t.levels : 0,
    avgR: t.levels ? t.sumR / t.levels : 0,
    markingAccuracy: t.marksPlaced ? t.marksCorrect / t.marksPlaced : 0,
    quizAccuracy: t.answersTotal ? t.answersCorrect / t.answersTotal : 0,
    concepts,
    strongest: concepts[0] ?? null,
    weakest: concepts.length > 1 ? concepts[concepts.length - 1]! : null,
  };
}

/** Practice trades earn a little XP (10, +10 for a win), capped per day. */
export async function awardPracticeXp(won: boolean): Promise<{ xpGained: number; rankedUp: boolean; xp: number; capped: boolean }> {
  const p = await getProfile();
  const before = rankForXp(p.xp).step;
  const today = dayKey();
  if (p.practiceXp.day !== today) p.practiceXp = { day: today, xp: 0 };
  const xpGained = Math.max(0, Math.min(won ? 20 : 10, PRACTICE_XP_DAILY_CAP - p.practiceXp.xp));
  p.practiceXp.xp += xpGained;
  p.xp += xpGained;
  await saveProfile(p);
  return { xpGained, rankedUp: rankForXp(p.xp).step > before, xp: p.xp, capped: p.practiceXp.xp >= PRACTICE_XP_DAILY_CAP };
}

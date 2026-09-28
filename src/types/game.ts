// Shared game types — the server reuses these exact schemas to re-check scores.

export type Candle = { i: number; o: number; h: number; l: number; c: number };

export type MarkType =
  | "FVG"
  | "BOS"
  | "SWING_HIGH"
  | "SWING_LOW"
  | "ORDER_BLOCK"
  | "SR_LINE"
  | "PATTERN"; // a candlestick pattern candle (Tier 1)

export type Mark = {
  id: string;
  type: MarkType;
  // boxes use i1,i2,p1,p2; lines use i1,(i2),p1; points use i1,p1
  i1: number;
  i2?: number | undefined;
  p1: number;
  p2?: number | undefined;
};

export type AnswerMark = Mark & { tolerance: { candles: number; pricePct: number } };

export type Question =
  | { id: string; kind: "mcq"; prompt: string; options: string[]; correctIndex: number }
  | { id: string; kind: "truefalse"; prompt: string; correct: boolean }
  | { id: string; kind: "tap"; prompt: string; correctCandle: number; toleranceCandles: number };

export type Difficulty = "tutorial" | "easy" | "medium" | "hard" | "exam";

export type Level = {
  id: string; // "t2-bos-easy-1"
  tier: 1 | 2 | 3 | 4;
  strategyId: string; // "bos"
  difficulty: Difficulty;
  candles: Candle[]; // full series, including the outcome
  decisionIndex: number; // replay pauses after this candle
  answerKey: AnswerMark[];
  correctDirection: "buy" | "sell";
  logicalSL: { min: number; max: number }; // price range counted as a logical SL
  questions: Question[];
  explanation: string; // markdown shown on the review screen
  hintArea?: { i1: number; i2: number; p1: number; p2: number } | undefined;
  version: number;
  /** Real market this chart came from. Hidden while playing, revealed on review. */
  source?: { label: string; timeframe: string; from: number; to: number; decisionTime: number } | undefined;
};

export type GameMode = "campaign" | "practice" | "timed" | "daily" | "ranked";

export type ActionLog = {
  levelId: string;
  mode?: GameMode;
  levelVersion: number;
  transformSeed: number;
  startedAt: number;
  events: Array<
    | { t: number; type: "decision" } // chart paused at the decision point
    | { t: number; type: "mark_add"; mark: Mark }
    | { t: number; type: "mark_remove"; id: string }
    | { t: number; type: "marking_done" }
    | { t: number; type: "trade"; side: "buy" | "sell"; entry: number; sl?: number | undefined; tp: number; riskPct: number }
    | { t: number; type: "answer"; questionId: string; value: number | boolean }
  >;
  clientScore: number;
  stars: 0 | 1 | 2 | 3;
};

export type ScoreLine = { label: string; points: number; kind: "reward" | "fine" | "info" };

export type ScoreBreakdown = {
  lines: ScoreLine[];
  total: number;
  r: number; // realized R multiple
  stars: 0 | 1 | 2 | 3;
  marksCorrect: number;
  marksWrong: number;
  marksMissed: number;
  answersCorrect: number;
  answersWrong: number;
  won: boolean;
};

export type Strategy = {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  premium: boolean;
  description: string;
  playable: boolean;
};

export type Tier = { tier: 1 | 2 | 3 | 4; name: string; premium: boolean };

export type LevelResult = {
  levelId: string;
  stars: 0 | 1 | 2 | 3;
  score: number;
  r: number;
  won: boolean;
  completedAt: number;
};

export type BadgeId = "sniper" | "disciplined" | "first_blood" | "scholar" | "comeback";

export type Profile = {
  xp: number;
  balance: number;
  results: Record<string, LevelResult>;
  badges: BadgeId[];
  tutorialsSeen: string[];
  perfectSetupStreak: number;
  slTradeCount: number;
  perfectQuizCount: number;
  totals: {
    levels: number;
    wins: number;
    sumR: number;
    marksCorrect: number;
    marksPlaced: number;
    answersCorrect: number;
    answersTotal: number;
  };
  /** Per-concept accuracy (mark types + quiz), for strongest/weakest stats. */
  concepts: Record<string, { correct: number; total: number }>;
  /** Academy lessons: best quiz score (0..1) and when first completed. */
  academy: Record<string, { best: number; completedAt: number }>;
  /** Attempts per "mode:levelId" (first attempt is the one that counts for rankings). */
  attempts: Record<string, number>;
  /** Score of the first attempt per "mode:levelId" (used by leaderboards). */
  firstTry: Record<string, number>;
  /** Quiz attempts per academy lesson (XP shrinks with each retry). */
  quizAttempts: Record<string, number>;
  /** Practice XP earned today (capped per day). */
  practiceXp: { day: string; xp: number };
  /** Day keys (YYYY-MM-DD) on which the daily challenge was played. */
  dailyDone: Record<string, boolean>;
  /** Times the virtual account was recapitalised after being blown. */
  recaps: number;
  /** Local profile ids this player follows (Friends leaderboard). */
  friends: string[];
  settings: {
    sound: boolean;
    theme: "dark" | "light";
    chartColors: "classic" | "colorblind" | "mono";
    tutorials: boolean;
  };
};

export type LeaderboardEntry = {
  rank: number;
  name: string;
  score: number;
  accuracy: number;
  isYou?: boolean;
};

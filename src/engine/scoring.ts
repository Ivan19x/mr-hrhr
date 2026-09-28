// Scoring engine. Pure function: computeScore(level, log) => ScoreBreakdown.
// The server reuses this exact file to re-check submitted scores.
import type { ActionLog, Level, ScoreBreakdown, ScoreLine, Mark } from "@/types/game";
import { matchMarks } from "./marking";
import { simulateTrade } from "./trade";

const MARK_NAMES: Record<Mark["type"], string> = {
  FVG: "fair value gap",
  BOS: "BOS line",
  SWING_HIGH: "swing high",
  SWING_LOW: "swing low",
  ORDER_BLOCK: "order block",
  SR_LINE: "S/R line",
  PATTERN: "pattern candle",
};

export const POINTS = {
  winPerR: 100,
  loss: -100,
  correctMark: 30,
  wrongMark: -20,
  missedMark: 0,
  correctAnswer: 40,
  wrongAnswer: -50,
  setupMatch: 50,
  fastDecision: 25,
  noStopLoss: -30,
} as const;

/** Risk used to measure R on a trade without a stop loss: distance to the logical SL. */
export function fallbackRisk(level: Level, entry: number): number {
  const mid = (level.logicalSL.min + level.logicalSL.max) / 2;
  return Math.abs(entry - mid);
}

export function computeScore(level: Level, log: ActionLog): ScoreBreakdown {
  const lines: ScoreLine[] = [];

  // Rebuild final mark set from the event log (adds and removes, in order).
  const marks = new Map<string, Mark>();
  let markingDoneAt: number | null = null;
  let decisionAt: number | null = null;
  let tradeEvent: Extract<ActionLog["events"][number], { type: "trade" }> | null = null;
  const answers = new Map<string, number | boolean>();

  for (const ev of log.events) {
    if (ev.type === "mark_add") marks.set(ev.mark.id, ev.mark);
    else if (ev.type === "mark_remove") marks.delete(ev.id);
    else if (ev.type === "marking_done") markingDoneAt = ev.t;
    else if (ev.type === "decision") decisionAt = ev.t;
    else if (ev.type === "trade") tradeEvent = ev;
    else if (ev.type === "answer") answers.set(ev.questionId, ev.value);
  }

  // --- Marks ---
  const match = matchMarks([...marks.values()], level.answerKey);
  for (let k = 0; k < match.correct.length; k++) {
    lines.push({ label: "Correct mark", points: POINTS.correctMark, kind: "reward" });
  }
  for (let k = 0; k < match.wrong.length; k++) {
    lines.push({ label: "Wrong mark", points: POINTS.wrongMark, kind: "fine" });
  }
  for (const m of match.missed) {
    lines.push({ label: `Missed ${MARK_NAMES[m.type]}`, points: POINTS.missedMark, kind: "info" });
  }

  // --- Trade ---
  let r = 0;
  let won = false;
  if (tradeEvent) {
    const outcome = simulateTrade(
      level.candles,
      level.decisionIndex,
      {
        side: tradeEvent.side,
        entry: tradeEvent.entry,
        sl: tradeEvent.sl,
        tp: tradeEvent.tp,
        riskPct: tradeEvent.riskPct,
      },
      fallbackRisk(level, tradeEvent.entry),
    );
    r = outcome.r;
    won = r > 0;
    if (outcome.result === "tp") {
      lines.push({
        label: `Winning trade (+${r.toFixed(1)}R)`,
        points: Math.round(POINTS.winPerR * r),
        kind: "reward",
      });
    } else if (outcome.result === "sl") {
      lines.push({ label: "Losing trade (SL hit)", points: POINTS.loss, kind: "fine" });
    } else if (r > 0) {
      // Still open at the end of the data: closed at the last candle.
      lines.push({
        label: `Closed at end (+${r.toFixed(1)}R)`,
        points: Math.round(POINTS.winPerR * r),
        kind: "reward",
      });
    } else if (r < 0) {
      lines.push({
        label: `Closed at end (${r.toFixed(1)}R)`,
        points: Math.max(POINTS.loss, Math.round(POINTS.winPerR * r)),
        kind: "fine",
      });
    } else {
      lines.push({ label: "Closed flat", points: 0, kind: "info" });
    }
    if (tradeEvent.side !== level.correctDirection) {
      lines.push({ label: "Traded against the setup", points: 0, kind: "info" });
    }

    const slOptional = level.difficulty === "easy" || level.difficulty === "tutorial";
    if (tradeEvent.sl === undefined && slOptional) {
      lines.push({ label: "No stop loss", points: POINTS.noStopLoss, kind: "fine" });
    }

    // Setup match bonus: entry inside a correctly marked zone and SL at a
    // logical level beyond it.
    if (
      tradeEvent.sl !== undefined &&
      tradeEvent.sl >= level.logicalSL.min &&
      tradeEvent.sl <= level.logicalSL.max &&
      match.correct.length > 0
    ) {
      lines.push({ label: "Setup match bonus", points: POINTS.setupMatch, kind: "reward" });
    }

    // Fast decision bonus (timed levels): marking + entry in under 15 s from
    // the moment the chart paused at the decision point.
    const timed = level.difficulty === "hard" || level.difficulty === "exam";
    const clockStart = decisionAt ?? markingDoneAt;
    if (timed && clockStart !== null && tradeEvent.t - clockStart < 15000) {
      lines.push({ label: "Fast decision", points: POINTS.fastDecision, kind: "reward" });
    }
  }

  // --- Questions ---
  let answersCorrect = 0;
  let answersWrong = 0;
  for (const q of level.questions) {
    const v = answers.get(q.id);
    if (v === undefined) continue;
    let ok = false;
    if (q.kind === "mcq") ok = v === q.correctIndex;
    else if (q.kind === "truefalse") ok = v === q.correct;
    else ok = typeof v === "number" && Math.abs(v - q.correctCandle) <= q.toleranceCandles;
    if (ok) {
      answersCorrect++;
      lines.push({ label: "Correct answer", points: POINTS.correctAnswer, kind: "reward" });
    } else {
      answersWrong++;
      lines.push({ label: "Wrong answer", points: POINTS.wrongAnswer, kind: "fine" });
    }
  }

  const total = lines.reduce((s, l) => s + l.points, 0);

  // Stars: 1 for completing, 2 for positive total, 3 for a winning trade
  // plus all marks and all answers correct.
  let stars: 0 | 1 | 2 | 3 = 1;
  if (total > 0) stars = 2;
  const allMarks = match.wrong.length === 0 && match.missed.length === 0 && match.correct.length > 0;
  const allAnswers = answersWrong === 0 && answersCorrect === level.questions.length;
  if (won && allMarks && allAnswers) stars = 3;

  return {
    lines,
    total,
    r,
    stars,
    marksCorrect: match.correct.length,
    marksWrong: match.wrong.length,
    marksMissed: match.missed.length,
    answersCorrect,
    answersWrong,
    won,
  };
}

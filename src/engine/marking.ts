// Mark matching: a player mark is correct when it matches an answer-key mark of
// the same type the way a trader would judge it. Each answer-key mark matches once.
//   • Points (swing high/low, pattern candle): the right candle, at the right price.
//   • BOS lines: start at the broken swing (and end at the breaking candle when set).
//   • S/R lines: the right price level, drawn across the area that matters.
//   • Zones (FVG, order block): overlap most of the real zone without being huge,
//     and cover the candle(s) that created it.
import type { AnswerMark, Mark } from "@/types/game";

function priceClose(a: number, b: number, pct: number): boolean {
  if (b === 0) return Math.abs(a - b) < 1e-9;
  return Math.abs(a - b) / Math.abs(b) <= pct / 100;
}

const isBox = (t: Mark["type"]) => t === "FVG" || t === "ORDER_BLOCK";

export function markMatches(mark: Mark, answer: AnswerMark): boolean {
  if (mark.type !== answer.type) return false;
  const { candles: ci, pricePct } = answer.tolerance;

  if (isBox(answer.type)) {
    if (mark.p2 === undefined || answer.p2 === undefined) return false;
    const aTop = Math.max(answer.p1, answer.p2);
    const aBot = Math.min(answer.p1, answer.p2);
    const mTop = Math.max(mark.p1, mark.p2);
    const mBot = Math.min(mark.p1, mark.p2);
    const aH = Math.max(aTop - aBot, Math.abs(aTop) * 1e-6);
    const overlap = Math.min(aTop, mTop) - Math.max(aBot, mBot);
    if (overlap < 0.5 * aH) return false; // must cover most of the real zone
    if (mTop - mBot > 3.5 * aH + (Math.abs(aTop) * pricePct) / 100) return false; // not a lazy giant box
    const mi1 = Math.min(mark.i1, mark.i2 ?? mark.i1);
    const mi2 = Math.max(mark.i1, mark.i2 ?? mark.i1);
    return mi1 <= answer.i1 + ci && mi2 >= answer.i1 - ci; // covers the candle(s) that made it
  }

  if (answer.type === "SR_LINE") {
    if (!priceClose(mark.p1, answer.p1, pricePct)) return false;
    const mi1 = Math.min(mark.i1, mark.i2 ?? mark.i1);
    const mi2 = Math.max(mark.i1, mark.i2 ?? mark.i1);
    const ai2 = answer.i2 ?? answer.i1;
    return mi1 <= ai2 + ci && mi2 >= answer.i1 - ci; // drawn across the level's area
  }

  if (Math.abs(mark.i1 - answer.i1) > ci) return false;
  if (!priceClose(mark.p1, answer.p1, pricePct)) return false;
  if (answer.type === "BOS" && answer.i2 !== undefined) {
    if (mark.i2 === undefined || Math.abs(mark.i2 - answer.i2) > ci) return false;
  }
  return true;
}

export type MarkMatchResult = {
  correct: Mark[];
  wrong: Mark[];
  missed: AnswerMark[];
  matchedAnswers: AnswerMark[];
};

export function matchMarks(playerMarks: Mark[], answerKey: AnswerMark[]): MarkMatchResult {
  const used = new Set<string>();
  const correct: Mark[] = [];
  const wrong: Mark[] = [];
  for (const m of playerMarks) {
    const hit = answerKey.find((a) => !used.has(a.id) && markMatches(m, a));
    if (hit) {
      used.add(hit.id);
      correct.push(m);
    } else {
      wrong.push(m);
    }
  }
  const missed = answerKey.filter((a) => !used.has(a.id));
  const matchedAnswers = answerKey.filter((a) => used.has(a.id));
  return { correct, wrong, missed, matchedAnswers };
}

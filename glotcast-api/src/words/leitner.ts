/** Leitner boxes 1–5: next review after 1 / 2 / 4 / 8 / 16 days. */
export const INTERVAL_DAYS = [1, 2, 4, 8, 16] as const
export const MAX_BOX = 5
const DAY_MS = 86_400_000

export interface LeitnerState {
  box: number
  correctCount: number
  incorrectCount: number
}

export interface Reviewed extends LeitnerState {
  nextReviewAt: Date
  lastReviewedAt: Date
}

export const intervalDays = (box: number): number => INTERVAL_DAYS[Math.min(MAX_BOX, Math.max(1, box)) - 1]!

/** Known → one box up (at most 5); unknown → back to box 1. The next review follows the new box. */
export function review(state: LeitnerState, known: boolean, now = new Date()): Reviewed {
  const box = known ? Math.min(MAX_BOX, state.box + 1) : 1
  return {
    box,
    correctCount: state.correctCount + (known ? 1 : 0),
    incorrectCount: state.incorrectCount + (known ? 0 : 1),
    lastReviewedAt: now,
    nextReviewAt: new Date(now.getTime() + intervalDays(box) * DAY_MS),
  }
}

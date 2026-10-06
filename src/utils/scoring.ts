import type { AnswerState, ExamRules, Outcome, Question } from '@/types/exam'

export const DEFAULT_RULES: ExamRules = {
  pointsCorrect: 1,
  penaltyWrong: 0.15,
  penaltyBlank: 0,
  passMark: 5,
  timeLimitMinutes: null,
  shuffleQuestions: true,
  shuffleOptions: false,
  questionCount: null,
}

export function withDefaults(partial?: Partial<ExamRules> | null): ExamRules {
  return { ...DEFAULT_RULES, ...(partial ?? {}) }
}

/** Reglas efectivas de un banco: las suyas sobre las predeterminadas del usuario */
export function resolveBankRules(
  bank?: { rules?: Partial<ExamRules> } | null,
  userDefaults?: Partial<ExamRules> | null,
): ExamRules {
  return withDefaults({ ...(userDefaults ?? {}), ...(bank?.rules ?? {}) })
}

export function outcomeOf(question: Pick<Question, 'correct'>, answer?: AnswerState | null): Outcome {
  if (!answer || answer.selected === null) return 'blank'
  return answer.selected === question.correct ? 'correct' : 'wrong'
}

export interface ScoreBreakdown {
  rawPoints: number
  maxPoints: number
  score: number
  passed: boolean
}

/**
 * Nota = (Aciertos·PuntosAcierto − Fallos·Penalización − Blancas·DescuentoBlanca) · 10 / (Total·PuntosAcierto)
 *
 * Se normaliza por Total·PuntosAcierto para que la nota máxima sea siempre 10
 * (con PuntosAcierto = 1 coincide exactamente con la fórmula clásica ·10/Total).
 * La nota nunca baja de 0.
 */
export function computeScore(
  counts: { correct: number; wrong: number; blank: number; total: number },
  rules: Pick<ExamRules, 'pointsCorrect' | 'penaltyWrong' | 'penaltyBlank' | 'passMark'>,
): ScoreBreakdown {
  const rawPoints =
    counts.correct * rules.pointsCorrect - counts.wrong * rules.penaltyWrong - counts.blank * rules.penaltyBlank
  const maxPoints = counts.total * rules.pointsCorrect
  const score = maxPoints > 0 ? Math.max(0, Math.min(10, (rawPoints * 10) / maxPoints)) : 0
  const rounded = Math.round(score * 100) / 100
  return { rawPoints: Math.round(rawPoints * 1000) / 1000, maxPoints, score: rounded, passed: rounded >= rules.passMark }
}

/** Probabilidad de que adivinar al azar compense, dada la penalización: útil para la UI. */
export function guessExpectedValue(rules: Pick<ExamRules, 'pointsCorrect' | 'penaltyWrong' | 'penaltyBlank'>, optionCount: number, discarded = 0) {
  const remaining = Math.max(1, optionCount - discarded)
  const p = 1 / remaining
  return p * rules.pointsCorrect - (1 - p) * rules.penaltyWrong + rules.penaltyBlank
}

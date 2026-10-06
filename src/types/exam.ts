export interface Question {
  id: string
  text: string
  options: string[]
  /** Índice (base 0) de la opción correcta */
  correct: number
  explanation?: string
  topic?: string
}

export interface ExamRules {
  /** Puntos que suma cada acierto */
  pointsCorrect: number
  /** Puntos que resta cada fallo */
  penaltyWrong: number
  /** Puntos que resta cada pregunta en blanco */
  penaltyBlank: number
  /** Nota mínima (sobre 10) para aprobar */
  passMark: number
  /** Minutos disponibles; null = sin límite */
  timeLimitMinutes: number | null
  shuffleQuestions: boolean
  shuffleOptions: boolean
  /** Número de preguntas por examen; null = todas */
  questionCount: number | null
}

export interface QuestionBank {
  id: string
  name: string
  subject?: string
  description?: string
  questions: Question[]
  /** Reglas recordadas para esta asignatura */
  rules?: Partial<ExamRules>
  createdAt: number
  updatedAt: number
}

export type ExamMode = 'simulation' | 'practice' | 'review'
export type Confidence = 'sure' | 'doubt'
export type Outcome = 'correct' | 'wrong' | 'blank'

/** Pregunta dentro de una sesión: puede venir de varios bancos y con opciones barajadas */
export interface SessionQuestion extends Question {
  /** Clave única en la sesión: `${bankId}::${id}` */
  key: string
  bankId: string
}

export interface AnswerState {
  selected: number | null
  confidence: Confidence | null
  answeredAt?: number
}

export interface ExamSession {
  id: string
  mode: ExamMode
  title: string
  bankIds: string[]
  rules: ExamRules
  questions: SessionQuestion[]
  answers: Record<string, AnswerState>
  flagged: string[]
  currentIndex: number
  startedAt: number
}

export interface ResultDetail {
  key: string
  questionId: string
  bankId: string
  topic?: string
  text: string
  options: string[]
  correct: number
  explanation?: string
  selected: number | null
  confidence: Confidence | null
  outcome: Outcome
}

export interface ExamResult {
  id: string
  mode: ExamMode
  title: string
  bankIds: string[]
  startedAt: number
  finishedAt: number
  durationSec: number
  timedOut: boolean
  total: number
  correct: number
  wrong: number
  blank: number
  /** Puntos brutos antes de escalar a 10 */
  rawPoints: number
  /** Nota sobre 10 */
  score: number
  passed: boolean
  rules: ExamRules
  details: ResultDetail[]
  /** Preguntas que entraron o siguen en el mazo de repaso tras este examen */
  reviewAdded: number
  /** Preguntas que salieron del mazo por estar dominadas */
  reviewMastered: number
}

export type ReviewReason = 'wrong' | 'doubt' | 'blank'

/** Tarjeta del mazo de fallos (sistema Leitner de 5 cajas) */
export interface ReviewItem {
  key: string
  bankId: string
  questionId: string
  reason: ReviewReason
  box: number
  dueAt: number
  addedAt: number
  lastSeenAt: number
  lapses: number
}

export interface BackupFile {
  app: 'matchaTest'
  version: 1
  exportedAt: number
  banks: QuestionBank[]
  results: ExamResult[]
  review: ReviewItem[]
  defaultRules?: ExamRules
}

/** Lo que devuelve el modal de configuración para lanzar un examen */
export interface StartPayload {
  mode: ExamMode
  rules: ExamRules
  /** Temas elegidos; vacío = todos */
  topics: string[]
  interleave: boolean
}

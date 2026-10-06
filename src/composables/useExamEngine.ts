import { computed, ref, watch } from 'vue'
import type {
  AnswerState,
  Confidence,
  ExamMode,
  ExamResult,
  ExamRules,
  ExamSession,
  ResultDetail,
  ReviewItem,
  SessionQuestion,
} from '@/types/exam'
import { computeScore, outcomeOf } from '@/utils/scoring'
import { applyReviewOutcome } from '@/utils/spacedRepetition'
import { uid } from '@/utils/id'
import { readLocal, useStorage, writeLocal } from './useStorage'

const SESSION_KEY = 'active-session'
export const WARNING_SECONDS = 5 * 60

// Estado global (singleton): la sesión sobrevive a cambios de vista y a recargas
const session = ref<ExamSession | null>(readLocal<ExamSession | null>(SESSION_KEY, null))
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null
let finishing: Promise<ExamResult> | null = null

watch(session, (s) => writeLocal(SESSION_KEY, s), { deep: true })
watch(
  () => session.value?.id,
  (id) => {
    if (id && !ticker) ticker = setInterval(() => (now.value = Date.now()), 1000)
    if (!id && ticker) {
      clearInterval(ticker)
      ticker = null
    }
  },
  { immediate: true },
)

export interface StartOptions {
  mode: ExamMode
  title: string
  bankIds: string[]
  questions: SessionQuestion[]
  rules: ExamRules
}

export function useExamEngine() {
  const storage = useStorage()

  const isActive = computed(() => session.value !== null)
  const mode = computed(() => session.value?.mode ?? 'practice')
  /** En práctica y repaso se corrige al instante */
  const instantFeedback = computed(() => mode.value !== 'simulation')

  const questions = computed(() => session.value?.questions ?? [])
  const total = computed(() => questions.value.length)
  const currentIndex = computed(() => session.value?.currentIndex ?? 0)
  const current = computed(() => questions.value[currentIndex.value] ?? null)
  const answerOf = (key: string): AnswerState | undefined => session.value?.answers[key]
  const currentAnswer = computed(() => (current.value ? answerOf(current.value.key) : undefined))
  const isRevealed = (key: string) => instantFeedback.value && (answerOf(key)?.selected ?? null) !== null

  const answeredCount = computed(
    () => questions.value.filter((q) => (answerOf(q.key)?.selected ?? null) !== null).length,
  )
  const liveCounts = computed(() => {
    let correct = 0
    let wrong = 0
    for (const q of questions.value) {
      const o = outcomeOf(q, answerOf(q.key))
      if (o === 'correct') correct++
      else if (o === 'wrong') wrong++
    }
    return { correct, wrong, blank: total.value - correct - wrong }
  })

  const elapsedSec = computed(() => (session.value ? Math.floor((now.value - session.value.startedAt) / 1000) : 0))
  const remainingSec = computed(() => {
    const limit = session.value?.rules.timeLimitMinutes
    if (!session.value || !limit) return null
    return Math.max(0, limit * 60 - elapsedSec.value)
  })

  function start(opts: StartOptions) {
    if (!opts.questions.length) throw new Error('No hay preguntas para este examen.')
    finishing = null
    session.value = {
      id: uid('s'),
      mode: opts.mode,
      title: opts.title,
      bankIds: opts.bankIds,
      rules: { ...opts.rules },
      questions: opts.questions,
      answers: {},
      flagged: [],
      currentIndex: 0,
      startedAt: Date.now(),
    }
    now.value = Date.now()
  }

  function select(optionIndex: number) {
    const s = session.value
    const q = current.value
    if (!s || !q) return
    const prev = s.answers[q.key]
    // En corrección inmediata la respuesta queda bloqueada
    if (instantFeedback.value && prev?.selected != null) return
    // En simulacro: volver a pulsar la misma opción la deja en blanco
    const selected = !instantFeedback.value && prev?.selected === optionIndex ? null : optionIndex
    s.answers[q.key] = { selected, confidence: prev?.confidence ?? null, answeredAt: Date.now() }
  }

  function setConfidence(c: Confidence) {
    const s = session.value
    const q = current.value
    if (!s || !q) return
    const prev = s.answers[q.key] ?? { selected: null, confidence: null }
    s.answers[q.key] = { ...prev, confidence: prev.confidence === c && !instantFeedback.value ? null : c }
  }

  function toggleFlag(key = current.value?.key) {
    const s = session.value
    if (!s || !key) return
    const i = s.flagged.indexOf(key)
    if (i >= 0) s.flagged.splice(i, 1)
    else s.flagged.push(key)
  }

  function goTo(i: number) {
    if (session.value && i >= 0 && i < total.value) session.value.currentIndex = i
  }
  const next = () => goTo(currentIndex.value + 1)
  const prev = () => goTo(currentIndex.value - 1)

  function nextUnanswered() {
    const n = total.value
    for (let step = 1; step <= n; step++) {
      const i = (currentIndex.value + step) % n
      if ((answerOf(questions.value[i].key)?.selected ?? null) === null) return goTo(i)
    }
  }

  /** Corrige, guarda el resultado, actualiza el mazo de repaso y cierra la sesión */
  function finish(timedOut = false): Promise<ExamResult> {
    if (finishing) return finishing
    const s = session.value
    if (!s) return Promise.reject(new Error('No hay examen activo.'))

    finishing = (async () => {
      const finishedAt = Date.now()
      const details: ResultDetail[] = s.questions.map((q) => {
        const a = s.answers[q.key]
        return {
          key: q.key,
          questionId: q.id,
          bankId: q.bankId,
          topic: q.topic,
          text: q.text,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation,
          selected: a?.selected ?? null,
          confidence: a?.confidence ?? null,
          outcome: outcomeOf(q, a),
        }
      })
      const correct = details.filter((d) => d.outcome === 'correct').length
      const wrong = details.filter((d) => d.outcome === 'wrong').length
      const blank = details.length - correct - wrong
      const score = computeScore({ correct, wrong, blank, total: details.length }, s.rules)

      // Repaso espaciado
      const existing = new Map(storage.review.value.map((r) => [r.key, r]))
      const upserts: ReviewItem[] = []
      const removals: string[] = []
      for (const d of details) {
        const change = applyReviewOutcome(existing.get(d.key), { ...d, mode: s.mode }, finishedAt)
        if (change.upsert) upserts.push(change.upsert)
        if (change.remove) removals.push(change.remove)
      }

      const result: ExamResult = {
        id: uid('r'),
        mode: s.mode,
        title: s.title,
        bankIds: s.bankIds,
        startedAt: s.startedAt,
        finishedAt,
        durationSec: Math.round((finishedAt - s.startedAt) / 1000),
        timedOut,
        total: details.length,
        correct,
        wrong,
        blank,
        rawPoints: score.rawPoints,
        score: score.score,
        passed: score.passed,
        rules: s.rules,
        details,
        reviewAdded: upserts.filter((u) => u.box === 1).length,
        reviewMastered: removals.length,
      }

      await storage.applyReviewChanges(upserts, removals)
      await storage.addResult(result)
      session.value = null
      return result
    })()
    finishing.catch(() => (finishing = null))
    return finishing
  }

  function abandon() {
    session.value = null
    finishing = null
  }

  return {
    session,
    isActive,
    mode,
    instantFeedback,
    questions,
    total,
    currentIndex,
    current,
    currentAnswer,
    answerOf,
    isRevealed,
    answeredCount,
    liveCounts,
    elapsedSec,
    remainingSec,
    start,
    select,
    setConfidence,
    toggleFlag,
    goTo,
    next,
    prev,
    nextUnanswered,
    finish,
    abandon,
  }
}

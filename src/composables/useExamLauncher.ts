import { useRouter } from 'vue-router'
import type { ExamResult, Outcome, Question, QuestionBank, StartPayload } from '@/types/exam'
import { useExamEngine } from './useExamEngine'
import { useStorage } from './useStorage'
import { useToast } from './useToast'
import { bankEntries, buildSessionQuestions } from '@/utils/sessionBuilder'
import { withDefaults } from '@/utils/scoring'
import { isDue } from '@/utils/spacedRepetition'

/** Punto único para iniciar cualquier tipo de sesión y navegar al examen */
export function useExamLauncher() {
  const router = useRouter()
  const engine = useExamEngine()
  const storage = useStorage()
  const toast = useToast()

  function go() {
    router.push({ name: 'exam' })
  }

  function launchBank(bank: QuestionBank, p: StartPayload) {
    const questions = buildSessionQuestions(bankEntries(bank), {
      topics: p.topics,
      count: p.rules.questionCount,
      shuffleQuestions: p.rules.shuffleQuestions,
      shuffleOptions: p.rules.shuffleOptions,
      interleave: p.interleave,
    })
    if (!questions.length) return toast.show('No hay preguntas con esos filtros.', 'error')
    engine.start({ mode: p.mode, title: bank.name, bankIds: [bank.id], questions, rules: p.rules })
    go()
  }

  /** Mazo de fallos: pendientes de hoy (o todo el mazo) de uno o todos los bancos */
  function launchReview(opts: { onlyDue?: boolean; bankId?: string } = {}) {
    const now = Date.now()
    const items = storage.reviewValid.value
      .filter((r) => !opts.bankId || r.bankId === opts.bankId)
      .filter((r) => !opts.onlyDue || isDue(r, now))
      // Primero las más atrasadas y de caja más baja
      .sort((a, b) => a.box - b.box || a.dueAt - b.dueAt)

    const entries: { bankId: string; question: Question }[] = []
    for (const item of items) {
      const q = storage.getBank(item.bankId)?.questions.find((x) => x.id === item.questionId)
      if (q) entries.push({ bankId: item.bankId, question: q })
    }
    if (!entries.length) return toast.show('Tu mazo de repaso está vacío. ¡Bien hecho!', 'blush')

    const bankIds = [...new Set(entries.map((e) => e.bankId))]
    const firstBank = storage.getBank(bankIds[0])
    const rules = withDefaults({ ...storage.defaultRules.value, ...firstBank?.rules, timeLimitMinutes: null, questionCount: null })
    const questions = buildSessionQuestions(entries, { interleave: true, shuffleOptions: true })
    engine.start({
      mode: 'review',
      title: bankIds.length === 1 && firstBank ? `Repaso · ${firstBank.name}` : 'Repaso · Todos los bancos',
      bankIds,
      questions,
      rules,
    })
    go()
  }

  /** Volver a practicar las preguntas de un resultado según su desenlace */
  function launchFromResult(result: ExamResult, outcomes: Outcome[], includeDoubts = true) {
    const entries = result.details
      .filter((d) => outcomes.includes(d.outcome) || (includeDoubts && d.confidence === 'doubt'))
      .map((d) => {
        // Si el banco sigue existiendo se usa la versión actual de la pregunta
        const live = storage.getBank(d.bankId)?.questions.find((q) => q.id === d.questionId)
        const question: Question = live ?? {
          id: d.questionId,
          text: d.text,
          options: d.options,
          correct: d.correct,
          explanation: d.explanation,
          topic: d.topic,
        }
        return { bankId: d.bankId, question }
      })
    if (!entries.length) return toast.show('No hay preguntas que repasar en este intento.', 'blush')
    engine.start({
      mode: 'practice',
      title: `Fallos · ${result.title}`,
      bankIds: result.bankIds,
      questions: buildSessionQuestions(entries, { shuffleQuestions: true, shuffleOptions: true }),
      rules: { ...result.rules, timeLimitMinutes: null, questionCount: null },
    })
    go()
  }

  return { launchBank, launchReview, launchFromResult }
}

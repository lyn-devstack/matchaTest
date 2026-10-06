import type { Question, QuestionBank, SessionQuestion } from '@/types/exam'
import { questionKey } from './id'
import { interleaveBy, shuffle } from './shuffle'

export interface BuildOptions {
  topics?: string[] | null
  count?: number | null
  shuffleQuestions?: boolean
  shuffleOptions?: boolean
  /** Alterna temas en lugar de agruparlos (aprendizaje intercalado) */
  interleave?: boolean
}

export const NO_TOPIC = 'Sin tema'
export const topicOf = (q: Pick<Question, 'topic'>) => q.topic?.trim() || NO_TOPIC

export function bankTopics(bank: QuestionBank): string[] {
  return [...new Set(bank.questions.map(topicOf))]
}

function shuffleOptionsOf(q: SessionQuestion): SessionQuestion {
  const order = shuffle(q.options.map((_, i) => i))
  return { ...q, options: order.map((i) => q.options[i]), correct: order.indexOf(q.correct) }
}

export function toSessionQuestion(bankId: string, q: Question): SessionQuestion {
  return { ...q, key: questionKey(bankId, q.id), bankId }
}

export function buildSessionQuestions(
  entries: { bankId: string; question: Question }[],
  opts: BuildOptions = {},
): SessionQuestion[] {
  let list = entries.map((e) => toSessionQuestion(e.bankId, e.question))
  if (opts.topics?.length) {
    const wanted = new Set(opts.topics)
    list = list.filter((q) => wanted.has(topicOf(q)))
  }
  if (opts.interleave) list = interleaveBy(list, topicOf)
  else if (opts.shuffleQuestions) list = shuffle(list)

  if (opts.count && opts.count > 0 && opts.count < list.length) {
    // Si se ha recortado, se recorta tras barajar para que cada intento sea distinto
    list = (opts.interleave || opts.shuffleQuestions ? list : shuffle(list)).slice(0, opts.count)
    if (!opts.interleave && !opts.shuffleQuestions) {
      const order = new Map(entries.map((e, i) => [questionKey(e.bankId, e.question.id), i]))
      list.sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0))
    }
  }
  if (opts.shuffleOptions) list = list.map(shuffleOptionsOf)
  return list
}

export function bankEntries(bank: QuestionBank) {
  return bank.questions.map((question) => ({ bankId: bank.id, question }))
}

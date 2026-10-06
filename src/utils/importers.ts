import type { ExamRules, Question } from '@/types/exam'

export interface ParsedBank {
  name?: string
  subject?: string
  description?: string
  questions: Question[]
  rules?: Partial<ExamRules>
  warnings: string[]
}

type Raw = Record<string, unknown>

const pick = (obj: Raw, keys: string[]): unknown => {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k]
  return undefined
}

const asText = (v: unknown): string | undefined => {
  if (typeof v === 'string') return v.trim() || undefined
  if (typeof v === 'number') return String(v)
  return undefined
}

const letterIndex = (s: string): number | null => {
  const m = s.trim().match(/^([a-hA-H])[).]?$/)
  return m ? m[1].toUpperCase().charCodeAt(0) - 65 : null
}

/** Asegura ids únicos dentro del banco */
function dedupeIds(questions: Question[]): Question[] {
  const seen = new Set<string>()
  return questions.map((q, i) => {
    let id = q.id || `q${i + 1}`
    while (seen.has(id)) id = `${id}_${i + 1}`
    seen.add(id)
    return { ...q, id }
  })
}

// ───────────────────────────── JSON ─────────────────────────────

function resolveCorrect(raw: unknown, options: string[], optionFlags: boolean[]): number | null {
  const flagged = optionFlags.indexOf(true)
  if (raw === undefined || raw === null) return flagged >= 0 ? flagged : null

  if (typeof raw === 'number' && Number.isInteger(raw)) {
    if (raw >= 0 && raw < options.length) return raw
    // Se tolera numeración base 1 cuando el índice se sale del rango
    if (raw === options.length) return raw - 1
    return null
  }
  if (typeof raw === 'string') {
    const s = raw.trim()
    const li = letterIndex(s)
    if (li !== null && li < options.length) return li
    if (/^\d+$/.test(s)) return resolveCorrect(Number(s), options, optionFlags)
    const byText = options.findIndex((o) => o.trim().toLowerCase() === s.toLowerCase())
    if (byText >= 0) return byText
  }
  if (Array.isArray(raw) && raw.length) return resolveCorrect(raw[0], options, optionFlags)
  return null
}

function normalizeQuestion(raw: Raw, index: number, warnings: string[], topicFallback?: string): Question | null {
  const label = `Pregunta ${index + 1}`
  const text = asText(pick(raw, ['text', 'question', 'pregunta', 'enunciado', 'statement', 'title']))
  if (!text) {
    warnings.push(`${label}: sin enunciado, se ignora.`)
    return null
  }

  let rawOptions = pick(raw, ['options', 'opciones', 'choices', 'answers', 'respuestas', 'alternativas'])
  let letterKeys: string[] | null = null
  if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
    letterKeys = Object.keys(rawOptions as Raw)
    rawOptions = Object.values(rawOptions as Raw)
  }
  if (!Array.isArray(rawOptions)) {
    warnings.push(`${label}: no tiene opciones, se ignora.`)
    return null
  }

  const options: string[] = []
  const flags: boolean[] = []
  for (const opt of rawOptions) {
    if (typeof opt === 'string' || typeof opt === 'number') {
      options.push(String(opt).trim())
      flags.push(false)
    } else if (opt && typeof opt === 'object') {
      const o = opt as Raw
      const t = asText(pick(o, ['text', 'texto', 'label', 'option', 'opcion']))
      if (t) {
        options.push(t)
        flags.push(Boolean(pick(o, ['correct', 'correcta', 'isCorrect', 'is_correct'])))
      }
    }
  }
  if (options.length < 2) {
    warnings.push(`${label}: necesita al menos 2 opciones, se ignora.`)
    return null
  }

  let correctRaw = pick(raw, ['correct', 'correctIndex', 'answer', 'correcta', 'respuesta', 'respuestaCorrecta', 'solution', 'solucion'])
  // Si las opciones venían como { a: "...", b: "..." } y la respuesta es una clave
  if (letterKeys && typeof correctRaw === 'string' && letterKeys.includes(correctRaw)) {
    correctRaw = letterKeys.indexOf(correctRaw)
  }
  const correct = resolveCorrect(correctRaw, options, flags)
  if (correct === null) {
    warnings.push(`${label}: no se pudo determinar la respuesta correcta, se ignora.`)
    return null
  }

  return {
    id: asText(pick(raw, ['id', 'uid', 'codigo'])) ?? `q${index + 1}`,
    text,
    options,
    correct,
    explanation: asText(pick(raw, ['explanation', 'explicacion', 'explicación', 'justificacion', 'feedback', 'rationale'])),
    topic: asText(pick(raw, ['topic', 'tema', 'chapter', 'capitulo', 'capítulo', 'unit', 'unidad'])) ?? topicFallback,
  }
}

function rulesFromJson(raw: unknown): Partial<ExamRules> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Raw
  const num = (keys: string[]) => {
    const v = pick(r, keys)
    const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v
    return typeof n === 'number' && Number.isFinite(n) ? n : undefined
  }
  const out: Partial<ExamRules> = {}
  const pc = num(['pointsCorrect', 'puntosAcierto', 'acierto'])
  const pw = num(['penaltyWrong', 'penalizacion', 'penalizacionFallo', 'fallo'])
  const pb = num(['penaltyBlank', 'penalizacionBlanco', 'blanco'])
  const pm = num(['passMark', 'notaCorte', 'aprobado'])
  const tl = num(['timeLimitMinutes', 'tiempo', 'minutos', 'duracion'])
  if (pc !== undefined) out.pointsCorrect = pc
  if (pw !== undefined) out.penaltyWrong = Math.abs(pw)
  if (pb !== undefined) out.penaltyBlank = Math.abs(pb)
  if (pm !== undefined) out.passMark = pm
  if (tl !== undefined) out.timeLimitMinutes = tl > 0 ? tl : null
  return Object.keys(out).length ? out : undefined
}

export function parseJsonBank(text: string): ParsedBank {
  const warnings: string[] = []
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (e) {
    throw new Error(`El JSON no es válido: ${(e as Error).message}`)
  }

  const questions: Question[] = []
  const pushAll = (list: unknown, topic?: string) => {
    if (!Array.isArray(list)) return
    for (const item of list) {
      if (!item || typeof item !== 'object') continue
      const q = normalizeQuestion(item as Raw, questions.length, warnings, topic)
      if (q) questions.push(q)
    }
  }

  let meta: Raw = {}
  if (Array.isArray(data)) {
    pushAll(data)
  } else if (data && typeof data === 'object') {
    meta = data as Raw
    pushAll(pick(meta, ['questions', 'preguntas', 'items']))
    const topics = pick(meta, ['topics', 'temas', 'chapters', 'capitulos'])
    if (Array.isArray(topics)) {
      for (const t of topics) {
        if (!t || typeof t !== 'object') continue
        const tr = t as Raw
        pushAll(pick(tr, ['questions', 'preguntas', 'items']), asText(pick(tr, ['name', 'nombre', 'title', 'titulo'])))
      }
    }
  } else {
    throw new Error('El JSON debe ser una lista de preguntas o un objeto con "questions".')
  }

  return {
    name: asText(pick(meta, ['name', 'nombre', 'title', 'titulo'])),
    subject: asText(pick(meta, ['subject', 'asignatura', 'course'])),
    description: asText(pick(meta, ['description', 'descripcion', 'convocatoria'])),
    rules: rulesFromJson(pick(meta, ['rules', 'config', 'criterios', 'reglas'])),
    questions: dedupeIds(questions),
    warnings,
  }
}

// ─────────────────────────── Markdown ───────────────────────────

interface Draft {
  text: string[]
  options: string[]
  correct: number | null
  explanation: string[]
  topic?: string
  line: number
}

const CORRECT_MARK = /\s*(?:\*{1,2}|✓|✔|\((?:correcta|correct|ok)\)|\[(?:correcta|x)\])\s*$/i

export function parseMarkdownBank(text: string): ParsedBank {
  const warnings: string[] = []
  const questions: Question[] = []
  let name: string | undefined
  let topic: string | undefined
  let draft: Draft | null = null
  let inExplanation = false

  const flush = () => {
    if (!draft) return
    const stem = draft.text.join(' ').trim()
    if (!stem) {
      // nada
    } else if (draft.options.length < 2) {
      warnings.push(`Línea ${draft.line}: "${stem.slice(0, 40)}…" tiene menos de 2 opciones, se ignora.`)
    } else if (draft.correct === null || draft.correct >= draft.options.length) {
      warnings.push(`Línea ${draft.line}: "${stem.slice(0, 40)}…" no marca la respuesta correcta, se ignora.`)
    } else {
      questions.push({
        id: `q${questions.length + 1}`,
        text: stem,
        options: draft.options,
        correct: draft.correct,
        explanation: draft.explanation.join('\n').trim() || undefined,
        topic: draft.topic,
      })
    }
    draft = null
    inExplanation = false
  }

  const start = (stem: string, line: number) => {
    flush()
    draft = { text: [stem], options: [], correct: null, explanation: [], topic, line }
  }

  const addOption = (raw: string, isCorrect: boolean) => {
    if (!draft) return
    let t = raw.trim()
    if (CORRECT_MARK.test(t)) {
      isCorrect = true
      t = t.replace(CORRECT_MARK, '').trim()
    }
    if (/^\*\*(.+)\*\*$/.test(t)) {
      isCorrect = true
      t = t.slice(2, -2).trim()
    }
    if (isCorrect) draft.correct = draft.options.length
    draft.options.push(t)
  }

  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  lines.forEach((rawLine, i) => {
    const line = rawLine.trim()
    const lineNo = i + 1
    if (!line) {
      inExplanation = false
      return
    }
    let m: RegExpMatchArray | null

    if ((m = line.match(/^#\s+(.+)$/))) {
      flush()
      if (!name) name = m[1].trim()
      return
    }
    if ((m = line.match(/^##\s+(.+)$/))) {
      flush()
      topic = m[1].replace(/^tema\s*/i, (s) => s).trim()
      return
    }
    if ((m = line.match(/^(?:#{3,6}\s+)(?:\d+[.)-]\s*)?(.+)$/))) {
      start(m[1], lineNo)
      return
    }
    if ((m = line.match(/^(?:respuesta|soluci[oó]n|correcta|answer)\s*(?:correcta)?\s*[:=]\s*([a-hA-H]|\d+)\b/i))) {
      if (draft) {
        const d = draft as Draft
        const v = m[1]
        d.correct = /\d/.test(v) ? Number(v) - 1 : v.toUpperCase().charCodeAt(0) - 65
      }
      return
    }
    if ((m = line.match(/^(?:explicaci[oó]n|justificaci[oó]n|explanation|feedback)\s*:\s*(.*)$/i))) {
      if (draft) {
        ;(draft as Draft).explanation.push(m[1])
        inExplanation = true
      }
      return
    }
    if ((m = line.match(/^>\s?(.*)$/))) {
      if (draft) {
        ;(draft as Draft).explanation.push(m[1])
        inExplanation = true
      }
      return
    }
    if ((m = line.match(/^[-*+]\s*\[( |x|X)\]\s*(.+)$/))) {
      addOption(m[2], m[1].toLowerCase() === 'x')
      return
    }
    if ((m = line.match(/^(\*{0,2})\s*([a-hA-H])[).]\s+(.+)$/)) && draft) {
      addOption(m[3], m[1].length > 0)
      return
    }
    if ((m = line.match(/^(?:\d+[.)]|[QP]\d*[:.)])\s+(.+)$/))) {
      start(m[1], lineNo)
      return
    }
    if ((m = line.match(/^[-*+]\s+(.+)$/)) && draft) {
      addOption(m[1], false)
      return
    }
    if (draft) {
      const d = draft as Draft
      if (inExplanation) d.explanation.push(line)
      else if (d.options.length === 0) d.text.push(line)
    }
  })
  flush()

  return { name, questions, warnings }
}

// ─────────────────────────── Detección ───────────────────────────

export function parseBankText(text: string): ParsedBank {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('El contenido está vacío.')
  const parsed = trimmed.startsWith('{') || trimmed.startsWith('[') ? parseJsonBank(trimmed) : parseMarkdownBank(trimmed)
  if (parsed.questions.length === 0) {
    throw new Error(
      parsed.warnings.length
        ? `No se encontró ninguna pregunta válida. ${parsed.warnings.slice(0, 3).join(' ')}`
        : 'No se encontró ninguna pregunta. Revisa el formato de ejemplo.',
    )
  }
  return parsed
}

export const JSON_EXAMPLE = `{
  "name": "Psicología de la Memoria",
  "subject": "Psicología · UNED",
  "rules": { "penaltyWrong": 0.33, "timeLimitMinutes": 90 },
  "questions": [
    {
      "text": "¿Quién propuso el modelo multialmacén?",
      "options": ["Baddeley", "Atkinson y Shiffrin", "Tulving"],
      "correct": 1,
      "explanation": "Atkinson y Shiffrin (1968).",
      "topic": "Tema 1"
    }
  ]
}`

export const MARKDOWN_EXAMPLE = `# Psicología de la Memoria

## Tema 1: Modelos de memoria

1. ¿Quién propuso el modelo multialmacén?
- [ ] Baddeley
- [x] Atkinson y Shiffrin
- [ ] Tulving
> Atkinson y Shiffrin lo publicaron en 1968.

2. La memoria de trabajo incluye un bucle…
a) visoespacial
b) fonológico *
c) episódico
Explicación: El bucle fonológico mantiene información verbal.`

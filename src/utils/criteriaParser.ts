import type { ExamRules } from '@/types/exam'

export type DetectedField = 'pointsCorrect' | 'penaltyWrong' | 'penaltyBlank' | 'passMark' | 'timeLimitMinutes' | 'questionCount'

export interface Finding {
  field: DetectedField
  value: number | null
  snippet: string
}

export interface CriteriaResult {
  rules: Partial<ExamRules>
  findings: Finding[]
}

const WORD_NUMBERS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
}
const WORD_FRACTIONS: Record<string, number> = {
  'la mitad': 1 / 2, medio: 1 / 2, 'un tercio': 1 / 3, 'una tercera parte': 1 / 3, 'un cuarto': 1 / 4,
  'una cuarta parte': 1 / 4, 'un quinto': 1 / 5, 'una quinta parte': 1 / 5,
}

/** Minúsculas, sin tildes, espacios normalizados */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ \t]+/g, ' ')
}

const toNumber = (s: string) => Number(s.replace(',', '.'))
const round = (n: number) => Math.round(n * 1000) / 1000

const NUM = String.raw`(\d+(?:[.,]\d+)?)`
const WRONG = /(incorrect|erronea|erroneas|fallad|fallo|fallos|mal contestad|mal respondid|equivocad|error)/
const BLANK = /(en blanco|sin contestar|sin responder|no contestad|no respondid|omitid)/
const CORRECT = /(correct|acierto|bien contestad|bien respondid)/
const NEGATED = /\bno\s+(?:se\s+)?(?:penaliza|penalizan|resta|restan|descuenta|descuentan|puntua|puntuan|computa|computan|tienen penalizacion|tiene penalizacion)|\bsin penalizacion|\bno hay penalizacion|\bno penalizan/

/** Busca un valor numérico (decimal, fracción o fracción en palabras) en el fragmento */
function findValue(sentence: string, base: number): number | null {
  const frac = sentence.match(/(\d+)\s*\/\s*(\d+)/)
  if (frac && Number(frac[2]) > 0) return round((Number(frac[1]) / Number(frac[2])) * base)
  for (const [w, v] of Object.entries(WORD_FRACTIONS)) {
    if (sentence.includes(w)) return round(v * base)
  }
  const pct = sentence.match(new RegExp(`${NUM}\\s*%`))
  if (pct) return round((toNumber(pct[1]) / 100) * base)
  const dec = sentence.match(new RegExp(`(?:resta|restan|restara|restaran|descuenta|descuentan|penaliza|penalizan|penalizacion de|penalizara|valen|vale|suma|suman|puntua|puntuan|puntuara|con|de)\\s*(?:-\\s*)?${NUM}`))
  if (dec) return round(toNumber(dec[1]))
  const neg = sentence.match(new RegExp(`-\\s*${NUM}`))
  if (neg) return round(toNumber(neg[1]))
  return null
}

/**
 * Analiza el texto de una guía docente / instrucciones de examen y extrae
 * las reglas de corrección que reconoce. Siempre devuelve el fragmento que
 * justifica cada valor para que el estudiante lo pueda revisar.
 */
export function parseCriteria(input: string): CriteriaResult {
  const text = normalize(input)
  const sentences = text
    .split(/(?<=[.;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
  // Cláusulas: "los fallos restan 0,25 y las blancas no puntúan" → dos reglas distintas
  const clauses = sentences.flatMap((s) =>
    s
      .split(/,\s+|\s+y\s+(?=(?:las?|los|cada|el)\s)|\s+mientras\s+(?:que\s+)?|\s+pero\s+|\s+aunque\s+/)
      .map((c) => c.trim())
      .filter(Boolean),
  )

  const findings: Finding[] = []
  const rules: Partial<ExamRules> = {}
  const add = (field: DetectedField, value: number | null, snippet: string) => {
    if (findings.some((f) => f.field === field)) return
    findings.push({ field, value, snippet: snippet.slice(0, 180) })
    if (field === 'questionCount') rules.questionCount = value
    else if (field === 'timeLimitMinutes') rules.timeLimitMinutes = value
    else if (value !== null) rules[field] = value
  }

  // 1) Puntos por acierto (necesario para escalar fracciones como "un tercio de una correcta")
  for (const s of clauses) {
    if (!CORRECT.test(s) || WRONG.test(s) || BLANK.test(s)) continue
    const m = s.match(new RegExp(`(?:vale|valen|suma|suman|puntua|puntuan|puntuara|se valora(?:ra)? (?:con|en)|otorga|otorgan)\\s*(?:con\\s*)?\\+?${NUM}\\s*(?:punto|pto|pt)?`))
    if (m) {
      add('pointsCorrect', toNumber(m[1]), s)
      break
    }
  }
  const base = rules.pointsCorrect ?? 1

  // 2) Penalización por fallo
  for (const s of clauses) {
    if (!WRONG.test(s) || BLANK.test(s)) continue
    // "cada tres respuestas incorrectas restan una correcta"
    const every = s.match(/cada\s+(\d+|dos|tres|cuatro|cinco|seis)\s+(?:respuestas?\s+|preguntas?\s+)?(?:incorrectas|erroneas|falladas|fallos|errores|mal)[^.]*?(?:restan|anulan|descuentan|eliminan|quitan|equivalen a restar)\s+(?:el valor de\s+)?(?:una|1)\b/)
    if (every) {
      const n = /\d/.test(every[1]) ? Number(every[1]) : WORD_NUMBERS[every[1]]
      if (n) add('penaltyWrong', round(base / n), s)
      break
    }
    if (NEGATED.test(s)) {
      add('penaltyWrong', 0, s)
      break
    }
    if (/(resta|restan|restara|descuenta|penaliza|penalizacion|penalizara|negativ|-\s*\d)/.test(s)) {
      const v = findValue(s, base)
      if (v !== null) {
        add('penaltyWrong', v, s)
        break
      }
    }
  }

  // 3) Preguntas en blanco
  for (const s of clauses) {
    if (!BLANK.test(s)) continue
    if (NEGATED.test(s) || /(ni suman ni restan|no (?:suman|cuentan|computan)|0 puntos|cero puntos)/.test(s)) {
      add('penaltyBlank', 0, s)
      break
    }
    if (/(resta|restan|descuenta|penaliza)/.test(s)) {
      const v = findValue(s, base)
      if (v !== null) {
        add('penaltyBlank', v, s)
        break
      }
    }
  }

  // 4) Duración
  const timeKeywords = /(duracion|tiempo|dispon|durara|minutos para|horas para|examen tendra|realizacion)/
  const parseTime = (s: string): number | null => {
    const hm = s.match(new RegExp(`${NUM}\\s*(?:horas?|h)\\b(?:\\s*(?:y|,)?\\s*(\\d+)\\s*(?:minutos|min))?`))
    if (hm) return Math.round(toNumber(hm[1]) * 60 + (hm[2] ? Number(hm[2]) : 0))
    if (/(una hora y media|hora y media)/.test(s)) return 90
    if (/\buna hora\b/.test(s)) return 60
    if (/\bdos horas\b/.test(s)) return 120
    const mins = s.match(/(\d+)\s*\(?\s*(?:minutos|min)\b/)
    if (mins) return Number(mins[1])
    return null
  }
  // Prioridad a la duración del examen (tablas de la guía UNED: "Duración del examen 120 (minutos)")
  const timeSentence =
    sentences.find((s) => /duracion del examen/.test(s) && parseTime(s) !== null) ??
    sentences.find((s) => timeKeywords.test(s) && parseTime(s) !== null)
  if (timeSentence) add('timeLimitMinutes', parseTime(timeSentence), timeSentence)

  // 5) Nota de corte
  for (const s of sentences) {
    const m = s.match(new RegExp(`(?:aprobar|aprobado|superar|nota minima|nota de corte|calificacion minima)[^.]*?${NUM}`))
    if (m) {
      const v = toNumber(m[1])
      if (v > 0 && v <= 10) {
        add('passMark', v, s)
        break
      }
    }
  }

  // 6) Número de preguntas
  for (const s of sentences) {
    const m = s.match(/(\d+)\s+preguntas/) ?? s.match(/preguntas (?:test|tipo test)\s+(\d+)/)
    if (m && Number(m[1]) > 1 && Number(m[1]) <= 500) {
      add('questionCount', Number(m[1]), s)
      break
    }
  }

  return { rules, findings }
}

export const FIELD_LABELS: Record<DetectedField, string> = {
  pointsCorrect: 'Puntos por acierto',
  penaltyWrong: 'Penalización por fallo',
  penaltyBlank: 'Descuento por blanca',
  passMark: 'Nota de corte',
  timeLimitMinutes: 'Tiempo (min)',
  questionCount: 'Nº de preguntas',
}

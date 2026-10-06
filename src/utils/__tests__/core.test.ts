import { describe, expect, it } from 'vitest'
import { computeScore, DEFAULT_RULES } from '../scoring'
import { parseCriteria } from '../criteriaParser'
import { parseBankText, JSON_EXAMPLE, MARKDOWN_EXAMPLE } from '../importers'
import { applyReviewOutcome } from '../spacedRepetition'

describe('computeScore', () => {
  it('aplica la fórmula clásica con penalización', () => {
    const r = computeScore({ correct: 30, wrong: 10, blank: 10, total: 50 }, { ...DEFAULT_RULES, penaltyWrong: 0.25 })
    // (30 − 2.5) · 10 / 50 = 5.5
    expect(r.score).toBe(5.5)
    expect(r.passed).toBe(true)
  })
  it('normaliza cuando cada acierto vale más de 1', () => {
    const r = computeScore({ correct: 10, wrong: 0, blank: 0, total: 10 }, { ...DEFAULT_RULES, pointsCorrect: 2 })
    expect(r.score).toBe(10)
  })
  it('nunca baja de 0', () => {
    const r = computeScore({ correct: 0, wrong: 10, blank: 0, total: 10 }, { ...DEFAULT_RULES, penaltyWrong: 1 })
    expect(r.score).toBe(0)
  })
  it('descuenta blancas si se configura', () => {
    const r = computeScore({ correct: 5, wrong: 0, blank: 5, total: 10 }, { ...DEFAULT_RULES, penaltyBlank: 0.1 })
    expect(r.score).toBe(4.5)
  })
})

describe('parseCriteria', () => {
  it('detecta "cada tres incorrectas restan una correcta"', () => {
    const r = parseCriteria('El examen consta de 30 preguntas. Cada tres respuestas incorrectas restan una correcta.')
    expect(r.rules.penaltyWrong).toBeCloseTo(0.333, 2)
    expect(r.rules.questionCount).toBe(30)
  })
  it('separa fallos y blancas en la misma frase', () => {
    const r = parseCriteria('Las respuestas incorrectas restan 0,25 puntos y las preguntas en blanco no puntúan.')
    expect(r.rules.penaltyWrong).toBe(0.25)
    expect(r.rules.penaltyBlank).toBe(0)
  })
  it('detecta duración en horas y minutos y nota de corte', () => {
    const r = parseCriteria('Duración del examen: 1 hora y 30 minutos. Para aprobar es necesario obtener un 5.')
    expect(r.rules.timeLimitMinutes).toBe(90)
    expect(r.rules.passMark).toBe(5)
  })
  it('detecta fracciones y ausencia de penalización', () => {
    expect(parseCriteria('Cada pregunta fallada restará 1/4 del valor de una correcta.').rules.penaltyWrong).toBe(0.25)
    expect(parseCriteria('Las respuestas erróneas no penalizan.').rules.penaltyWrong).toBe(0)
  })
  it('escala la penalización con el valor del acierto', () => {
    const r = parseCriteria('Cada respuesta correcta vale 0,5 puntos. Cada respuesta incorrecta resta un tercio del valor de una correcta. Tiempo: 120 minutos.')
    expect(r.rules.pointsCorrect).toBe(0.5)
    expect(r.rules.penaltyWrong).toBeCloseTo(0.167, 2)
    expect(r.rules.timeLimitMinutes).toBe(120)
  })
})

describe('parseCriteria · guía UNED en formato tabla', () => {
  it('lee duración y nº de preguntas del examen, no de las PEC', () => {
    const r = parseCriteria(
      [
        'Tipo de examen Examen tipo test',
        'Preguntas test 20',
        'Duración del examen 120 (minutos)',
        'Cada pregunta bien contestada suma 0,5 puntos;',
        'Cada pregunta mal contestada resta 0,15 puntos;',
        'Las preguntas no contestadas (en blanco) no puntúan.',
        'Nota del examen para aprobar sin PEC 5,6',
        'PEC: una vez que empiece la actividad dispondrá de una hora para completarla.',
      ].join('\n'),
    )
    expect(r.rules).toMatchObject({ pointsCorrect: 0.5, penaltyWrong: 0.15, penaltyBlank: 0, passMark: 5.6, timeLimitMinutes: 120, questionCount: 20 })
    expect(r.findings.find((f) => f.field === 'timeLimitMinutes')?.snippet).toContain('duracion del examen')
  })
})

describe('importers', () => {
  it('lee el ejemplo JSON', () => {
    const b = parseBankText(JSON_EXAMPLE)
    expect(b.name).toBe('Psicología de la Memoria')
    expect(b.questions).toHaveLength(1)
    expect(b.questions[0].correct).toBe(1)
    expect(b.rules?.penaltyWrong).toBe(0.33)
  })
  it('lee el ejemplo Markdown con checkboxes y letras', () => {
    const b = parseBankText(MARKDOWN_EXAMPLE)
    expect(b.questions).toHaveLength(2)
    expect(b.questions[0].correct).toBe(1)
    expect(b.questions[0].topic).toBe('Tema 1: Modelos de memoria')
    expect(b.questions[0].explanation).toContain('1968')
    expect(b.questions[1].correct).toBe(1)
    expect(b.questions[1].options[1]).toBe('fonológico')
    expect(b.questions[1].explanation).toContain('bucle')
  })
  it('acepta respuestas como letra y opciones como objeto', () => {
    const b = parseBankText(JSON.stringify([{ pregunta: '¿2+2?', opciones: { a: '3', b: '4' }, respuesta: 'b' }]))
    expect(b.questions[0].correct).toBe(1)
  })
  it('acepta "Respuesta: C" en markdown', () => {
    const b = parseBankText('1. ¿Capital de Francia?\na) Roma\nb) Madrid\nc) París\nRespuesta: C')
    expect(b.questions[0].correct).toBe(2)
  })
})

describe('applyReviewOutcome', () => {
  const base = { key: 'b::q', bankId: 'b', questionId: 'q', mode: 'practice' as const }
  it('un fallo entra en caja 1', () => {
    const r = applyReviewOutcome(undefined, { ...base, outcome: 'wrong', confidence: null }, 1000)
    expect(r.upsert?.box).toBe(1)
    expect(r.upsert?.dueAt).toBe(1000)
  })
  it('un acierto dudado entra en el mazo', () => {
    const r = applyReviewOutcome(undefined, { ...base, outcome: 'correct', confidence: 'doubt' })
    expect(r.upsert?.reason).toBe('doubt')
  })
  it('un acierto seguro sin tarjeta no hace nada', () => {
    expect(applyReviewOutcome(undefined, { ...base, outcome: 'correct', confidence: 'sure' })).toEqual({})
  })
  it('sale del mazo tras superar la última caja', () => {
    const item = applyReviewOutcome(undefined, { ...base, outcome: 'wrong', confidence: null }).upsert!
    const r = applyReviewOutcome({ ...item, box: 5 }, { ...base, outcome: 'correct', confidence: 'sure' })
    expect(r.remove).toBe('b::q')
  })
})

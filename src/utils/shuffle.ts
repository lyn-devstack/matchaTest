/** Fisher–Yates, devuelve una copia */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Intercalado (interleaving): reparte las preguntas alternando temas
 * para que nunca salgan muchas seguidas del mismo bloque.
 */
export function interleaveBy<T>(items: readonly T[], groupOf: (item: T) => string): T[] {
  const groups = new Map<string, T[]>()
  for (const item of shuffle(items)) {
    const g = groupOf(item)
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(item)
  }
  const queues = shuffle([...groups.values()])
  const out: T[] = []
  while (out.length < items.length) {
    for (const q of queues) {
      const next = q.shift()
      if (next !== undefined) out.push(next)
    }
  }
  return out
}

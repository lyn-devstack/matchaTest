export function uid(prefix = ''): string {
  const raw =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return prefix ? `${prefix}_${raw}` : raw
}

export const questionKey = (bankId: string, questionId: string) => `${bankId}::${questionId}`

/** Copia profunda a objeto plano (IndexedDB no acepta proxies reactivos de Vue). */
export function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

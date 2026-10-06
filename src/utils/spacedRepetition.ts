import type { Confidence, ExamMode, Outcome, ReviewItem } from '@/types/exam'

/** Días hasta el siguiente repaso según la caja Leitner (índice = caja) */
export const BOX_INTERVAL_DAYS = [0, 0, 1, 3, 7, 14] as const
export const MAX_BOX = 5
const DAY = 24 * 60 * 60 * 1000

export interface ReviewChange {
  upsert?: ReviewItem
  remove?: string
}

/**
 * Actualiza una tarjeta del mazo de fallos tras responder.
 * - Fallo o blanca → vuelve a la caja 1 y queda pendiente ya.
 * - Acierto dudado → entra (o se mantiene) en el mazo, sin subir de caja.
 * - Acierto seguro → sube de caja; al superar la última sale del mazo (dominada).
 */
export function applyReviewOutcome(
  existing: ReviewItem | undefined,
  input: { key: string; bankId: string; questionId: string; outcome: Outcome; confidence: Confidence | null; mode: ExamMode },
  now = Date.now(),
): ReviewChange {
  const { outcome, confidence } = input

  if (outcome === 'wrong' || outcome === 'blank') {
    return {
      upsert: {
        key: input.key,
        bankId: input.bankId,
        questionId: input.questionId,
        reason: outcome,
        box: 1,
        dueAt: now,
        addedAt: existing?.addedAt ?? now,
        lastSeenAt: now,
        lapses: (existing?.lapses ?? 0) + 1,
      },
    }
  }

  if (confidence === 'doubt') {
    const box = existing?.box ?? 1
    return {
      upsert: {
        key: input.key,
        bankId: input.bankId,
        questionId: input.questionId,
        reason: existing?.reason === 'wrong' ? 'wrong' : 'doubt',
        box,
        dueAt: existing ? now + BOX_INTERVAL_DAYS[box] * DAY : now,
        addedAt: existing?.addedAt ?? now,
        lastSeenAt: now,
        lapses: existing?.lapses ?? 0,
      },
    }
  }

  if (!existing) return {}

  const box = existing.box + 1
  if (box > MAX_BOX) return { remove: existing.key }
  return {
    upsert: { ...existing, box, dueAt: now + BOX_INTERVAL_DAYS[box] * DAY, lastSeenAt: now },
  }
}

export const isDue = (item: ReviewItem, now = Date.now()) => item.dueAt <= now

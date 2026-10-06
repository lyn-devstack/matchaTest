<script setup lang="ts">
import { computed } from 'vue'
import type { ResultDetail } from '@/types/exam'
import { topicOf } from '@/utils/sessionBuilder'
import { percent } from '@/utils/format'

const props = withDefaults(defineProps<{ details: ResultDetail[]; limit?: number }>(), { limit: 12 })

interface TopicStat {
  topic: string
  correct: number
  total: number
  pct: number
}

/** Dominio por tema: aciertos / preguntas vistas (las blancas cuentan como no dominadas) */
const topics = computed<TopicStat[]>(() => {
  const map = new Map<string, { correct: number; total: number }>()
  for (const d of props.details) {
    const t = topicOf(d)
    const s = map.get(t) ?? { correct: 0, total: 0 }
    s.total++
    if (d.outcome === 'correct' && d.confidence !== 'doubt') s.correct++
    else if (d.outcome === 'correct') s.correct += 0.5
    map.set(t, s)
  }
  return [...map.entries()]
    .map(([topic, s]) => ({ topic, ...s, pct: percent(s.correct, s.total) }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, props.limit)
})

function level(pct: number) {
  if (pct >= 80) return { label: 'Dominado', bar: 'bg-matcha-600' }
  if (pct >= 50) return { label: 'En progreso', bar: 'bg-matcha-300' }
  return { label: 'A reforzar', bar: 'bg-error' }
}
</script>

<template>
  <div>
    <p v-if="!topics.length" class="py-6 text-center text-sm text-main-muted">
      Aún no hay datos. Completa un test para ver tu dominio por tema.
    </p>
    <ul v-else class="space-y-4">
      <li v-for="t in topics" :key="t.topic" :title="`${t.topic}: ${t.pct}% (${t.total} respuestas)`">
        <div class="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
          <span class="truncate font-bold">{{ t.topic }}</span>
          <span class="shrink-0 text-xs text-main-muted">
            {{ level(t.pct).label }} · <b class="num text-sm text-main">{{ t.pct }}%</b>
          </span>
        </div>
        <div class="h-2.5 overflow-hidden rounded-full bg-stone-100" role="meter" :aria-valuenow="t.pct" aria-valuemin="0" aria-valuemax="100" :aria-label="t.topic">
          <div
            :class="['h-full rounded-full transition-all duration-700 ease-out', level(t.pct).bar]"
            :style="{ width: `${Math.max(t.pct, 2)}%` }"
          />
        </div>
        <p class="num mt-1 text-[11px] text-main-muted">{{ t.total }} respuestas</p>
      </li>
    </ul>
    <p v-if="topics.length" class="mt-4 text-[11px] text-main-muted">
      Ordenado de menor a mayor dominio. Un acierto dudado cuenta como medio.
    </p>
  </div>
</template>

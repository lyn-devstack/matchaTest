<script setup lang="ts">
import type { AnswerState, SessionQuestion } from '@/types/exam'
import { outcomeOf } from '@/utils/scoring'

const props = defineProps<{
  questions: SessionQuestion[]
  answers: Record<string, AnswerState>
  flagged: string[]
  currentIndex: number
  instantFeedback: boolean
}>()
const emit = defineEmits<{ go: [index: number] }>()

function cellClass(q: SessionQuestion) {
  const a = props.answers[q.key]
  if (props.instantFeedback) {
    const o = outcomeOf(q, a)
    if (o === 'correct') return 'bg-matcha text-white border-matcha'
    if (o === 'wrong') return 'bg-error-100 text-error-700 border-error-100'
    return 'bg-card text-main-soft border-stone-200'
  }
  return a?.selected != null ? 'bg-matcha-100 text-matcha-700 border-matcha-100' : 'bg-card text-main-soft border-stone-200'
}
</script>

<template>
  <div>
    <div class="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5 xl:grid-cols-6">
      <button
        v-for="(q, i) in questions"
        :key="q.key"
        :class="[
          'num relative grid aspect-square place-items-center rounded-xl border text-xs font-extrabold transition-all duration-300 hover:scale-105',
          cellClass(q),
          i === currentIndex && 'ring-2 ring-main/70 ring-offset-2 ring-offset-card',
        ]"
        :aria-label="`Ir a la pregunta ${i + 1}`"
        :aria-current="i === currentIndex ? 'step' : undefined"
        @click="emit('go', i)"
      >
        {{ i + 1 }}
        <span
          v-if="flagged.includes(q.key)"
          class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-blush-600"
          aria-label="marcada"
        />
        <span
          v-else-if="answers[q.key]?.confidence === 'doubt'"
          class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-blush"
          aria-label="dudosa"
        />
      </button>
    </div>

    <ul class="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-semibold text-main-muted">
      <template v-if="instantFeedback">
        <li class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded bg-matcha" /> Acierto</li>
        <li class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded bg-error-100" /> Fallo</li>
      </template>
      <li v-else class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded bg-matcha-100" /> Respondida</li>
      <li class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-blush-600" /> Marcada</li>
      <li class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-blush" /> Dudosa</li>
    </ul>
  </div>
</template>

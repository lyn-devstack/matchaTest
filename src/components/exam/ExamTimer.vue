<script setup lang="ts">
import { computed } from 'vue'
import { Hourglass, Timer } from 'lucide-vue-next'
import { formatClock } from '@/utils/format'
import { WARNING_SECONDS } from '@/composables/useExamEngine'

const props = defineProps<{
  /** Segundos restantes; null si el examen no tiene límite */
  remaining: number | null
  elapsed: number
  limitMinutes: number | null
}>()

const warning = computed(() => props.remaining !== null && props.remaining <= WARNING_SECONDS)
const progress = computed(() =>
  props.remaining !== null && props.limitMinutes ? props.remaining / (props.limitMinutes * 60) : 1,
)
</script>

<template>
  <div
    :class="[
      'relative inline-flex items-center gap-2 overflow-hidden rounded-full border px-4 py-2 font-extrabold transition-all duration-500',
      warning ? 'border-error/60 bg-error-50 text-error-700' : 'border-stone-200/70 bg-card text-main',
    ]"
    role="timer"
    :aria-label="remaining !== null ? `Quedan ${formatClock(remaining)}` : `Tiempo transcurrido ${formatClock(elapsed)}`"
  >
    <!-- barra de tiempo restante muy sutil -->
    <span
      v-if="remaining !== null"
      :class="['absolute inset-y-0 left-0 transition-all duration-1000 ease-linear', warning ? 'bg-error-100/70' : 'bg-matcha-50']"
      :style="{ width: `${progress * 100}%` }"
      aria-hidden="true"
    />
    <component :is="remaining !== null ? Hourglass : Timer" :class="['relative h-4 w-4', warning && 'animate-breathe']" />
    <span class="num relative text-sm">{{ formatClock(remaining ?? elapsed) }}</span>
    <span v-if="warning" class="relative hidden text-xs font-bold sm:inline">· últimos minutos</span>
  </div>
</template>

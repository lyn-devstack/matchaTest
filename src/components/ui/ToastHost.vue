<script setup lang="ts">
import { CheckCircle2, Info, AlertCircle } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
const icons = { matcha: CheckCircle2, blush: Info, error: AlertCircle }
const tones = {
  matcha: 'text-matcha-700',
  blush: 'text-blush-700',
  error: 'text-error-700',
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
    <TransitionGroup
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-3"
      leave-active-class="transition-all duration-200 ease-in"
      leave-to-class="opacity-0"
    >
      <button
        v-for="t in toasts"
        :key="t.id"
        class="card pointer-events-auto flex max-w-md items-center gap-2.5 px-5 py-3 text-sm font-semibold"
        @click="dismiss(t.id)"
      >
        <component :is="icons[t.tone]" :class="['h-5 w-5 shrink-0', tones[t.tone]]" />
        {{ t.message }}
      </button>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
type Tone = 'blush' | 'matcha' | 'error' | 'stone' | 'outline'
withDefaults(defineProps<{ tone?: Tone; size?: 'sm' | 'md' }>(), { tone: 'blush', size: 'sm' })

const tones: Record<Tone, string> = {
  blush: 'bg-blush-100 text-blush-700',
  matcha: 'bg-matcha-50 text-matcha-700',
  error: 'bg-error-50 text-error-700',
  stone: 'bg-stone-100 text-main-soft',
  outline: 'border border-stone-200 text-main-soft bg-card',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 whitespace-nowrap rounded-full font-bold',
      size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      tones[tone],
    ]"
  >
    <slot />
  </span>
</template>

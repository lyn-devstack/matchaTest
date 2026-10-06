<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ label: string; value: string | number; hint?: string; icon?: Component; tone?: 'matcha' | 'blush' | 'error' | 'stone' }>()

const iconTones = {
  matcha: 'bg-matcha-50 text-matcha-700',
  blush: 'bg-blush-100 text-blush-700',
  error: 'bg-error-50 text-error-700',
  stone: 'bg-stone-100 text-main-soft',
}
</script>

<template>
  <div class="card flex items-start gap-3 p-4 sm:p-5">
    <div v-if="icon" :class="['grid h-10 w-10 shrink-0 place-items-center rounded-2xl', iconTones[tone ?? 'matcha']]">
      <component :is="icon" class="h-5 w-5" />
    </div>
    <div class="min-w-0">
      <p class="text-xs font-bold uppercase tracking-wide text-main-muted">{{ label }}</p>
      <p class="num mt-0.5 text-2xl font-extrabold tracking-tight">{{ value }}</p>
      <p v-if="hint" class="mt-0.5 truncate text-xs text-main-soft">{{ hint }}</p>
    </div>
  </div>
</template>

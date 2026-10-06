<script setup lang="ts" generic="T extends string">
import type { Component } from 'vue'

const model = defineModel<T>({ required: true })
defineProps<{ options: { value: T; label: string; icon?: Component; hint?: string }[] }>()
</script>

<template>
  <div class="grid gap-2 rounded-3xl bg-cream-deep/70 p-1.5" :style="{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :class="[
        'flex flex-col items-center gap-0.5 rounded-[1.25rem] px-3 py-2.5 text-center transition-all duration-300 ease-in-out',
        model === opt.value ? 'bg-card text-main shadow-soft' : 'text-main-soft hover:text-main',
      ]"
      @click="model = opt.value"
    >
      <span class="flex items-center gap-1.5 text-sm font-bold">
        <component :is="opt.icon" v-if="opt.icon" class="h-4 w-4" />
        {{ opt.label }}
      </span>
      <span v-if="opt.hint" class="text-[11px] leading-tight text-main-muted">{{ opt.hint }}</span>
    </button>
  </div>
</template>

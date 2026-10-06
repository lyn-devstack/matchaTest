<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
defineProps<{ label: string; description?: string }>()
</script>

<template>
  <label class="flex cursor-pointer items-start justify-between gap-4 rounded-2xl p-1">
    <span>
      <span class="block text-sm font-semibold">{{ label }}</span>
      <span v-if="description" class="block text-xs text-main-soft">{{ description }}</span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="model"
      :class="[
        'relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-all duration-300 ease-in-out',
        model ? 'bg-matcha' : 'bg-stone-200',
      ]"
      @click="model = !model"
    >
      <span
        :class="[
          'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300 ease-in-out',
          model ? 'left-6' : 'left-1',
        ]"
      />
    </button>
  </label>
</template>

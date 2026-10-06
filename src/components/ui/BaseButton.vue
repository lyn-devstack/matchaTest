<script setup lang="ts">
type Variant = 'primary' | 'soft' | 'ghost' | 'outline' | 'danger' | 'blush'
type Size = 'sm' | 'md' | 'lg'

withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    block?: boolean
    type?: 'button' | 'submit'
    disabled?: boolean
    loading?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
)

const variants: Record<Variant, string> = {
  primary: 'bg-matcha text-white shadow-sm hover:bg-matcha-600 hover:shadow-lift',
  soft: 'bg-matcha-50 text-matcha-700 border border-matcha-100 hover:bg-matcha-100',
  blush: 'bg-blush-100 text-blush-700 border border-blush/70 hover:bg-blush',
  outline: 'bg-card text-main border border-stone-200 hover:border-matcha-300 hover:bg-matcha-50/50',
  ghost: 'text-main-soft hover:bg-stone-100/70 hover:text-main',
  danger: 'bg-error-50 text-error-700 border border-error-100 hover:bg-error-100',
}
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-14 px-7 text-base gap-2.5',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-bold',
      'transition-all duration-300 ease-in-out hover:scale-[1.02] active:scale-[0.98]',
      'disabled:pointer-events-none disabled:opacity-50',
      variants[variant],
      sizes[size],
      block && 'w-full',
    ]"
  >
    <span
      v-if="loading"
      class="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>

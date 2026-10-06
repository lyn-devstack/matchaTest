<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{ open: boolean; title?: string; subtitle?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }>(),
  { size: 'md' },
)
const emit = defineEmits<{ close: [] }>()

const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) window.addEventListener('keydown', onKey)
    else window.removeEventListener('keydown', onKey)
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center bg-main/25 p-0 backdrop-blur-[3px] sm:items-center sm:p-6"
        @mousedown.self="emit('close')"
      >
        <div
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          :class="[
            'flex max-h-[92vh] w-full animate-fade-up flex-col overflow-hidden rounded-t-3xl bg-card shadow-lift sm:rounded-3xl',
            widths[size],
          ]"
        >
          <header v-if="title || $slots.header" class="flex items-start justify-between gap-4 px-6 pb-2 pt-6 sm:px-8">
            <slot name="header">
              <div>
                <h2 class="text-xl font-extrabold tracking-tight">{{ title }}</h2>
                <p v-if="subtitle" class="mt-1 text-sm text-main-soft">{{ subtitle }}</p>
              </div>
            </slot>
            <button
              class="-mr-2 rounded-full p-2 text-main-muted transition-all duration-300 hover:bg-stone-100 hover:text-main"
              aria-label="Cerrar"
              @click="emit('close')"
            >
              <X class="h-5 w-5" />
            </button>
          </header>
          <div class="scroll-soft flex-1 overflow-y-auto px-6 py-4 sm:px-8">
            <slot />
          </div>
          <footer
            v-if="$slots.footer"
            class="flex flex-wrap items-center justify-end gap-3 border-t border-stone-100 bg-cream/60 px-6 py-4 sm:px-8"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

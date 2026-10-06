<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    tone?: 'primary' | 'danger'
  }>(),
  { confirmLabel: 'Confirmar', cancelLabel: 'Cancelar', tone: 'primary' },
)
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <BaseModal :open="open" :title="title" size="sm" @close="emit('cancel')">
    <p v-if="message" class="text-main-soft">{{ message }}</p>
    <slot />
    <template #footer>
      <BaseButton variant="ghost" @click="emit('cancel')">{{ cancelLabel }}</BaseButton>
      <BaseButton :variant="tone === 'danger' ? 'danger' : 'primary'" @click="emit('confirm')">{{ confirmLabel }}</BaseButton>
    </template>
  </BaseModal>
</template>

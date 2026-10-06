<script setup lang="ts">
import { computed } from 'vue'
import { EyeOff, GraduationCap, Hourglass, ListChecks, MinusCircle, Settings2, Target } from 'lucide-vue-next'
import type { QuestionBank, StartPayload } from '@/types/exam'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useStorage } from '@/composables/useStorage'
import { resolveBankRules } from '@/utils/scoring'
import { formatNumber } from '@/utils/format'

/** Simulacro: reproduce el examen real con las reglas del banco. No hay nada que configurar aquí. */
const props = defineProps<{ open: boolean; bank: QuestionBank | null }>()
const emit = defineEmits<{ close: []; start: [payload: StartPayload]; editRules: [] }>()

const { defaultRules } = useStorage()
const rules = computed(() => resolveBankRules(props.bank, defaultRules.value))
const hasCustomRules = computed(() => !!props.bank?.rules && Object.keys(props.bank.rules).length > 0)
const count = computed(() => Math.min(rules.value.questionCount ?? Infinity, props.bank?.questions.length ?? 0))

const conditions = computed(() => {
  const r = rules.value
  return [
    { icon: ListChecks, label: `${count.value} preguntas`, hint: count.value < (props.bank?.questions.length ?? 0) ? 'al azar de todo el temario' : 'todo el banco' },
    { icon: Hourglass, label: r.timeLimitMinutes ? `${r.timeLimitMinutes} minutos` : 'Sin límite de tiempo', hint: r.timeLimitMinutes ? 'cuenta atrás, aviso a los 5 min' : 'cronómetro informativo' },
    {
      icon: MinusCircle,
      label: `+${formatNumber(r.pointsCorrect)} acierto · −${formatNumber(r.penaltyWrong)} fallo`,
      hint: r.penaltyBlank ? `−${formatNumber(r.penaltyBlank)} por blanca` : 'las blancas no restan',
    },
    { icon: Target, label: `Apruebas con ${formatNumber(r.passMark)}`, hint: 'nota sobre 10' },
    { icon: EyeOff, label: 'Sin corrección hasta entregar', hint: 'como en el examen de verdad' },
  ]
})

function start() {
  if (!props.bank || !count.value) return
  emit('start', { mode: 'simulation', rules: { ...rules.value, shuffleQuestions: true }, topics: [], interleave: false })
}
</script>

<template>
  <BaseModal :open="open" size="md" title="Simulacro de examen" :subtitle="bank?.name" @close="emit('close')">
    <div v-if="bank" class="space-y-5 pb-2">
      <div class="flex items-start gap-3 rounded-3xl bg-matcha-50 p-4">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-card text-matcha-700 shadow-sm">
          <GraduationCap class="h-5 w-5" />
        </span>
        <p class="text-sm text-main-soft">
          <b class="text-main">Para medir si apruebas.</b> Mismas condiciones que el examen real; al entregar verás tu nota
          y las preguntas falladas o dudosas pasarán a tu mazo de repaso.
        </p>
      </div>

      <ul class="divide-y divide-stone-100 rounded-3xl border border-stone-200/60">
        <li v-for="c in conditions" :key="c.label" class="flex items-center gap-3 px-4 py-3">
          <component :is="c.icon" class="h-5 w-5 shrink-0 text-matcha-700" />
          <span class="font-bold">{{ c.label }}</span>
          <span class="ml-auto text-right text-xs text-main-muted">{{ c.hint }}</span>
        </li>
      </ul>

      <button
        class="flex w-full items-center justify-between gap-3 rounded-2xl px-1 text-left text-sm transition-colors duration-200 hover:text-matcha-700"
        @click="emit('editRules')"
      >
        <span class="text-main-soft">
          {{ hasCustomRules ? '¿No coincide con tu asignatura?' : 'Estas son las reglas por defecto. ¿Tienes la guía docente?' }}
        </span>
        <span class="inline-flex shrink-0 items-center gap-1.5 font-bold text-matcha-700">
          <Settings2 class="h-4 w-4" /> Cambiar reglas
        </span>
      </button>
    </div>

    <template #footer>
      <BaseButton variant="ghost" class="mr-auto" @click="emit('close')">Cancelar</BaseButton>
      <BaseButton :disabled="!count" @click="start"><GraduationCap class="h-4 w-4" /> Empezar simulacro</BaseButton>
    </template>
  </BaseModal>
</template>

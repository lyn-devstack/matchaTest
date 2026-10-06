<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BookOpenCheck, Check } from 'lucide-vue-next'
import type { QuestionBank, StartPayload } from '@/types/exam'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import { readLocal, useStorage, writeLocal } from '@/composables/useStorage'
import { resolveBankRules } from '@/utils/scoring'
import { bankTopics, topicOf } from '@/utils/sessionBuilder'

/** Práctica: aprender con corrección inmediata. Solo se elige qué estudiar; sin reloj. */
const props = defineProps<{ open: boolean; bank: QuestionBank | null }>()
const emit = defineEmits<{ close: []; start: [payload: StartPayload] }>()

const { defaultRules } = useStorage()
const SIZES = [10, 20, 40] as const
/** Tamaño elegido por el usuario; si el tema tiene menos preguntas se usan todas */
const size = ref<number | 'all'>(10)
const selectedTopics = ref<string[]>([])
const interleave = ref(true)

const topics = computed(() => (props.bank ? bankTopics(props.bank) : []))
const available = computed(() => props.bank?.questions.filter((q) => selectedTopics.value.includes(topicOf(q))).length ?? 0)
const effectiveSize = computed(() => (size.value === 'all' || size.value >= available.value ? 'all' : size.value))
const finalCount = computed(() => (effectiveSize.value === 'all' ? available.value : effectiveSize.value))
const countOf = computed(() => {
  const m = new Map<string, number>()
  for (const q of props.bank?.questions ?? []) m.set(topicOf(q), (m.get(topicOf(q)) ?? 0) + 1)
  return m
})

watch(
  () => [props.open, props.bank?.id] as const,
  ([open]) => {
    if (!open || !props.bank) return
    selectedTopics.value = [...topics.value]
    size.value = readLocal<number | 'all'>('practice-size', 10)
  },
  { immediate: true },
)

const allSelected = computed(() => selectedTopics.value.length === topics.value.length)
const isOn = (t: string) => !allSelected.value && selectedTopics.value.includes(t)

/**
 * Con «Todos los temas» activo, pulsar un tema lo elige en solitario.
 * Después cada pulsación añade o quita; si se quitan todos se vuelve a «Todos».
 */
function pickTopic(t: string) {
  if (allSelected.value) {
    selectedTopics.value = [t]
    return
  }
  const i = selectedTopics.value.indexOf(t)
  if (i >= 0) selectedTopics.value.splice(i, 1)
  else selectedTopics.value.push(t)
  if (!selectedTopics.value.length) selectedTopics.value = [...topics.value]
}
const selectAll = () => (selectedTopics.value = [...topics.value])

const selectionLabel = computed(() =>
  allSelected.value
    ? `Todo el banco · ${available.value} preguntas`
    : `${selectedTopics.value.length === 1 ? selectedTopics.value[0] : `${selectedTopics.value.length} temas`} · ${available.value} preguntas`,
)

function start() {
  if (!props.bank || !finalCount.value) return
  writeLocal('practice-size', size.value)
  const rules = resolveBankRules(props.bank, defaultRules.value)
  emit('start', {
    mode: 'practice',
    rules: { ...rules, timeLimitMinutes: null, questionCount: finalCount.value, shuffleQuestions: true },
    topics: allSelected.value ? [] : [...selectedTopics.value],
    interleave: interleave.value && selectedTopics.value.length > 1,
  })
}
</script>

<template>
  <BaseModal :open="open" size="lg" title="Practicar" :subtitle="bank?.name" @close="emit('close')">
    <div v-if="bank" class="space-y-6 pb-2">
      <div class="flex items-start gap-3 rounded-3xl bg-blush-50 p-4">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-card text-blush-700 shadow-sm">
          <BookOpenCheck class="h-5 w-5" />
        </span>
        <p class="text-sm text-main-soft">
          <b class="text-main">Para aprender.</b> Sin reloj: al responder ves al momento si has acertado y la explicación.
          Después te preguntamos si lo sabías seguro o dudaste, y lo dudoso vuelve en el repaso.
        </p>
      </div>

      <section v-if="topics.length > 1" class="space-y-3">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h3 class="text-sm font-extrabold uppercase tracking-wide text-main-muted">¿Qué quieres estudiar?</h3>
          <span class="text-xs font-semibold text-main-soft">{{ selectionLabel }}</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="t in topics"
            :key="t"
            :class="['topic-chip', isOn(t) ? 'topic-chip--on' : 'topic-chip--off']"
            :aria-pressed="isOn(t)"
            @click="pickTopic(t)"
          >
            <Check v-if="isOn(t)" class="h-3.5 w-3.5" stroke-width="3" />
            {{ t }}
            <span class="num opacity-70">{{ countOf.get(t) }}</span>
          </button>
          <button
            :class="['topic-chip', allSelected ? 'topic-chip--on' : 'topic-chip--off']"
            :aria-pressed="allSelected"
            @click="selectAll"
          >
            <Check v-if="allSelected" class="h-3.5 w-3.5" stroke-width="3" />
            Todos los temas
            <span class="num opacity-70">{{ bank.questions.length }}</span>
          </button>
        </div>
        <p class="text-xs text-main-muted">Pulsa un tema para estudiar solo ese; pulsa otros para añadirlos.</p>
      </section>

      <section class="space-y-3">
        <h3 class="text-sm font-extrabold uppercase tracking-wide text-main-muted">¿Cuántas preguntas?</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="s in [...SIZES, 'all' as const]"
            :key="s"
            :disabled="s !== 'all' && s >= available"
            :class="[
              'num rounded-full border px-4 py-2 text-sm font-bold transition-all duration-300 hover:scale-[1.02] disabled:opacity-40',
              effectiveSize === s ? 'border-matcha bg-matcha text-white' : 'border-stone-200 bg-card text-main-soft hover:border-matcha-300',
            ]"
            @click="size = s"
          >
            {{ s === 'all' ? `Todas (${available})` : s }}
          </button>
        </div>
        <ToggleSwitch
          v-if="selectedTopics.length > 1"
          v-model="interleave"
          label="Intercalar temas"
          description="Alterna preguntas de distintos temas: cuesta un poco más, pero se retiene mejor"
        />
      </section>
    </div>

    <template #footer>
      <BaseButton variant="ghost" class="mr-auto" @click="emit('close')">Cancelar</BaseButton>
      <BaseButton :disabled="!finalCount" @click="start">
        <BookOpenCheck class="h-4 w-4" /> Empezar práctica · {{ finalCount }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.topic-chip {
  @apply inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold transition-all duration-300 hover:scale-[1.02];
}
.topic-chip--on {
  @apply border-matcha bg-matcha text-white;
}
.topic-chip--off {
  @apply border-stone-200 bg-card text-main-soft hover:border-matcha-300 hover:text-main;
}
</style>

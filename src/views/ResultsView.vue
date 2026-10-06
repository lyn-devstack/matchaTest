<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, BarChart3, Check, Clock, HelpCircle, Layers, Lightbulb, Minus, RotateCcw, X } from 'lucide-vue-next'
import type { Outcome, ResultDetail } from '@/types/exam'
import BaseButton from '@/components/ui/BaseButton.vue'
import BasePill from '@/components/ui/BasePill.vue'
import TopicMastery from '@/components/stats/TopicMastery.vue'
import { useStorage } from '@/composables/useStorage'
import { useExamLauncher } from '@/composables/useExamLauncher'
import { useExamEngine } from '@/composables/useExamEngine'
import { formatDateTime, formatDuration, formatNumber, formatScore, optionLetter, percent } from '@/utils/format'

const props = defineProps<{ id: string }>()
const storage = useStorage()
const launcher = useExamLauncher()
const engine = useExamEngine()

const result = computed(() => storage.getResult(props.id))

const modeLabel = { simulation: 'Simulacro real', practice: 'Práctica', review: 'Mazo de repaso' }

const message = computed(() => {
  const r = result.value
  if (!r) return ''
  const gap = r.rules.passMark - r.score
  if (r.score >= 9) return 'Excelente. Este tema está muy asentado.'
  if (r.passed) return 'Aprobado. Repasa las dudosas para ganar margen.'
  if (gap <= 1) return `Te faltan ${formatNumber(Math.round(gap * 100) / 100)} puntos. Estás muy cerca.`
  return 'Cada fallo de hoy es una pregunta que ya no fallarás en el examen.'
})

// Anillo de nota
const R = 52
const C = 2 * Math.PI * R
const dash = computed(() => ((result.value?.score ?? 0) / 10) * C)

// Lista de revisión
type Filter = 'all' | Outcome | 'doubt'
const filter = ref<Filter>('wrong')
const counts = computed(() => {
  const d = result.value?.details ?? []
  return {
    all: d.length,
    wrong: d.filter((x) => x.outcome === 'wrong').length,
    blank: d.filter((x) => x.outcome === 'blank').length,
    doubt: d.filter((x) => x.confidence === 'doubt').length,
    correct: d.filter((x) => x.outcome === 'correct').length,
  }
})
const visible = computed<ResultDetail[]>(() => {
  const d = result.value?.details ?? []
  if (filter.value === 'all') return d
  if (filter.value === 'doubt') return d.filter((x) => x.confidence === 'doubt')
  return d.filter((x) => x.outcome === filter.value)
})
if (counts.value.wrong === 0) filter.value = counts.value.doubt ? 'doubt' : 'all'

const filters: { value: Filter; label: string }[] = [
  { value: 'wrong', label: 'Fallos' },
  { value: 'blank', label: 'En blanco' },
  { value: 'doubt', label: 'Dudosas' },
  { value: 'correct', label: 'Aciertos' },
  { value: 'all', label: 'Todas' },
]

function retryMistakes() {
  if (!result.value) return
  if (engine.isActive.value) engine.abandon()
  launcher.launchFromResult(result.value, ['wrong', 'blank'])
}

const outcomeStyle: Record<Outcome, { icon: typeof Check; cls: string }> = {
  correct: { icon: Check, cls: 'bg-matcha text-white' },
  wrong: { icon: X, cls: 'bg-error text-white' },
  blank: { icon: Minus, cls: 'bg-stone-200 text-main-soft' },
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
    <div v-if="!result" class="card p-10 text-center">
      <p class="font-bold">No encontramos este resultado.</p>
      <RouterLink to="/" class="mt-4 inline-block font-bold text-matcha-700">Volver al inicio</RouterLink>
    </div>

    <template v-else>
      <RouterLink to="/" class="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-main-soft transition-colors hover:text-main">
        <ArrowLeft class="h-4 w-4" /> Inicio
      </RouterLink>

      <!-- Cabecera de nota -->
      <section class="card animate-fade-up overflow-hidden">
        <div class="grid gap-6 p-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-center">
          <div class="relative mx-auto h-40 w-40">
            <svg viewBox="0 0 120 120" class="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" :r="R" fill="none" class="stroke-stone-100" stroke-width="10" />
              <circle
                cx="60"
                cy="60"
                :r="R"
                fill="none"
                :class="result.passed ? 'stroke-matcha' : 'stroke-error'"
                stroke-width="10"
                stroke-linecap="round"
                :stroke-dasharray="`${dash} ${C}`"
                style="transition: stroke-dasharray 900ms ease-out"
              />
            </svg>
            <div class="absolute inset-0 grid place-items-center text-center">
              <div>
                <p class="text-5xl font-extrabold tracking-tight">{{ formatScore(result.score) }}</p>
                <p class="text-xs font-bold text-main-muted">sobre 10</p>
              </div>
            </div>
          </div>

          <div>
            <div class="flex flex-wrap items-center gap-2">
              <BasePill :tone="result.passed ? 'matcha' : 'error'" size="md">
                {{ result.passed ? 'Aprobado' : 'Aún no aprobado' }}
              </BasePill>
              <BasePill tone="stone" size="md">{{ modeLabel[result.mode] }}</BasePill>
              <BasePill v-if="result.timedOut" tone="blush" size="md">Tiempo agotado</BasePill>
            </div>
            <h1 class="mt-3 text-2xl font-extrabold tracking-tight">{{ result.title }}</h1>
            <p class="mt-1 text-main-soft">{{ message }}</p>
            <p class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-main-muted">
              <span>{{ formatDateTime(result.finishedAt) }}</span>
              <span class="inline-flex items-center gap-1"><Clock class="h-3.5 w-3.5" /> {{ formatDuration(result.durationSec) }}</span>
            </p>
          </div>
        </div>

        <div class="grid grid-cols-3 border-t border-stone-100 text-center">
          <div class="p-4">
            <p class="text-2xl font-extrabold text-matcha-700">{{ result.correct }}</p>
            <p class="text-xs font-bold text-main-muted">aciertos · {{ percent(result.correct, result.total) }}%</p>
          </div>
          <div class="border-x border-stone-100 p-4">
            <p class="text-2xl font-extrabold text-error-700">{{ result.wrong }}</p>
            <p class="text-xs font-bold text-main-muted">fallos</p>
          </div>
          <div class="p-4">
            <p class="text-2xl font-extrabold text-main-soft">{{ result.blank }}</p>
            <p class="text-xs font-bold text-main-muted">en blanco</p>
          </div>
        </div>

        <div class="num border-t border-stone-100 bg-cream/60 px-6 py-4 text-sm text-main-soft sm:px-8">
          ({{ result.correct }} × {{ formatNumber(result.rules.pointsCorrect) }} − {{ result.wrong }} ×
          {{ formatNumber(result.rules.penaltyWrong) }} − {{ result.blank }} × {{ formatNumber(result.rules.penaltyBlank) }}) × 10 /
          ({{ result.total }} × {{ formatNumber(result.rules.pointsCorrect) }}) =
          <b class="text-main">{{ formatScore(result.score) }}</b>
          <span class="text-main-muted"> · corte {{ formatNumber(result.rules.passMark) }}</span>
        </div>
      </section>

      <!-- Acciones -->
      <div class="mt-5 flex flex-wrap gap-3">
        <BaseButton v-if="counts.wrong + counts.blank + counts.doubt > 0" @click="retryMistakes">
          <RotateCcw class="h-4 w-4" /> Practicar fallos y dudas ({{ counts.wrong + counts.blank + counts.doubt }})
        </BaseButton>
        <RouterLink to="/stats">
          <BaseButton variant="outline"><BarChart3 class="h-4 w-4" /> Estadísticas</BaseButton>
        </RouterLink>
        <p v-if="result.reviewAdded || result.reviewMastered" class="flex items-center gap-1.5 text-sm text-main-soft">
          <Layers class="h-4 w-4 text-blush-700" />
          <span v-if="result.reviewAdded">{{ result.reviewAdded }} al mazo de repaso</span>
          <span v-if="result.reviewAdded && result.reviewMastered">·</span>
          <span v-if="result.reviewMastered">{{ result.reviewMastered }} dominadas</span>
        </p>
      </div>

      <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <!-- Revisión pregunta a pregunta -->
        <section>
          <div class="mb-4 flex flex-wrap gap-2">
            <button
              v-for="f in filters"
              :key="f.value"
              :class="[
                'rounded-full px-3.5 py-1.5 text-sm font-bold transition-all duration-300',
                filter === f.value ? 'bg-main text-cream' : 'bg-card text-main-soft border border-stone-200 hover:text-main',
              ]"
              @click="filter = f.value"
            >
              {{ f.label }} <span class="num opacity-70">{{ counts[f.value] }}</span>
            </button>
          </div>

          <p v-if="!visible.length" class="card p-8 text-center text-sm text-main-muted">Nada por aquí.</p>
          <ul class="space-y-3">
            <li v-for="d in visible" :key="d.key" class="card p-5">
              <div class="flex items-start gap-3">
                <span :class="['grid h-7 w-7 shrink-0 place-items-center rounded-xl', outcomeStyle[d.outcome].cls]">
                  <component :is="outcomeStyle[d.outcome].icon" class="h-4 w-4" stroke-width="3" />
                </span>
                <div class="min-w-0 flex-1">
                  <div class="mb-1 flex flex-wrap items-center gap-2">
                    <span class="text-xs font-bold text-main-muted">#{{ result.details.indexOf(d) + 1 }}</span>
                    <BasePill v-if="d.topic" tone="blush">{{ d.topic }}</BasePill>
                    <BasePill v-if="d.confidence === 'doubt'" tone="outline"><HelpCircle class="h-3 w-3" /> dudada</BasePill>
                  </div>
                  <p class="font-bold leading-relaxed">{{ d.text }}</p>
                  <ul class="mt-3 space-y-1.5 text-sm">
                    <li
                      v-for="(opt, i) in d.options"
                      :key="i"
                      :class="[
                        'flex gap-2 rounded-xl px-3 py-1.5',
                        i === d.correct ? 'bg-matcha-50 font-semibold text-matcha-800' : i === d.selected ? 'bg-error-50 text-error-700' : 'text-main-soft',
                      ]"
                    >
                      <span class="font-extrabold">{{ optionLetter(i) }}.</span>
                      <span class="flex-1">{{ opt }}</span>
                      <span v-if="i === d.selected" class="text-xs font-bold">tu respuesta</span>
                    </li>
                  </ul>
                  <p v-if="d.explanation" class="mt-3 flex gap-2 rounded-2xl bg-blush-50 p-3 text-sm leading-relaxed">
                    <Lightbulb class="mt-0.5 h-4 w-4 shrink-0 text-blush-700" /> {{ d.explanation }}
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </section>

        <aside class="lg:sticky lg:top-24 lg:self-start">
          <section class="card p-5 sm:p-6">
            <h2 class="font-extrabold">Por tema</h2>
            <p class="mb-4 text-xs text-main-muted">En este intento</p>
            <TopicMastery :details="result.details" />
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

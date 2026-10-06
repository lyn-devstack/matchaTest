<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Award, CalendarCheck, Clock, Target, Trash2, TrendingUp } from 'lucide-vue-next'
import type { ExamMode, ExamResult } from '@/types/exam'
import StatTile from '@/components/ui/StatTile.vue'
import BasePill from '@/components/ui/BasePill.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import ScoreChart from './ScoreChart.vue'
import TopicMastery from './TopicMastery.vue'
import { formatDateTime, formatDuration, formatScore, percent } from '@/utils/format'

const props = defineProps<{ results: ExamResult[]; passMark?: number }>()
const emit = defineEmits<{ delete: [id: string] }>()

type ModeFilter = 'all' | ExamMode
const modeFilter = ref<ModeFilter>('simulation')
const filtered = computed(() =>
  modeFilter.value === 'all' ? props.results : props.results.filter((r) => r.mode === modeFilter.value),
)

const kpis = computed(() => {
  const list = filtered.value
  const n = list.length
  const avg = n ? list.reduce((s, r) => s + r.score, 0) / n : 0
  const best = n ? Math.max(...list.map((r) => r.score)) : 0
  const passed = list.filter((r) => r.passed).length
  const time = list.reduce((s, r) => s + r.durationSec, 0)
  // Tendencia: media de los 3 últimos frente a los 3 anteriores
  const recent = list.slice(0, 3)
  const before = list.slice(3, 6)
  const mean = (a: ExamResult[]) => a.reduce((s, r) => s + r.score, 0) / a.length
  const trend = recent.length && before.length ? mean(recent) - mean(before) : null
  return { n, avg, best, passRate: percent(passed, n), time, trend }
})

const allDetails = computed(() => filtered.value.flatMap((r) => r.details))
const showAll = ref(false)
const history = computed(() => (showAll.value ? filtered.value : filtered.value.slice(0, 8)))

const modeLabel: Record<ExamMode, string> = { simulation: 'Simulacro', practice: 'Práctica', review: 'Repaso' }
const filterOptions = [
  { value: 'simulation' as const, label: 'Simulacros' },
  { value: 'practice' as const, label: 'Práctica' },
  { value: 'review' as const, label: 'Repaso' },
  { value: 'all' as const, label: 'Todo' },
]
</script>

<template>
  <div class="space-y-6">
    <SegmentedControl v-model="modeFilter" :options="filterOptions" class="max-w-xl" />

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatTile :icon="CalendarCheck" label="Intentos" :value="kpis.n" tone="stone" />
      <StatTile
        :icon="TrendingUp"
        label="Nota media"
        :value="kpis.n ? formatScore(kpis.avg) : '—'"
        :hint="kpis.trend === null ? undefined : `${kpis.trend >= 0 ? '+' : ''}${formatScore(kpis.trend)} vs. 3 anteriores`"
      />
      <StatTile :icon="Award" label="Mejor nota" :value="kpis.n ? formatScore(kpis.best) : '—'" tone="blush" />
      <StatTile :icon="Target" label="Aprobados" :value="kpis.n ? `${kpis.passRate}%` : '—'" tone="matcha" />
      <StatTile :icon="Clock" label="Tiempo total" :value="formatDuration(kpis.time)" tone="stone" class="col-span-2 lg:col-span-1" />
    </div>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section class="card p-5 sm:p-6">
        <h3 class="font-extrabold">Evolución de la nota</h3>
        <p class="mb-4 text-xs text-main-muted">Últimos 30 intentos, sobre 10. Puntos rosados = no aprobado.</p>
        <ScoreChart v-if="filtered.length" :results="filtered" :pass-mark="passMark ?? filtered[0]?.rules.passMark ?? 5" />
        <p v-else class="py-12 text-center text-sm text-main-muted">Todavía no hay intentos en este modo.</p>
      </section>
      <section class="card p-5 sm:p-6">
        <h3 class="font-extrabold">Dominio por tema</h3>
        <p class="mb-4 text-xs text-main-muted">Porcentaje de aciertos seguros por tema.</p>
        <TopicMastery :details="allDetails" />
      </section>
    </div>

    <section class="card overflow-hidden">
      <div class="flex items-center justify-between px-5 pb-3 pt-5 sm:px-6">
        <h3 class="font-extrabold">Historial</h3>
        <span class="text-xs font-semibold text-main-muted">{{ filtered.length }} intentos</span>
      </div>
      <div v-if="filtered.length" class="scroll-soft overflow-x-auto">
        <table class="w-full min-w-[640px] text-sm">
          <thead>
            <tr class="border-y border-stone-100 bg-cream/60 text-left text-xs font-bold uppercase tracking-wide text-main-muted">
              <th class="px-5 py-2.5 sm:px-6">Fecha</th>
              <th class="px-3 py-2.5">Banco</th>
              <th class="px-3 py-2.5 text-right">Nota</th>
              <th class="px-3 py-2.5 text-right">Aciertos</th>
              <th class="px-3 py-2.5 text-right">Fallos</th>
              <th class="px-3 py-2.5 text-right">Blancas</th>
              <th class="px-3 py-2.5 text-right">Tiempo</th>
              <th class="px-3 py-2.5"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody class="num">
            <tr
              v-for="r in history"
              :key="r.id"
              class="border-b border-stone-100 transition-colors duration-200 last:border-0 hover:bg-matcha-50/40"
            >
              <td class="whitespace-nowrap px-5 py-3 text-main-soft sm:px-6">{{ formatDateTime(r.finishedAt) }}</td>
              <td class="max-w-[220px] px-3 py-3">
                <RouterLink :to="{ name: 'results', params: { id: r.id } }" class="block truncate font-bold hover:text-matcha-700">
                  {{ r.title }}
                </RouterLink>
                <span class="text-xs text-main-muted">{{ modeLabel[r.mode] }}</span>
              </td>
              <td class="px-3 py-3 text-right">
                <BasePill :tone="r.passed ? 'matcha' : 'error'" size="md">{{ formatScore(r.score) }}</BasePill>
              </td>
              <td class="px-3 py-3 text-right font-semibold">{{ r.correct }}</td>
              <td class="px-3 py-3 text-right font-semibold">{{ r.wrong }}</td>
              <td class="px-3 py-3 text-right font-semibold text-main-soft">{{ r.blank }}</td>
              <td class="whitespace-nowrap px-3 py-3 text-right text-main-soft">{{ formatDuration(r.durationSec) }}</td>
              <td class="px-3 py-3 text-right">
                <button
                  class="rounded-full p-1.5 text-main-muted transition-all duration-300 hover:bg-error-50 hover:text-error-700"
                  :aria-label="`Borrar intento del ${formatDateTime(r.finishedAt)}`"
                  @click="emit('delete', r.id)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="px-6 pb-8 pt-2 text-sm text-main-muted">Aquí aparecerán tus intentos.</p>
      <button
        v-if="filtered.length > 8"
        class="w-full border-t border-stone-100 py-3 text-sm font-bold text-matcha-700 transition-colors duration-200 hover:bg-matcha-50/50"
        @click="showAll = !showAll"
      >
        {{ showAll ? 'Ver menos' : `Ver los ${filtered.length}` }}
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookOpenCheck, ChevronRight, Download, GraduationCap, Layers, MoreHorizontal, Pencil, Settings2, Trash2 } from 'lucide-vue-next'
import type { ExamResult, QuestionBank } from '@/types/exam'
import BaseButton from '@/components/ui/BaseButton.vue'
import BasePill from '@/components/ui/BasePill.vue'
import { bankTopics } from '@/utils/sessionBuilder'
import { formatDate, formatNumber, formatScore } from '@/utils/format'
import { resolveBankRules } from '@/utils/scoring'
import { useStorage } from '@/composables/useStorage'

const props = defineProps<{ bank: QuestionBank; results: ExamResult[]; reviewCount: number }>()
const emit = defineEmits<{ practice: []; simulate: []; review: []; rules: []; export: []; rename: []; delete: [] }>()

const menu = ref(false)
const topics = computed(() => bankTopics(props.bank))
const sims = computed(() => props.results.filter((r) => r.mode === 'simulation'))
const last = computed(() => sims.value[0] ?? props.results[0])
const { defaultRules } = useStorage()
const rules = computed(() => resolveBankRules(props.bank, defaultRules.value))
const rulesSummary = computed(() => {
  const r = rules.value
  const n = Math.min(r.questionCount ?? Infinity, props.bank.questions.length)
  return [`${n} preg.`, r.timeLimitMinutes ? `${r.timeLimitMinutes} min` : 'sin límite', `−${formatNumber(r.penaltyWrong)} fallo`, `corte ${formatNumber(r.passMark)}`].join(' · ')
})
const best = computed(() => (sims.value.length ? Math.max(...sims.value.map((r) => r.score)) : null))
</script>

<template>
  <article class="card group flex flex-col p-5 transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-lift sm:p-6">
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <BasePill v-if="bank.subject" tone="blush" class="mb-2">{{ bank.subject }}</BasePill>
        <h3 class="text-lg font-extrabold leading-snug">{{ bank.name }}</h3>
        <p v-if="bank.description" class="mt-1 line-clamp-2 text-sm text-main-soft">{{ bank.description }}</p>
      </div>
      <div class="relative">
        <button
          class="rounded-full p-2 text-main-muted transition-all duration-300 hover:bg-stone-100 hover:text-main"
          aria-label="Más opciones"
          :aria-expanded="menu"
          @click="menu = !menu"
          @blur="menu = false"
        >
          <MoreHorizontal class="h-5 w-5" />
        </button>
        <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95">
          <div
            v-if="menu"
            class="absolute right-0 z-10 mt-1 w-48 origin-top-right rounded-2xl border border-stone-200/70 bg-card p-1.5 shadow-lift"
            @mousedown.prevent
          >
            <button class="menu-item" @click="menu = false; emit('rename')"><Pencil class="h-4 w-4" /> Renombrar</button>
            <button class="menu-item" @click="menu = false; emit('export')"><Download class="h-4 w-4" /> Exportar JSON</button>
            <button class="menu-item text-error-700 hover:bg-error-50" @click="menu = false; emit('delete')">
              <Trash2 class="h-4 w-4" /> Eliminar
            </button>
          </div>
        </Transition>
      </div>
    </header>

    <div class="mt-4 flex flex-wrap gap-2 text-xs">
      <BasePill tone="stone">{{ bank.questions.length }} preguntas</BasePill>
      <BasePill tone="stone">{{ topics.length }} {{ topics.length === 1 ? 'tema' : 'temas' }}</BasePill>
    </div>

    <div class="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-cream/80 p-3 text-center">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-wide text-main-muted">Último</p>
        <p class="text-xl font-extrabold">{{ last ? formatScore(last.score) : '—' }}</p>
        <p v-if="last" class="text-[11px] text-main-muted">{{ formatDate(last.finishedAt) }}</p>
      </div>
      <div>
        <p class="text-[11px] font-bold uppercase tracking-wide text-main-muted">Mejor simulacro</p>
        <p class="text-xl font-extrabold">{{ best !== null ? formatScore(best) : '—' }}</p>
        <p v-if="sims.length" class="text-[11px] text-main-muted">{{ sims.length }} intentos</p>
      </div>
    </div>

    <button
      class="mt-3 flex w-full items-center gap-2 rounded-2xl border border-stone-200/70 px-3 py-2 text-left text-xs transition-all duration-300 hover:border-matcha-300 hover:bg-matcha-50/40"
      title="Reglas del examen: corrección, tiempo y nº de preguntas del simulacro"
      @click="emit('rules')"
    >
      <Settings2 class="h-4 w-4 shrink-0 text-main-muted" />
      <span class="min-w-0 flex-1">
        <span class="block font-bold text-main">Reglas del examen</span>
        <span class="num block truncate text-main-muted">{{ rulesSummary }}</span>
      </span>
      <ChevronRight class="h-4 w-4 shrink-0 text-main-muted" />
    </button>

    <div class="mt-auto pt-5">
      <div class="grid grid-cols-2 gap-2">
        <div class="text-center">
          <BaseButton variant="soft" block @click="emit('practice')"><BookOpenCheck class="h-4 w-4" /> Practicar</BaseButton>
          <p class="mt-1.5 text-[11px] leading-tight text-main-muted">Aprende: corrección al momento</p>
        </div>
        <div class="text-center">
          <BaseButton block @click="emit('simulate')"><GraduationCap class="h-4 w-4" /> Simulacro</BaseButton>
          <p class="mt-1.5 text-[11px] leading-tight text-main-muted">Mídete: como el examen real</p>
        </div>
      </div>
      <button
        v-if="reviewCount"
        class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-sm font-bold text-blush-700 transition-all duration-300 hover:bg-blush-50"
        @click="emit('review')"
      >
        <Layers class="h-4 w-4" /> Repasar {{ reviewCount }} {{ reviewCount === 1 ? 'pendiente' : 'pendientes' }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.menu-item {
  @apply flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors duration-200 hover:bg-stone-100;
}
</style>

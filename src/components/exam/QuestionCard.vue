<script setup lang="ts">
import { computed } from 'vue'
import { Bookmark, Check, HelpCircle, Lightbulb, ShieldCheck, X } from 'lucide-vue-next'
import type { AnswerState, Confidence, ExamMode, SessionQuestion } from '@/types/exam'
import BasePill from '@/components/ui/BasePill.vue'
import { optionLetter } from '@/utils/format'

const props = defineProps<{
  question: SessionQuestion
  index: number
  total: number
  answer?: AnswerState
  mode: ExamMode
  revealed: boolean
  flagged: boolean
}>()
const emit = defineEmits<{ select: [index: number]; confidence: [c: Confidence]; flag: [] }>()

const selected = computed(() => props.answer?.selected ?? null)
const confidence = computed(() => props.answer?.confidence ?? null)
const isCorrect = computed(() => props.revealed && selected.value === props.question.correct)

type OptState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim'
function stateOf(i: number): OptState {
  if (!props.revealed) return selected.value === i ? 'selected' : 'idle'
  if (i === props.question.correct) return 'correct'
  if (i === selected.value) return 'wrong'
  return 'dim'
}

const optClasses: Record<OptState, string> = {
  idle: 'border-stone-200/80 bg-card hover:border-matcha-300 hover:bg-matcha-50/40 hover:scale-[1.01]',
  selected: 'border-matcha bg-matcha-50 ring-4 ring-matcha/10',
  correct: 'border-matcha bg-matcha-50',
  wrong: 'border-error bg-error-50',
  dim: 'border-stone-200/60 bg-card opacity-60',
}
const letterClasses: Record<OptState, string> = {
  idle: 'bg-cream-deep text-main-soft group-hover:bg-matcha-100 group-hover:text-matcha-700',
  selected: 'bg-matcha text-white',
  correct: 'bg-matcha text-white',
  wrong: 'bg-error text-white',
  dim: 'bg-cream-deep text-main-muted',
}
</script>

<template>
  <article class="card animate-fade-up p-5 sm:p-8" :aria-label="`Pregunta ${index + 1} de ${total}`">
    <header class="mb-5 flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <BasePill tone="stone" size="md">
          <span class="num">{{ index + 1 }}</span>
          <span class="font-semibold text-main-muted">/ {{ total }}</span>
        </BasePill>
        <BasePill v-if="question.topic" tone="blush">{{ question.topic }}</BasePill>
      </div>
      <button
        :class="[
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-300',
          flagged ? 'bg-blush text-blush-700' : 'text-main-muted hover:bg-stone-100 hover:text-main',
        ]"
        :aria-pressed="flagged"
        title="Marcar para revisar (F)"
        @click="emit('flag')"
      >
        <Bookmark :class="['h-4 w-4', flagged && 'fill-current']" />
        {{ flagged ? 'Marcada' : 'Marcar' }}
      </button>
    </header>

    <h2 class="whitespace-pre-line text-lg font-bold leading-relaxed sm:text-xl">{{ question.text }}</h2>

    <ul class="mt-6 space-y-3" role="radiogroup">
      <li v-for="(opt, i) in question.options" :key="i">
        <button
          role="radio"
          :aria-checked="selected === i"
          :disabled="revealed"
          :class="[
            'group flex w-full items-start gap-3.5 rounded-2xl border-2 p-3.5 text-left transition-all duration-300 ease-in-out sm:p-4',
            'disabled:cursor-default',
            optClasses[stateOf(i)],
          ]"
          @click="emit('select', i)"
        >
          <span
            :class="[
              'grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-extrabold transition-all duration-300',
              letterClasses[stateOf(i)],
            ]"
          >
            <Check v-if="stateOf(i) === 'correct'" class="h-4 w-4" stroke-width="3" />
            <X v-else-if="stateOf(i) === 'wrong'" class="h-4 w-4" stroke-width="3" />
            <template v-else>{{ optionLetter(i) }}</template>
          </span>
          <span class="flex-1 pt-1 leading-relaxed">{{ opt }}</span>
        </button>
      </li>
    </ul>

    <!-- Simulacro: marcar duda sin revelar nada -->
    <div v-if="mode === 'simulation'" class="mt-5 flex flex-wrap items-center justify-between gap-3">
      <button
        :class="[
          'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition-all duration-300',
          confidence === 'doubt'
            ? 'bg-blush-100 text-blush-700'
            : 'text-main-muted hover:bg-stone-100 hover:text-main',
        ]"
        :aria-pressed="confidence === 'doubt'"
        title="Irá a tu mazo de repaso aunque aciertes (D)"
        @click="emit('confidence', 'doubt')"
      >
        <HelpCircle class="h-4 w-4" />
        {{ confidence === 'doubt' ? 'Marcada como dudosa' : 'He dudado' }}
      </button>
      <p v-if="selected !== null" class="text-xs text-main-muted">Pulsa otra vez la opción para dejarla en blanco</p>
    </div>

    <!-- Práctica / repaso: feedback inmediato -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
    >
      <section v-if="revealed" class="mt-6 space-y-4">
        <div
          :class="[
            'flex items-center gap-2 text-sm font-extrabold',
            isCorrect ? 'text-matcha-700' : 'text-error-700',
          ]"
        >
          <component :is="isCorrect ? Check : X" class="h-5 w-5" stroke-width="3" />
          {{ isCorrect ? '¡Correcto!' : `La respuesta correcta era la ${optionLetter(question.correct)}` }}
        </div>

        <div v-if="question.explanation" class="flex gap-3 rounded-2xl bg-blush-50 p-4 text-[15px] leading-relaxed">
          <Lightbulb class="mt-0.5 h-5 w-5 shrink-0 text-blush-700" />
          <p class="whitespace-pre-line">{{ question.explanation }}</p>
        </div>

        <div class="rounded-2xl border border-dashed border-stone-200 p-4">
          <p class="mb-3 text-sm font-bold text-main-soft">¿Cómo de seguro/a estabas?</p>
          <div class="grid gap-2 sm:grid-cols-2">
            <button
              :class="[
                'flex items-center justify-center gap-2 rounded-full border-2 px-4 py-2.5 text-sm font-bold transition-all duration-300 hover:scale-[1.02]',
                confidence === 'sure'
                  ? 'border-matcha bg-matcha text-white'
                  : 'border-matcha-100 bg-matcha-50 text-matcha-700 hover:border-matcha-300',
              ]"
              @click="emit('confidence', 'sure')"
            >
              <ShieldCheck class="h-4 w-4" /> Lo sabía con certeza
              <span class="kbd ml-1 hidden sm:inline-flex">S</span>
            </button>
            <button
              :class="[
                'flex items-center justify-center gap-2 rounded-full border-2 px-4 py-2.5 text-sm font-bold transition-all duration-300 hover:scale-[1.02]',
                confidence === 'doubt'
                  ? 'border-blush-600 bg-blush text-blush-700'
                  : 'border-blush/70 bg-blush-50 text-blush-700 hover:border-blush-600',
              ]"
              @click="emit('confidence', 'doubt')"
            >
              <HelpCircle class="h-4 w-4" /> He dudado / por descarte
              <span class="kbd ml-1 hidden sm:inline-flex">D</span>
            </button>
          </div>
          <p v-if="isCorrect && confidence === 'doubt'" class="mt-3 text-xs text-main-soft">
            Acertada pero dudada: la guardamos en tu mazo de repaso para afianzarla.
          </p>
          <p v-else-if="!isCorrect" class="mt-3 text-xs text-main-soft">
            Esta pregunta irá a tu mazo de repaso espaciado.
          </p>
        </div>
      </section>
    </Transition>
  </article>
</template>

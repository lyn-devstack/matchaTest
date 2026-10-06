<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, Flag, Keyboard, LogOut, SkipForward } from 'lucide-vue-next'
import QuestionCard from '@/components/exam/QuestionCard.vue'
import QuestionGrid from '@/components/exam/QuestionGrid.vue'
import ExamTimer from '@/components/exam/ExamTimer.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useExamEngine, WARNING_SECONDS } from '@/composables/useExamEngine'
import { useToast } from '@/composables/useToast'
import { formatNumber, pluralize } from '@/utils/format'

const router = useRouter()
const engine = useExamEngine()
const toast = useToast()
const { session, current, currentAnswer, currentIndex, total, mode, instantFeedback, remainingSec, elapsedSec, liveCounts } =
  engine

const confirmFinish = ref(false)
const confirmExit = ref(false)
const finishing = ref(false)
const showKeys = ref(false)

const modeLabel = computed(
  () => ({ simulation: 'Simulacro real', practice: 'Modo práctica', review: 'Mazo de repaso' })[mode.value],
)
const progress = computed(() => (total.value ? engine.answeredCount.value / total.value : 0))
const revealed = computed(() => (current.value ? engine.isRevealed(current.value.key) : false))
const blanks = computed(() => total.value - engine.answeredCount.value)
const isLast = computed(() => currentIndex.value === total.value - 1)

async function finish(timedOut = false) {
  if (finishing.value) return
  finishing.value = true
  confirmFinish.value = false
  try {
    const result = await engine.finish(timedOut)
    if (timedOut) toast.show('Se acabó el tiempo. Hemos corregido tu examen.', 'blush')
    router.replace({ name: 'results', params: { id: result.id } })
  } catch (e) {
    toast.show((e as Error).message, 'error')
    finishing.value = false
  }
}

function exit() {
  confirmExit.value = false
  engine.abandon()
  router.replace('/')
}

function onNext() {
  if (isLast.value) confirmFinish.value = true
  else engine.next()
}

// Aviso suave a los 5 minutos
let warned = false
watch(remainingSec, (r) => {
  if (r === null) return
  if (!warned && r <= WARNING_SECONDS && r > 0) {
    warned = true
    toast.show('Quedan 5 minutos. Repasa las marcadas con calma.', 'blush', 5000)
  }
  if (r <= 0) finish(true)
}, { immediate: true })

// Si la sesión desaparece (p. ej. abandonada en otra pestaña) se vuelve al inicio
watch(session, (s) => {
  if (!s && !finishing.value) router.replace('/')
})

function onKeydown(e: KeyboardEvent) {
  if (confirmFinish.value || confirmExit.value) return
  const target = e.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const q = current.value
  if (!q) return
  const k = e.key.toLowerCase()

  const num = Number(k)
  if (num >= 1 && num <= q.options.length) return engine.select(num - 1)
  const letter = k.length === 1 ? k.charCodeAt(0) - 97 : -1
  if (letter >= 0 && letter < q.options.length && !['d', 'f', 's'].includes(k)) return engine.select(letter)

  switch (k) {
    case 'arrowright':
    case 'enter':
      e.preventDefault()
      return onNext()
    case 'arrowleft':
      return engine.prev()
    case 'f':
      return engine.toggleFlag()
    case 'd':
      return engine.setConfidence('doubt')
    case 's':
      if (instantFeedback.value) engine.setConfidence('sure')
      return
    case '?':
      showKeys.value = !showKeys.value
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="session && current" class="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
    <!-- Barra superior: mínima, sin distracciones -->
    <div class="sticky top-0 z-30 -mx-4 mb-6 bg-cream/90 px-4 pb-3 pt-2 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <button
            class="grid h-10 w-10 shrink-0 place-items-center rounded-full text-main-muted transition-all duration-300 hover:bg-stone-100 hover:text-main"
            title="Salir del examen"
            aria-label="Salir del examen"
            @click="confirmExit = true"
          >
            <LogOut class="h-5 w-5 -scale-x-100" />
          </button>
          <div class="min-w-0">
            <p class="truncate font-extrabold leading-tight">{{ session.title }}</p>
            <p class="text-xs font-semibold text-main-muted">{{ modeLabel }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <ExamTimer :remaining="remainingSec" :elapsed="elapsedSec" :limit-minutes="session.rules.timeLimitMinutes" />
          <BaseButton size="sm" class="hidden sm:inline-flex" :loading="finishing" @click="confirmFinish = true">
            <Flag class="h-4 w-4" /> Entregar
          </BaseButton>
        </div>
      </div>
      <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200/60">
        <div
          class="h-full rounded-full bg-matcha transition-all duration-500 ease-out"
          :style="{ width: `${progress * 100}%` }"
        />
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section>
        <QuestionCard
          :key="current.key"
          :question="current"
          :index="currentIndex"
          :total="total"
          :answer="currentAnswer"
          :mode="mode"
          :revealed="revealed"
          :flagged="session.flagged.includes(current.key)"
          @select="engine.select"
          @confidence="engine.setConfidence"
          @flag="engine.toggleFlag()"
        />

        <div class="mt-5 flex items-center justify-between gap-3">
          <BaseButton variant="outline" :disabled="currentIndex === 0" @click="engine.prev()">
            <ArrowLeft class="h-4 w-4" /> <span class="hidden sm:inline">Anterior</span>
          </BaseButton>
          <BaseButton
            v-if="!instantFeedback && blanks > 0"
            variant="ghost"
            size="sm"
            @click="engine.nextUnanswered()"
          >
            <SkipForward class="h-4 w-4" /> Siguiente sin responder
          </BaseButton>
          <BaseButton :variant="isLast ? 'primary' : instantFeedback && !revealed ? 'outline' : 'primary'" @click="onNext">
            {{ isLast ? 'Terminar' : instantFeedback && !revealed ? 'Saltar' : 'Siguiente' }}
            <ArrowRight class="h-4 w-4" />
          </BaseButton>
        </div>
      </section>

      <aside class="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <div class="card p-5">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-extrabold">Preguntas</h3>
            <span class="num text-xs font-bold text-main-muted">{{ engine.answeredCount.value }}/{{ total }}</span>
          </div>
          <QuestionGrid
            :questions="session.questions"
            :answers="session.answers"
            :flagged="session.flagged"
            :current-index="currentIndex"
            :instant-feedback="instantFeedback"
            @go="engine.goTo"
          />
        </div>

        <div v-if="instantFeedback" class="card grid grid-cols-2 gap-3 p-5 text-center">
          <div class="rounded-2xl bg-matcha-50 p-3">
            <p class="num text-2xl font-extrabold text-matcha-700">{{ liveCounts.correct }}</p>
            <p class="text-xs font-bold text-matcha-700/80">aciertos</p>
          </div>
          <div class="rounded-2xl bg-error-50 p-3">
            <p class="num text-2xl font-extrabold text-error-700">{{ liveCounts.wrong }}</p>
            <p class="text-xs font-bold text-error-700/80">fallos</p>
          </div>
        </div>

        <div class="card-soft space-y-1.5 p-4 text-xs text-main-soft">
          <p class="font-bold text-main">Reglas de este examen</p>
          <p>Acierto <b class="num">+{{ formatNumber(session.rules.pointsCorrect) }}</b> · Fallo <b class="num">−{{ formatNumber(session.rules.penaltyWrong) }}</b> · Blanca <b class="num">−{{ formatNumber(session.rules.penaltyBlank) }}</b></p>
          <p>Aprobado con <b class="num">{{ formatNumber(session.rules.passMark) }}</b></p>
          <p v-if="mode === 'simulation'" class="pt-1 text-main-muted">Sin corrección hasta que entregues.</p>
        </div>

        <button
          class="hidden w-full items-center justify-center gap-2 rounded-full py-2 text-xs font-bold text-main-muted transition-all duration-300 hover:text-main lg:flex"
          @click="showKeys = !showKeys"
        >
          <Keyboard class="h-4 w-4" /> Atajos de teclado
        </button>
        <div v-if="showKeys" class="card-soft grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 p-4 text-xs text-main-soft">
          <span class="kbd">1–4 / A–C</span> <span>Elegir opción</span>
          <span class="kbd">← →</span> <span>Anterior / siguiente</span>
          <span class="kbd">F</span> <span>Marcar pregunta</span>
          <span class="kbd">D</span> <span>He dudado</span>
          <span v-if="instantFeedback" class="kbd">S</span> <span v-if="instantFeedback">Lo sabía seguro</span>
        </div>

        <BaseButton block class="sm:hidden" :loading="finishing" @click="confirmFinish = true">
          <Flag class="h-4 w-4" /> Entregar examen
        </BaseButton>
      </aside>
    </div>

    <ConfirmDialog
      :open="confirmFinish"
      :title="mode === 'simulation' ? '¿Entregar el simulacro?' : '¿Terminar la sesión?'"
      confirm-label="Sí, corregir"
      cancel-label="Seguir"
      @confirm="finish()"
      @cancel="confirmFinish = false"
    >
      <div class="space-y-3 text-main-soft">
        <p v-if="blanks > 0">
          Tienes <b class="text-main">{{ pluralize(blanks, 'pregunta', 'preguntas') }} en blanco</b>.
          <template v-if="session.rules.penaltyBlank > 0">Cada una descuenta {{ formatNumber(session.rules.penaltyBlank) }}.</template>
          <template v-else>No restan puntos.</template>
        </p>
        <p v-else>Has respondido todas las preguntas. ¡Buen trabajo!</p>
        <p v-if="session.flagged.length">
          Te quedan <b class="text-main">{{ pluralize(session.flagged.length, 'marcada', 'marcadas') }}</b> por revisar.
        </p>
      </div>
    </ConfirmDialog>

    <ConfirmDialog
      :open="confirmExit"
      title="¿Salir sin entregar?"
      message="Se descartará este intento y no contará en tus estadísticas. Si solo quieres hacer una pausa, puedes volver al inicio: el examen seguirá guardado."
      confirm-label="Descartar intento"
      tone="danger"
      @confirm="exit"
      @cancel="confirmExit = false"
    >
      <BaseButton variant="soft" size="sm" class="mt-4" @click="router.push('/')">Pausar y volver al inicio</BaseButton>
    </ConfirmDialog>
  </div>
</template>

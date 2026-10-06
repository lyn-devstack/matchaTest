<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ChevronDown, FileSearch, Sparkles, Timer, Upload, Wand2 } from 'lucide-vue-next'
import type { ExamRules, QuestionBank } from '@/types/exam'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BasePill from '@/components/ui/BasePill.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import { useStorage } from '@/composables/useStorage'
import { useToast } from '@/composables/useToast'
import { computeScore, guessExpectedValue, resolveBankRules } from '@/utils/scoring'
import { FIELD_LABELS, parseCriteria, type Finding } from '@/utils/criteriaParser'
import { readFileText } from '@/utils/pdfText'
import { formatNumber, formatScore } from '@/utils/format'

/**
 * Reglas del examen de un banco (asignatura): corrección, tiempo y tamaño del simulacro.
 * Se configuran una vez —idealmente subiendo la guía docente— y las usan simulacros y prácticas.
 */
const props = defineProps<{ open: boolean; bank: QuestionBank | null; backLabel?: string }>()
const emit = defineEmits<{ close: []; saved: [rules: ExamRules] }>()

const storage = useStorage()
const toast = useToast()

const rules = reactive<ExamRules>(resolveBankRules())
const timed = ref(false)
const minutes = ref(60)
const useAll = ref(true)
const count = ref(20)
const saving = ref(false)

const total = computed(() => props.bank?.questions.length ?? 0)
const finalCount = computed(() => (useAll.value ? total.value : Math.min(count.value || 0, total.value)))

watch(
  () => [props.open, props.bank?.id] as const,
  ([open]) => {
    if (!open || !props.bank) return
    const r = resolveBankRules(props.bank, storage.defaultRules.value)
    Object.assign(rules, r)
    timed.value = r.timeLimitMinutes !== null && r.timeLimitMinutes > 0
    minutes.value = r.timeLimitMinutes ?? 60
    useAll.value = r.questionCount === null || r.questionCount >= props.bank.questions.length
    count.value = r.questionCount ?? Math.min(20, props.bank.questions.length)
    criteriaText.value = ''
    findings.value = []
    analyzed.value = false
    criteriaOpen.value = false
  },
  { immediate: true },
)

// ── Vista previa de la fórmula ──
const example = computed(() => computeScore({ correct: 6, wrong: 3, blank: 1, total: 10 }, rules))
const guessAdvice = computed(() => {
  const options = props.bank?.questions[0]?.options.length ?? 4
  if (guessExpectedValue(rules, options) >= 0)
    return `Con ${options} opciones, responder al azar compensa de media: no dejes preguntas en blanco.`
  if (guessExpectedValue(rules, options, 1) >= 0)
    return 'Responder a ciegas resta de media, pero si descartas una opción ya compensa arriesgar.'
  return 'La penalización es alta: arriesga solo si puedes descartar al menos dos opciones.'
})

// ── Guía docente ──
const criteriaOpen = ref(false)
const criteriaText = ref('')
const findings = ref<Finding[]>([])
const reading = ref(false)
const analyzed = ref(false)

async function onCriteriaFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  reading.value = true
  try {
    criteriaText.value = await readFileText(file)
    analyze()
  } catch {
    toast.show('No se pudo leer el archivo. Prueba a copiar y pegar el texto.', 'error')
  } finally {
    reading.value = false
    input.value = ''
  }
}

function analyze() {
  findings.value = parseCriteria(criteriaText.value).findings
  analyzed.value = true
  for (const f of findings.value) {
    if (f.field === 'timeLimitMinutes') {
      timed.value = f.value !== null && f.value > 0
      if (f.value) minutes.value = f.value
    } else if (f.field === 'questionCount') {
      if (f.value) {
        useAll.value = f.value >= total.value
        count.value = Math.min(f.value, total.value)
      }
    } else if (f.value !== null) rules[f.field] = f.value
  }
  if (findings.value.length) toast.show(`Detectadas ${findings.value.length} reglas en la guía. Revísalas y guarda.`)
}

const valid = computed(
  () =>
    finalCount.value > 0 &&
    rules.pointsCorrect > 0 &&
    rules.penaltyWrong >= 0 &&
    rules.penaltyBlank >= 0 &&
    rules.passMark >= 0 &&
    rules.passMark <= 10 &&
    (!timed.value || minutes.value > 0),
)

async function save() {
  if (!valid.value || !props.bank) return
  saving.value = true
  try {
    const saved: ExamRules = {
      ...rules,
      timeLimitMinutes: timed.value ? minutes.value : null,
      questionCount: useAll.value ? null : finalCount.value,
    }
    await storage.saveBank({ ...props.bank, rules: saved })
    toast.show(`Reglas guardadas para «${props.bank.name}».`)
    emit('saved', saved)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    size="lg"
    title="Reglas del examen"
    :subtitle="bank ? `${bank.name} · se usan en todos los simulacros de este banco` : undefined"
    @close="emit('close')"
  >
    <div v-if="bank" class="space-y-7 pb-2">
      <!-- Guía docente -->
      <div class="space-y-3 rounded-3xl bg-blush-50 p-4 sm:p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex min-w-0 flex-1 items-start gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-card text-blush-700 shadow-sm">
              <Wand2 class="h-5 w-5" />
            </span>
            <div class="min-w-[180px] flex-1">
              <p class="font-bold">Rellenar desde la guía docente</p>
              <p class="text-xs text-main-soft">
                Sube el PDF de la guía de la asignatura y detectamos penalización, tiempo, nota de corte y nº de preguntas.
                Se procesa en tu navegador.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <label
              class="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-matcha px-4 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:bg-matcha-600"
            >
              <span v-if="reading" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              <Upload v-else class="h-4 w-4" /> Subir guía (PDF)
              <input type="file" accept=".pdf,.txt,.md,text/plain,application/pdf" class="sr-only" @change="onCriteriaFile" />
            </label>
            <button
              class="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-bold text-blush-700 transition-all duration-300 hover:bg-blush-100"
              :aria-expanded="criteriaOpen"
              @click="criteriaOpen = !criteriaOpen"
            >
              Pegar texto
              <ChevronDown :class="['h-4 w-4 transition-transform duration-300', criteriaOpen && 'rotate-180']" />
            </button>
          </div>
        </div>

        <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 -translate-y-1">
          <div v-if="criteriaOpen" class="space-y-2">
            <textarea
              v-model="criteriaText"
              rows="4"
              class="input resize-y text-sm"
              placeholder="Pega el apartado «Sistema de evaluación» de la guía. Ej.: «Cada pregunta bien contestada suma 0,5 puntos; cada pregunta mal contestada resta 0,15 puntos…»"
            />
            <BaseButton size="sm" :disabled="!criteriaText.trim()" @click="analyze">
              <FileSearch class="h-4 w-4" /> Analizar texto
            </BaseButton>
          </div>
        </Transition>

        <div v-if="analyzed" class="rounded-2xl bg-card p-3">
          <p v-if="!findings.length" class="text-sm text-main-soft">
            No hemos reconocido reglas en este texto. Puedes ajustarlas a mano abajo.
          </p>
          <template v-else>
            <p class="mb-2 text-xs font-bold text-matcha-700">Aplicado a los campos de abajo. Revísalo y pulsa «Guardar reglas»:</p>
            <ul class="space-y-2">
              <li v-for="f in findings" :key="f.field" class="text-sm">
                <div class="flex items-center gap-2">
                  <Sparkles class="h-3.5 w-3.5 text-matcha" />
                  <span class="font-bold">{{ FIELD_LABELS[f.field] }}:</span>
                  <span class="num font-extrabold text-matcha-700">{{ f.value === null ? '—' : formatNumber(f.value) }}</span>
                </div>
                <p class="ml-5 truncate text-xs italic text-main-muted" :title="f.snippet">«{{ f.snippet }}»</p>
              </li>
            </ul>
          </template>
        </div>
      </div>

      <!-- Corrección -->
      <section class="space-y-4">
        <h3 class="text-sm font-extrabold uppercase tracking-wide text-main-muted">Corrección</h3>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label>
            <span class="label">Puntos por acierto</span>
            <input v-model.number="rules.pointsCorrect" type="number" step="0.05" min="0.01" class="input num" />
          </label>
          <label>
            <span class="label">Penalización fallo</span>
            <input v-model.number="rules.penaltyWrong" type="number" step="0.01" min="0" class="input num" />
          </label>
          <label>
            <span class="label">Descuento blanca</span>
            <input v-model.number="rules.penaltyBlank" type="number" step="0.01" min="0" class="input num" />
          </label>
          <label>
            <span class="label">Nota de corte</span>
            <input v-model.number="rules.passMark" type="number" step="0.1" min="0" max="10" class="input num" />
          </label>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="text-xs font-semibold text-main-muted">Atajos:</span>
          <button
            v-for="p in [
              { l: 'Sin penalización', v: 0 },
              { l: '−0,25', v: 0.25 },
              { l: '1/3 (3 mal = 1 bien)', v: Math.round((rules.pointsCorrect / 3) * 1000) / 1000 },
              { l: '1/(n−1)', v: Math.round((rules.pointsCorrect / Math.max(1, (bank.questions[0]?.options.length ?? 4) - 1)) * 1000) / 1000 },
            ]"
            :key="p.l"
            class="rounded-full bg-cream-deep px-2.5 py-0.5 text-xs font-bold text-main-soft transition-all duration-300 hover:bg-matcha-50 hover:text-matcha-700"
            @click="rules.penaltyWrong = p.v"
          >
            {{ p.l }}
          </button>
        </div>
        <div class="card-soft space-y-1.5 p-4 text-sm">
          <p class="num font-semibold">
            Nota = (A × {{ formatNumber(rules.pointsCorrect) }} − F × {{ formatNumber(rules.penaltyWrong) }} − B ×
            {{ formatNumber(rules.penaltyBlank) }}) × 10 / (N × {{ formatNumber(rules.pointsCorrect) }})
          </p>
          <p class="text-main-soft">
            Ejemplo: 6 aciertos, 3 fallos y 1 en blanco de 10 →
            <b :class="example.passed ? 'text-matcha-700' : 'text-error-700'" class="num">{{ formatScore(example.score) }}</b>
          </p>
          <p class="text-xs text-main-muted">{{ guessAdvice }}</p>
        </div>
      </section>

      <!-- Formato del simulacro -->
      <section class="space-y-3">
        <h3 class="text-sm font-extrabold uppercase tracking-wide text-main-muted">Formato del simulacro</h3>
        <div class="flex flex-wrap items-center gap-4">
          <ToggleSwitch v-model="timed" label="Temporizador" description="Cuenta atrás con aviso a los 5 minutos" />
          <div v-if="timed" class="flex items-center gap-2">
            <Timer class="h-4 w-4 text-main-muted" />
            <input v-model.number="minutes" type="number" min="1" class="input num w-24" aria-label="Minutos" />
            <span class="text-sm text-main-soft">min</span>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <ToggleSwitch v-model="useAll" :label="`Todas las preguntas (${total})`" class="min-w-[220px]" />
          <div v-if="!useAll" class="flex items-center gap-2">
            <input v-model.number="count" type="number" min="1" :max="total" class="input num w-24" aria-label="Preguntas por simulacro" />
            <span class="text-sm text-main-soft">preguntas al azar por simulacro</span>
            <BasePill v-if="timed && finalCount" tone="stone">
              ≈ {{ formatNumber(Math.round(((minutes * 60) / finalCount) * 10) / 10) }} s/pregunta
            </BasePill>
          </div>
        </div>
        <ToggleSwitch v-model="rules.shuffleOptions" label="Barajar opciones" description="Desactívalo si las explicaciones citan letras («descartamos la b)»)" />
      </section>
    </div>

    <template #footer>
      <BaseButton variant="ghost" class="mr-auto" @click="emit('close')">{{ backLabel ?? 'Cancelar' }}</BaseButton>
      <BaseButton :disabled="!valid" :loading="saving" @click="save">Guardar reglas</BaseButton>
    </template>
  </BaseModal>
</template>

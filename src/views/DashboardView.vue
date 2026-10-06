<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArchiveRestore,
  Coffee,
  Database,
  Download,
  Flame,
  Layers,
  PlayCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-vue-next'
import type { QuestionBank, StartPayload } from '@/types/exam'
import BankCard from '@/components/bank/BankCard.vue'
import ImportModal from '@/components/bank/ImportModal.vue'
import ExamConfigModal from '@/components/config/ExamConfigModal.vue'
import PracticeModal from '@/components/config/PracticeModal.vue'
import SimulationModal from '@/components/config/SimulationModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { downloadJson, useStorage } from '@/composables/useStorage'
import { useExamEngine } from '@/composables/useExamEngine'
import { useExamLauncher } from '@/composables/useExamLauncher'
import { useToast } from '@/composables/useToast'
import { MAX_BOX } from '@/utils/spacedRepetition'
import { formatScore, pluralize } from '@/utils/format'
import type { BackupFile } from '@/types/exam'

const router = useRouter()
const storage = useStorage()
const engine = useExamEngine()
const launcher = useExamLauncher()
const toast = useToast()
const { banks, results, reviewValid, reviewDue } = storage

// ── Saludo y resumen ──
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return 'Estudiando a deshoras'
  if (h < 14) return 'Buenos días'
  if (h < 21) return 'Buenas tardes'
  return 'Buenas noches'
})

/** Días seguidos (hasta hoy o ayer) con al menos un test */
const streak = computed(() => {
  const days = new Set(results.value.map((r) => new Date(r.finishedAt).toDateString()))
  let n = 0
  const d = new Date()
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1)
  while (days.has(d.toDateString())) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
})
const lastSim = computed(() => results.value.find((r) => r.mode === 'simulation'))

const boxes = computed(() => {
  const counts = Array.from({ length: MAX_BOX }, () => 0)
  for (const r of reviewValid.value) counts[Math.min(MAX_BOX, Math.max(1, r.box)) - 1]++
  return counts
})

const resultsFor = (bankId: string) => results.value.filter((r) => r.bankIds.includes(bankId))
const reviewFor = (bankId: string) => reviewDue.value.filter((r) => r.bankId === bankId).length

// ── Lanzar exámenes (con aviso si hay uno en curso) ──
const importOpen = ref(false)
// Un solo modal abierto a la vez; el banco se lee del almacén para ver siempre las reglas recién guardadas
type ModalKind = 'simulation' | 'practice' | 'rules'
const modal = ref<{ kind: ModalKind; bankId: string; returnTo?: ModalKind } | null>(null)
const modalBank = computed(() => (modal.value ? (storage.getBank(modal.value.bankId) ?? null) : null))
const pendingLaunch = ref<(() => void) | null>(null)

function guarded(action: () => void) {
  if (engine.isActive.value) pendingLaunch.value = action
  else action()
}
function runPending() {
  const action = pendingLaunch.value
  pendingLaunch.value = null
  engine.abandon()
  action?.()
}

function openModal(kind: ModalKind, bank: QuestionBank) {
  modal.value = { kind, bankId: bank.id }
}
function editRulesFromSimulation() {
  if (modal.value) modal.value = { kind: 'rules', bankId: modal.value.bankId, returnTo: 'simulation' }
}
/** Al cerrar o guardar las reglas se vuelve al simulacro si se vino de ahí */
function closeRules() {
  const m = modal.value
  modal.value = m?.returnTo ? { kind: m.returnTo, bankId: m.bankId } : null
}
function onStart(p: StartPayload) {
  const bank = modalBank.value
  modal.value = null
  if (bank) guarded(() => launcher.launchBank(bank, p))
}
const startReview = (opts: { onlyDue?: boolean; bankId?: string }) => guarded(() => launcher.launchReview(opts))

// ── Gestión de bancos ──
const renaming = ref<QuestionBank | null>(null)
const renameValue = ref('')
const renameSubject = ref('')
function startRename(b: QuestionBank) {
  renaming.value = b
  renameValue.value = b.name
  renameSubject.value = b.subject ?? ''
}
async function saveRename() {
  if (!renaming.value || !renameValue.value.trim()) return
  await storage.saveBank({ ...renaming.value, name: renameValue.value.trim(), subject: renameSubject.value.trim() || undefined })
  renaming.value = null
}

const deleting = ref<QuestionBank | null>(null)
async function confirmDelete() {
  if (!deleting.value) return
  const name = deleting.value.name
  await storage.deleteBank(deleting.value.id)
  deleting.value = null
  toast.show(`«${name}» eliminado.`)
}

function exportBank(b: QuestionBank) {
  const slug = b.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')
  downloadJson(`${slug || 'banco'}.json`, {
    name: b.name,
    subject: b.subject,
    description: b.description,
    rules: b.rules,
    questions: b.questions,
  })
}

// ── Copia de seguridad ──
function exportAll() {
  downloadJson(`matchatest-backup-${new Date().toISOString().slice(0, 10)}.json`, storage.exportBackup())
  toast.show('Copia de seguridad descargada.')
}
async function importAll(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    await storage.importBackup(JSON.parse(await file.text()) as BackupFile)
    toast.show('Copia restaurada.')
  } catch (err) {
    toast.show((err as Error).message || 'No se pudo leer la copia.', 'error')
  }
}
const wiping = ref(false)
async function wipe() {
  wiping.value = false
  engine.abandon()
  await storage.wipeAll()
  toast.show('Todos los datos locales se han borrado.', 'blush')
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
    <!-- Bienvenida -->
    <section class="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div class="card relative overflow-hidden p-6 sm:p-8">
        <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-matcha-50" aria-hidden="true" />
        <div class="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-blush-50" aria-hidden="true" />
        <div class="relative">
          <p class="flex items-center gap-2 text-sm font-bold text-matcha-700">
            <Coffee class="h-4 w-4" /> {{ greeting }}
          </p>
          <h1 class="mt-2 max-w-lg text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Un test cada día, sin agobios.
          </h1>
          <p class="mt-3 max-w-lg text-main-soft">
            Practica con las reglas reales de tu asignatura, repasa lo que dudaste y mira cómo sube tu nota.
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            <BaseButton v-if="engine.isActive.value" size="lg" @click="router.push('/exam')">
              <PlayCircle class="h-5 w-5" /> Continuar «{{ engine.session.value?.title }}»
            </BaseButton>
            <BaseButton :variant="engine.isActive.value ? 'outline' : 'primary'" size="lg" @click="importOpen = true">
              <UploadCloud class="h-5 w-5" /> Importar banco
            </BaseButton>
          </div>
          <div class="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-main-soft">
            <span class="flex items-center gap-1.5">
              <Flame class="h-4 w-4 text-blush-700" />
              <b class="text-main">{{ pluralize(streak, 'día', 'días') }}</b> seguidos
            </span>
            <span v-if="lastSim" class="flex items-center gap-1.5">
              <Sparkles class="h-4 w-4 text-matcha" /> Último simulacro
              <b class="text-main">{{ formatScore(lastSim.score) }}</b>
            </span>
          </div>
        </div>
      </div>

      <!-- Mazo de repaso -->
      <div class="card flex flex-col p-6 sm:p-7">
        <div class="flex items-center gap-3">
          <span class="grid h-11 w-11 place-items-center rounded-2xl bg-blush-100 text-blush-700">
            <Layers class="h-5 w-5" />
          </span>
          <div>
            <h2 class="font-extrabold">Mazo de repaso</h2>
            <p class="text-xs text-main-muted">Fallos y dudas, en repetición espaciada</p>
          </div>
        </div>
        <div class="mt-5 flex items-end gap-3">
          <p class="text-5xl font-extrabold tracking-tight">{{ reviewDue.length }}</p>
          <p class="pb-1.5 text-sm text-main-soft">
            {{ reviewDue.length === 1 ? 'pendiente' : 'pendientes' }} hoy<br />
            <span class="text-main-muted">de {{ reviewValid.length }} en el mazo</span>
          </p>
        </div>
        <!-- distribución por cajas Leitner -->
        <div v-if="reviewValid.length" class="mt-4">
          <div class="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            <div
              v-for="(n, i) in boxes"
              v-show="n > 0"
              :key="i"
              :class="['h-full first:rounded-l-full last:rounded-r-full', ['bg-error', 'bg-blush-600', 'bg-blush', 'bg-matcha-300', 'bg-matcha-600'][i]]"
              :style="{ flexGrow: n }"
              :title="`Caja ${i + 1}: ${n}`"
            />
          </div>
          <div class="mt-1.5 flex justify-between text-[11px] font-semibold text-main-muted">
            <span>Recién falladas</span><span>Casi dominadas</span>
          </div>
        </div>
        <div class="mt-auto grid gap-2 pt-5">
          <BaseButton variant="blush" :disabled="!reviewDue.length" @click="startReview({ onlyDue: true })">
            Repasar pendientes
          </BaseButton>
          <BaseButton v-if="reviewValid.length > reviewDue.length" variant="ghost" size="sm" @click="startReview({})">
            Repasar todo el mazo ({{ reviewValid.length }})
          </BaseButton>
        </div>
      </div>
    </section>

    <!-- Bancos -->
    <section>
      <div class="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 class="text-xl font-extrabold tracking-tight">Tus bancos</h2>
          <p class="text-sm text-main-soft">Por asignatura, tema o convocatoria.</p>
        </div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BankCard
          v-for="b in banks"
          :key="b.id"
          :bank="b"
          :results="resultsFor(b.id)"
          :review-count="reviewFor(b.id)"
          @practice="openModal('practice', b)"
          @simulate="openModal('simulation', b)"
          @rules="openModal('rules', b)"
          @review="startReview({ onlyDue: true, bankId: b.id })"
          @export="exportBank(b)"
          @rename="startRename(b)"
          @delete="deleting = b"
        />
        <button
          class="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-stone-200 p-6 text-main-soft transition-all duration-300 ease-in-out hover:scale-[1.01] hover:border-matcha-300 hover:bg-matcha-50/40 hover:text-matcha-700"
          @click="importOpen = true"
        >
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-card shadow-soft"><Plus class="h-6 w-6" /></span>
          <span class="font-bold">Añadir banco</span>
          <span class="max-w-[220px] text-center text-xs text-main-muted">Arrastra un JSON o pega tus preguntas en Markdown</span>
        </button>
      </div>
    </section>

    <!-- Datos locales -->
    <section class="card-soft flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div class="flex items-start gap-3">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-card text-matcha-700 shadow-sm">
          <Database class="h-5 w-5" />
        </span>
        <div>
          <h2 class="font-extrabold">Tus datos son tuyos</h2>
          <p class="text-sm text-main-soft">
            Todo vive en este navegador (IndexedDB). Haz una copia para llevarla a otro dispositivo.
            <span v-if="storage.persistent.value" class="inline-flex items-center gap-1 font-semibold text-matcha-700">
              <ShieldCheck class="h-3.5 w-3.5" /> Almacenamiento persistente activo.
            </span>
          </p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <BaseButton variant="outline" size="sm" @click="exportAll"><Download class="h-4 w-4" /> Exportar copia</BaseButton>
        <label
          class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 bg-card px-3.5 text-sm font-bold transition-all duration-300 hover:scale-[1.02] hover:border-matcha-300"
        >
          <ArchiveRestore class="h-4 w-4" /> Restaurar
          <input type="file" accept=".json,application/json" class="sr-only" @change="importAll" />
        </label>
        <BaseButton variant="ghost" size="sm" @click="wiping = true"><Trash2 class="h-4 w-4" /> Borrar todo</BaseButton>
      </div>
    </section>

    <ImportModal :open="importOpen" @close="importOpen = false" />
    <SimulationModal
      :open="modal?.kind === 'simulation'"
      :bank="modalBank"
      @close="modal = null"
      @start="onStart"
      @edit-rules="editRulesFromSimulation"
    />
    <PracticeModal :open="modal?.kind === 'practice'" :bank="modalBank" @close="modal = null" @start="onStart" />
    <ExamConfigModal
      :open="modal?.kind === 'rules'"
      :bank="modalBank"
      :back-label="modal?.returnTo ? 'Volver' : 'Cancelar'"
      @close="closeRules"
      @saved="closeRules"
    />

    <BaseModal :open="renaming !== null" title="Editar banco" size="sm" @close="renaming = null">
      <form id="rename-form" class="space-y-3" @submit.prevent="saveRename">
        <label class="block">
          <span class="label">Nombre</span>
          <input v-model="renameValue" class="input" required />
        </label>
        <label class="block">
          <span class="label">Asignatura</span>
          <input v-model="renameSubject" class="input" placeholder="Opcional" />
        </label>
      </form>
      <template #footer>
        <BaseButton variant="ghost" @click="renaming = null">Cancelar</BaseButton>
        <BaseButton type="submit" form="rename-form">Guardar</BaseButton>
      </template>
    </BaseModal>

    <ConfirmDialog
      :open="deleting !== null"
      :title="`¿Eliminar «${deleting?.name}»?`"
      message="Se borrarán sus preguntas y sus tarjetas del mazo de repaso. El historial de notas se conserva."
      confirm-label="Eliminar banco"
      tone="danger"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />
    <ConfirmDialog
      :open="pendingLaunch !== null"
      title="Tienes un examen a medias"
      message="Si empiezas otro, el intento actual se descartará sin guardar."
      confirm-label="Descartar y empezar"
      cancel-label="Mantenerlo"
      @confirm="runPending"
      @cancel="pendingLaunch = null"
    />
    <ConfirmDialog
      :open="wiping"
      title="¿Borrar todos los datos?"
      message="Se eliminarán bancos, historial y mazo de repaso de este navegador. Exporta una copia antes si quieres conservarlos."
      confirm-label="Borrar todo"
      tone="danger"
      @confirm="wipe"
      @cancel="wiping = false"
    />
  </div>
</template>

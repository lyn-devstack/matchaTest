<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, ClipboardPaste, FileJson, FileText, Link2, UploadCloud } from 'lucide-vue-next'
import type { QuestionBank } from '@/types/exam'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BasePill from '@/components/ui/BasePill.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { readLocal, useStorage, writeLocal } from '@/composables/useStorage'
import { useToast } from '@/composables/useToast'
import { JSON_EXAMPLE, MARKDOWN_EXAMPLE, parseBankText, type ParsedBank } from '@/utils/importers'
import { uid } from '@/utils/id'
import { NO_TOPIC } from '@/utils/sessionBuilder'
import { FIELD_LABELS } from '@/utils/criteriaParser'
import { formatNumber } from '@/utils/format'
import { fetchBankText } from '@/utils/remoteSource'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; saved: [bank: QuestionBank] }>()

const storage = useStorage()
const toast = useToast()

const tab = ref<'file' | 'link' | 'paste'>('file')
const text = ref('')
const fileName = ref('')
const parsed = ref<ParsedBank | null>(null)
const error = ref('')
const dragging = ref(false)
const name = ref('')
const subject = ref('')
const description = ref('')
const target = ref<string>('new')
const saving = ref(false)
const showFormat = ref<'json' | 'md' | null>(null)
const linkUrl = ref('')
const loadingLink = ref(false)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    text.value = ''
    fileName.value = ''
    parsed.value = null
    error.value = ''
    name.value = ''
    subject.value = ''
    description.value = ''
    target.value = 'new'
    linkUrl.value = readLocal('import-url', '')
  },
)

function parse(content: string, source?: string) {
  error.value = ''
  parsed.value = null
  if (!content.trim()) return
  try {
    const p = parseBankText(content)
    parsed.value = p
    name.value = p.name ?? source?.replace(/\.(json|md|markdown|txt)$/i, '') ?? name.value
    subject.value = p.subject ?? subject.value
    description.value = p.description ?? description.value
  } catch (e) {
    error.value = (e as Error).message
  }
}

let pasteTimer: ReturnType<typeof setTimeout> | undefined
watch(text, (v) => {
  if (tab.value !== 'paste') return
  clearTimeout(pasteTimer)
  pasteTimer = setTimeout(() => parse(v), 350)
})

async function loadFile(file: File) {
  if (file.size > 15 * 1024 * 1024) {
    error.value = 'El archivo es demasiado grande (máx. 15 MB).'
    return
  }
  fileName.value = file.name
  parse(await file.text(), file.name)
}

/** Carga el banco desde un enlace (Gist secreto, Raw de GitHub…) sin guardar archivos en el disco */
async function loadLink() {
  const url = linkUrl.value.trim()
  if (!url) return
  loadingLink.value = true
  error.value = ''
  parsed.value = null
  try {
    const { text: content, filename } = await fetchBankText(url)
    fileName.value = filename
    parse(content, filename)
    if (parsed.value) writeLocal('import-url', url)
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loadingLink.value = false
  }
}

function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}
function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) loadFile(file)
  input.value = ''
}

const topics = computed(() => {
  const map = new Map<string, number>()
  for (const q of parsed.value?.questions ?? []) {
    const t = q.topic || NO_TOPIC
    map.set(t, (map.get(t) ?? 0) + 1)
  }
  return [...map.entries()]
})

async function save() {
  if (!parsed.value) return
  saving.value = true
  try {
    const now = Date.now()
    let bank: QuestionBank
    if (target.value === 'new') {
      bank = {
        id: uid('b'),
        name: name.value.trim() || 'Banco sin nombre',
        subject: subject.value.trim() || undefined,
        description: description.value.trim() || undefined,
        questions: parsed.value.questions,
        rules: parsed.value.rules,
        createdAt: now,
        updatedAt: now,
      }
    } else {
      const existing = storage.getBank(target.value)
      if (!existing) throw new Error('El banco de destino ya no existe.')
      const ids = new Set(existing.questions.map((q) => q.id))
      const prefix = `i${now.toString(36)}_`
      const incoming = parsed.value.questions.map((q) => (ids.has(q.id) ? { ...q, id: prefix + q.id } : q))
      bank = { ...existing, questions: [...existing.questions, ...incoming], rules: { ...existing.rules, ...parsed.value.rules } }
    }
    const saved = await storage.saveBank(bank)
    toast.show(`${parsed.value.questions.length} preguntas guardadas en «${saved.name}».`)
    emit('saved', saved)
    emit('close')
  } catch (e) {
    toast.show((e as Error).message, 'error')
  } finally {
    saving.value = false
  }
}

const tabs = [
  { value: 'file' as const, label: 'Subir archivo', icon: UploadCloud },
  { value: 'link' as const, label: 'Desde enlace', icon: Link2 },
  { value: 'paste' as const, label: 'Pegar texto', icon: ClipboardPaste },
]
</script>

<template>
  <BaseModal :open="open" size="lg" title="Importar banco de preguntas" subtitle="JSON o Markdown. Todo se queda en tu navegador." @close="emit('close')">
    <div class="space-y-5 pb-2">
      <SegmentedControl v-model="tab" :options="tabs" />

      <label
        v-if="tab === 'file'"
        :class="[
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-all duration-300',
          dragging ? 'scale-[1.01] border-matcha bg-matcha-50' : 'border-stone-200 bg-cream/60 hover:border-matcha-300 hover:bg-matcha-50/40',
        ]"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <span class="grid h-14 w-14 place-items-center rounded-2xl bg-card text-matcha shadow-soft">
          <UploadCloud class="h-7 w-7" />
        </span>
        <span class="font-bold">{{ fileName || 'Arrastra aquí tu archivo o haz clic para elegirlo' }}</span>
        <span class="text-sm text-main-muted">.json, .md o .txt</span>
        <input type="file" accept=".json,.md,.markdown,.txt,application/json,text/markdown,text/plain" class="sr-only" @change="onPick" />
      </label>

      <div v-else-if="tab === 'link'" class="space-y-3 rounded-3xl bg-cream/60 p-4 sm:p-5">
        <form class="flex flex-col gap-2 sm:flex-row" @submit.prevent="loadLink">
          <input
            v-model="linkUrl"
            type="url"
            inputmode="url"
            autocomplete="off"
            spellcheck="false"
            class="input flex-1 text-sm"
            placeholder="https://gist.github.com/usuario/…"
            aria-label="Enlace al banco"
          />
          <BaseButton type="submit" :loading="loadingLink" :disabled="!linkUrl.trim()">Cargar</BaseButton>
        </form>
        <p class="text-xs text-main-soft">
          Pega el enlace de un <b>Gist secreto</b> de GitHub (o el botón «Raw» de un archivo). El banco se carga directamente en
          este navegador, sin descargar archivos. Google Drive y Dropbox no lo permiten.
        </p>
        <p v-if="fileName && parsed" class="text-xs font-semibold text-matcha-700">Cargado: {{ fileName }}</p>
      </div>

      <textarea
        v-else
        v-model="text"
        rows="10"
        class="input scroll-soft resize-y font-mono text-[13px] leading-relaxed"
        placeholder="Pega aquí tu JSON o tus preguntas en Markdown…"
      />

      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="text-main-muted">Ver formato:</span>
        <button
          :class="['inline-flex items-center gap-1 rounded-full px-3 py-1 font-bold transition-all duration-300', showFormat === 'json' ? 'bg-blush text-blush-700' : 'bg-blush-50 text-blush-700 hover:bg-blush-100']"
          @click="showFormat = showFormat === 'json' ? null : 'json'"
        >
          <FileJson class="h-4 w-4" /> JSON
        </button>
        <button
          :class="['inline-flex items-center gap-1 rounded-full px-3 py-1 font-bold transition-all duration-300', showFormat === 'md' ? 'bg-blush text-blush-700' : 'bg-blush-50 text-blush-700 hover:bg-blush-100']"
          @click="showFormat = showFormat === 'md' ? null : 'md'"
        >
          <FileText class="h-4 w-4" /> Markdown
        </button>
      </div>
      <div v-if="showFormat" class="relative">
        <pre class="scroll-soft max-h-64 overflow-auto rounded-2xl bg-main p-4 text-[12px] leading-relaxed text-cream">{{ showFormat === 'json' ? JSON_EXAMPLE : MARKDOWN_EXAMPLE }}</pre>
        <BaseButton
          size="sm"
          variant="soft"
          class="absolute right-3 top-3"
          @click="
            tab = 'paste';
            text = showFormat === 'json' ? JSON_EXAMPLE : MARKDOWN_EXAMPLE
          "
        >
          Usar ejemplo
        </BaseButton>
        <p class="mt-2 text-xs text-main-muted">
          JSON: <code>correct</code> admite índice (desde 0), letra («B») o el texto de la opción. Markdown: marca la correcta con
          <code>[x]</code>, un <code>*</code> final o una línea <code>Respuesta: B</code>. Los <code>## encabezados</code> definen el tema.
        </p>
      </div>

      <p v-if="error" class="flex items-start gap-2 rounded-2xl bg-error-50 p-4 text-sm text-error-700">
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" /> {{ error }}
      </p>

      <div v-if="parsed" class="animate-fade-up space-y-4 rounded-3xl border border-matcha-100 bg-matcha-50/50 p-5">
        <div class="flex flex-wrap items-center gap-2">
          <BasePill tone="matcha" size="md">{{ parsed.questions.length }} preguntas</BasePill>
          <BasePill v-for="[t, n] in topics" :key="t" tone="outline">{{ t }} · {{ n }}</BasePill>
        </div>
        <div v-if="parsed.rules" class="flex flex-wrap gap-2 text-xs">
          <span class="font-semibold text-main-muted">Reglas incluidas:</span>
          <BasePill v-for="(v, k) in parsed.rules" :key="k" tone="blush">
            {{ FIELD_LABELS[k as keyof typeof FIELD_LABELS] ?? k }}: {{ typeof v === 'number' ? formatNumber(v) : v }}
          </BasePill>
        </div>
        <details v-if="parsed.warnings.length" class="text-sm text-main-soft">
          <summary class="cursor-pointer font-semibold text-blush-700">
            {{ parsed.warnings.length }} avisos (preguntas ignoradas)
          </summary>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-xs">
            <li v-for="(w, i) in parsed.warnings.slice(0, 20)" :key="i">{{ w }}</li>
          </ul>
        </details>

        <label v-if="storage.banks.value.length" class="block">
          <span class="label">Guardar en</span>
          <select v-model="target" class="input">
            <option value="new">Nuevo banco</option>
            <option v-for="b in storage.banks.value" :key="b.id" :value="b.id">Añadir a «{{ b.name }}»</option>
          </select>
        </label>
        <div v-if="target === 'new'" class="grid gap-3 sm:grid-cols-2">
          <label class="sm:col-span-2">
            <span class="label">Nombre del banco</span>
            <input v-model="name" class="input" placeholder="p. ej. Psicología del Aprendizaje · Feb 2024" />
          </label>
          <label>
            <span class="label">Asignatura</span>
            <input v-model="subject" class="input" placeholder="Opcional" />
          </label>
          <label>
            <span class="label">Convocatoria / notas</span>
            <input v-model="description" class="input" placeholder="Opcional" />
          </label>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="ghost" @click="emit('close')">Cancelar</BaseButton>
      <BaseButton :disabled="!parsed" :loading="saving" @click="save">Guardar banco</BaseButton>
    </template>
  </BaseModal>
</template>

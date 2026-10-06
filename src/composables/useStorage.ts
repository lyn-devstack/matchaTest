import { computed, ref, watch, type Ref } from 'vue'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { BackupFile, ExamResult, ExamRules, QuestionBank, ReviewItem } from '@/types/exam'
import { createSampleBank } from '@/data/sampleBank'
import { DEFAULT_RULES } from '@/utils/scoring'
import { isDue } from '@/utils/spacedRepetition'
import { plain } from '@/utils/id'

interface MatchaDB extends DBSchema {
  banks: { key: string; value: QuestionBank }
  results: { key: string; value: ExamResult; indexes: { 'by-date': number } }
  review: { key: string; value: ReviewItem; indexes: { 'by-bank': string } }
}

const DB_NAME = 'matchatest'
const DB_VERSION = 1
const LS_PREFIX = 'matchatest:'

// ───────────────────── localStorage (preferencias pequeñas) ─────────────────────

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeLocal(key: string, value: unknown) {
  try {
    if (value === undefined || value === null) localStorage.removeItem(LS_PREFIX + key)
    else localStorage.setItem(LS_PREFIX + key, JSON.stringify(value))
  } catch {
    /* almacenamiento lleno o bloqueado: la app sigue funcionando en memoria */
  }
}

export function useLocalRef<T>(key: string, fallback: T): Ref<T> {
  const r = ref(readLocal(key, fallback)) as Ref<T>
  watch(r, (v) => writeLocal(key, v), { deep: true })
  return r
}

// ───────────────────────────── IndexedDB (estado global) ─────────────────────────────

let dbPromise: Promise<IDBPDatabase<MatchaDB>> | null = null
function db() {
  dbPromise ??= openDB<MatchaDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore('banks', { keyPath: 'id' })
      const results = database.createObjectStore('results', { keyPath: 'id' })
      results.createIndex('by-date', 'finishedAt')
      const review = database.createObjectStore('review', { keyPath: 'key' })
      review.createIndex('by-bank', 'bankId')
    },
  })
  return dbPromise
}

const banks = ref<QuestionBank[]>([])
const results = ref<ExamResult[]>([])
const review = ref<ReviewItem[]>([])
const loaded = ref(false)
const persistent = ref<boolean | null>(null)
const defaultRules = useLocalRef<ExamRules>('default-rules', DEFAULT_RULES)
let initPromise: Promise<void> | null = null

const sortBanks = (list: QuestionBank[]) => list.sort((a, b) => b.updatedAt - a.updatedAt)
const sortResults = (list: ExamResult[]) => list.sort((a, b) => b.finishedAt - a.finishedAt)

async function init() {
  initPromise ??= (async () => {
    const d = await db()
    const [b, r, v] = await Promise.all([d.getAll('banks'), d.getAll('results'), d.getAll('review')])
    if (b.length === 0 && !readLocal('seeded', false)) {
      const sample = createSampleBank()
      await d.put('banks', sample)
      b.push(sample)
      writeLocal('seeded', true)
    }
    banks.value = sortBanks(b)
    results.value = sortResults(r)
    review.value = v
    loaded.value = true
    // Pide al navegador que no borre los datos en caso de poco espacio
    try {
      persistent.value = (await navigator.storage?.persisted?.()) ?? null
      if (persistent.value === false) persistent.value = (await navigator.storage?.persist?.()) ?? false
    } catch {
      persistent.value = null
    }
  })()
  return initPromise
}

// ── Bancos ──
async function saveBank(bank: QuestionBank) {
  const data = plain({ ...bank, updatedAt: Date.now() })
  await (await db()).put('banks', data)
  const i = banks.value.findIndex((b) => b.id === data.id)
  if (i >= 0) banks.value.splice(i, 1, data)
  else banks.value.unshift(data)
  sortBanks(banks.value)
  return data
}

async function deleteBank(id: string) {
  const d = await db()
  const tx = d.transaction(['banks', 'review'], 'readwrite')
  await tx.objectStore('banks').delete(id)
  const keys = await tx.objectStore('review').index('by-bank').getAllKeys(id)
  await Promise.all(keys.map((k) => tx.objectStore('review').delete(k)))
  await tx.done
  banks.value = banks.value.filter((b) => b.id !== id)
  review.value = review.value.filter((r) => r.bankId !== id)
}

const getBank = (id: string) => banks.value.find((b) => b.id === id)

// ── Resultados ──
async function addResult(result: ExamResult) {
  const data = plain(result)
  await (await db()).put('results', data)
  results.value.unshift(data)
  sortResults(results.value)
}

async function deleteResult(id: string) {
  await (await db()).delete('results', id)
  results.value = results.value.filter((r) => r.id !== id)
}

const getResult = (id: string) => results.value.find((r) => r.id === id)

// ── Mazo de repaso ──
async function applyReviewChanges(upserts: ReviewItem[], removals: string[]) {
  if (!upserts.length && !removals.length) return
  const d = await db()
  const tx = d.transaction('review', 'readwrite')
  await Promise.all([...upserts.map((u) => tx.store.put(plain(u))), ...removals.map((k) => tx.store.delete(k))])
  await tx.done
  const map = new Map(review.value.map((r) => [r.key, r]))
  for (const k of removals) map.delete(k)
  for (const u of upserts) map.set(u.key, u)
  review.value = [...map.values()]
}

async function clearReview(bankId?: string) {
  const keys = review.value.filter((r) => !bankId || r.bankId === bankId).map((r) => r.key)
  await applyReviewChanges([], keys)
}

/** Tarjetas cuyo banco y pregunta siguen existiendo */
const reviewValid = computed(() =>
  review.value.filter((r) => getBank(r.bankId)?.questions.some((q) => q.id === r.questionId)),
)
const reviewDue = computed(() => {
  const now = Date.now()
  return reviewValid.value.filter((r) => isDue(r, now))
})

// ── Copia de seguridad ──
function exportBackup(): BackupFile {
  return plain({
    app: 'matchaTest',
    version: 1,
    exportedAt: Date.now(),
    banks: banks.value,
    results: results.value,
    review: review.value,
    defaultRules: defaultRules.value,
  })
}

async function importBackup(file: BackupFile) {
  if (file?.app !== 'matchaTest' || !Array.isArray(file.banks)) {
    throw new Error('El archivo no es una copia de seguridad de matchaTest.')
  }
  const d = await db()
  const tx = d.transaction(['banks', 'results', 'review'], 'readwrite')
  await Promise.all([
    ...file.banks.map((b) => tx.objectStore('banks').put(b)),
    ...(file.results ?? []).map((r) => tx.objectStore('results').put(r)),
    ...(file.review ?? []).map((r) => tx.objectStore('review').put(r)),
  ])
  await tx.done
  if (file.defaultRules) defaultRules.value = { ...DEFAULT_RULES, ...file.defaultRules }
  initPromise = null
  await init()
}

async function wipeAll() {
  const d = await db()
  const tx = d.transaction(['banks', 'results', 'review'], 'readwrite')
  await Promise.all([tx.objectStore('banks').clear(), tx.objectStore('results').clear(), tx.objectStore('review').clear()])
  await tx.done
  banks.value = []
  results.value = []
  review.value = []
}

export function useStorage() {
  return {
    loaded,
    persistent,
    banks,
    results,
    review,
    reviewValid,
    reviewDue,
    defaultRules,
    init,
    saveBank,
    deleteBank,
    getBank,
    addResult,
    deleteResult,
    getResult,
    applyReviewChanges,
    clearReview,
    exportBackup,
    importBackup,
    wipeAll,
  }
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

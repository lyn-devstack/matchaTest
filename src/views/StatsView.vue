<script setup lang="ts">
import { computed, ref } from 'vue'
import StatsOverview from '@/components/stats/StatsOverview.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useStorage } from '@/composables/useStorage'
import { useToast } from '@/composables/useToast'

const storage = useStorage()
const toast = useToast()
const bankId = ref<string>('all')

const results = computed(() =>
  bankId.value === 'all' ? storage.results.value : storage.results.value.filter((r) => r.bankIds.includes(bankId.value)),
)
const passMark = computed(() => (bankId.value === 'all' ? undefined : storage.getBank(bankId.value)?.rules?.passMark))

const pendingDelete = ref<string | null>(null)
async function confirmDelete() {
  if (!pendingDelete.value) return
  await storage.deleteResult(pendingDelete.value)
  pendingDelete.value = null
  toast.show('Intento eliminado.')
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight">Estadísticas</h1>
        <p class="mt-1 text-main-soft">Tu evolución, sin presión: cada intento es información.</p>
      </div>
      <label class="w-full sm:w-72">
        <span class="label">Asignatura / banco</span>
        <select v-model="bankId" class="input">
          <option value="all">Todos los bancos</option>
          <option v-for="b in storage.banks.value" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </label>
    </header>

    <StatsOverview :results="results" :pass-mark="passMark" @delete="pendingDelete = $event" />

    <ConfirmDialog
      :open="pendingDelete !== null"
      title="¿Borrar este intento?"
      message="Desaparecerá del historial y de las estadísticas. Tu mazo de repaso no cambia."
      confirm-label="Borrar"
      tone="danger"
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />
  </div>
</template>

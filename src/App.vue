<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { BarChart3, Heart, Home, Leaf, PlayCircle } from 'lucide-vue-next'
import ToastHost from '@/components/ui/ToastHost.vue'
import { useExamEngine } from '@/composables/useExamEngine'
import { useStorage } from '@/composables/useStorage'
import { AUTHOR } from '@/config/author'

const route = useRoute()
const engine = useExamEngine()
const { loaded } = useStorage()

/** Durante el examen la cabecera se reduce para minimizar distracciones */
const focusMode = computed(() => route.name === 'exam')

const nav = [
  { to: '/', label: 'Inicio', icon: Home, name: 'dashboard' },
  { to: '/stats', label: 'Estadísticas', icon: BarChart3, name: 'stats' },
]
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header
      v-if="!focusMode"
      class="sticky top-0 z-40 border-b border-stone-200/50 bg-cream/85 backdrop-blur-md"
    >
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <RouterLink to="/" class="group flex items-center gap-2.5" aria-label="matchaTest, inicio">
          <span
            class="grid h-9 w-9 place-items-center rounded-2xl bg-matcha text-white shadow-sm transition-all duration-300 group-hover:rotate-[-8deg] group-hover:scale-105"
          >
            <Leaf class="h-5 w-5" />
          </span>
          <span class="text-lg font-extrabold tracking-tight">
            matcha<span class="text-matcha">Test</span>
          </span>
        </RouterLink>

        <nav class="flex items-center gap-1">
          <RouterLink
            v-if="engine.isActive.value"
            to="/exam"
            class="mr-1 inline-flex items-center gap-1.5 rounded-full bg-blush-100 px-3 py-1.5 text-sm font-bold text-blush-700 transition-all duration-300 hover:scale-[1.02] hover:bg-blush"
          >
            <PlayCircle class="h-4 w-4 animate-breathe" />
            <span class="hidden sm:inline">Continuar examen</span>
          </RouterLink>
          <RouterLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            :class="[
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition-all duration-300',
              route.name === item.name ? 'bg-card text-main shadow-soft' : 'text-main-soft hover:text-main',
            ]"
          >
            <component :is="item.icon" class="h-4 w-4" />
            <span class="hidden sm:inline">{{ item.label }}</span>
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <div v-if="!loaded" class="grid min-h-[60vh] place-items-center">
        <div class="flex items-center gap-3 text-main-soft">
          <Leaf class="h-5 w-5 animate-breathe text-matcha" />
          Preparando tu mesa de estudio…
        </div>
      </div>
      <RouterView v-else v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <footer v-if="!focusMode" class="mx-auto w-full max-w-6xl space-y-1.5 px-4 py-8 text-center text-xs text-main-muted sm:px-6">
      <p class="flex flex-wrap items-center justify-center gap-x-1.5 text-sm text-main-soft">
        <Heart class="h-3.5 w-3.5 fill-blush text-blush-700" aria-hidden="true" />
        Diseñada y creada por
        <a
          v-if="AUTHOR.url"
          :href="AUTHOR.url"
          target="_blank"
          rel="noopener"
          class="font-bold text-main underline decoration-blush-600 decoration-2 underline-offset-4 transition-colors hover:text-matcha-700"
        >{{ AUTHOR.name }}</a>
        <b v-else class="text-main">{{ AUTHOR.name }}</b>
      </p>
      <p>
        matchaTest © {{ AUTHOR.since }} {{ AUTHOR.name }} · Licencia MIT · Tus bancos, notas y repasos se guardan solo en este
        navegador.
      </p>
    </footer>

    <ToastHost />
  </div>
</template>

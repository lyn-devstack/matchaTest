import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import { useExamEngine } from '@/composables/useExamEngine'

// Hash history: funciona en GitHub Pages / Vercel sin reglas de reescritura
export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    {
      path: '/exam',
      name: 'exam',
      component: () => import('@/views/ExamView.vue'),
      beforeEnter: () => (useExamEngine().isActive.value ? true : { name: 'dashboard' }),
    },
    { path: '/results/:id', name: 'results', component: () => import('@/views/ResultsView.vue'), props: true },
    { path: '/stats', name: 'stats', component: () => import('@/views/StatsView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

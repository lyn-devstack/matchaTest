import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { useStorage } from './composables/useStorage'
import './assets/main.css'

useStorage().init()
createApp(App).use(router).mount('#app')

import { ref } from 'vue'

export type ToastTone = 'matcha' | 'blush' | 'error'
export interface Toast {
  id: number
  message: string
  tone: ToastTone
}

const toasts = ref<Toast[]>([])
let seq = 0

export function useToast() {
  function show(message: string, tone: ToastTone = 'matcha', ms = 3200) {
    const id = ++seq
    toasts.value.push({ id, message, tone })
    setTimeout(() => dismiss(id), ms)
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }
  return { toasts, show, dismiss }
}

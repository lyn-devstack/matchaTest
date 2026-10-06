const numberFmt = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const shortFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatScore = (n: number) => numberFmt.format(n)
export const formatNumber = (n: number) => shortFmt.format(n)
export const formatDate = (ts: number) => dateFmt.format(ts)
export const formatDateTime = (ts: number) => dateTimeFmt.format(ts)

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h} h ${m} min`
  if (m > 0) return `${m} min ${s % 60 ? `${s % 60} s` : ''}`.trim()
  return `${s} s`
}

export const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0)

export const optionLetter = (i: number) => String.fromCharCode(65 + i)

export function pluralize(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { ExamResult } from '@/types/exam'
import { formatDate, formatScore } from '@/utils/format'

const props = withDefaults(defineProps<{ results: ExamResult[]; passMark?: number; height?: number }>(), {
  passMark: 5,
  height: 220,
})

// El SVG usa el ancho real del contenedor (1 unidad = 1px) para que el texto no se encoja en móvil
const wrapper = ref<HTMLDivElement | null>(null)
const width = ref(640)
let observer: ResizeObserver | null = null
onMounted(() => {
  if (!wrapper.value) return
  width.value = wrapper.value.clientWidth || 640
  observer = new ResizeObserver(([entry]) => (width.value = Math.max(240, entry.contentRect.width)))
  observer.observe(wrapper.value)
})
onBeforeUnmount(() => observer?.disconnect())

const pad = { top: 16, right: 40, bottom: 28, left: 36 }
const W = computed(() => width.value)
const H = computed(() => props.height)
const innerW = computed(() => W.value - pad.left - pad.right)
const innerH = computed(() => H.value - pad.top - pad.bottom)

/** Cronológico, últimos 30 intentos */
const points = computed(() => {
  const list = [...props.results].sort((a, b) => a.finishedAt - b.finishedAt).slice(-30)
  const n = list.length
  return list.map((r, i) => ({
    r,
    x: pad.left + (n === 1 ? innerW.value / 2 : (i / (n - 1)) * innerW.value),
    y: pad.top + innerH.value - (r.score / 10) * innerH.value,
  }))
})

const yTicks = [0, 2.5, 5, 7.5, 10]
const yOf = (v: number) => pad.top + innerH.value - (v / 10) * innerH.value

const linePath = computed(() => points.value.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
const areaPath = computed(() => {
  const pts = points.value
  if (pts.length < 2) return ''
  const base = yOf(0)
  return `${linePath.value} L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`
})

const hover = ref<number | null>(null)
const svgEl = ref<SVGSVGElement | null>(null)

function onMove(e: PointerEvent) {
  const svg = svgEl.value
  if (!svg || !points.value.length) return
  const rect = svg.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * W.value
  let best = 0
  let dist = Infinity
  points.value.forEach((p, i) => {
    const d = Math.abs(p.x - x)
    if (d < dist) {
      dist = d
      best = i
    }
  })
  hover.value = best
}

function onKey(e: KeyboardEvent) {
  const n = points.value.length
  if (!n) return
  if (e.key === 'ArrowRight') hover.value = Math.min(n - 1, (hover.value ?? -1) + 1)
  else if (e.key === 'ArrowLeft') hover.value = Math.max(0, (hover.value ?? n) - 1)
  else return
  e.preventDefault()
}

const hovered = computed(() => (hover.value === null ? null : points.value[hover.value]))
const last = computed(() => points.value[points.value.length - 1])
const tooltipStyle = computed(() => {
  const p = hovered.value
  if (!p) return {}
  const leftPct = (p.x / W.value) * 100
  return {
    left: `${leftPct}%`,
    top: `${(p.y / H.value) * 100}%`,
    transform: `translate(${leftPct > 70 ? 'calc(-100% - 12px)' : '12px'}, -50%)`,
  }
})
const modeLabel = { simulation: 'Simulacro', practice: 'Práctica', review: 'Repaso' }
</script>

<template>
  <div ref="wrapper" class="relative">
    <svg
      ref="svgEl"
      :viewBox="`0 0 ${W} ${H}`"
      class="h-auto w-full touch-none select-none overflow-visible outline-none"
      role="img"
      :aria-label="`Evolución de la nota en los últimos ${points.length} intentos`"
      tabindex="0"
      @pointermove="onMove"
      @pointerleave="hover = null"
      @focus="hover = points.length - 1"
      @blur="hover = null"
      @keydown="onKey"
    >
      <!-- rejilla -->
      <g>
        <line
          v-for="t in yTicks"
          :key="t"
          :x1="pad.left"
          :x2="W - pad.right"
          :y1="yOf(t)"
          :y2="yOf(t)"
          class="stroke-stone-200/80"
          stroke-width="1"
        />
        <text
          v-for="t in yTicks"
          :key="`l${t}`"
          :x="pad.left - 10"
          :y="yOf(t)"
          text-anchor="end"
          dominant-baseline="middle"
          class="num fill-main-muted text-[11px] font-semibold"
        >
          {{ t.toString().replace('.', ',') }}
        </text>
      </g>

      <!-- nota de corte -->
      <line :x1="pad.left" :x2="W - pad.right" :y1="yOf(passMark)" :y2="yOf(passMark)" class="stroke-blush-600" stroke-width="1.5" />
      <text :x="W - pad.right + 6" :y="yOf(passMark)" dominant-baseline="middle" class="fill-main-soft text-[11px] font-bold">
        corte
      </text>

      <path v-if="areaPath" :d="areaPath" class="fill-matcha/10" />
      <path :d="linePath" fill="none" class="stroke-matcha-600" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

      <!-- crosshair -->
      <line
        v-if="hovered"
        :x1="hovered.x"
        :x2="hovered.x"
        :y1="pad.top"
        :y2="yOf(0)"
        class="stroke-main-muted/50"
        stroke-width="1"
      />

      <!-- puntos (con anillo del color de la superficie) -->
      <circle
        v-for="(p, i) in points"
        :key="p.r.id"
        :cx="p.x"
        :cy="p.y"
        :r="hover === i ? 6 : 4"
        :class="p.r.passed ? 'fill-matcha-600' : 'fill-error-600'"
        class="stroke-card transition-all duration-200"
        stroke-width="2"
      />

      <!-- etiqueta del último valor -->
      <text
        v-if="last && hover === null"
        :x="last.x + 10"
        :y="last.y"
        dominant-baseline="middle"
        class="num fill-main text-[12px] font-extrabold"
      >
        {{ formatScore(last.r.score) }}
      </text>

      <!-- eje X: primera y última fecha -->
      <text v-if="points.length" :x="points[0].x" :y="H - 6" text-anchor="start" class="fill-main-muted text-[11px] font-semibold">
        {{ formatDate(points[0].r.finishedAt) }}
      </text>
      <text
        v-if="points.length > 1"
        :x="last.x"
        :y="H - 6"
        text-anchor="end"
        class="fill-main-muted text-[11px] font-semibold"
      >
        {{ formatDate(last.r.finishedAt) }}
      </text>
    </svg>

    <div
      v-if="hovered"
      class="pointer-events-none absolute z-10 w-max max-w-[220px] rounded-2xl border border-stone-200/70 bg-card px-3.5 py-2.5 text-xs shadow-lift"
      :style="tooltipStyle"
    >
      <p class="text-base font-extrabold text-main">{{ formatScore(hovered.r.score) }}</p>
      <p class="truncate font-semibold text-main-soft">{{ hovered.r.title }}</p>
      <p class="text-main-muted">
        {{ modeLabel[hovered.r.mode] }} · {{ formatDate(hovered.r.finishedAt) }}
      </p>
      <p class="num mt-1 text-main-soft">{{ hovered.r.correct }} ✓ · {{ hovered.r.wrong }} ✗ · {{ hovered.r.blank }} en blanco</p>
    </div>
  </div>
</template>

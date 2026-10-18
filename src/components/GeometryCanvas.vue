<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Ellipse } from '../math/ellipse';
import { ellipseParams, pointAtAngle, sampleEllipse } from '../math/ellipse';
import type { Point } from '../math/types';
import { formatNumber } from '../math/numeric';
import {
  axesOf,
  buildGrid,
  extendedLine,
  labelAnchor,
  makeViewport,
  pathOfPoints,
  toMath,
  toScreen,
} from '../render/project2d';
import type { EllipseFrame } from '../problems/ellipseFrame';
import type { EllipseProblemDef } from '../problems/types';

const props = defineProps<{
  ellipse: Ellipse;
  problem: EllipseProblemDef;
  frame: EllipseFrame | null;
  /** 累计可见/高亮的对象 id */
  highlight: string[];
  guard: [number, number] | null;
}>();

const emit = defineEmits<{ pick: [phi: number] }>();

const W = 640;
const H = 520;

const vp = computed(() => makeViewport(props.ellipse, W, H));
const params = computed(() => ellipseParams(props.ellipse));

const grid = computed(() => buildGrid(vp.value));
const axes = computed(() => axesOf(vp.value));
const ellipsePath = computed(() => pathOfPoints(sampleEllipse(props.ellipse, 260), vp.value, true));

const show = (id: string) => props.highlight.includes(id);

const linePath = computed(() => {
  const f = props.frame;
  if (!f?.line) return '';
  const { p1, p2 } = extendedLine(f.line, vp.value);
  const a = toScreen(p1, vp.value);
  const b = toScreen(p2, vp.value);
  return `M${a.x.toFixed(2)},${a.y.toFixed(2)} L${b.x.toFixed(2)},${b.y.toFixed(2)}`;
});

const P = computed<Point>(() => ({ x: props.problem.fixedPoint.x, y: props.problem.fixedPoint.y }));
const known = computed<Point>(() => ({ x: 2, y: Math.SQRT2 }));

const Q = computed<Point | null>(() => (props.frame ? props.frame.Q : null));
const A = computed<Point | null>(() => props.frame?.A ?? null);
const B = computed<Point | null>(() => props.frame?.B ?? null);
const tangent = computed(() => Boolean(props.frame?.isTangent));

const guardPath = computed(() => {
  const g = props.guard;
  if (!g) return '';
  const [from, to] = g;
  const span = ((to - from + Math.PI * 2) % (Math.PI * 2)) || Math.PI * 2;
  const pts: Point[] = [];
  for (let i = 0; i <= 16; i++) {
    pts.push(pointAtAngle(props.ellipse, from + (span * i) / 16));
  }
  return pathOfPoints(pts, vp.value);
});

const sx = (p: Point) => toScreen(p, vp.value);

/** 半轴标注 */
const axisAnn = computed(() => {
  const { a, b, c } = params.value;
  const o = sx({ x: 0, y: 0 });
  const ax = sx({ x: a, y: 0 });
  const by = sx({ x: 0, y: b });
  const f1 = sx({ x: -c, y: 0 });
  const f2 = sx({ x: c, y: 0 });
  return { o, ax, by, f1, f2, a, b, c };
});

// —— 交互：拖 Q / 点击椭圆 ——
const svg = ref<SVGSVGElement | null>(null);
const dragging = ref(false);

function toLocal(e: PointerEvent): { x: number; y: number } {
  const el = svg.value;
  if (!el) return { x: 0, y: 0 };
  const rect = el.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}

function pickAt(e: PointerEvent): void {
  const local = toLocal(e);
  const mp = toMath(local, vp.value);
  const phi = Math.atan2(mp.y / params.value.b, mp.x / params.value.a);
  emit('pick', phi);
}

function onDown(e: PointerEvent): void {
  dragging.value = true;
  (e.target as Element).setPointerCapture?.(e.pointerId);
  pickAt(e);
}

function onMove(e: PointerEvent): void {
  if (!dragging.value) return;
  pickAt(e);
}

function onUp(e: PointerEvent): void {
  dragging.value = false;
  (e.target as Element).releasePointerCapture?.(e.pointerId);
}
</script>

<template>
  <svg
    ref="svg"
    class="canvas"
    :viewBox="`0 0 ${W} ${H}`"
    role="application"
    aria-label="椭圆与过定点的直线，可拖动椭圆上的点 Q"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
  >
    <!-- 网格 -->
    <g class="grid">
      <line
        v-for="(g, i) in grid"
        :key="'g' + i"
        :x1="g.x1"
        :y1="g.y1"
        :x2="g.x2"
        :y2="g.y2"
        :stroke="g.strong ? '#cbd5e1' : '#eef2f7'"
        :stroke-width="g.strong ? 1.1 : 1"
      />
    </g>

    <!-- 坐标轴 -->
    <g class="axes">
      <line :x1="0" :y1="axes.origin.y" :x2="W" :y2="axes.origin.y" stroke="#94a3b8" stroke-width="1.2" />
      <line :x1="axes.origin.x" :y1="H" :x2="axes.origin.x" :y2="0" stroke="#94a3b8" stroke-width="1.2" />
      <text :x="W - 14" :y="axes.origin.y - 8" fill="#94a3b8" font-size="12">x</text>
      <text :x="axes.origin.x + 8" :y="16" fill="#94a3b8" font-size="12">y</text>
    </g>

    <!-- Q 禁区：P 在椭圆上时，直线会在该扇区退化为切线 -->
    <path v-if="guardPath && show('pt:Q')" :d="guardPath" fill="none" stroke="#fca5a5" stroke-width="7" stroke-linecap="round" opacity="0.55" />

    <!-- 椭圆 -->
    <path :d="ellipsePath" fill="rgba(109,40,217,0.035)" stroke="#1e293b" stroke-width="1.9" />

    <!-- 半轴 / 焦点标注 -->
    <g v-if="show('ann:axes')" class="ann">
      <line :x1="axisAnn.o.x" :y1="axisAnn.o.y" :x2="axisAnn.ax.x" :y2="axisAnn.ax.y" stroke="#0f766e" stroke-width="1.3" stroke-dasharray="5 4" />
      <line :x1="axisAnn.o.x" :y1="axisAnn.o.y" :x2="axisAnn.by.x" :y2="axisAnn.by.y" stroke="#0f766e" stroke-width="1.3" stroke-dasharray="5 4" />
      <text :x="(axisAnn.o.x + axisAnn.ax.x) / 2" :y="axisAnn.o.y + 16" fill="#0f766e" font-size="12" text-anchor="middle">a</text>
      <text :x="axisAnn.o.x + 8" :y="(axisAnn.o.y + axisAnn.by.y) / 2" fill="#0f766e" font-size="12">b</text>
    </g>

    <g v-if="show('ann:focus')" class="ann">
      <line :x1="axisAnn.o.x" :y1="axisAnn.o.y" :x2="axisAnn.f2.x" :y2="axisAnn.f2.y" stroke="#0f766e" stroke-width="1.3" stroke-dasharray="4 3" />
      <circle :cx="axisAnn.f1.x" :cy="axisAnn.f1.y" r="3.2" fill="#0f766e" />
      <circle :cx="axisAnn.f2.x" :cy="axisAnn.f2.y" r="3.2" fill="#0f766e" />
      <text :x="axisAnn.f1.x - 6" :y="axisAnn.f1.y + 16" fill="#0f766e" font-size="11" text-anchor="end">F₁</text>
      <text :x="axisAnn.f2.x + 6" :y="axisAnn.f2.y + 16" fill="#0f766e" font-size="11">F₂</text>
      <text :x="(axisAnn.o.x + axisAnn.f2.x) / 2" :y="axisAnn.o.y - 7" fill="#0f766e" font-size="11" text-anchor="middle">c</text>
    </g>

    <!-- 直线 l -->
    <path v-if="show('line:l') && linePath" :d="linePath" fill="none" stroke="#6d28d9" stroke-width="1.7" />

    <!-- OA / OB -->
    <g v-if="show('seg:OA') || show('seg:OB')" class="segments">
      <line v-if="show('seg:OA') && A" :x1="sx({ x: 0, y: 0 }).x" :y1="sx({ x: 0, y: 0 }).y" :x2="sx(A).x" :y2="sx(A).y" stroke="#a78bfa" stroke-width="1.6" stroke-dasharray="6 4" />
      <line v-if="show('seg:OB') && B" :x1="sx({ x: 0, y: 0 }).x" :y1="sx({ x: 0, y: 0 }).y" :x2="sx(B).x" :y2="sx(B).y" stroke="#c4b5fd" stroke-width="1.6" stroke-dasharray="6 4" />
    </g>

    <!-- 点：已知点 -->
    <g v-if="show('pt:known')">
      <circle :cx="sx(known).x" :cy="sx(known).y" r="5" fill="#0f766e" />
      <text :x="sx(known).x + 9" :y="sx(known).y + 18" fill="#0f766e" font-size="12" font-weight="600">
        (2, √2)
      </text>
    </g>

    <!-- 点：P -->
    <g v-if="show('pt:P')">
      <circle :cx="sx(P).x" :cy="sx(P).y" r="6" fill="#dc2626" />
      <text :x="sx(P).x + 10" :y="sx(P).y - 9" fill="#dc2626" font-size="13" font-weight="600">
        P({{ props.problem.fixedPoint.x }}, {{ props.problem.fixedPoint.y }})
      </text>
    </g>

    <!-- 点：Q -->
    <g v-if="show('pt:Q') && Q && !tangent" class="q-handle">
      <circle :cx="sx(Q).x" :cy="sx(Q).y" r="17" fill="transparent" style="cursor: grab" />
      <circle :cx="sx(Q).x" :cy="sx(Q).y" r="9" fill="none" stroke="#f59e0b" stroke-width="1.4" opacity="0.55" />
      <circle :cx="sx(Q).x" :cy="sx(Q).y" r="5.4" fill="#b45309" />
      <text :x="sx(Q).x + 12" :y="sx(Q).y - 10" fill="#b45309" font-size="13" font-weight="600">Q</text>
    </g>

    <!-- 点：A / B -->
    <g v-if="show('pt:A') && A">
      <circle :cx="sx(A).x" :cy="sx(A).y" r="5.6" fill="#7c3aed" />
      <text :x="sx(A).x + 9" :y="sx(A).y - 8" fill="#7c3aed" font-size="13" font-weight="600">A</text>
    </g>
    <g v-if="show('pt:B') && B">
      <circle :cx="sx(B).x" :cy="sx(B).y" r="5.6" fill="#7c3aed" />
      <text :x="sx(B).x + 9" :y="sx(B).y - 8" fill="#7c3aed" font-size="13" font-weight="600">B</text>
    </g>

    <!-- 原点 -->
    <g>
      <circle :cx="axes.origin.x" :cy="axes.origin.y" r="3" fill="#475569" />
      <text :x="axes.origin.x - 8" :y="axes.origin.y + 16" fill="#475569" font-size="12" text-anchor="end">O</text>
    </g>

    <!-- 相切提示 -->
    <g v-if="tangent && A">
      <text :x="sx(A).x + 12" :y="sx(A).y + 18" fill="#b45309" font-size="12" font-weight="600">
        相切：A = B
      </text>
    </g>

    <!-- 位置读数（跟随 A、B，减少视线移动） -->
    <g v-if="A && show('pt:A')" class="readout">
      <text :x="sx(A).x + 9" :y="sx(A).y + 8" fill="#7c3aed" font-size="11" opacity="0.85">
        ({{ formatNumber(A.x, 2) }}, {{ formatNumber(A.y, 2) }})
      </text>
    </g>
    <g v-if="B && show('pt:B')" class="readout">
      <text :x="sx(B).x + 9" :y="sx(B).y + 8" fill="#7c3aed" font-size="11" opacity="0.85">
        ({{ formatNumber(B.x, 2) }}, {{ formatNumber(B.y, 2) }})
      </text>
    </g>
  </svg>
</template>

<style scoped>
.canvas {
  display: block;
  width: 100%;
  height: auto;
  background: #fff;
  border-radius: 10px;
  touch-action: none;
  user-select: none;
}
</style>

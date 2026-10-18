<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Vec3 } from '../render/project3d';
import {
  cameraBasis,
  makeProjector,
  polygonPath,
  polylinePath,
  projectPoint,
} from '../render/project3d';
import { edgeKey, markFrontFaces } from '../render/occlude';
import type { PyramidModel } from '../problems/pyramid';

const props = defineProps<{
  model: PyramidModel;
  arc: Vec3[];
  camera: { yaw: number; pitch: number };
  highlight: string[];
}>();

const emit = defineEmits<{ rotate: [dyaw: number, dpitch: number] }>();

const W = 600;
const H = 520;

const basis = computed(() => cameraBasis(props.camera));
const faces = computed(() => markFrontFaces(props.model.faces, basis.value));
const projector = computed(() =>
  makeProjector(Object.values(props.model.vertices), basis.value, W, H, 0.76),
);

const projected = computed(() => {
  const pr = projector.value;
  const out: Record<string, { x: number; y: number; depth: number }> = {};
  for (const [name, v] of Object.entries(props.model.vertices)) {
    out[name] = projectPoint(v, pr);
  }
  return out;
});

const frontFaces = computed(() => faces.value.filter((f) => f.front));

/** 判断一条棱是否可见：相邻面至少一个朝前 */
function edgeVisible(a: string, b: string): boolean {
  const key = edgeKey(a, b);
  return faces.value.some((f) => {
    if (!f.front) return false;
    const names = f.names;
    for (let i = 0; i < names.length; i++) {
      const x = names[i];
      const y = names[(i + 1) % names.length];
      if (edgeKey(x, y) === key) return true;
    }
    return false;
  });
}

const edgeLines = computed(() =>
  props.model.edges.map(([a, b]) => {
    const p1 = projected.value[a];
    const p2 = projected.value[b];
    return { a, b, p1, p2, visible: edgeVisible(a, b) };
  }),
);

const auxLines = computed(() =>
  props.model.aux.map(([a, b]) => ({
    a,
    b,
    p1: projected.value[a],
    p2: projected.value[b],
  })),
);

const labelPos = computed(() => {
  const pr = projector.value;
  const center = pr.center;
  return Object.entries(props.model.vertices)
    .filter(([name]) => name !== 'E')
    .map(([name, v]) => {
      const p = projected.value[name];
      const dx = p.x - pr.cx;
      const dy = p.y - pr.cy;
      const len = Math.hypot(dx, dy) || 1;
      return {
        name,
        x: p.x + (dx / len) * 16,
        y: p.y + (dy / len) * 16,
        px: p.x,
        py: p.y,
      };
    });
});

const arcPath = computed(() => polylinePath(props.arc.map((p) => projectPoint(p, projector.value))));

const foot = computed(() => props.model.metrics.foot);
const footProjected = computed(() => projectPoint(foot.value, projector.value));

// 旋转
const dragging = ref(false);
let lastX = 0;
let lastY = 0;

function onDown(e: PointerEvent): void {
  dragging.value = true;
  lastX = e.clientX;
  lastY = e.clientY;
  (e.target as Element).setPointerCapture?.(e.pointerId);
}

function onMove(e: PointerEvent): void {
  if (!dragging.value) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  emit('rotate', dx * 0.008, dy * 0.006);
}

function onUp(e: PointerEvent): void {
  dragging.value = false;
  (e.target as Element).releasePointerCapture?.(e.pointerId);
}
</script>

<template>
  <svg
    class="canvas"
    :viewBox="`0 0 ${W} ${H}`"
    role="img"
    aria-label="四棱锥 P-ABCD，可拖动旋转"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
  >
    <!-- 朝前的面填充 -->
    <path
      v-for="f in frontFaces"
      :key="f.id"
      :d="polygonPath(f.points.map((p) => projectPoint(p, projector)))"
      fill="#eef2ff"
      stroke="none"
      opacity="0.92"
    />

    <!-- 隐藏棱（虚线，画在填充之上，教材画法） -->
    <line
      v-for="(e, i) in edgeLines.filter((x) => !x.visible)"
      :key="'h' + i"
      :x1="e.p1.x"
      :y1="e.p1.y"
      :x2="e.p2.x"
      :y2="e.p2.y"
      stroke="#94a3b8"
      stroke-width="1.3"
      stroke-dasharray="6 5"
    />

    <!-- 可见棱 -->
    <line
      v-for="(e, i) in edgeLines.filter((x) => x.visible)"
      :key="'v' + i"
      :x1="e.p1.x"
      :y1="e.p1.y"
      :x2="e.p2.x"
      :y2="e.p2.y"
      stroke="#1e293b"
      stroke-width="1.8"
    />

    <!-- 辅助线：AE / PE / DE -->
    <g v-if="highlight.includes('seg:AE')">
      <line
        v-for="(a, i) in auxLines"
        :key="'a' + i"
        :x1="a.p1.x"
        :y1="a.p1.y"
        :x2="a.p2.x"
        :y2="a.p2.y"
        stroke="#7c3aed"
        stroke-width="1.6"
        stroke-dasharray="4 4"
      />
    </g>

    <!-- 二面角平面角弧 -->
    <path v-if="highlight.includes('arc:A-PC-D')" :d="arcPath" fill="none" stroke="#0f766e" stroke-width="2" />

    <!-- 垂足 F -->
    <g v-if="highlight.includes('pt:foot')">
      <circle :cx="footProjected.x" :cy="footProjected.y" r="3.6" fill="#b45309" />
      <text :x="footProjected.x + 8" :y="footProjected.y - 6" fill="#b45309" font-size="12" font-weight="600">F</text>
    </g>

    <!-- 顶点 -->
    <circle
      v-for="p in labelPos"
      :key="'p' + p.name"
      :cx="p.px"
      :cy="p.py"
      r="3.6"
      :fill="p.name === 'P' ? '#dc2626' : '#1e293b'"
    />
    <text
      v-for="p in labelPos"
      :key="'l' + p.name"
      :x="p.x"
      :y="p.y"
      fill="#0f172a"
      font-size="13"
      font-weight="600"
      text-anchor="middle"
    >
      {{ p.name }}
    </text>

    <!-- E 标签 -->
    <g>
      <circle :cx="projected.E.x" :cy="projected.E.y" r="3.4" fill="#7c3aed" />
      <text :x="projected.E.x + 12" :y="projected.E.y + 4" fill="#7c3aed" font-size="13" font-weight="600">E</text>
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
  cursor: grab;
  user-select: none;
}
.canvas:active {
  cursor: grabbing;
}
</style>

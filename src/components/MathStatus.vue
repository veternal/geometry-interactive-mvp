<script setup lang="ts">
import { computed } from 'vue';
import { formatNumber, formatSlope } from '../math/numeric';
import type { EllipseFrame } from '../problems/ellipseFrame';
import type { EllipseProblemDef } from '../problems/types';
import type { PyramidModel } from '../problems/pyramid';
import type { GivenCheck } from '../problems/pyramidCheck';

const props = defineProps<{
  mode: 'ellipse' | 'pyramid';
  frame: EllipseFrame | null;
  problem: EllipseProblemDef | null;
  pyramid: PyramidModel | null;
  pyramidCheck: GivenCheck | null;
}>();

interface Row {
  key: string;
  value: string;
  tone?: 'muted' | 'warn' | 'ok';
  raw?: string;
}

const ellipseRows = computed<Row[]>(() => {
  const f = props.frame;
  if (!f) return [];
  const tangent = f.isTangent;
  return [
    { key: '直线 l', value: f.equation, raw: 'Ax + By + C = 0' },
    { key: 'Q（拖动点）', value: f.Q ? `(${formatNumber(f.Q.x)}, ${formatNumber(f.Q.y)})` : '—' },
    { key: 'A（交点）', value: f.A ? `(${formatNumber(f.A.x)}, ${formatNumber(f.A.y)})` : '—' },
    {
      key: 'B（交点）',
      value: tangent ? '与 A 重合（相切）' : f.B ? `(${formatNumber(f.B.x)}, ${formatNumber(f.B.y)})` : '—',
      tone: tangent ? 'warn' : undefined,
    },
    {
      key: 'k_OA',
      value: formatSlope(f.kOA),
      tone: f.kOA === null ? 'warn' : undefined,
    },
    {
      key: 'k_OB',
      value: formatSlope(f.kOB),
      tone: f.kOB === null ? 'warn' : undefined,
    },
    {
      key: 'k_OA + k_OB',
      value:
        f.sum === null
          ? '不可求和'
          : `${formatNumber(f.kOA)} ${f.kOB !== null && f.kOB < 0 ? '−' : '+'} ${formatNumber(Math.abs(f.kOB ?? 0))} = ${formatNumber(f.sum)}`,
      tone: f.sum === null ? 'warn' : 'ok',
    },
    {
      key: '|AB|（弦长）',
      value: tangent ? '0（相切）' : formatNumber(f.chordLength, 3),
      tone: tangent ? 'warn' : undefined,
      raw: '几何不变量',
    },
  ];
});

const pyramidRows = computed<Row[]>(() => {
  const m = props.pyramid?.metrics;
  if (!m) return [];
  const ok = Math.abs(m.aeDotDP) <= 1e-9;
  return [
    { key: 'AE · DP', value: formatNumber(m.aeDotDP, 4), tone: ok ? 'ok' : 'warn' },
    { key: '∠(AE, 平面 PCD)', value: `${formatNumber(m.angleDeg, 2)}°`, tone: ok ? 'ok' : 'warn' },
    { key: '垂足 F', value: `(${formatNumber(m.foot.x, 3)}, ${formatNumber(m.foot.y, 3)}, ${formatNumber(m.foot.z, 3)})` },
    { key: '|EF|', value: formatNumber(m.footToE, 4), tone: ok ? 'ok' : 'warn' },
    { key: 'cos θ（A-PC-D）', value: formatNumber(m.cosDihedral, 4) },
    { key: 'θ', value: `${formatNumber(m.dihedralDeg, 2)}°` },
  ];
});

const rows = computed(() => (props.mode === 'ellipse' ? ellipseRows.value : pyramidRows.value));
</script>

<template>
  <section class="panel status">
    <header class="head">
      <span>当前数学状态</span>
      <span class="tag">{{ mode === 'ellipse' ? '实时派生' : '题设长度' }}</span>
    </header>

    <dl class="grid">
      <template v-for="r in rows" :key="r.key">
        <dt>{{ r.key }}</dt>
        <dd :class="['val', 'mono', r.tone ?? '']">
          {{ r.value }}
          <span v-if="r.raw" class="raw">{{ r.raw }}</span>
        </dd>
      </template>
    </dl>

    <p v-if="mode === 'ellipse'" class="hint">
      斜率按三态处理：不存在就显示"不存在"，求和遇到不存在就显示"不可求和"——不会用 0 或极大值替代。
    </p>
  </section>
</template>

<style scoped>
.status {
  padding: 14px 16px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  font-weight: 650;
  color: var(--muted);
  margin-bottom: 8px;
  letter-spacing: 0.04em;
}
.grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 5px 14px;
  margin: 0;
}
dt {
  color: var(--muted);
  font-size: 12.5px;
  white-space: nowrap;
}
dd {
  margin: 0;
  font-size: 12.5px;
  color: var(--ink);
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}
.val.warn {
  color: var(--warn);
  font-weight: 600;
}
.val.ok {
  color: var(--ok);
  font-weight: 600;
}
.val.muted {
  color: var(--muted);
}
.raw {
  font-family: inherit;
  font-size: 10.5px;
  color: #94a3b8;
}
.hint {
  margin: 10px 0 0;
  font-size: 11.5px;
  color: var(--muted);
  line-height: 1.65;
  border-top: 1px dashed var(--line);
  padding-top: 8px;
}
</style>

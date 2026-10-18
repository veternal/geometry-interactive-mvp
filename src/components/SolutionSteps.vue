<script setup lang="ts">
import { computed } from 'vue';
import MathText from './MathText.vue';
import type { AssertResult, StepDef } from '../problems/types';

const props = defineProps<{
  steps: StepDef[];
  currentIndex: number;
  asserts: Record<string, AssertResult[]>;
}>();

const emit = defineEmits<{ select: [index: number] }>();

const current = computed(() => props.steps[props.currentIndex] ?? null);

function statusOf(step: StepDef): 'pass' | 'fail' | 'none' {
  const res = props.asserts[step.id];
  if (!res || res.length === 0) return 'none';
  return res.every((r) => r.pass) ? 'pass' : 'fail';
}
</script>

<template>
  <section class="panel steps">
    <header class="head">
      <span>分步解析</span>
      <span class="tag">{{ currentIndex + 1 }} / {{ steps.length }}</span>
    </header>

    <ol class="list">
      <li
        v-for="(s, i) in steps"
        :key="s.id"
        :class="['item', { active: i === currentIndex, past: i < currentIndex }]"
        @click="emit('select', i)"
      >
        <div class="row">
          <span class="idx mono">{{ s.id }}</span>
          <span class="step-title">{{ s.title }}</span>
          <span v-if="statusOf(s) === 'pass'" class="badge pass" title="该步结论已由程序校验">✓</span>
          <span v-else-if="statusOf(s) === 'fail'" class="badge fail" title="该步断言未通过">✗</span>
        </div>

        <div v-if="i === currentIndex" class="body">
          <div v-for="(tex, j) in s.latex" :key="j" class="tex-line">
            <MathText :tex="tex" display />
          </div>

          <p v-if="s.note" class="note">{{ s.note }}</p>

          <ul v-if="asserts[s.id]?.length" class="asserts">
            <li v-for="a in asserts[s.id]" :key="a.id" :class="a.pass ? 'ok' : 'bad'">
              <span class="mark">{{ a.pass ? '✓' : '✗' }}</span>
              <span class="alabel">{{ a.label }}</span>
              <span class="amsg mono">{{ a.message }}</span>
            </li>
          </ul>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.steps {
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
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.item {
  border-radius: 8px;
  padding: 7px 8px;
  cursor: pointer;
  transition: background 0.14s;
}
.item:hover {
  background: #f8fafc;
}
.item.active {
  background: var(--accent-soft);
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.idx {
  font-size: 11.5px;
  color: var(--muted);
  min-width: 26px;
}
.item.active .idx {
  color: var(--accent);
  font-weight: 600;
}
.step-title {
  font-size: 13.5px;
  flex: 1;
  line-height: 1.5;
}
.item.past .step-title {
  color: #475569;
}
.badge {
  font-size: 11px;
  width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  border-radius: 50%;
  flex: none;
}
.badge.pass {
  background: var(--ok-soft);
  color: var(--ok);
}
.badge.fail {
  background: var(--error-soft);
  color: var(--error);
}
.body {
  padding: 6px 0 2px 34px;
}
.tex-line {
  margin: 3px 0;
  color: #1e293b;
}
.note {
  margin: 8px 0 4px;
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.7;
  border-left: 2px solid #ddd6fe;
  padding-left: 9px;
}
.asserts {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.asserts li {
  display: flex;
  gap: 6px;
  align-items: baseline;
  font-size: 11.5px;
  line-height: 1.6;
}
.asserts .mark {
  flex: none;
  font-weight: 700;
}
.asserts .ok .mark {
  color: var(--ok);
}
.asserts .bad .mark {
  color: var(--error);
}
.alabel {
  color: #334155;
  flex: none;
}
.amsg {
  color: var(--muted);
  font-size: 10.5px;
}
</style>

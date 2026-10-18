<script setup lang="ts">
import MathText from './MathText.vue';
import type { Problem } from '../problems/types';

defineProps<{
  problem: Problem;
  problems: Problem[];
  currentId: string;
}>();

const emit = defineEmits<{ select: [id: string] }>();
</script>

<template>
  <section class="panel problem">
    <div class="tabs">
      <button
        v-for="p in problems"
        :key="p.metadata.id"
        :class="['tab', { active: p.metadata.id === currentId }]"
        @click="emit('select', p.metadata.id)"
      >
        {{ p.metadata.title }}
      </button>
    </div>

    <h1 class="title">{{ problem.statement.title }}</h1>

    <ol class="lines">
      <li v-for="(l, i) in problem.statement.lines" :key="i">
        <span class="line-text">{{ l }}</span>
      </li>
    </ol>

    <div class="givens">
      <span v-for="(v, k) in problem.givens" :key="k" class="given">
        <span class="k">{{ k }}</span>
        <span class="v">{{ v }}</span>
      </span>
    </div>

    <p class="role">{{ problem.metadata.role }}</p>
  </section>
</template>

<style scoped>
.problem {
  padding: 16px 18px 14px;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.tab {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--line-soft);
  border: 1px solid transparent;
  color: var(--muted);
}
.tab.active {
  background: var(--accent-soft);
  border-color: #ddd6fe;
  color: var(--accent);
  font-weight: 600;
}
.title {
  font-size: 15px;
  font-weight: 650;
  line-height: 1.6;
  margin: 0 0 8px;
  letter-spacing: 0.01em;
}
.lines {
  margin: 0 0 10px;
  padding-left: 20px;
  color: #1e293b;
}
.lines li {
  margin: 2px 0;
}
.line-text {
  white-space: pre-wrap;
}
.givens {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.given {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-size: 12px;
  background: #f8fafc;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 2px 8px;
}
.given .k {
  color: var(--muted);
}
.given .v {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--ink);
}
.role {
  margin: 0;
  font-size: 12.5px;
  color: var(--muted);
  border-left: 3px solid #ddd6fe;
  padding-left: 10px;
}
</style>

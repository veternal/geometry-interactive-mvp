<script setup lang="ts">
import type { ConsistencyCopy } from '../math/validator';

defineProps<{ copy: ConsistencyCopy | null }>();
</script>

<template>
  <section v-if="copy" :class="['banner', copy.tone]">
    <span class="dot" aria-hidden="true" />
    <div class="text">
      <strong>{{ copy.title }}</strong>
      <p>{{ copy.detail }}</p>
    </div>
  </section>
</template>

<style scoped>
.banner {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #f8fafc;
  line-height: 1.65;
}
.banner.ok {
  background: var(--ok-soft);
  border-color: #a7f3d0;
}
.banner.warn {
  background: var(--warn-soft);
  border-color: #fde68a;
}
.banner.error {
  background: var(--error-soft);
  border-color: #fecaca;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 7px;
  flex: none;
  background: var(--muted);
}
.banner.ok .dot {
  background: var(--ok);
}
.banner.warn .dot {
  background: var(--warn);
}
.banner.error .dot {
  background: var(--error);
}
.text strong {
  font-size: 13px;
  font-weight: 650;
}
.banner.warn .text strong {
  color: #92400e;
}
.banner.error .text strong {
  color: #991b1b;
}
.banner.ok .text strong {
  color: #115e59;
}
.text p {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: #334155;
}
</style>

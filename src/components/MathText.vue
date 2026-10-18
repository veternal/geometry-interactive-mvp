<script setup lang="ts">
import { computed } from 'vue';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const props = withDefaults(
  defineProps<{
    tex: string;
    display?: boolean;
    /** 允许换行，用于较长的推导行 */
    wrap?: boolean;
  }>(),
  { display: false, wrap: false },
);

const html = computed(() => {
  try {
    return katex.renderToString(props.tex, {
      throwOnError: false,
      displayMode: props.display,
      strict: false,
      output: 'html',
    });
  } catch {
    return `<code>${props.tex}</code>`;
  }
});
</script>

<template>
  <span class="math-text" :class="{ block: display, wrap }" v-html="html" />
</template>

<style scoped>
.math-text {
  display: inline-block;
  max-width: 100%;
}
.math-text.block {
  display: block;
  overflow-x: auto;
  overflow-y: hidden;
}
.math-text.wrap {
  white-space: normal;
}
</style>

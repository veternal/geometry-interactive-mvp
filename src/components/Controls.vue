<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  isEllipse: boolean;
  phiDeg: number;
  guard: [number, number] | null;
  tangentMode: boolean;
  ad: number;
  adMin: number;
  adMax: number;
  adStep: number;
  isPlaying: boolean;
  stepIndex: number;
  stepCount: number;
  canJump: boolean;
  jumpLabel: string;
  jumpHint: string;
}>();

const emit = defineEmits<{
  phi: [deg: number];
  ad: [value: number];
  prev: [];
  next: [];
  play: [];
  reset: [];
  jump: [];
}>();

const inGuard = computed(() => {
  if (!props.isEllipse || !props.guard || props.tangentMode) return false;
  const [from, to] = props.guard;
  // 禁区跨越 0° 时按区间包含判断
  const v = props.phiDeg;
  if (from <= to) return v >= from && v <= to;
  return v >= from || v <= to;
});
</script>

<template>
  <section class="panel controls">
    <div class="left">
      <template v-if="isEllipse">
        <label class="slider">
          <span class="lbl">
            Q 的参数角 φ
            <span class="mono val">{{ phiDeg.toFixed(1) }}°</span>
          </span>
          <input
            type="range"
            min="0"
            max="359.9"
            step="0.1"
            :value="phiDeg"
            :disabled="tangentMode"
            aria-label="Q 的参数角"
            @input="emit('phi', Number(($event.target as HTMLInputElement).value))"
          />
        </label>
        <span v-if="inGuard" class="guard-note">该区间内 Q 与 P 重合，已避开</span>
        <span v-else-if="tangentMode" class="guard-note">切线展示中：φ 不可拖</span>
      </template>

      <label v-else class="slider">
        <span class="lbl">
          AD（拖动或滑块）
          <span class="mono val">{{ ad.toFixed(2) }}</span>
        </span>
        <input
          type="range"
          :min="adMin"
          :max="adMax"
          :step="adStep"
          :value="ad"
          aria-label="AD 的长度"
          @input="emit('ad', Number(($event.target as HTMLInputElement).value))"
        />
      </label>
    </div>

    <div class="right">
      <button ghost @click="emit('prev')" :disabled="stepIndex === 0">上一步</button>
      <button @click="emit('next')" :disabled="stepIndex >= stepCount - 1">下一步</button>
      <button :class="{ primary: !isPlaying }" @click="emit('play')">
        {{ isPlaying ? '暂停' : '播放' }}
      </button>
      <button ghost @click="emit('reset')">重置</button>
      <button class="primary jump" :disabled="!canJump" :title="jumpHint" @click="emit('jump')">
        {{ jumpLabel }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 10px 16px;
  flex-wrap: wrap;
}
.left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 300px;
  flex: 1;
}
.slider {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  max-width: 460px;
}
.lbl {
  font-size: 11.5px;
  color: var(--muted);
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.val {
  color: var(--ink);
  font-weight: 600;
}
input[type='range'] {
  width: 100%;
  accent-color: var(--accent);
}
.guard-note {
  font-size: 11px;
  color: var(--warn);
  background: var(--warn-soft);
  padding: 2px 7px;
  border-radius: 6px;
  white-space: nowrap;
}
.right {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.jump {
  font-weight: 600;
}
</style>

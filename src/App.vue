<script setup lang="ts">
import { computed } from 'vue';
import ProblemPanel from './components/ProblemPanel.vue';
import SolutionSteps from './components/SolutionSteps.vue';
import GeometryCanvas from './components/GeometryCanvas.vue';
import PyramidCanvas from './components/PyramidCanvas.vue';
import MathStatus from './components/MathStatus.vue';
import Controls from './components/Controls.vue';
import ConsistencyBanner from './components/ConsistencyBanner.vue';
import { useGeometryState } from './composables/useGeometryState';
import { toRad } from './math/numeric';

const state = useGeometryState();

function onPick(phi: number): void {
  state.setPhi(phi);
}

function onRotate(dyaw: number, dpitch: number): void {
  const c = state.camera.value;
  const pitch = Math.max(-1.2, Math.min(1.2, c.pitch + dpitch));
  state.camera.value = { yaw: c.yaw + dyaw, pitch };
}

const jumpLabel = computed(() => {
  if (state.isEllipse.value) {
    return state.canJump.value ? '跳到 Σ = 2 的位置' : '本题无满足条件的位置';
  }
  return state.canJump.value ? '把 AD 调到条件成立' : '未找到满足条件的取值';
});

const jumpHint = computed(() => {
  if (state.canJump.value) return '直接跳到使条件成立的参数取值';
  return state.isEllipse.value
    ? '该题在参数域内不存在满足条件的位置（详见上方提示）'
    : '未找到满足条件的取值';
});

const adRange = computed(() => {
  const p = state.problem.value;
  if (p.kind !== 'pyramid') return { min: 1, max: 5, step: 0.1 };
  const s = p.sliders.find((x) => x.key === 'ad');
  return s ? { min: s.min, max: s.max, step: s.step } : { min: 1, max: 5, step: 0.1 };
});

const mode = computed<'ellipse' | 'pyramid'>(() => (state.isEllipse.value ? 'ellipse' : 'pyramid'));
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <span class="mark">几何互动解析</span>
        <span class="ver">MVP · Plan V3</span>
      </div>
      <span class="meta">数学层是唯一事实来源 · 渲染只负责表现</span>
    </header>

    <ProblemPanel
      :problem="state.problem.value"
      :problems="state.problems"
      :current-id="state.problemId.value"
      @select="state.selectProblem"
    />

    <div class="body">
      <div class="col left">
        <SolutionSteps
          :steps="state.problem.value.steps"
          :current-index="state.stepIndex.value"
          :asserts="state.allAsserts.value"
          @select="state.applyStep"
        />
      </div>

      <div class="col right">
        <section class="panel canvas-wrap">
          <GeometryCanvas
            v-if="state.isEllipse.value && state.ellipse.value && state.ellipseProblem.value"
            :ellipse="state.ellipse.value"
            :problem="state.ellipseProblem.value"
            :frame="state.frame.value"
            :highlight="state.highlight.value"
            :guard="state.guard.value"
            @pick="onPick"
          />
          <PyramidCanvas
            v-else
            :model="state.pyramid.value"
            :arc="state.pyramidArc.value"
            :camera="state.camera.value"
            :highlight="state.highlight.value"
            @rotate="onRotate"
          />
          <p class="canvas-tip">
            <template v-if="state.isEllipse.value">
              拖动橙色点 Q，或点击椭圆任意位置；直线 PQ 是派生量，永远过 P。竖直方向（φ = 270°）也能连续到达。
            </template>
            <template v-else>拖动图形可旋转视角；拖动下方 AD 滑块可以看到条件何时成立。</template>
          </p>
        </section>

        <ConsistencyBanner :copy="state.consistency.value" />

        <MathStatus
          :mode="mode"
          :frame="state.frame.value"
          :problem="state.ellipseProblem.value"
          :pyramid="state.isEllipse.value ? null : state.pyramid.value"
          :pyramid-check="state.isEllipse.value ? null : state.pyramidCheck.value"
        />
      </div>
    </div>

    <Controls
      :is-ellipse="state.isEllipse.value"
      :phi-deg="state.phiDeg.value"
      :guard="state.guard.value"
      :tangent-mode="state.tangentMode.value"
      :ad="state.ad.value"
      :ad-min="adRange.min"
      :ad-max="adRange.max"
      :ad-step="adRange.step"
      :is-playing="state.isPlaying.value"
      :step-index="state.stepIndex.value"
      :step-count="state.problem.value.steps.length"
      :can-jump="state.canJump.value"
      :jump-label="jumpLabel"
      :jump-hint="jumpHint"
      @phi="(d) => state.setPhi(toRad(d))"
      @ad="(v) => (state.ad.value = v)"
      @prev="state.prevStep"
      @next="state.nextStep"
      @play="state.play"
      @reset="state.reset"
      @jump="state.jumpToWitness"
    />
  </div>
</template>

<style scoped>
.app {
  max-width: 1360px;
  margin: 0 auto;
  padding: 18px 22px 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.topbar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px;
}
.brand {
  display: flex;
  align-items: baseline;
  gap: 9px;
}
.mark {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.ver {
  font-size: 11px;
  color: var(--muted);
  background: var(--line-soft);
  border-radius: 999px;
  padding: 1px 8px;
}
.meta {
  font-size: 11.5px;
  color: var(--muted);
}
.body {
  display: grid;
  grid-template-columns: minmax(340px, 0.86fr) minmax(460px, 1.14fr);
  gap: 12px;
  align-items: start;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.canvas-wrap {
  padding: 10px 12px 8px;
}
.canvas-tip {
  margin: 6px 2px 2px;
  font-size: 11.5px;
  color: var(--muted);
  line-height: 1.6;
}
@media (max-width: 1080px) {
  .body {
    grid-template-columns: 1fr;
  }
  .app {
    padding: 14px 12px 20px;
  }
}
</style>

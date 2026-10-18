import { computed, onBeforeUnmount, ref } from 'vue';
import { makeEllipse } from '../math/ellipse';
import { normalizeAngle, toDeg, toRad } from '../math/numeric';
import type { ConsistencyCopy } from '../math/validator';
import { consistencyCopy } from '../math/validator';
import { emptyABState, assignAB } from '../math/identity';
import type { ABState } from '../math/identity';
import {
  clampPhi,
  guardRange,
  makeEllipseFrame,
  trackedFrame,
} from '../problems/ellipseFrame';
import { runStepAsserts } from '../problems/assert';
import { ellipseChecks, problems } from '../problems/registry';
import type { EllipseProblemDef, Problem } from '../problems/types';
import { buildPyramid, dihedralArc, PYRAMID_AB, PYRAMID_PA } from '../problems/pyramid';
import { checkGivenAd, givenCopy } from '../problems/pyramidCheck';

/**
 * 交互状态层（V2 §6.5）。
 *
 * 只持有少数状态：
 *  - 椭圆题：φ（+ 一个"切线展示"开关，因为切线不在 φ 的像里）
 *  - 立体题：AD 与相机 yaw / pitch
 * 其余全部由 math/ 派生，前端不做数学判断。
 */
export function useGeometryState() {
  const problemId = ref(problems[0].metadata.id);
  const problem = computed<Problem>(
    () => problems.find((p) => p.metadata.id === problemId.value) ?? problems[0],
  );

  const stepIndex = ref(0);
  const step = computed(() => problem.value.steps[stepIndex.value] ?? null);
  const assertResults = computed(() => runStepAsserts(step.value));
  const stepHasFailure = computed(() => assertResults.value.some((r) => !r.pass));

  /** 所有步骤的断言结果：让"每一步结论都被程序校验过"这件事可见 */
  const allAsserts = computed<Record<string, ReturnType<typeof runStepAsserts>>>(() => {
    const map: Record<string, ReturnType<typeof runStepAsserts>> = {};
    for (const s of problem.value.steps) map[s.id] = runStepAsserts(s);
    return map;
  });

  /** 累计可见对象：步骤前进时对象累积出现，回退时不闪 */
  const highlight = computed(() => {
    const set = new Set<string>();
    const steps = problem.value.steps;
    for (let i = 0; i <= stepIndex.value && i < steps.length; i++) {
      for (const id of steps[i].highlight) set.add(id);
    }
    // 立体几何的辅助线在最后一步之前就应可见
    return [...set];
  });

  const phi = ref(toRad(300));
  const tangentMode = ref(false);
  const abState = ref<ABState>(emptyABState());

  const ad = ref(4);
  const camera = ref({ yaw: 3.6, pitch: 0.45 });

  const isEllipse = computed(() => problem.value.kind === 'ellipse');
  const ellipseProblem = computed<EllipseProblemDef | null>(() =>
    problem.value.kind === 'ellipse' ? problem.value : null,
  );

  const ellipse = computed(() => {
    const p = ellipseProblem.value;
    return p ? makeEllipse(p.ellipse.a2, p.ellipse.b2) : null;
  });

  const frame = computed(() => {
    const p = ellipseProblem.value;
    const el = ellipse.value;
    if (!p || !el) return null;
    return trackedFrame(el, p.fixedPoint, phi.value, abState.value, {
      tangentMode: tangentMode.value,
    });
  });

  const guard = computed(() => {
    const p = ellipseProblem.value;
    const el = ellipse.value;
    if (!p || !el) return null;
    return guardRange(el, p.fixedPoint, p.guardDeg);
  });

  const phiDeg = computed(() => toDeg(phi.value));

  function setPhi(next: number, opts: { clamp?: boolean } = {}): void {
    const p = ellipseProblem.value;
    const el = ellipse.value;
    if (!p || !el) return;
    const value =
      opts.clamp === false
        ? normalizeAngle(next)
        : clampPhi(el, p.fixedPoint, next, p.guardDeg);
    phi.value = value;
    const f = makeEllipseFrame(el, p.fixedPoint, value, { tangentMode: tangentMode.value });
    const { next: ns } = assignAB(f.points, abState.value);
    abState.value = ns;
  }

  /** 一致性结论（椭圆题）：来自模块加载时的预计算，不随拖动变化 */
  const ellipseConsistency = computed<{ copy: ConsistencyCopy; canJump: boolean } | null>(() => {
    const p = ellipseProblem.value;
    if (!p) return null;
    const report = ellipseChecks[p.metadata.id];
    if (!report) return null;
    const copy = consistencyCopy(report.consistency, {
      target: p.condition.target,
      targetSymbol: p.condition.symbol,
      range: report.range,
    });
    return {
      copy,
      canJump: report.consistency.state === 'OK' && report.consistency.witness.phi !== undefined,
    };
  });

  /** 立体几何模型 */
  const pyramid = computed(() => buildPyramid(PYRAMID_AB, ad.value, PYRAMID_PA));
  const pyramidCheck = computed(() =>
    checkGivenAd(ad.value, { ab: PYRAMID_AB, pa: PYRAMID_PA, symbol: 'AE·DP' }),
  );
  const pyramidCopy = computed(() => givenCopy(pyramidCheck.value, PYRAMID_PA));
  const pyramidArc = computed(() => dihedralArc(pyramid.value));

  const consistencyCopyText = computed<ConsistencyCopy | null>(() =>
    isEllipse.value ? (ellipseConsistency.value?.copy ?? null) : pyramidCopy.value,
  );

  function applyStep(i: number): void {
    const p = problem.value;
    if (i < 0 || i >= p.steps.length) return;
    stepIndex.value = i;
    const s = p.steps[i];
    if (p.kind === 'ellipse') {
      tangentMode.value = s.params?.tangentMode === 1;
      if (s.params?.phiDeg !== undefined) {
        setPhi(toRad(s.params.phiDeg), { clamp: false });
      }
    } else if (s.params?.ad !== undefined) {
      ad.value = s.params.ad;
    }
  }

  function nextStep(): void {
    if (stepIndex.value < problem.value.steps.length - 1) applyStep(stepIndex.value + 1);
  }

  function prevStep(): void {
    if (stepIndex.value > 0) applyStep(stepIndex.value - 1);
  }

  function reset(): void {
    stepIndex.value = 0;
    tangentMode.value = false;
    abState.value = emptyABState();
    const p = problem.value;
    if (p.kind === 'ellipse') {
      setPhi(toRad(p.initialPhiDeg), { clamp: false });
    } else {
      ad.value = p.base.ad;
      camera.value = { ...p.camera };
    }
  }

  function selectProblem(id: string): void {
    problemId.value = id;
    const p = problems.find((x) => x.metadata.id === id);
    stepIndex.value = 0;
    tangentMode.value = false;
    abState.value = emptyABState();
    if (p?.kind === 'ellipse') {
      setPhi(toRad(p.initialPhiDeg), { clamp: false });
    } else if (p?.kind === 'pyramid') {
      ad.value = p.base.ad;
      camera.value = { ...p.camera };
    }
  }

  /** 跳到满足条件的参数值（椭圆题用 φ，立体题用 AD） */
  function jumpToWitness(): void {
    const p = problem.value;
    if (p.kind === 'ellipse') {
      const report = ellipseChecks[p.metadata.id];
      if (report?.consistency.state === 'OK' && report.consistency.witness.phi !== undefined) {
        tangentMode.value = false;
        setPhi(report.consistency.witness.phi, { clamp: false });
      }
    } else if (pyramidCheck.value.witness !== null) {
      ad.value = pyramidCheck.value.witness;
    }
  }

  const canJump = computed(() =>
    isEllipse.value ? Boolean(ellipseConsistency.value?.canJump) : pyramidCheck.value.witness !== null,
  );

  // 播放
  const isPlaying = ref(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  function stopPlay(): void {
    isPlaying.value = false;
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function play(): void {
    if (isPlaying.value) {
      stopPlay();
      return;
    }
    isPlaying.value = true;
    timer = setInterval(() => {
      if (stepIndex.value >= problem.value.steps.length - 1) {
        stopPlay();
        return;
      }
      nextStep();
    }, 2600);
  }

  onBeforeUnmount(stopPlay);

  return {
    problems,
    problemId,
    problem,
    selectProblem,
    stepIndex,
    step,
    assertResults,
    allAsserts,
    highlight,
    stepHasFailure,
    applyStep,
    nextStep,
    prevStep,
    reset,
    play,
    isPlaying,

    isEllipse,
    ellipseProblem,
    ellipse,
    frame,
    guard,
    phi,
    phiDeg,
    setPhi,
    tangentMode,
    ellipseConsistency,
    jumpToWitness,
    canJump,

    ad,
    camera,
    pyramid,
    pyramidCheck,
    pyramidArc,

    consistency: consistencyCopyText,
  };
}

export type GeometryState = ReturnType<typeof useGeometryState>;

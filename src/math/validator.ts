import type { Point, Slope } from './types';
import { EPS, angleDistance, toDeg } from './numeric';

/**
 * 题目条件一致性校验（V2 §4.6 / §7.7）。
 *
 * 范式：参数化 → 条件方程 F(θ) → 求零点集 Z → 四态判定。
 * 本实现用"粗扫 + 二分"求 Z，因为解析式随题型变化，不构成通用路径；
 * 扫描在参数域内进行，因此天然覆盖竖直直线等奇异位置。
 */

export type DegenerateReason =
  | 'TANGENT_A_EQUALS_B'
  | 'SLOPE_UNDEFINED'
  | 'COINCIDES_WITH_FIXED'
  | 'PLANE_DEGENERATE';

export interface Witness {
  /** OK 时为满足条件的参数角；DEGENERATE_ONLY 时仅为未定义状态的示例角，不是解 */
  phi?: number;
  /** 由参数角换算的斜率（null = 竖直线） */
  k?: Slope;
  /** 目标量的实际值 */
  value?: number;
  /** 示例点 */
  point?: Point;
}

export type Consistency =
  | { state: 'OK'; witness: Witness }
  | { state: 'EMPTY' }
  | { state: 'DEGENERATE_ONLY'; witness: Witness; reason: DegenerateReason }
  | { state: 'UNDEFINED_PARAM'; reason: string; witness?: Witness };

export interface FrameProbe {
  phi: number;
  points: Point[];
  A: Point | null;
  B: Point | null;
  isTangent: boolean;
  /** 目标量（如 k_OA + k_OB）；不可求和时为 null */
  measure: Slope;
}

export interface CheckOptions {
  /** 目标值，如 2 */
  target: number;
  /** 定点 P：用于判定"交点与定点重合" */
  fixedPoint?: Point;
  /** 粗扫步长（弧度），默认 0.25° */
  coarseStepRad?: number;
}

export interface CheckReport {
  consistency: Consistency;
  /** 参数域内有效帧数（probe 非 null） */
  validFrames: number;
  /** 目标量有定义的帧数 */
  definedFrames: number;
  /** 目标量在参数域内的取值范围，便于解释"为什么不相容" */
  range: { min: number; max: number } | null;
}

export function checkCondition(
  probe: (phi: number) => FrameProbe | null,
  opts: CheckOptions,
): CheckReport {
  const step = opts.coarseStepRad ?? (0.25 * Math.PI) / 180;
  const twoPi = Math.PI * 2;

  const probes: FrameProbe[] = [];
  let validFrames = 0;
  let definedFrames = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  const manyProbes: FrameProbe[] = [];

  const steps = Math.ceil(twoPi / step);
  for (let i = 0; i <= steps; i++) {
    const phi = (i / steps) * twoPi;
    const f = probe(phi);
    if (!f) continue;
    validFrames++;
    manyProbes.push(f);
    if (f.measure !== null && Number.isFinite(f.measure)) {
      definedFrames++;
      min = Math.min(min, f.measure);
      max = Math.max(max, f.measure);
      probes.push(f);
    }
  }

  if (validFrames === 0) {
    return {
      consistency: { state: 'UNDEFINED_PARAM', reason: '参数域内直线始终未定义' },
      validFrames,
      definedFrames,
      range: null,
    };
  }

  const range = definedFrames > 0 ? { min, max } : null;

  // 目标量在整个参数域内都未定义；保留退化状态用于解释，不把示例角当作原条件的解。
  if (definedFrames === 0) {
    const reason = inferReason(manyProbes, opts.fixedPoint);
    const sample = manyProbes[Math.floor(manyProbes.length / 2)];
    return {
      consistency: {
        state: 'DEGENERATE_ONLY',
        reason,
        witness: {
          phi: sample?.phi,
          k: kOfSample(sample),
        },
      },
      validFrames,
      definedFrames,
      range: null,
    };
  }

  // 符号变化 → 二分细化
  const g = (phi: number): number | null => {
    const f = probe(phi);
    if (!f || f.measure === null) return null;
    return f.measure - opts.target;
  };

  const hits: number[] = [];
  for (let i = 0; i < probes.length - 1; i++) {
    const a = probes[i];
    const next = probes[i + 1];
    // 只比较相邻的粗扫帧：若 φ 间距明显大于步长，说明中间存在"目标量未定义"的帧，
    // 跨越 null 区间判断符号变化会产生假根（Σ 在 null 点两侧可能异号）。
    if (Math.abs(next.phi - a.phi) > step * 1.5) continue;

    const ga = (a.measure as number) - opts.target;
    if (Math.abs(ga) <= EPS) {
      pushUnique(hits, a.phi);
      continue;
    }
    const gb = (next.measure as number) - opts.target;
    if (Math.sign(ga) !== Math.sign(gb)) {
      const root = bisect(g, a.phi, next.phi);
      if (root !== null) pushUnique(hits, root);
    }
  }

  if (hits.length > 0) {
    const phi = hits[0];
    const f = probe(phi);
    return {
      consistency: {
        state: 'OK',
        witness: {
          phi,
          k: slopeFromFrame(f),
          value: f?.measure ?? opts.target,
          point: f?.A ?? undefined,
        },
      },
      validFrames,
      definedFrames,
      range,
    };
  }

  return {
    consistency: { state: 'EMPTY' },
    validFrames,
    definedFrames,
    range,
  };
}

function pushUnique(arr: number[], v: number): void {
  for (const x of arr) {
    if (angleDistance(x, v) <= 1e-6) return;
  }
  arr.push(v);
}

function bisect(
  f: (phi: number) => number | null,
  lo: number,
  hi: number,
  iterations = 80,
): number | null {
  let a = lo;
  let b = hi;
  let fa = f(a);
  if (fa === null) return null;
  const fb = f(b);
  if (fb === null) return null;
  if (Math.sign(fa) === Math.sign(fb)) return null;

  for (let i = 0; i < iterations; i++) {
    const mid = (a + b) / 2;
    const fm = f(mid);
    if (fm === null) return null;
    if (Math.abs(b - a) <= 1e-12) {
      a = mid;
      b = mid;
      break;
    }
    if (Math.sign(fm) === Math.sign(fa)) {
      a = mid;
      fa = fm;
    } else {
      b = mid;
    }
  }
  return (a + b) / 2;
}

/** 推断退化原因：优先级 交点与定点重合 → 相切 → 斜率不存在 */
export function inferReason(probes: FrameProbe[], fixedPoint?: Point): DegenerateReason {
  if (probes.length === 0) return 'SLOPE_UNDEFINED';

  // 只用"确实产生了交点"的帧：直线未定义的帧（Q 与 P 重合）没有交点，
  // 不能用它否定"交点始终含定点"这一判断。
  const withPoints = probes.filter((p) => p.points.length > 0);
  if (withPoints.length === 0) return 'SLOPE_UNDEFINED';

  if (fixedPoint) {
    const allCoincide = withPoints.every((p) =>
      p.points.some((q) => Math.hypot(q.x - fixedPoint.x, q.y - fixedPoint.y) <= EPS),
    );
    if (allCoincide) return 'COINCIDES_WITH_FIXED';
  }

  if (withPoints.every((p) => p.isTangent)) return 'TANGENT_A_EQUALS_B';

  return 'SLOPE_UNDEFINED';
}

function kOfSample(f?: FrameProbe): Slope {
  if (!f) return null;
  return slopeFromFrame(f);
}

/** 由一帧的 A 点推算直线斜率（仅用于 witness 展示，不作为计算事实） */
function slopeFromFrame(f: FrameProbe | null): Slope {
  if (!f || !f.A || !f.B) return null;
  const dx = f.B.x - f.A.x;
  if (Math.abs(dx) <= 1e-12) return null;
  return (f.B.y - f.A.y) / dx;
}

/** 一致性状态 → 文案（V2 §7.7：组件内不写分支文案） */
export interface ConsistencyCopy {
  title: string;
  detail: string;
  tone: 'ok' | 'warn' | 'error';
}

export interface CopyContext {
  targetSymbol?: string;
  target?: number;
  range?: { min: number; max: number } | null;
}

export function consistencyCopy(c: Consistency, ctx: CopyContext = {}): ConsistencyCopy {
  const symbol = ctx.targetSymbol ?? '目标量';
  const target = ctx.target;

  switch (c.state) {
    case 'OK': {
      const phi = c.witness.phi;
      const where = phi === undefined ? '' : `（φ ≈ ${toDeg(phi).toFixed(2)}°）`;
      const val = c.witness.value;
      return {
        title: '题目条件相容',
        detail:
          target === undefined
            ? `参数域内存在取值使 ${symbol} 等于目标值${where}。`
            : `存在参数取值使 ${symbol} = ${target}${where}，此时 ${symbol} ≈ ${val?.toFixed(4) ?? '—'}。`,
        tone: 'ok',
      };
    }
    case 'EMPTY': {
      const r = ctx.range;
      const rangeText = r ? `参数域内 ${symbol} 的实际取值范围是 [${r.min.toFixed(4)}, ${r.max.toFixed(4)}]` : '';
      return {
        title: '题目条件不相容',
        detail:
          target === undefined
            ? `参数域内没有任何取值满足 ${symbol} 的目标值。${rangeText}`
            : `参数域内没有任何取值满足 ${symbol} = ${target}。${rangeText}`,
        tone: 'error',
      };
    }
    case 'DEGENERATE_ONLY': {
      return {
        title: '原条件无有效解：目标量未定义',
        detail: degenerateDetail(c.reason, symbol, target),
        tone: 'warn',
      };
    }
    case 'UNDEFINED_PARAM': {
      return {
        title: '当前参数化无法表达此情形',
        detail: `${c.reason}。需要改用一般式 Ax + By + C = 0 表述，而不是斜率参数。`,
        tone: 'warn',
      };
    }
  }
}

function degenerateDetail(reason: DegenerateReason, symbol: string, target?: number): string {
  const t = target === undefined ? '' : ` = ${target}`;
  switch (reason) {
    case 'COINCIDES_WITH_FIXED':
      return `过定点的直线与圆锥曲线的交点中，恒有一个与该定点重合。以原点 O 与它相连的线段是竖直线（x = 0），斜率不存在，所以 ${symbol} 在整个参数域内都无法求和，更不可能等于 ${target ?? '目标值'}。原条件无有效解；界面展示的退化情形也不是原条件的解。`;
    case 'TANGENT_A_EQUALS_B':
      return `形式候选使直线与曲线相切，两个交点重合为一个点（A = B）；此时 ${symbol}${t} 没有有效定义，不能把该候选当作原条件的解。`;
    case 'SLOPE_UNDEFINED':
      return `${symbol} 的计算过程中需要某个斜率，而该斜率在参数域内恒不存在。斜率不存在不能被当作 0 或极大值参与运算，因此 ${symbol} 不可求和。`;
    case 'PLANE_DEGENERATE':
      return `该情形下所涉及的平面退化（三点共线或法向为零），无法定义所需的角或距离。`;
  }
}

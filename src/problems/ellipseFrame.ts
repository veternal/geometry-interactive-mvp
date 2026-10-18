import type { Ellipse } from '../math/ellipse';
import { angleOfPoint, isOnEllipse, pointAtAngle } from '../math/ellipse';
import type { Line, Point, Slope } from '../math/types';
import { equationText, lineThrough, normalize } from '../math/line';
import { intersect } from '../math/intersection';
import { slopeOf, sumSlopes } from '../math/slope';
import type { FrameProbe } from '../math/validator';
import { normalizeAngle, toRad } from '../math/numeric';
import { emptyABState, assignAB } from '../math/identity';
import type { ABState } from '../math/identity';

/**
 * 椭圆题的"帧"：由 (椭圆, 定点, φ) 唯一确定的全部数学量。
 * 除 φ 之外没有任何独立状态——这就是 V2 §2.3 的核心约定。
 */

export interface EllipseFrame {
  phi: number;
  Q: Point;
  line: Line | null;
  equation: string;
  points: Point[];
  A: Point | null;
  B: Point | null;
  isTangent: boolean;
  /** 是否处于"定点处切线"展示模式（φ 无法表达切线，见 README） */
  tangentMode: boolean;
  disc: number;
  /** 两交点弦长（几何不变量，用于展示与断言） */
  chordLength: number;
  kOA: Slope;
  kOB: Slope;
  sum: Slope;
  probe: FrameProbe;
}

export interface FrameOptions {
  /**
   * 切线展示模式：φ 的像里不包含 P 处的切线（它对应 Q → P 的极限），
   * 因此 P(0,2) 处的退化形式候选需要单独展示；它不是原条件的解。
   */
  tangentMode?: boolean;
}

/** P 在椭圆上时，P 处的切线：x·x₀/a² + y·y₀/b² = 1 */
function tangentAt(el: Ellipse, P: Point): Line {
  return normalize({ A: P.x / el.a2, B: P.y / el.b2, C: -1 });
}

export function makeEllipseFrame(
  el: Ellipse,
  P: Point,
  phi: number,
  opts: FrameOptions = {},
): EllipseFrame {
  const Q = pointAtAngle(el, phi);
  const useTangent = Boolean(opts.tangentMode) && isOnEllipse(el, P);

  const line = useTangent ? tangentAt(el, P) : lineThrough(P, Q);

  if (!line) {
    return {
      phi,
      Q,
      line: null,
      equation: '—',
      points: [],
      A: null,
      B: null,
      isTangent: false,
      tangentMode: useTangent,
      disc: Number.NaN,
      chordLength: 0,
      kOA: null,
      kOB: null,
      sum: null,
      probe: {
        phi,
        points: [],
        A: null,
        B: null,
        isTangent: false,
        measure: null,
      },
    };
  }

  const res = intersect(el, line);
  const A = res.points[0] ?? null;
  const B = res.points.length > 1 ? res.points[res.points.length - 1] : null;
  const kOA = A ? slopeOf(A) : null;
  const kOB = B ? slopeOf(B) : null;
  const sum = sumSlopes(kOA, kOB);

  return {
    phi,
    Q,
    line,
    equation: equationText(line),
    points: res.points,
    A,
    B,
    isTangent: res.isTangent,
    tangentMode: useTangent,
    disc: res.disc,
    chordLength: res.chordLength,
    kOA,
    kOB,
    sum,
    probe: {
      phi,
      points: res.points,
      A,
      B,
      isTangent: res.isTangent,
      measure: sum,
    },
  };
}

/** 带身份保持的帧：交互层使用，保证 A/B 不跳号 */
export interface TrackedFrame extends EllipseFrame {
  abState: ABState;
}

export function trackedFrame(
  el: Ellipse,
  P: Point,
  phi: number,
  prev: ABState = emptyABState(),
  opts: FrameOptions = {},
): TrackedFrame {
  const f = makeEllipseFrame(el, P, phi, opts);
  if (f.points.length === 0) return { ...f, abState: prev };

  const { A, B, next } = assignAB(f.points, prev);
  const kOA = A ? slopeOf(A) : null;
  const kOB = B ? slopeOf(B) : null;
  return {
    ...f,
    A,
    B,
    kOA,
    kOB,
    sum: sumSlopes(kOA, kOB),
    abState: next,
    probe: { ...f.probe, A, B, measure: sumSlopes(kOA, kOB) },
  };
}

/** 定点 P 在椭圆上的参数角（弧度）；不在椭圆上返回 null */
export function phiOfFixedPoint(el: Ellipse, P: Point): number | null {
  return isOnEllipse(el, P) ? normalizeAngle(angleOfPoint(el, P)) : null;
}

/**
 * 交互域约束：P 在椭圆上时，排除 Q 落在 P 附近 guardDeg 的扇区，
 * 否则直线退化为切线、Q 与 P 重合，交互失去意义。
 */
export function clampPhi(el: Ellipse, P: Point, phi: number, guardDeg: number): number {
  const pPhi = phiOfFixedPoint(el, P);
  if (pPhi === null) return normalizeAngle(phi);

  const guard = toRad(guardDeg);
  const p = normalizeAngle(phi);
  let d = Math.abs(p - pPhi);
  if (d > Math.PI) d = Math.PI * 2 - d;
  if (d >= guard) return p;

  // 推到禁区边界（按指针更近的一侧）
  const forward = normalizeAngle(pPhi + guard);
  const backward = normalizeAngle(pPhi - guard);
  const df = Math.abs(normalizeAngle(p - pPhi - guard));
  const db = Math.abs(normalizeAngle(p - pPhi + guard));
  return df <= db ? forward : backward;
}

/** 禁区扇区，供 UI 画不可拖拽缺口 */
export function guardRange(el: Ellipse, P: Point, guardDeg: number): [number, number] | null {
  const pPhi = phiOfFixedPoint(el, P);
  if (pPhi === null) return null;
  const guard = toRad(guardDeg);
  return [normalizeAngle(pPhi - guard), normalizeAngle(pPhi + guard)];
}

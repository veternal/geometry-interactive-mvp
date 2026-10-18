import type { Ellipse } from './ellipse';
import { implicit } from './ellipse';
import type { Line, Point } from './types';
import { basePoint, direction } from './line';
import { EPS, EPS_PARAM } from './numeric';

export interface IntersectionResult {
  /** 去重后的交点，按参数 s 升序；相切时为 1 个点 */
  points: Point[];
  /** 对应的直线参数值，与 points 一一对应 */
  s: number[];
  /** 判别式（参数方程的判别式，量纲随系数变化，仅作展示/调试） */
  disc: number;
  /** 相切（两交点合并） */
  isTangent: boolean;
  /** 是否成功求交（false 仅出现在数值异常时） */
  ok: boolean;
  /**
   * 两交点间的弦长（几何不变量）。
   * 注意不要用 disc 做几何判断：Δ 的量纲与方程缩放有关，
   * 换个写法（乘一个常数）Δ 就变了，弦长不会。
   */
  chordLength: number;
}

/**
 * 直线 × 椭圆。
 *
 * 沿直线参数 s 求根，而不是直接解 x——这样竖直直线无需特殊分支。
 * 设 P(s) = base + s·dir，代入 x²/a² + y²/b² = 1 得
 *   c2 s² + c1 s + c0 = 0
 * 其中 c2 = dx²/a² + dy²/b² > 0 恒成立（方向向量非零）。
 */
export function intersect(el: Ellipse, l: Line): IntersectionResult {
  const p0 = basePoint(l);
  const d = direction(l);

  const c2 = (d.x * d.x) / el.a2 + (d.y * d.y) / el.b2;
  const c1 = 2 * ((p0.x * d.x) / el.a2 + (p0.y * d.y) / el.b2);
  const c0 = (p0.x * p0.x) / el.a2 + (p0.y * p0.y) / el.b2 - 1;
  const disc = c1 * c1 - 4 * c2 * c0;

  if (c2 <= 0) {
    return { points: [], s: [], disc, isTangent: false, ok: false, chordLength: 0 };
  }

  const sStar = -c1 / (2 * c2);
  const cand = { x: p0.x + sStar * d.x, y: p0.y + sStar * d.y };

  // Δ < 0：用"最近点是否落在椭圆上"判定相切，避免用 Δ 的绝对阈值（量纲随系数变化）
  if (disc < 0) {
    if (Math.abs(implicit(el, cand)) <= EPS) {
      return { points: [cand], s: [sStar], disc, isTangent: true, ok: true, chordLength: 0 };
    }
    return { points: [], s: [], disc, isTangent: false, ok: true, chordLength: 0 };
  }

  const sq = Math.sqrt(disc);
  let roots = [(-c1 - sq) / (2 * c2), (-c1 + sq) / (2 * c2)];
  if (roots[0] > roots[1]) roots = [roots[1], roots[0]];

  const toPoint = (s: number): Point => ({
    x: p0.x + s * d.x,
    y: p0.y + s * d.y,
  });

  // 相切判据：参数间距（无量纲），避免出现"两个几乎重合的点"
  if (Math.abs(roots[1] - roots[0]) <= EPS_PARAM) {
    const s = (roots[0] + roots[1]) / 2;
    return { points: [toPoint(s)], s: [s], disc, isTangent: true, ok: true, chordLength: 0 };
  }

  return {
    points: roots.map(toPoint),
    s: roots,
    disc,
    isTangent: false,
    ok: true,
    chordLength: roots[1] - roots[0],
  };
}

/** 交点平均残差，用于测试断言 */
export function residualOnEllipse(el: Ellipse, pts: Point[]): number {
  if (pts.length === 0) return 0;
  return Math.max(...pts.map((p) => Math.abs(implicit(el, p))));
}

import type { Point, Slope } from './types';
import { EPS_SLOPE, isZero } from './numeric';

/**
 * 斜率三态（V2 §6.4）。
 * 只返回 number | null，永不返回 Infinity / NaN。
 */

/** 点相对原点的斜率 k = y/x；x ≈ 0 时返回 null（不存在） */
export function slopeOf(p: Point): Slope {
  if (isZero(p.x, EPS_SLOPE)) return null;
  const k = p.y / p.x;
  return Number.isFinite(k) ? k : null;
}

/** 两点连线斜率；两点重合时返回 null */
export function slopeBetween(p: Point, q: Point): Slope {
  const dx = q.x - p.x;
  if (isZero(dx, EPS_SLOPE)) return null;
  const k = (q.y - p.y) / dx;
  return Number.isFinite(k) ? k : null;
}

/**
 * 斜率求和：任一为 null 则整体不可求和（返回 null）。
 * 绝不把 null 当 0 —— 这会让"不可求和"变成错误的数值结论。
 */
export function sumSlopes(...values: Slope[]): Slope {
  let acc = 0;
  for (const v of values) {
    if (v === null || !Number.isFinite(v)) return null;
    acc += v;
  }
  return acc;
}

export function sumOfPoints(from: Point, pts: Point[]): Slope {
  return sumSlopes(...pts.map((p) => slopeOf(p)));
}

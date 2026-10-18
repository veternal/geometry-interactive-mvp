import type { Point } from './types';
import { EPS, dist } from './numeric';

/**
 * A / B 身份稳定性（V2 §6.6.2）。
 *
 * 拖动时若每帧按 x 排序取首尾，标号会在某个位置突然对调，导致连线闪跳。
 * 这里用"与上一帧的最近邻匹配"保持身份。
 */

export interface ABState {
  lastA: Point | null;
  lastB: Point | null;
}

export const emptyABState = (): ABState => ({ lastA: null, lastB: null });

export interface ABResult {
  A: Point | null;
  B: Point | null;
  next: ABState;
}

export function assignAB(points: Point[], prev: ABState): ABResult {
  // 0 点：保持上一帧身份不变（不要清空，否则重新出现时会跳号）
  if (points.length === 0) {
    return { A: null, B: null, next: { ...prev } };
  }

  // 1 点（相切）：A 取该点，B 不存在；不更新 lastB
  if (points.length === 1) {
    return {
      A: points[0],
      B: null,
      next: { lastA: points[0], lastB: prev.lastB },
    };
  }

  const [p, q] = points;

  // 没有历史：按传入顺序（s 升序），稳定
  if (!prev.lastA || !prev.lastB) {
    return { A: p, B: q, next: { lastA: p, lastB: q } };
  }

  const direct = dist(p, prev.lastA) + dist(q, prev.lastB);
  const swapped = dist(q, prev.lastA) + dist(p, prev.lastB);

  // 对称位置（两种分配等价）时保持上一帧顺序，不切换
  if (Math.abs(direct - swapped) <= EPS) {
    return { A: p, B: q, next: { lastA: p, lastB: q } };
  }

  if (direct <= swapped) {
    return { A: p, B: q, next: { lastA: p, lastB: q } };
  }
  return { A: q, B: p, next: { lastA: q, lastB: p } };
}

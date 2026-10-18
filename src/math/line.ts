import type { Line, Point } from './types';
import { EPS, EPS_SLOPE, isZero } from './numeric';

/**
 * 直线的唯一内部表示是一般式 Ax + By + C = 0。
 * 禁止用 y = kx + b 作为内部表示——它无法表示 x = c。
 */

/** 过两点的直线；两点重合时返回 null（直线未定义） */
export function lineThrough(p: Point, q: Point): Line | null {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  if (Math.hypot(dx, dy) <= EPS) return null;
  // (y1 - y2) x + (x2 - x1) y + (x1 y2 - x2 y1) = 0
  return normalize({ A: -dy, B: dx, C: dy * p.x - dx * p.y });
}

/** 由斜截式构造，仅用于题设给定斜率/测试构造（内部仍转成一般式） */
export function lineFromSlopeIntercept(k: number, m: number): Line {
  // y = kx + m  →  kx - y + m = 0
  return normalize({ A: k, B: -1, C: m });
}

/** 归一化：除以模长，并统一符号（A > 0，或 A ≈ 0 时 B > 0），便于比较与显示 */
export function normalize(l: Line): Line {
  const n = Math.hypot(l.A, l.B);
  if (n <= EPS_SLOPE) throw new Error(`直线法向退化: A=${l.A}, B=${l.B}`);
  let { A, B, C } = l;
  A /= n;
  B /= n;
  C /= n;
  if (A < -EPS_SLOPE || (isZero(A) && B < 0)) {
    A = -A;
    B = -B;
    C = -C;
  }
  return { A, B, C };
}

export function valueAt(l: Line, p: Point): number {
  return l.A * p.x + l.B * p.y + l.C;
}

/** 竖直线：B ≈ 0 */
export function isVertical(l: Line, tol = EPS_SLOPE): boolean {
  return isZero(l.B, tol);
}

/** 水平线：A ≈ 0 */
export function isHorizontal(l: Line, tol = EPS_SLOPE): boolean {
  return isZero(l.A, tol);
}

/** 方向向量（单位），与法向 (A,B) 垂直 */
export function direction(l: Line): Point {
  return { x: l.B, y: -l.A };
}

/** 直线上离原点最近的点，作为参数化基点 */
export function basePoint(l: Line): Point {
  const d = l.A * l.A + l.B * l.B;
  return { x: (-l.A * l.C) / d, y: (-l.B * l.C) / d };
}

/** 参数化：P(s) = basePoint + s · direction（direction 已单位化） */
export function pointAtParam(l: Line, s: number): Point {
  const b = basePoint(l);
  const d = direction(l);
  return { x: b.x + s * d.x, y: b.y + s * d.y };
}

/** 点到直线的有符号距离 */
export function signedDistance(l: Line, p: Point): number {
  const n = Math.hypot(l.A, l.B);
  return (l.A * p.x + l.B * p.y + l.C) / n;
}

/** 直线的斜率（三态）：竖直线返回 null。仅用于展示/推导，不作为内部表示。 */
export function slopeOfLine(l: Line): number | null {
  if (isZero(l.B, EPS_SLOPE)) return null;
  const k = -l.A / l.B;
  return Number.isFinite(k) ? k : null;
}

/** 一般式的可读形式，用于状态面板 */
export function equationText(l: Line, digits = 3): string {
  const f = (v: number) => {
    const s = v.toFixed(digits);
    return s === '-0.000' ? '0.000' : s;
  };
  const parts: string[] = [];
  parts.push(`${f(l.A)}x`);
  parts.push(l.B >= 0 ? `+ ${f(l.B)}y` : `− ${f(Math.abs(l.B))}y`);
  parts.push(l.C >= 0 ? `+ ${f(l.C)}` : `− ${f(Math.abs(l.C))}`);
  return `${parts.join(' ')} = 0`;
}

/** 由过定点 P 与斜率 k 得到的直线；k = null 表示竖直线 */
export function lineFromPointSlope(p: Point, k: number | null): Line {
  if (k === null) return normalize({ A: 1, B: 0, C: -p.x });
  return normalize({ A: k, B: -1, C: -k * p.x + p.y });
}

/** 直线间的夹角（弧度，0..π/2） */
export function acuteAngleBetween(l1: Line, l2: Line): number {
  const cos = Math.abs(l1.A * l2.A + l1.B * l2.B);
  return Math.acos(Math.min(1, cos));
}

export { EPS };

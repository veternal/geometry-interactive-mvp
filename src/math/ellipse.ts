import type { Point } from './types';
import { EPS } from './numeric';

/** 标准椭圆 x²/a² + y²/b² = 1（a > b > 0），以 a²、b² 存储避免开根号误差 */
export interface Ellipse {
  a2: number;
  b2: number;
}

export function makeEllipse(a2: number, b2: number): Ellipse {
  if (!(a2 > 0) || !(b2 > 0)) throw new Error(`椭圆参数非法: a2=${a2}, b2=${b2}`);
  return { a2, b2 };
}

export interface EllipseParams {
  a: number;
  b: number;
  c: number;
  /** 离心率 */
  e: number;
}

export function ellipseParams(el: Ellipse): EllipseParams {
  const a = Math.sqrt(el.a2);
  const b = Math.sqrt(el.b2);
  const c = Math.sqrt(Math.max(0, el.a2 - el.b2));
  return { a, b, c, e: a === 0 ? 0 : c / a };
}

/** 点在椭圆上的判定（V2 §6.6.1：|x²/a² + y²/b² − 1| ≤ EPS） */
export function isOnEllipse(el: Ellipse, p: Point, tol = EPS): boolean {
  return Math.abs(implicit(el, p)) <= tol;
}

/** 椭圆隐式方程左端减 1，用于断言残差 */
export function implicit(el: Ellipse, p: Point): number {
  return (p.x * p.x) / el.a2 + (p.y * p.y) / el.b2 - 1;
}

/** 参数点 Q(φ) = (a cosφ, b sinφ)，结构上必在椭圆上 */
export function pointAtAngle(el: Ellipse, phi: number): Point {
  const a = Math.sqrt(el.a2);
  const b = Math.sqrt(el.b2);
  return { x: a * Math.cos(phi), y: b * Math.sin(phi) };
}

/** 由椭圆上一点反解参数角 φ（拖拽/点击的映射） */
export function angleOfPoint(el: Ellipse, p: Point): number {
  const a = Math.sqrt(el.a2);
  const b = Math.sqrt(el.b2);
  return Math.atan2(p.y / b, p.x / a);
}

/** 采样 n 个点，用于绘制 */
export function sampleEllipse(el: Ellipse, n = 240): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    out.push(pointAtAngle(el, (i / n) * Math.PI * 2));
  }
  return out;
}

export function describeEllipse(el: Ellipse): string {
  return `x²/${el.a2} + y²/${el.b2} = 1`;
}

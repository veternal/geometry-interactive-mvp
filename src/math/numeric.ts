/**
 * 数值约定（V2 §6.6.1）
 *
 * 所有容差集中在此文件，禁止在业务代码里散落魔法数字。
 */

/** 几何判定的绝对容差：点在椭圆上、断言比较 */
export const EPS = 1e-9;

/** 斜率/分母判零：|x| <= EPS_SLOPE 视为 0（斜率不存在） */
export const EPS_SLOPE = 1e-12;

/** 两交点合并（相切）的判据：参数间距 |s1 - s2| <= EPS_PARAM（无量纲） */
export const EPS_PARAM = 1e-7;

/** Step.assert 默认容差 */
export const EPS_ASSERT = 1e-9;

/** 交互域内 Q 与 P 的最小角距（度）：P 在椭圆上时排除该扇区 */
export const PHI_GUARD_DEG = 2;

export function nearly(a: number, b: number, tol = EPS): boolean {
  return Math.abs(a - b) <= tol;
}

export function isZero(v: number, tol = EPS_SLOPE): boolean {
  return Math.abs(v) <= tol;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** 归一化到 [0, 2π) */
export function normalizeAngle(a: number): number {
  const twoPi = Math.PI * 2;
  const r = a % twoPi;
  return r < 0 ? r + twoPi : r;
}

/** 两个角之间的最小差值（弧度，非负） */
export function angleDistance(a: number, b: number): number {
  const twoPi = Math.PI * 2;
  let d = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  if (d > Math.PI) d = twoPi - d;
  return d;
}

export function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * 数值展示（V2 §6.6.5）：固定小数位，不做"去尾零"的动态处理，避免抖动。
 * 非法值一律显示占位符，绝不把 NaN / Infinity / undefined 交给用户。
 */
export function formatNumber(v: number | null | undefined, digits = 3): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return v.toFixed(digits);
}

/** 斜率的展示：null → "不存在" */
export function formatSlope(s: number | null | undefined, digits = 3): string {
  if (s === null || s === undefined) return '不存在';
  if (!Number.isFinite(s)) return '不存在';
  return s.toFixed(digits);
}

/** 带符号的数值展示，用于"2.1619 − 0.1619" 这类推导 */
export function formatSigned(v: number | null, digits = 3): string {
  if (v === null || !Number.isFinite(v)) return '—';
  const s = v.toFixed(digits);
  return v >= 0 ? `+${s}` : s;
}

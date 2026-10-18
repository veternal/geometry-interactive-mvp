/**
 * 3D 正交投影（V2 §7.3）。
 *
 * 不引入任何 3D 引擎：一个相机基 + 一次正交投影就够。
 * 状态只有 yaw / pitch 两个标量。
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
export const add = (a: Vec3, b: Vec3): Vec3 => V(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: Vec3, b: Vec3): Vec3 => V(a.x - b.x, a.y - b.y, a.z - b.z);
export const mul = (a: Vec3, k: number): Vec3 => V(a.x * k, a.y * k, a.z * k);
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 =>
  V(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const len = (a: Vec3): number => Math.sqrt(dot(a, a));
export const norm = (a: Vec3): Vec3 => {
  const l = len(a);
  return l <= 1e-12 ? V(0, 0, 0) : mul(a, 1 / l);
};

export interface Camera {
  yaw: number;
  pitch: number;
}

export interface Basis {
  /** 视线方向（由物体指向相机） */
  w: Vec3;
  /** 屏幕右方向 */
  r: Vec3;
  /** 屏幕上方向 */
  u: Vec3;
}

export function cameraBasis({ yaw, pitch }: Camera): Basis {
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const w = V(cp * Math.cos(yaw), cp * Math.sin(yaw), sp);
  const r = V(-Math.sin(yaw), Math.cos(yaw), 0);
  const u = cross(w, r);
  return { w, r, u };
}

export interface Projector {
  cx: number;
  cy: number;
  scale: number;
  center: Vec3;
  basis: Basis;
}

export function makeProjector(
  vertices: Vec3[],
  basis: Basis,
  width = 600,
  height = 520,
  fill = 0.78,
): Projector {
  const n = Math.max(1, vertices.length);
  const center = mul(
    vertices.reduce((s, p) => add(s, p), V(0, 0, 0)),
    1 / n,
  );
  let maxR = 0.1;
  for (const p of vertices) maxR = Math.max(maxR, len(sub(p, center)));
  const scale = Math.min(width, height) * fill * 0.5 / maxR;
  return { cx: width / 2, cy: height / 2, scale, center, basis };
}

export interface Projected {
  x: number;
  y: number;
  /** 沿视线方向的深度，越大越靠近相机 */
  depth: number;
}

export function projectPoint(p: Vec3, pr: Projector): Projected {
  const rel = sub(p, pr.center);
  return {
    x: pr.cx + pr.scale * dot(rel, pr.basis.r),
    y: pr.cy - pr.scale * dot(rel, pr.basis.u),
    depth: dot(rel, pr.basis.w),
  };
}

export function polygonPath(pts: Projected[]): string {
  if (pts.length === 0) return '';
  return (
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z'
  );
}

export function polylinePath(pts: Projected[]): string {
  if (pts.length === 0) return '';
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
}

/** 沿单位球面插值，用于在 3D 中采样二面角弧（正投影下才能是准确的弧） */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const ua = norm(a);
  const ub = norm(b);
  const c = Math.min(1, Math.max(-1, dot(ua, ub)));
  const theta = Math.acos(c);
  if (theta < 1e-9) return ua;
  const s = Math.sin(theta);
  return add(mul(ua, Math.sin((1 - t) * theta) / s), mul(ub, Math.sin(t * theta) / s));
}

export function angleBetween(a: Vec3, b: Vec3): number {
  const na = norm(a);
  const nb = norm(b);
  return Math.acos(Math.min(1, Math.max(-1, dot(na, nb))));
}

/** 点 P 在平面（过 D，法向 n）上的垂足 */
export function footOnPlane(p: Vec3, d: Vec3, n: Vec3): Vec3 {
  const nn = norm(n);
  return sub(p, mul(nn, dot(sub(p, d), nn)));
}

/** 直线与平面的夹角（弧度），返回 0..π/2。
 *  用 atan2(|sin|, |cos|) 而不是 asin：当夹角接近 90° 时 asin 在 |x|→1 处精度骤降。 */
export function angleLineToPlane(dir: Vec3, planeNormal: Vec3): number {
  const n = norm(planeNormal);
  const u = norm(dir);
  const sinTheta = Math.abs(dot(u, n));
  const cosTheta = len(cross(u, n));
  return Math.atan2(sinTheta, cosTheta);
}

/** 二面角 A-棱-D 的平面角（v1、v2 为两个半平面内垂直于棱的方向） */
export function dihedralCos(v1: Vec3, v2: Vec3): number {
  return Math.min(1, Math.max(-1, dot(norm(v1), norm(v2))));
}

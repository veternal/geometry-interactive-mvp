import type { Vec3, Basis } from './project3d';
import { add, cross, dot, mul, norm, sub, V } from './project3d';

/**
 * 凸多面体的面/棱可见性（V2 §7.3）。
 *
 * 定理：凸多面体的一条棱可见 ⟺ 与它相邻的两个面中至少有一个朝前。
 * 由此得到"隐藏棱画虚线、可见棱画实线"的教材画法，无需任何深度缓冲。
 */

export interface Face {
  id: string;
  names: string[];
  points: Vec3[];
  normal: Vec3;
  center: Vec3;
  /** 是否朝前（可见） */
  front: boolean;
}

export function buildFaces(vertices: Record<string, Vec3>, groups: string[][]): Face[] {
  const all = Object.values(vertices);
  const solidCenter = mul(
    all.reduce((s, p) => add(s, p), V(0, 0, 0)),
    1 / Math.max(1, all.length),
  );

  return groups.map((names) => {
    const points = names.map((n) => vertices[n]);
    const center = mul(
      points.reduce((s, p) => add(s, p), V(0, 0, 0)),
      1 / points.length,
    );
    let normal = cross(sub(points[1], points[0]), sub(points[2], points[0]));
    // 统一朝外：法向与"面心 − 体心"同向
    if (dot(normal, sub(center, solidCenter)) < 0) normal = mul(normal, -1);
    return {
      id: names.join(''),
      names,
      points,
      normal: norm(normal),
      center,
      front: false,
    };
  });
}

/** 标记朝向：dot(法向, 视线) > threshold 视为朝前 */
export function markFrontFaces(faces: Face[], basis: Basis, threshold = 0.04): Face[] {
  return faces.map((f) => ({ ...f, front: dot(f.normal, basis.w) > threshold }));
}

export interface EdgeVisibility {
  /** key 为两端点名字母序拼接，如 "AP" */
  visible: Set<string>;
  hidden: Set<string>;
}

export function edgeVisibility(faces: Face[]): EdgeVisibility {
  const visible = new Set<string>();
  const hidden = new Set<string>();

  for (const f of faces) {
    for (let i = 0; i < f.names.length; i++) {
      const a = f.names[i];
      const b = f.names[(i + 1) % f.names.length];
      const key = [a, b].sort().join('');
      if (f.front) visible.add(key);
      else hidden.add(key);
    }
  }
  for (const k of visible) hidden.delete(k);
  return { visible, hidden };
}

export function edgeKey(a: string, b: string): string {
  return [a, b].sort().join('');
}

/** 棱的两个端点是否至少一个朝前的面用到了它 */
export function isEdgeVisible(vis: EdgeVisibility, a: string, b: string): boolean {
  return vis.visible.has(edgeKey(a, b));
}

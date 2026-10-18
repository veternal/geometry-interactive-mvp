import type { Ellipse } from '../math/ellipse';
import { ellipseParams } from '../math/ellipse';
import type { Line, Point } from '../math/types';
import { basePoint, direction } from '../math/line';

/**
 * 2D 正交投影（V2 §7.3）。
 *
 * 整个二维渲染只有这一个坐标变换，缩放/平移只改 cx、cy、scale。
 * 数学坐标 → 屏幕坐标，屏幕 y 轴向下。
 */

export interface Viewport {
  width: number;
  height: number;
  cx: number;
  cy: number;
  /** 每 1 个数学单位对应多少像素 */
  scale: number;
  /** 可见数学范围，供裁剪用 */
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export function makeViewport(
  el: Ellipse,
  width = 640,
  height = 520,
  fillX = 0.74,
  fillY = 0.66,
): Viewport {
  const { a, b } = ellipseParams(el);
  const scale = Math.min((width * fillX) / (2 * a), (height * fillY) / (2 * b));
  const cx = width / 2;
  const cy = height / 2;
  return {
    width,
    height,
    cx,
    cy,
    scale,
    xMin: -cx / scale,
    xMax: cx / scale,
    yMin: -cy / scale,
    yMax: cy / scale,
  };
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export function toScreen(p: Point, vp: Viewport): ScreenPoint {
  return { x: vp.cx + vp.scale * p.x, y: vp.cy - vp.scale * p.y };
}

/** 屏幕坐标 → 数学坐标（拖拽时用） */
export function toMath(sp: ScreenPoint, vp: Viewport): Point {
  return { x: (sp.x - vp.cx) / vp.scale, y: (vp.cy - sp.y) / vp.scale };
}

export function pathOfPoints(pts: Point[], vp: Viewport, close = false): string {
  if (pts.length === 0) return '';
  const d = pts.map((p, i) => {
    const s = toScreen(p, vp);
    return `${i === 0 ? 'M' : 'L'}${s.x.toFixed(2)},${s.y.toFixed(2)}`;
  });
  return d.join(' ') + (close ? ' Z' : '');
}

/** 把直线延长到视口之外，用于绘制（内部保持一般式，不做斜率判断） */
export function extendedLine(l: Line, vp: Viewport): { p1: Point; p2: Point } {
  const b = basePoint(l);
  const d = direction(l);
  const len = (2 * Math.hypot(vp.width, vp.height)) / vp.scale;
  return {
    p1: { x: b.x - d.x * len, y: b.y - d.y * len },
    p2: { x: b.x + d.x * len, y: b.y + d.y * len },
  };
}

export interface GridLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strong: boolean;
}

/** 自适应网格：单位步长取 0.5 / 1 / 2 / 5 等，保证屏幕上间距 ≥ 24px */
export function buildGrid(vp: Viewport): GridLine[] {
  const targetPx = 44;
  const rawStep = targetPx / vp.scale;
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const candidates = [1, 2, 5, 10].map((m) => m * pow);
  const step = candidates.find((s) => s >= rawStep) ?? candidates[candidates.length - 1];

  const lines: GridLine[] = [];
  const { xMin, xMax, yMin, yMax } = vp;

  const startX = Math.ceil(xMin / step) * step;
  for (let x = startX; x <= xMax; x += step) {
    const sx = toScreen({ x, y: 0 }, vp).x;
    lines.push({ x1: sx, y1: 0, x2: sx, y2: vp.height, strong: Math.abs(x) < step / 2 });
  }
  const startY = Math.ceil(yMin / step) * step;
  for (let y = startY; y <= yMax; y += step) {
    const sy = toScreen({ x: 0, y }, vp).y;
    lines.push({ x1: 0, y1: sy, x2: vp.width, y2: sy, strong: Math.abs(y) < step / 2 });
  }
  return lines;
}

/** 坐标轴端点（含箭头方向） */
export function axesOf(vp: Viewport) {
  const origin = toScreen({ x: 0, y: 0 }, vp);
  return {
    origin,
    xEnd: { x: vp.width - 6, y: origin.y },
    yEnd: { x: origin.x, y: 6 },
  };
}

/** 标签位置：按象限外推，避免压住点本身 */
export function labelAnchor(p: Point, vp: Viewport): { x: number; y: number; anchor: 'start' | 'end' | 'middle' } {
  const s = toScreen(p, vp);
  const right = p.x >= 0;
  return {
    x: s.x + (right ? 10 : -10),
    y: s.y - 8,
    anchor: right ? 'start' : 'end',
  };
}

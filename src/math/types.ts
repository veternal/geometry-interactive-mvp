/** 基础类型：Point / Line / Slope。math 层不依赖任何 UI 框架。 */

export interface Point {
  x: number;
  y: number;
}

/** 直线一般式 Ax + By + C = 0（A、B 不同时为 0） */
export interface Line {
  A: number;
  B: number;
  C: number;
}

/** 斜率三态：null 表示不存在（竖直线）。禁止用 Infinity 冒充。 */
export type Slope = number | null;

/**
 * 题目数据契约（V2 §7.5 / §7.6）。
 *
 * 规则：
 * 1. 换题 = 换一个 Problem 对象，不改组件；
 * 2. Step.assert 的 actual 必须调用 math/ 的函数，不允许返回字面量常量；
 * 3. latex 里出现的数字若来自计算，用占位符 + 计算注入，不手写死数。
 */

export type ProblemKind = 'ellipse' | 'pyramid';

export interface StepAssertDef {
  id: string;
  /** 人类可读的断言说明，失败时展示 */
  label: string;
  /** 必须来自 math/ 的计算结果 */
  actual: () => number | null;
  /** null 表示"该量应当不存在" */
  expect: number | null;
  tol?: number;
}

export interface StepDef {
  id: string;
  title: string;
  /** 该步展示的推导行，按顺序逐行出现 */
  latex: string[];
  /** 高亮的几何对象 id（V2 §6.6.3 规范） */
  highlight: string[];
  /** 该步生效的参数，如 { phiDeg: 347.1 } */
  params?: Record<string, number>;
  assert?: StepAssertDef[];
  note?: string;
}

export interface ValidationDef {
  id: string;
  /** 条件的 LaTeX 表述 */
  conditionLatex: string;
  kind: 'identity' | 'perpendicular' | 'onCurve';
  /** 用于文案的符号，如 "k_{OA}+k_{OB}" */
  symbol: string;
  target: number;
}

export interface ProblemMeta {
  id: string;
  grade: string;
  title: string;
  subtitle?: string;
  /** 该题的定位说明，显示在题目区下方 */
  role: string;
}

export interface BaseProblem {
  metadata: ProblemMeta;
  statement: {
    title: string;
    lines: string[];
  };
  givens: Record<string, number | string>;
  steps: StepDef[];
  validations: ValidationDef[];
}

export interface PointDef {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface EllipseProblemDef extends BaseProblem {
  kind: 'ellipse';
  ellipse: { a2: number; b2: number };
  fixedPoint: PointDef;
  /** 初始 φ（度）；若在禁区会被自动夹到边界 */
  initialPhiDeg: number;
  /** P 在椭圆上时，排除 P 附近 ±guardDeg 的扇区 */
  guardDeg: number;
  /** 第二问的目标条件 */
  condition: ValidationDef;
}

export interface PyramidProblemDef extends BaseProblem {
  kind: 'pyramid';
  base: { ab: number; ad: number; pa: number };
  /** 是否补充 PA = AD 这一缺失条件（V2 §4.5） */
  conditions: { paEqualsAd: boolean };
  camera: { yaw: number; pitch: number };
  /** 交互滑块可调的范围 */
  sliders: { key: 'ad'; min: number; max: number; step: number }[];
}

export type Problem = EllipseProblemDef | PyramidProblemDef;

export interface AssertResult {
  id: string;
  label: string;
  pass: boolean;
  actual: number | null;
  expect: number | null;
  tol: number;
  message: string;
}

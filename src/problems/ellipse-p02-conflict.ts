import { makeEllipse, isOnEllipse } from '../math/ellipse';
import { toRad } from '../math/numeric';
import { checkCondition } from '../math/validator';
import type { EllipseProblemDef, StepDef } from './types';
import { makeEllipseFrame } from './ellipseFrame';
import { firstQuestionSteps } from './common';

const el = makeEllipse(8, 4);
const P = { x: 0, y: 2 };

/**
 * 第二问（退化情形）：P(0, 2) 是椭圆的短轴端点。
 *
 * 原条件无有效解：任意过 P 的割线都以 P 为交点，k_OP 不存在。
 * k_OA + k_OB = 2 ⇔ k = (4 − m²)/4 仅在 m² ≠ 4 时成立。
 * 越过该定义域代入 m = 2 得到 k = 0、l: y = 2，只是退化形式候选；
 * 它在 P 处相切，A = B = P，两条原点斜率都不存在。
 */
const check = checkCondition((phi) => makeEllipseFrame(el, P, phi).probe, {
  target: 2,
  fixedPoint: P,
});

const secondSteps: StepDef[] = [
  {
    id: '2.1',
    title: '先检查 P 是否在椭圆上',
    latex: [
      'P(0,2):\\quad \\frac{0^{2}}{8}+\\frac{2^{2}}{4}=1',
      'P\\in C',
    ],
    highlight: ['ellipse', 'pt:P'],
    note: 'P 在椭圆短轴端点上；需要继续检查题设的斜率和式是否有定义。',
    assert: [
      {
        id: 'p-on-curve',
        label: 'P(0,2) 在椭圆上',
        actual: () => (isOnEllipse(el, P) ? 1 : 0),
        expect: 1,
      },
    ],
  },
  {
    id: '2.2',
    title: '过 P 的直线，交点必含 P',
    latex: [
      '\\forall\\,Q\\in C:\\quad l=PQ\\ \\Rightarrow\\ l\\cap C=\\{P,\\ Q\\}',
      'OP:\\ x=0\\ \\Rightarrow\\ k_{OP}\\ \\text{不存在}',
    ],
    highlight: ['ellipse', 'pt:P', 'pt:Q', 'line:l', 'seg:OA', 'seg:OB'],
    params: { phiDeg: 300 },
    note: '这不是某个位置的特殊情况：无论 Q 拖到哪里，过 P 的直线与椭圆的两个交点里总有一个是 P。',
    assert: [
      {
        id: 'one-intersection-is-p',
        label: '任一位置下 P 都是交点之一',
        actual: () => {
          const f = makeEllipseFrame(el, P, toRad(300));
          return f.points.some((q) => Math.hypot(q.x - P.x, q.y - P.y) < 1e-9) ? 1 : 0;
        },
        expect: 1,
      },
    ],
  },
  {
    id: '2.3',
    title: '因此和式不可求和',
    latex: [
      'k_{OA}+k_{OB}=\\underbrace{\\text{不存在}}_{k_{OP}}+\\ k_{OB}',
      '\\text{不存在}+\\text{数}\\ \\text{无意义}',
    ],
    highlight: ['ellipse', 'pt:P', 'pt:A', 'pt:B', 'seg:OA', 'seg:OB'],
    note: '状态面板里 Σ 恒为"不可求和"。不能把不存在的斜率记作 0 或很大很大的数。',
    assert: [
      {
        id: 'sum-undefined',
        label: '任一位置下 Σ 都不可求和',
        actual: () => {
          const f = makeEllipseFrame(el, P, toRad(200));
          return f.sum === null ? null : f.sum;
        },
        expect: null,
      },
    ],
  },
  {
    id: '2.4',
    title: '结论：原条件无有效解',
    latex: [
      'm=2\\ \\Rightarrow\\ m^{2}=4,\\quad \\frac{8k}{4-m^{2}}\\ \\text{无定义}',
      '\\text{仅形式延拓：}\\quad k=\\frac{4-m^{2}}{4}\\Big|_{m=2}=0\\ \\Rightarrow\\ l:y=2',
      'l:y=2\\ \\Rightarrow\\ A=B=P,\\quad k_{OA},k_{OB}\\ \\text{均不存在}',
    ],
    highlight: ['ellipse', 'pt:P', 'line:l'],
    params: { phiDeg: 0, tangentMode: 1 },
    note: '公式推导要求 m²≠4。把 m=2 代入只得到 y=2 这一退化形式候选；它在 P 处相切，两斜率均不存在，因此不是原条件的解。',
    assert: [
      {
        id: 'tangent',
        label: 'k = 0 时 Δ = 0（相切）',
        actual: () => (makeEllipseFrame(el, P, 0, { tangentMode: true }).isTangent ? 1 : 0),
        expect: 1,
      },
      {
        id: 'tangent-point-is-p',
        label: '切点就是 P',
        actual: () => {
          const f = makeEllipseFrame(el, P, 0, { tangentMode: true });
          const pt = f.points[0];
          return pt ? Math.hypot(pt.x - P.x, pt.y - P.y) : null;
        },
        expect: 0,
      },
    ],
  },
];

export const ellipseP02Conflict: EllipseProblemDef = {
  kind: 'ellipse',
  metadata: {
    id: 'ellipse-p02-conflict',
    grade: '高二 / 高三',
    title: '椭圆 · P(0,2)：条件退化',
    subtitle: '原条件无有效解；y = 2 仅为退化形式候选',
    role: '一致性检查演示：原条件无有效解；y = 2 仅为越过定义域后得到的退化形式候选，不是原条件的解。',
  },
  statement: {
    title: '已知椭圆 C 的离心率 e = √2/2，且经过点 (2, √2)',
    lines: [
      '（1）求椭圆 C 的方程；',
      '（2）设 P(0,2)，过 P 的直线 l 与 C 交于 A、B 两点，若 k_{OA}+k_{OB}=2，求 l 的方程。',
    ],
  },
  givens: {
    e: '√2/2',
    '过点': '(2, √2)',
    P: '(0, 2)',
    '条件': 'k_OA + k_OB = 2',
  },
  ellipse: { a2: 8, b2: 4 },
  fixedPoint: { id: 'P', label: 'P', x: 0, y: 2 },
  initialPhiDeg: 300,
  guardDeg: 2,
  condition: {
    id: 'sum-eq-2',
    conditionLatex: 'k_{OA}+k_{OB}=2',
    kind: 'identity',
    symbol: 'k_{OA}+k_{OB}',
    target: 2,
  },
  steps: [...firstQuestionSteps(el), ...secondSteps],
  validations: [
    {
      id: 'sum-eq-2',
      conditionLatex: 'k_{OA}+k_{OB}=2',
      kind: 'identity',
      symbol: 'k_{OA}+k_{OB}',
      target: 2,
    },
  ],
};

export const p02Internals = { el, P, check };

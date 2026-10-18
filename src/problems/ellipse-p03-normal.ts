import { makeEllipse } from '../math/ellipse';
import { slopeOfLine } from '../math/line';
import { toDeg, toRad } from '../math/numeric';
import { checkCondition } from '../math/validator';
import type { EllipseProblemDef, StepDef } from './types';
import { makeEllipseFrame } from './ellipseFrame';
import { firstQuestionSteps } from './common';

const el = makeEllipse(8, 4);
const P = { x: 0, y: 3 };

/**
 * 第二问（正常情形）：P(0, 3) 在椭圆外，k_OA + k_OB = 2 有唯一解 k = −5/4。
 * 解析判据（附录 A）：k = (4 − m²)/4，m = 3 ⇒ k = −5/4。
 */
const check = checkCondition((phi) => makeEllipseFrame(el, P, phi).probe, {
  target: 2,
  fixedPoint: P,
});

const witnessPhi =
  check.consistency.state === 'OK' && check.consistency.witness.phi !== undefined
    ? check.consistency.witness.phi
    : toRad(347.1);

const WITNESS_DEG = toDeg(witnessPhi);

/** 取某帧的斜率 k（由一般式求得，不用 y = kx + b 当内部表示） */
function frameK(phiDeg: number) {
  const f = makeEllipseFrame(el, P, toRad(phiDeg));
  return f.line ? slopeOfLine(f.line) : null;
}

const secondSteps: StepDef[] = [
  {
    id: '2.1',
    title: '设过 P(0,3) 的直线',
    latex: [
      'P(0,3):\\quad \\frac{0^{2}}{8}+\\frac{3^{2}}{4}=\\frac{9}{4}>1',
      'l:\\ y=kx+3\\quad(\\text{斜率不存在时为 } x=0)',
    ],
    highlight: ['ellipse', 'pt:P', 'pt:Q', 'line:l'],
    params: { phiDeg: 300 },
    note: 'P 在椭圆外，所以过 P 的直线可能与椭圆有两个交点、一个交点（相切）或没有交点。',
    assert: [
      {
        id: 'p-outside',
        label: 'P(0,3) 在椭圆外',
        actual: () => {
          const f = makeEllipseFrame(el, P, toRad(300));
          return f.points.length;
        },
        expect: 2,
      },
    ],
  },
  {
    id: '2.2',
    title: '联立得关于 x 的二次方程',
    latex: [
      'x^{2}+2(kx+3)^{2}=8',
      '(1+2k^{2})x^{2}+12kx+10=0',
    ],
    highlight: ['ellipse', 'pt:P', 'pt:Q', 'line:l', 'pt:A', 'pt:B'],
    note: '把 y 消掉，得到只含 x 的二次方程；它的两个根就是 A、B 的横坐标。',
    assert: [
      {
        id: 'two-roots',
        label: '该位置下恰有两个交点',
        actual: () => makeEllipseFrame(el, P, toRad(300)).points.length,
        expect: 2,
      },
    ],
  },
  {
    id: '2.3',
    title: '韦达定理',
    latex: [
      'x_{1}+x_{2}=\\frac{-12k}{1+2k^{2}}',
      'x_{1}x_{2}=\\frac{10}{1+2k^{2}}',
    ],
    highlight: ['ellipse', 'pt:A', 'pt:B', 'seg:OA', 'seg:OB'],
    assert: [
      {
        id: 'vieta-product',
        label: '实测 x₁x₂ 与韦达公式一致',
        actual: () => {
          const f = makeEllipseFrame(el, P, toRad(300));
          const k = f.line ? slopeOfLine(f.line) : null;
          const [p1, p2] = f.points;
          if (k === null || !p1 || !p2) return null;
          return (p1.x * p2.x) / (10 / (1 + 2 * k * k));
        },
        expect: 1,
      },
    ],
  },
  {
    id: '2.4',
    title: '把 k_OA + k_OB 用 k 表示',
    latex: [
      'k_{OA}+k_{OB}=\\frac{y_{1}}{x_{1}}+\\frac{y_{2}}{x_{2}}=2k+3\\cdot\\frac{x_{1}+x_{2}}{x_{1}x_{2}}',
      '=2k+3\\cdot\\frac{-12k}{10}=-\\frac{8k}{5}',
    ],
    highlight: ['ellipse', 'pt:A', 'pt:B', 'seg:OA', 'seg:OB'],
    note: '注意 x₁x₂ ≠ 0，所以可以逐项除以 x₁、x₂。',
    assert: [
      {
        id: 'sum-formula',
        label: '实测 Σ 与 −8k/5 一致',
        actual: () => {
          const f = makeEllipseFrame(el, P, toRad(300));
          const k = frameK(300);
          if (k === null || f.sum === null) return null;
          return f.sum / (-(8 * k) / 5);
        },
        expect: 1,
      },
    ],
  },
  {
    id: '2.5',
    title: '令和为 2，解出 k',
    latex: [
      '-\\frac{8k}{5}=2\\ \\Longrightarrow\\ k=-\\frac{5}{4}',
      '\\Delta=144k^{2}-4(1+2k^{2})\\cdot 10=64k^{2}-40=60>0',
    ],
    highlight: ['ellipse', 'pt:P', 'pt:Q', 'line:l', 'pt:A', 'pt:B', 'seg:OA', 'seg:OB'],
    params: { phiDeg: WITNESS_DEG },
    note: 'Δ > 0 说明这个 k 确实产生两个不同交点，解有效。',
    assert: [
      {
        id: 'sum-is-2',
        label: '该位置的 k_OA + k_OB = 2',
        actual: () => makeEllipseFrame(el, P, witnessPhi).sum,
        expect: 2,
        tol: 1e-6,
      },
      {
        id: 'chord',
        label: '两交点确实相异：弦长 |AB| ≈ 3.006',
        actual: () => makeEllipseFrame(el, P, witnessPhi).chordLength,
        expect: 3.00596,
        tol: 1e-4,
      },
    ],
  },
  {
    id: '2.6',
    title: '写出两交点与结论',
    latex: [
      'l:\\ y=-\\frac{5}{4}x+3',
      'A\\approx(0.879,\\ 1.901),\\quad B\\approx(2.757,\\ -0.446)',
    ],
    highlight: ['ellipse', 'pt:A', 'pt:B', 'seg:OA', 'seg:OB', 'line:l'],
    assert: [
      {
        id: 'ax',
        label: 'A 的横坐标 ≈ 0.8793',
        actual: () => makeEllipseFrame(el, P, witnessPhi).points[0]?.x ?? null,
        expect: 0.8793,
        tol: 5e-4,
      },
      {
        id: 'koa',
        label: 'k_OA ≈ 2.1619',
        actual: () => makeEllipseFrame(el, P, witnessPhi).kOA,
        expect: 2.1619,
        tol: 5e-4,
      },
    ],
  },
];

export const ellipseP03Normal: EllipseProblemDef = {
  kind: 'ellipse',
  metadata: {
    id: 'ellipse-p03-normal',
    grade: '高二 / 高三',
    title: '椭圆 · P(0,3)：条件相容',
    subtitle: 'k_OA + k_OB = 2 有唯一解 k = −5/4',
    role: '正常解析演示：拖 Q 观察 A、B 与两条斜率的连续变化，并找到使和为 2 的唯一位置。',
  },
  statement: {
    title: '已知椭圆 C 的离心率 e = √2/2，且经过点 (2, √2)',
    lines: [
      '（1）求椭圆 C 的方程；',
      '（2）设 P(0,3)，过 P 的直线 l 与 C 交于 A、B 两点，若 k_{OA}+k_{OB}=2，求 l 的方程。',
    ],
  },
  givens: {
    e: '√2/2',
    '过点': '(2, √2)',
    P: '(0, 3)',
    '条件': 'k_OA + k_OB = 2',
  },
  ellipse: { a2: 8, b2: 4 },
  fixedPoint: { id: 'P', label: 'P', x: 0, y: 3 },
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

export const p03Internals = { el, P, check, witnessPhi, WITNESS_DEG };

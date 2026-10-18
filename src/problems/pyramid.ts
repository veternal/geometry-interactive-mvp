import type { Vec3 } from '../render/project3d';
import {
  V,
  add,
  angleBetween,
  angleLineToPlane,
  cross,
  dihedralCos,
  dot,
  footOnPlane,
  len,
  mul,
  norm,
  sub,
} from '../render/project3d';
import { buildFaces } from '../render/occlude';
import type { Face } from '../render/occlude';
import type { PyramidProblemDef, StepDef } from './types';

/**
 * 四棱锥 P-ABCD，PA ⊥ 底面，底面 ABCD 为矩形。
 * 建系：A 为原点，AB 沿 x，AD 沿 y，AP 沿 z。
 */
export interface PyramidModel {
  vertices: Record<string, Vec3>;
  faces: Face[];
  edges: Array<[string, string]>;
  aux: Array<[string, string]>;
  metrics: PyramidMetrics;
}

export interface PyramidMetrics {
  aeDotDP: number;
  /** AE 与平面 PCD 的夹角（度） */
  angleDeg: number;
  foot: Vec3;
  footToE: number;
  cosDihedral: number;
  dihedralDeg: number;
}

export function buildPyramid(ab: number, ad: number, pa: number): PyramidModel {
  const A = V(0, 0, 0);
  const B = V(ab, 0, 0);
  const C = V(ab, ad, 0);
  const D = V(0, ad, 0);
  const P = V(0, 0, pa);
  const E = mul(add(P, D), 0.5);

  const vertices: Record<string, Vec3> = { A, B, C, D, P, E };

  const faces = buildFaces(vertices, [
    ['A', 'B', 'C', 'D'],
    ['P', 'A', 'B'],
    ['P', 'B', 'C'],
    ['P', 'C', 'D'],
    ['P', 'D', 'A'],
  ]);

  const edges: Array<[string, string]> = [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'D'],
    ['D', 'A'],
    ['P', 'A'],
    ['P', 'B'],
    ['P', 'C'],
    ['P', 'D'],
  ];
  const aux: Array<[string, string]> = [
    ['A', 'E'],
    ['P', 'E'],
    ['D', 'E'],
  ];

  const AE = sub(E, A);
  const DP = sub(P, D);
  const DC = sub(C, D);
  const planeNormal = cross(DC, DP);

  const metrics: PyramidMetrics = {
    aeDotDP: dot(AE, DP),
    angleDeg: (angleLineToPlane(AE, planeNormal) * 180) / Math.PI,
    foot: footOnPlane(A, D, planeNormal),
    footToE: 0,
    cosDihedral: 0,
    dihedralDeg: 0,
  };
  metrics.footToE = len(sub(metrics.foot, E));

  // 二面角 A-PC-D：在两个半平面内作垂直于棱 PC 的方向
  const e = norm(sub(C, P));
  const v1 = sub(sub(A, P), mul(e, dot(sub(A, P), e)));
  const v2 = sub(sub(D, P), mul(e, dot(sub(D, P), e)));
  metrics.cosDihedral = dihedralCos(v1, v2);
  metrics.dihedralDeg = (Math.acos(metrics.cosDihedral) * 180) / Math.PI;

  return { vertices, faces, edges, aux, metrics };
}

/** 二面角弧线采样点（世界坐标 → 由渲染层投影） */
export function dihedralArc(model: PyramidModel, samples = 24): Vec3[] {
  const { P, C, A, D } = model.vertices;
  const e = norm(sub(C, P));
  const v1 = norm(sub(sub(A, P), mul(e, dot(sub(A, P), e))));
  const v2 = norm(sub(sub(D, P), mul(e, dot(sub(D, P), e))));

  const theta = angleBetween(v1, v2);
  const radius = Math.min(len(sub(A, P)), len(sub(D, P))) * 0.42;
  const out: Vec3[] = [];
  const s = Math.sin(theta);
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const dir =
      s < 1e-9
        ? v1
        : add(mul(v1, Math.sin((1 - t) * theta) / s), mul(v2, Math.sin(t * theta) / s));
    out.push(add(P, mul(norm(dir), radius)));
  }
  return out;
}

const AB = 2;
const PA = 2;

const baseSteps = (ad: number): StepDef[] => [
  {
    id: '3.1',
    title: '建系',
    latex: [
      'A(0,0,0),\\ B(2,0,0),\\ D(0,AD,0),\\ P(0,0,2)',
      'C(2,AD,0),\\ E=\\text{mid}(P,D)=\\left(0,\\tfrac{AD}{2},1\\right)',
    ],
    highlight: ['solid', 'pt:A', 'pt:B', 'pt:C', 'pt:D', 'pt:P'],
    params: { ad },
    note: 'PA ⊥ 底面，所以三条两两垂直的棱正好当坐标轴。',
  },
  {
    id: '3.2',
    title: '写出向量 AE、DP',
    latex: [
      '\\overrightarrow{AE}=\\left(0,\\tfrac{AD}{2},1\\right),\\quad \\overrightarrow{DP}=(0,-AD,2)',
    ],
    highlight: ['solid', 'seg:AE', 'seg:DE', 'seg:PE'],
    params: { ad },
    note: 'AE 与 DP 都在侧面 PAD 内，所以问题可以先退化成平面问题。',
  },
  {
    id: '3.3',
    title: '算数量积',
    latex: [
      '\\overrightarrow{AE}\\cdot\\overrightarrow{DP}=-\\frac{AD^{2}}{2}+2=\\frac{PA^{2}-AD^{2}}{2}',
    ],
    highlight: ['solid', 'seg:AE', 'seg:DE', 'seg:PE'],
    params: { ad },
    note: '这一步是关键：结果只由 PA 与 AD 决定，与 AB 无关。',
    assert: [
      {
        id: 'ae-dot-dp',
        label: 'AE·DP = (PA² − AD²)/2',
        actual: () => {
          const m = buildPyramid(AB, ad, PA).metrics;
          return m.aeDotDP / ((PA * PA - ad * ad) / 2);
        },
        expect: 1,
      },
    ],
  },
  {
    id: '3.4',
    title: '按题面数据代入：AE 不垂直于 DP',
    latex: [
      'AD=4:\\quad \\overrightarrow{AE}\\cdot\\overrightarrow{DP}=-6\\ne 0',
      '\\Rightarrow\\ AE\\not\\perp DP\\ \\Rightarrow\\ AE\\not\\perp\\ \\text{平面}PCD',
    ],
    highlight: ['solid', 'seg:AE', 'seg:DE'],
    params: { ad: 4 },
    note: '题面给的是 PA=AB=2、AD=4，此时 (1) 不成立。(1) 成立的充要条件是 PA = AD。',
    assert: [
      {
        id: 'not-perp',
        label: 'AD = 4 时数量积为 −6',
        actual: () => buildPyramid(AB, 4, PA).metrics.aeDotDP,
        expect: -6,
      },
    ],
  },
  {
    id: '3.5',
    title: '把 AD 拖到 2：条件补齐后成立',
    latex: [
      'AD=PA=2:\\quad \\overrightarrow{AE}\\cdot\\overrightarrow{DP}=0',
      '\\Rightarrow\\ AE\\perp DP,\\ \\text{且}\\ AE\\perp CD\\ \\Rightarrow\\ AE\\perp\\ \\text{平面}PCD',
    ],
    highlight: ['solid', 'seg:AE', 'pt:foot'],
    params: { ad: 2 },
    note: '拖动 AD 滑块可以看到：AD=2 时垂足 F 与 E 重合，∠(AE, 平面PCD) 恰好 90°。',
    assert: [
      {
        id: 'perp',
        label: 'AD = 2 时 AE·DP = 0',
        actual: () => Math.abs(buildPyramid(AB, 2, PA).metrics.aeDotDP),
        expect: 0,
      },
      {
        id: 'angle-90',
        label: '此时 AE 与平面 PCD 的夹角为 90°',
        actual: () => buildPyramid(AB, 2, PA).metrics.angleDeg,
        expect: 90,
        tol: 1e-6,
      },
    ],
  },
  {
    id: '3.6',
    title: '第二问：二面角',
    latex: [
      'AD=4:\\quad \\cos\\theta=\\frac{1}{5}',
      '\\theta\\approx 78.46^{\\circ}',
    ],
    highlight: ['solid', 'arc:A-PC-D'],
    params: { ad: 4 },
    note: '二面角的平面角要在两个半平面内分别作垂直于棱 PC 的方向，再取夹角。',
    assert: [
      {
        id: 'cos',
        label: 'AD = 4 时 cos θ = 1/5',
        actual: () => buildPyramid(AB, 4, PA).metrics.cosDihedral,
        expect: 0.2,
        tol: 1e-9,
      },
    ],
  },
];

export const pyramidProblem: PyramidProblemDef = {
  kind: 'pyramid',
  metadata: {
    id: 'pyramid-pabcd',
    grade: '高二 / 高三',
    title: '立体几何 · 四棱锥（Experimental）：题面缺条件',
    subtitle: 'AE·DP = (PA² − AD²)/2，(1) 成立需 PA = AD',
    role: '跨题型验证：同一套一致性检查可以指出"题面少了一个条件"，而不是把它当成学生算错。',
  },
  statement: {
    title: '四棱锥 P-ABCD 中，底面 ABCD 是矩形，PA ⊥ 底面，PA = AB = 2，AD = 4，E 是 PD 的中点',
    lines: ['（1）求证：AE ⊥ 平面 PCD；', '（2）求二面角 A-PC-D 的余弦值。'],
  },
  givens: {
    PA: 2,
    AB: 2,
    AD: 4,
    'E': 'PD 中点',
  },
  base: { ab: AB, ad: 4, pa: PA },
  conditions: { paEqualsAd: false },
  camera: { yaw: 3.6, pitch: 0.45 },
  sliders: [{ key: 'ad', min: 1, max: 5, step: 0.1 }],
  steps: baseSteps(4),
  validations: [
    {
      id: 'ae-perp-plane',
      conditionLatex: '\\overrightarrow{AE}\\cdot\\overrightarrow{DP}=0',
      kind: 'perpendicular',
      symbol: 'AE·DP',
      target: 0,
    },
  ],
};

export const PYRAMID_AB = AB;
export const PYRAMID_PA = PA;

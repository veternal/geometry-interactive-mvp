import type { Ellipse } from '../math/ellipse';
import { ellipseParams, implicit } from '../math/ellipse';
import { EPS } from '../math/numeric';
import type { StepDef } from './types';

/**
 * 第一问（求椭圆方程）的公共步骤。
 * 两个椭圆题共用同一份推导，只是第二问不同。
 *
 * assert 全部调用 math/ 的函数，不允许返回字面量。
 */
export function firstQuestionSteps(el: Ellipse): StepDef[] {
  return [
    {
      id: '1.1',
      title: '由离心率建立 a、b 关系',
      latex: [
        'e=\\frac{c}{a}=\\frac{\\sqrt2}{2}',
        'c^{2}=\\frac{a^{2}}{2}',
      ],
      highlight: ['ellipse', 'ann:focus'],
      note: '先把 e 翻译成 a、c 的关系，再用 c² = a² − b² 换成 a、b 的关系。',
      assert: [
        {
          id: 'ecc',
          label: '离心率 e = √2/2',
          actual: () => ellipseParams(el).e,
          expect: Math.SQRT2 / 2,
        },
      ],
    },
    {
      id: '1.2',
      title: '由 c² = a² − b² 得 b² = a²/2',
      latex: [
        'c^{2}=a^{2}-b^{2}',
        '\\frac{a^{2}}{2}=a^{2}-b^{2}',
        'b^{2}=\\frac{a^{2}}{2}',
      ],
      highlight: ['ellipse', 'ann:axes'],
      note: '这一步之后，椭圆只剩一个未知量 a²。',
      assert: [
        {
          id: 'ratio',
          label: 'a² : b² = 2 : 1',
          actual: () => {
            const p = ellipseParams(el);
            return (p.a * p.a) / (p.b * p.b);
          },
          expect: 2,
        },
      ],
    },
    {
      id: '1.3',
      title: '代入已知点 (2, √2)',
      latex: [
        '\\frac{2^{2}}{a^{2}}+\\frac{(\\sqrt2)^{2}}{b^{2}}=1',
        '\\frac{4}{a^{2}}+\\frac{2}{b^{2}}=1',
        '\\frac{4}{a^{2}}+\\frac{4}{a^{2}}=1',
        'a^{2}=8',
      ],
      highlight: ['ellipse', 'pt:known'],
      note: '代入后只剩 a² 一个未知量，方程一次解出。',
      assert: [
        {
          id: 'a2',
          label: 'a² = 8',
          actual: () => {
            const p = ellipseParams(el);
            return p.a * p.a;
          },
          expect: 8,
        },
        {
          id: 'known-on-curve',
          label: '点 (2, √2) 满足所得方程',
          actual: () => implicit(el, { x: 2, y: Math.SQRT2 }),
          expect: 0,
        },
      ],
    },
    {
      id: '1.4',
      title: '得 b² 与椭圆方程',
      latex: [
        'b^{2}=\\frac{a^{2}}{2}=4',
        '\\frac{x^{2}}{8}+\\frac{y^{2}}{4}=1',
      ],
      highlight: ['ellipse', 'pt:known', 'ann:axes'],
      note: 'a² = 8 > b² = 4，所以焦点在 x 轴上。',
      assert: [
        {
          id: 'b2',
          label: 'b² = 4',
          actual: () => {
            const p = ellipseParams(el);
            return p.b * p.b;
          },
          expect: 4,
        },
      ],
    },
    {
      id: '1.5',
      title: '画出椭圆',
      latex: ['\\boxed{\\frac{x^{2}}{8}+\\frac{y^{2}}{4}=1}'],
      highlight: ['ellipse'],
      assert: [
        {
          id: 'ecc-again',
          label: '由 a²、b² 反算仍需满足 e = √2/2',
          actual: () => ellipseParams(el).e,
          expect: Math.SQRT2 / 2,
          tol: EPS,
        },
      ],
    },
  ];
}

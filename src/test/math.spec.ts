import { describe, expect, it } from 'vitest';
import { makeEllipse, isOnEllipse, implicit, pointAtAngle, ellipseParams } from '../math/ellipse';
import { lineThrough, lineFromSlopeIntercept, isVertical, slopeOfLine, normalize } from '../math/line';
import { intersect } from '../math/intersection';
import { slopeOf, sumSlopes } from '../math/slope';
import { formatSlope } from '../math/numeric';
import { assignAB, emptyABState } from '../math/identity';
import { dist } from '../math/numeric';
import { checkCondition, consistencyCopy } from '../math/validator';
import { makeEllipseFrame, trackedFrame, clampPhi } from '../problems/ellipseFrame';
import { firstQuestionSteps } from '../problems/common';
import { runStepAsserts } from '../problems/assert';
import { ellipseP02Conflict } from '../problems/ellipse-p02-conflict';
import { ellipseP03Normal } from '../problems/ellipse-p03-normal';
import { ellipseChecks } from '../problems/registry';
import type { Point } from '../math/types';

const el = makeEllipse(8, 4);
const P2 = { x: 0, y: 2 };
const P3 = { x: 0, y: 3 };

describe('1-2 基础数学对象', () => {
  it('已知点 (2, √2) 在椭圆上', () => {
    expect(isOnEllipse(el, { x: 2, y: Math.SQRT2 })).toBe(true);
    expect(Math.abs(implicit(el, { x: 2, y: Math.SQRT2 }))).toBeLessThan(1e-12);
  });

  it('两点式构造竖直直线 x = 0', () => {
    const l = lineThrough({ x: 0, y: 2 }, { x: 0, y: -2 });
    expect(l).not.toBeNull();
    expect(l!.A).toBeCloseTo(1, 12);
    expect(l!.B).toBeCloseTo(0, 12);
    expect(l!.C).toBeCloseTo(0, 12);
    expect(isVertical(l!)).toBe(true);
    expect(slopeOfLine(l!)).toBeNull();
  });

  it('椭圆参数与离心率', () => {
    const p = ellipseParams(el);
    expect(p.a * p.a).toBeCloseTo(8, 12);
    expect(p.b * p.b).toBeCloseTo(4, 12);
    expect(p.e).toBeCloseTo(Math.SQRT2 / 2, 12);
  });
});

describe('3-5 求交与斜率三态', () => {
  it('竖直直线与椭圆交于两点，x 恒为 0', () => {
    const r = intersect(el, lineThrough({ x: 0, y: 2 }, { x: 0, y: -2 })!);
    expect(r.ok).toBe(true);
    expect(r.points).toHaveLength(2);
    expect(r.isTangent).toBe(false);
    for (const p of r.points) expect(Math.abs(p.x)).toBeLessThan(1e-12);
    const ys = r.points.map((p) => p.y).sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(-2, 9);
    expect(ys[1]).toBeCloseTo(2, 9);
  });

  it('y = 2 是椭圆在短轴端点的切线：1 个点且 isTangent', () => {
    const r = intersect(el, lineFromSlopeIntercept(0, 2));
    expect(r.isTangent).toBe(true);
    expect(r.points).toHaveLength(1);
    expect(r.points[0].y).toBeCloseTo(2, 12);
    expect(Math.abs(r.points[0].x)).toBeLessThan(1e-9);
  });

  it('斜率不存在时返回 null，且求和传播为 null', () => {
    expect(slopeOf({ x: 0, y: 2 })).toBeNull();
    expect(sumSlopes(2.5, null)).toBeNull();
    expect(sumSlopes(2.1619, -0.1619)).toBeCloseTo(2, 9);
    expect(formatSlope(null)).toBe('不存在');
    expect(formatSlope(2.5)).toBe('2.500');
  });

  it('随机 1000 条直线：交点回代残差 ≤ 1e-9', () => {
    let checked = 0;
    for (let i = 0; i < 1000; i++) {
      const k = -8 + 16 * ((i * 37) % 1000) / 1000;
      const m = -8 + 16 * ((i * 61) % 1000) / 1000;
      const r = intersect(el, lineFromSlopeIntercept(k, m));
      if (r.points.length === 0) continue;
      checked++;
      for (const p of r.points) {
        expect(Math.abs(implicit(el, p))).toBeLessThan(1e-9);
      }
      if (r.points.length === 2) expect(r.isTangent).toBe(false);
    }
    expect(checked).toBeGreaterThan(800);
  });
});

describe('6 第一问：每步断言可由程序校验', () => {
  it('5 个步骤的 assert 全部通过', () => {
    const steps = firstQuestionSteps(el);
    for (const s of steps) {
      const res = runStepAsserts(s);
      for (const r of res) {
        expect(r.pass, `${s.id} / ${r.label}: ${r.message}`).toBe(true);
      }
    }
  });

  it('反向用例：把期望改成错的值，断言必须失败', () => {
    const steps = firstQuestionSteps(el);
    const s13 = steps.find((s) => s.id === '1.3')!;
    const broken = {
      ...s13,
      assert: [{ id: 'x', label: '故意写错', actual: () => ellipseParams(el).a * ellipseParams(el).a, expect: 9 }],
    };
    expect(runStepAsserts(broken)[0].pass).toBe(false);
  });
});

describe('7-10 交互帧：约束、竖直可达、身份稳定、相切', () => {
  it('任意 φ 下 Q 都在椭圆上', () => {
    for (const phi of [0, 0.7, 1.9, Math.PI, 4.71, 5.9]) {
      expect(isOnEllipse(el, pointAtAngle(el, phi), 1e-9)).toBe(true);
    }
  });

  it('φ = 3π/2 时直线竖直（B ≈ 0），且仍有两个交点', () => {
    const f = makeEllipseFrame(el, P3, (3 * Math.PI) / 2);
    expect(f.line).not.toBeNull();
    expect(Math.abs(f.line!.B)).toBeLessThan(1e-12);
    expect(f.points.length).toBe(2);
  });

  it('连续 720 帧扫描：A 的相邻帧位移 < 0.35（无跳号）', () => {
    let prev = emptyABState();
    let lastA: Point | null = null;
    let maxJump = 0;
    let samples = 0;
    for (let i = 0; i <= 720; i++) {
      const phi = (i / 720) * Math.PI * 2;
      const f = trackedFrame(el, P3, phi, prev);
      prev = f.abState;
      if (f.A) {
        samples++;
        if (lastA) maxJump = Math.max(maxJump, dist(lastA, f.A));
        lastA = f.A;
      }
    }
    expect(samples).toBeGreaterThan(700);
    expect(maxJump).toBeLessThan(0.35);
  });

  it('相位 90° 处为相切：只有 1 个交点', () => {
    const f = makeEllipseFrame(el, P2, Math.PI / 2, { tangentMode: true });
    expect(f.isTangent).toBe(true);
    expect(f.points).toHaveLength(1);
    expect(f.A?.x).toBeCloseTo(0, 9);
    expect(f.A?.y).toBeCloseTo(2, 9);
  });

  it('P 在椭圆上时，φ 禁区被夹到边界', () => {
    const clamped = clampPhi(el, P2, Math.PI / 2, 2);
    expect(Math.abs(clamped - Math.PI / 2)).toBeGreaterThan(0.03);
    expect(isOnEllipse(el, pointAtAngle(el, clamped), 1e-9)).toBe(true);
  });
});

describe('11-15 状态与一致性判定', () => {
  it('P(0,2)：全周 720 帧 Σ 恒不可求和，且 A 或 B 恒为 P', () => {
    let both = 0;
    for (let i = 0; i < 720; i++) {
      const phi = (i / 720) * Math.PI * 2;
      const f = makeEllipseFrame(el, P2, phi);
      if (f.points.length < 2) continue; // 切线帧单独看
      both++;
      expect(f.sum).toBeNull();
      const hasP = f.points.some((p) => Math.hypot(p.x - P2.x, p.y - P2.y) < 1e-9);
      expect(hasP).toBe(true);
    }
    expect(both).toBeGreaterThan(700);
  });

  it('面板文本不出现 NaN / Infinity / undefined', () => {
    for (const s of [null, 0, 1.234, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      const v = formatSlope(s as number | null | undefined);
      expect(v).not.toMatch(/NaN|Infinity|undefined/);
    }
  });

  it('P(0,2) 判定为 DEGENERATE_ONLY / COINCIDES_WITH_FIXED', () => {
    const rep = ellipseChecks[ellipseP02Conflict.metadata.id];
    expect(rep.consistency.state).toBe('DEGENERATE_ONLY');
    if (rep.consistency.state === 'DEGENERATE_ONLY') {
      expect(rep.consistency.reason).toBe('COINCIDES_WITH_FIXED');
    }
    expect(rep.definedFrames).toBe(0);
  });

  it('P(0,3) 判定为 OK，witness 的斜率 ≈ −1.25', () => {
    const rep = ellipseChecks[ellipseP03Normal.metadata.id];
    expect(rep.consistency.state).toBe('OK');
    if (rep.consistency.state === 'OK') {
      expect(rep.consistency.witness.k).toBeCloseTo(-1.25, 3);
      expect(rep.consistency.witness.value).toBeCloseTo(2, 6);
    }
  });

  it('文案：退化文案必须说明原因，EMPTY 文案不得含"相切"', () => {
    const degenerate = consistencyCopy(
      { state: 'DEGENERATE_ONLY', reason: 'COINCIDES_WITH_FIXED', witness: {} },
      { targetSymbol: 'k_{OA}+k_{OB}', target: 2 },
    );
    expect(degenerate.detail).toContain('斜率不存在');
    expect(degenerate.detail).toContain('退化');
    expect(degenerate.title).toContain('原条件无有效解');
    expect(degenerate.title).not.toContain('成立');

    const empty = consistencyCopy({ state: 'EMPTY' }, { targetSymbol: 'k_{OA}+k_{OB}', target: 2 });
    expect(empty.detail).not.toContain('相切');
    expect(empty.title).toContain('不相容');
  });

  it('P(0,2)：y=2 仅为越过定义域后的形式候选，原条件仍无定义', () => {
    const step = ellipseP02Conflict.steps.find((s) => s.id === '2.4');
    expect(step?.title).toContain('原条件无有效解');
    expect(step?.note).toContain('m²≠4');
    expect(step?.note).toContain('不是原条件的解');
    expect(ellipseP02Conflict.metadata.subtitle).toContain('退化形式候选');

    const tangent = makeEllipseFrame(el, P2, 0, { tangentMode: true });
    expect(tangent.isTangent).toBe(true);
    expect(tangent.points).toHaveLength(1);
    expect(tangent.A?.x).toBeCloseTo(0, 9);
    expect(tangent.A?.y).toBeCloseTo(2, 9);
    expect(tangent.sum).toBeNull();
    expect(slopeOf(tangent.A!)).toBeNull();
  });
});

describe('16-18 四态覆盖与跳转', () => {
  it('四种状态都有 fixture 覆盖', () => {
    const ok = checkCondition((phi) => makeEllipseFrame(el, P3, phi).probe, { target: 2, fixedPoint: P3 });
    expect(ok.consistency.state).toBe('OK');

    const degenerate = checkCondition((phi) => makeEllipseFrame(el, P2, phi).probe, { target: 2, fixedPoint: P2 });
    expect(degenerate.consistency.state).toBe('DEGENERATE_ONLY');

    // 人工 fixture：目标量恒为 1，要求等于 2 —— 参数域内无解
    const emptyProbe = () => ({
      phi: 0,
      points: [],
      A: null,
      B: null,
      isTangent: false,
      measure: 1,
    });
    const noSolution = checkCondition(emptyProbe, { target: 2 });
    expect(noSolution.consistency.state).toBe('EMPTY');

    const undefinedParam = checkCondition(() => null, { target: 2 });
    expect(undefinedParam.consistency.state).toBe('UNDEFINED_PARAM');
  });

  it('witness 的 φ 确实满足 Σ = 2（Q 取 A 或 B 会得到同一条直线）', () => {
    const rep = ellipseChecks[ellipseP03Normal.metadata.id];
    expect(rep.consistency.state).toBe('OK');
    if (rep.consistency.state === 'OK') {
      const phi = rep.consistency.witness.phi!;
      const f = makeEllipseFrame(el, P3, phi);
      expect(f.sum).toBeCloseTo(2, 6);
      expect(f.chordLength).toBeCloseTo(3.00596, 4);
      expect(Math.abs((f.line ? (slopeOfLine(f.line) ?? 0) : 0) + 1.25)).toBeLessThan(1e-6);

      // 直线的是同一条，所以 Q 落在 A 或 B 都成立：两个等价位置
      const deg = (phi * 180) / Math.PI;
      const equivalent = [71.888, 347.1];
      expect(equivalent.some((d) => Math.abs(deg - d) < 0.5)).toBe(true);
    }
  });

  it('A/B 身份：两种分配距离相等时保持传入顺序', () => {
    // 刻意构造对称情形：两种分配的代价完全相同
    // 上一帧在上/下方，新一帧在左右两侧：两种分配的代价完全相同
    const prev = { lastA: { x: 0, y: 0.5 }, lastB: { x: 0, y: -0.5 } };
    const symmetric = assignAB(
      [
        { x: -0.5, y: 0 },
        { x: 0.5, y: 0 },
      ],
      prev,
    );
    expect(symmetric.A).toEqual({ x: -0.5, y: 0 });
    expect(symmetric.B).toEqual({ x: 0.5, y: 0 });
  });

  it('A/B 身份：最近邻匹配不交换标号', () => {
    const prev = { lastA: { x: 1, y: 0 }, lastB: { x: -1, y: 0 } };
    const r = assignAB(
      [
        { x: -1.02, y: 0 },
        { x: 0.98, y: 0 },
      ],
      prev,
    );
    // 输入顺序是「左边的点在前」，但 A 应继续跟着上一帧的 A（x≈1）
    expect(r.A?.x).toBeCloseTo(0.98, 9);
    expect(r.B?.x).toBeCloseTo(-1.02, 9);
  });
});

describe('归一化与边界', () => {
  it('直线归一化后法向模长为 1 且 A > 0', () => {
    const l = normalize({ A: -3, B: 4, C: 5 });
    expect(Math.hypot(l.A, l.B)).toBeCloseTo(1, 12);
    expect(l.A).toBeGreaterThan(0);
  });

  it('两点重合时直线为 null（不抛错、不产生 NaN）', () => {
    expect(lineThrough({ x: 1, y: 1 }, { x: 1, y: 1 })).toBeNull();
  });
});

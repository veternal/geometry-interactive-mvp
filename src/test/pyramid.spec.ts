import { describe, expect, it } from 'vitest';
import { buildPyramid, dihedralArc, pyramidProblem } from '../problems/pyramid';
import { checkGivenAd, givenCopy } from '../problems/pyramidCheck';
import { runStepAsserts } from '../problems/assert';
import { cameraBasis, dot, makeProjector, projectPoint } from '../render/project3d';
import { edgeKey, markFrontFaces } from '../render/occlude';

const AB = 2;
const PA = 2;

describe('立体几何：题面数据的矛盾', () => {
  it('AE·DP = (PA² − AD²)/2，AD = 4 时为 −6', () => {
    expect(buildPyramid(AB, 4, PA).metrics.aeDotDP).toBeCloseTo(-6, 12);
  });

  it('(1) 成立的充要条件是 PA = AD：AD = 2 时数量积为 0、夹角 90°', () => {
    const m = buildPyramid(AB, 2, PA).metrics;
    expect(Math.abs(m.aeDotDP)).toBeLessThan(1e-12);
    expect(m.angleDeg).toBeCloseTo(90, 9);
    expect(m.footToE).toBeLessThan(1e-9);
  });

  it('与 AB 无关：AB 取 3 或 5，AD = 2 时依然成立', () => {
    for (const ab of [1, 3, 5]) {
      const m = buildPyramid(ab, 2, PA).metrics;
      expect(Math.abs(m.aeDotDP)).toBeLessThan(1e-12);
      expect(m.angleDeg).toBeCloseTo(90, 9);
    }
  });

  it('AD = 4 时的线面角为 53.13°', () => {
    const m = buildPyramid(AB, 4, PA).metrics;
    expect(m.angleDeg).toBeCloseTo(53.13010235, 6);
    expect(m.footToE).toBeGreaterThan(1.3);
  });

  it('二面角 A-PC-D：AD = 4 时 cos = 1/5', () => {
    const m = buildPyramid(AB, 4, PA).metrics;
    expect(m.cosDihedral).toBeCloseTo(0.2, 12);
    expect(m.dihedralDeg).toBeCloseTo(78.46304, 4);
  });

  it('AD = 2、AB = 4 时 cos = √10/5', () => {
    const m = buildPyramid(4, 2, PA).metrics;
    expect(m.cosDihedral).toBeCloseTo(Math.sqrt(10) / 5, 12);
  });
});

describe('求证类条件的第五态：GIVEN_MISMATCH', () => {
  it('AD = 4 时不满足，但条件可满足（AD = 2）', () => {
    const c = checkGivenAd(4, { ab: AB, pa: PA, symbol: 'AE·DP' });
    expect(c.state).toBe('GIVEN_MISMATCH');
    expect(c.current).toBeCloseTo(-6, 12);
    expect(c.witness).toBeCloseTo(2, 6);
  });

  it('AD = 2 时满足', () => {
    const c = checkGivenAd(2, { ab: AB, pa: PA, symbol: 'AE·DP' });
    expect(c.state).toBe('OK');
  });

  it('文案区分"数据不满足"与"无解"', () => {
    const copy = givenCopy(checkGivenAd(4, { ab: AB, pa: PA, symbol: 'AE·DP' }), PA);
    expect(copy.title).toContain('不满足');
    expect(copy.detail).toContain('题面缺的是条件');
    expect(copy.detail).toContain('-6.0000');
  });
});

describe('题目的 6 个步骤断言全部通过', () => {
  it('runStepAsserts 全绿', () => {
    for (const s of pyramidProblem.steps) {
      for (const r of runStepAsserts(s)) {
        expect(r.pass, `${s.id} / ${r.label}: ${r.message}`).toBe(true);
      }
    }
  });
});

describe('纯 SVG 投影：隐藏线判定', () => {
  it('默认视角下 PAB / PCD / PDA 朝前，BC 是隐藏棱', () => {
    const model = buildPyramid(AB, 4, PA);
    const basis = cameraBasis(pyramidProblem.camera);
    const faces = markFrontFaces(model.faces, basis);
    const front = faces.filter((f) => f.front).map((f) => f.id);

    expect(front).toContain('PAB');
    expect(front).toContain('PCD');
    expect(front).toContain('PDA');
    expect(front).not.toContain('PBC');

    const visible = new Set<string>();
    for (const f of faces.filter((x) => x.front)) {
      for (let i = 0; i < f.names.length; i++) {
        visible.add(edgeKey(f.names[i], f.names[(i + 1) % f.names.length]));
      }
    }
    expect(visible.has(edgeKey('B', 'C'))).toBe(false);
    expect(visible.has(edgeKey('A', 'P'))).toBe(true);
  });

  it('投影后所有顶点落在画布内', () => {
    const model = buildPyramid(AB, 4, PA);
    const basis = cameraBasis(pyramidProblem.camera);
    const pr = makeProjector(Object.values(model.vertices), basis, 600, 520, 0.76);
    for (const v of Object.values(model.vertices)) {
      const p = projectPoint(v, pr);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(600);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(520);
    }
  });

  it('二面角弧落在两个半平面之间（与 P 的距离恒定）', () => {
    const model = buildPyramid(AB, 4, PA);
    const arc = dihedralArc(model);
    const P = model.vertices.P;
    const radii = arc.map((p) => Math.hypot(p.x - P.x, p.y - P.y, p.z - P.z));
    const r0 = radii[0];
    for (const r of radii) expect(r).toBeCloseTo(r0, 9);
  });

  it('视角旋转后法向朝向随之改变（投影不是静态图）', () => {
    const model = buildPyramid(AB, 4, PA);
    const b1 = cameraBasis({ yaw: 3.6, pitch: 0.45 });
    const b2 = cameraBasis({ yaw: 3.6 + Math.PI, pitch: 0.45 });
    const f1 = markFrontFaces(model.faces, b1).filter((f) => f.front).map((f) => f.id);
    const f2 = markFrontFaces(model.faces, b2).filter((f) => f.front).map((f) => f.id);
    expect(f1.join()).not.toBe(f2.join());
  });
});

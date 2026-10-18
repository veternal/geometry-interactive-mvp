import { EPS_ASSERT, formatNumber } from '../math/numeric';
import type { AssertResult, StepAssertDef, StepDef } from './types';

/**
 * 逐步自校验（V2 §7.5）。
 *
 * 关键约束：def.actual 必须调用 math/ 的计算函数。
 * 如果它返回常量，这个断言等于自己校验自己——没有任何意义。
 * 这里用 typeof 检查之外的手段做不到，只能靠约定 + 代码评审。
 */
export function runAssert(def: StepAssertDef): AssertResult {
  const tol = def.tol ?? EPS_ASSERT;
  let actual: number | null;
  try {
    actual = def.actual();
  } catch (err) {
    return {
      id: def.id,
      label: def.label,
      pass: false,
      actual: null,
      expect: def.expect,
      tol,
      message: `断言执行抛错：${(err as Error).message}`,
    };
  }

  const pass =
    def.expect === null
      ? actual === null
      : actual !== null && Number.isFinite(actual) && Math.abs(actual - def.expect) <= tol;

  return {
    id: def.id,
    label: def.label,
    pass,
    actual,
    expect: def.expect,
    tol,
    message: pass
      ? '通过'
      : def.expect === null
        ? `期望该量不存在，实际得到 ${formatNumber(actual, 6)}`
        : `期望 ${formatNumber(def.expect, 6)}，实际 ${formatNumber(actual, 6)}（容差 ${tol}）`,
  };
}

export function runStepAsserts(step: StepDef | null): AssertResult[] {
  if (!step?.assert) return [];
  return step.assert.map(runAssert);
}

export function allPassed(results: AssertResult[]): boolean {
  return results.every((r) => r.pass);
}

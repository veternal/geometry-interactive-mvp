import type { ConsistencyCopy } from '../math/validator';
import { EPS } from '../math/numeric';
import { buildPyramid } from './pyramid';

/**
 * "求证"类条件的一致性检查（V2 §4.6 的第五态扩展）。
 *
 * V2 的四态（OK / EMPTY / DEGENERATE_ONLY / UNDEFINED_PARAM）是为"求参数"类
 * 条件设计的。立体几何的 (1) 是求证题：条件本身可满足，只是**当前给定的数据**
 * 不满足。必须把这两种情况分开，否则会得出"这道题无解"的错误结论。
 */
export type GivenState = 'OK' | 'GIVEN_MISMATCH' | 'EMPTY';

export interface GivenCheck {
  state: GivenState;
  /** 当前数据下的条件值 */
  current: number;
  /** 参数域内使条件成立的取值 */
  witness: number | null;
  /** 条件的符号，如 "AE·DP" */
  symbol: string;
}

export interface GivenCheckOptions {
  ab: number;
  pa: number;
  symbol: string;
  /** 参数 ad 的搜索域 */
  domain?: [number, number];
}

function conditionValue(ab: number, ad: number, pa: number): number {
  return buildPyramid(ab, ad, pa).metrics.aeDotDP;
}

export function checkGivenAd(ad: number, opts: GivenCheckOptions): GivenCheck {
  const { ab, pa, symbol } = opts;
  const [lo, hi] = opts.domain ?? [0.05, 20];
  const current = conditionValue(ab, ad, pa);

  if (Math.abs(current) <= EPS) {
    return { state: 'OK', current, witness: ad, symbol };
  }

  // 在参数域内找符号变化，再二分细化
  const f = (x: number) => conditionValue(ab, x, pa);
  const stepSize = (hi - lo) / 4000;
  let root: number | null = null;
  let prevX = lo;
  let prevV = f(prevX);

  for (let x = lo + stepSize; x <= hi; x += stepSize) {
    const v = f(x);
    if (Math.abs(v) <= EPS) {
      root = x;
      break;
    }
    if (Math.sign(v) !== Math.sign(prevV)) {
      let a = prevX;
      let b = x;
      let fa = prevV;
      for (let i = 0; i < 80; i++) {
        const mid = (a + b) / 2;
        const fm = f(mid);
        if (Math.abs(b - a) < 1e-12) break;
        if (Math.sign(fm) === Math.sign(fa)) {
          a = mid;
          fa = fm;
        } else {
          b = mid;
        }
      }
      root = (a + b) / 2;
      break;
    }
    prevX = x;
    prevV = v;
  }

  if (root === null) {
    return { state: 'EMPTY', current, witness: null, symbol };
  }
  return { state: 'GIVEN_MISMATCH', current, witness: root, symbol };
}

export function givenCopy(c: GivenCheck, pa: number): ConsistencyCopy {
  switch (c.state) {
    case 'OK':
      return {
        title: '当前数据满足条件',
        detail: `${c.symbol} = 0，条件成立。`,
        tone: 'ok',
      };
    case 'GIVEN_MISMATCH':
      return {
        title: '当前题面数据不满足该条件',
        detail: `按题面数据 ${c.symbol} = ${c.current.toFixed(4)} ≠ 0，所以结论不成立。条件本身是可满足的：把 AD 取为 ${c.witness?.toFixed(3)}（即 PA = AD = ${pa}）时 ${c.symbol} = 0。这说明题面缺的是条件，而不是题目无解。`,
        tone: 'warn',
      };
    case 'EMPTY':
      return {
        title: '该条件在参数范围内无法满足',
        detail: `${c.symbol} 在当前参数域内恒不为 0，条件的成立与参数无关。`,
        tone: 'error',
      };
  }
}

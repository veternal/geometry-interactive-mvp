import type { Problem } from './types';
import type { CheckReport } from '../math/validator';
import { ellipseP03Normal, p03Internals } from './ellipse-p03-normal';
import { ellipseP02Conflict, p02Internals } from './ellipse-p02-conflict';
import { pyramidProblem } from './pyramid';

export const problems: Problem[] = [ellipseP03Normal, ellipseP02Conflict, pyramidProblem];

/** 椭圆题的一致性检查在模块加载时算一次（1441 帧扫描，毫秒级） */
export const ellipseChecks: Record<string, CheckReport> = {
  [ellipseP03Normal.metadata.id]: p03Internals.check,
  [ellipseP02Conflict.metadata.id]: p02Internals.check,
};

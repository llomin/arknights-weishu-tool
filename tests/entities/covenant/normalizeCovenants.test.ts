import { describe, expect, it } from 'vitest';
import { covenantMap } from '@/entities/covenant/model/normalizeCovenants';

describe('normalizeCovenants', () => {
  it('从描述中提取稳定的人口阶段', () => {
    expect(covenantMap['炎']?.activationStages).toEqual([3, 6, 9]);
    expect(covenantMap['精准']?.activationStages).toEqual([2, 3]);
    expect(covenantMap['迅捷']?.activationStages).toEqual([2]);
    expect(covenantMap['绝技']?.activationStages).toEqual([2, 5]);
  });
});

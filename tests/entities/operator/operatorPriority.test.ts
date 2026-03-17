import { describe, expect, it } from 'vitest';
import {
  getOperatorPriorityBucket,
  getOperatorPriorityWeight,
} from '@/entities/operator/model/operatorPriority';

describe('getOperatorPriorityBucket', () => {
  it('优先命中同时包含“每”和“层数”的描述', () => {
    expect(
      getOperatorPriorityBucket('每击倒2名敌人,使已激活的[突袭]层数+2'),
    ).toBe('each_and_layers');
  });

  it('其次命中包含“层数”的描述', () => {
    expect(getOperatorPriorityBucket('攻击力提升(受层数影响)')).toBe(
      'layers',
    );
  });

  it('再命中包含“获得”的描述', () => {
    expect(getOperatorPriorityBucket('<获得时>使自身攻击力提升')).toBe('gain');
  });

  it('最后命中包含“与其相同”的描述', () => {
    expect(getOperatorPriorityBucket('使攻击范围内干员与其相同')).toBe(
      'same_as',
    );
  });

  it('其余归类为其他', () => {
    expect(getOperatorPriorityBucket('攻击速度提升')).toBe('other');
  });
});

describe('getOperatorPriorityWeight', () => {
  it('返回稳定的排序权重', () => {
    expect(getOperatorPriorityWeight('each_and_layers')).toBeLessThan(
      getOperatorPriorityWeight('layers'),
    );
    expect(getOperatorPriorityWeight('layers')).toBeLessThan(
      getOperatorPriorityWeight('gain'),
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  getOperatorPriorityBucket,
  getOperatorPriorityWeight,
} from '@/entities/operator/model/operatorPriority';

describe('getOperatorPriorityBucket', () => {
  it('识别持续叠加分类', () => {
    expect(getOperatorPriorityBucket('持续叠加')).toBe('持续叠加');
  });

  it('识别单次叠加分类', () => {
    expect(getOperatorPriorityBucket('单次叠加')).toBe('单次叠加');
  });

  it('识别特异化分类', () => {
    expect(getOperatorPriorityBucket('特异化')).toBe('特异化');
  });

  it('识别整备能力分类', () => {
    expect(getOperatorPriorityBucket('整备能力')).toBe('整备能力');
  });

  it('其余归类为其他', () => {
    expect(getOperatorPriorityBucket('未知分类')).toBe('其他');
  });
});

describe('getOperatorPriorityWeight', () => {
  it('返回稳定的排序权重', () => {
    expect(getOperatorPriorityWeight('持续叠加')).toBeLessThan(
      getOperatorPriorityWeight('单次叠加'),
    );
    expect(getOperatorPriorityWeight('单次叠加')).toBeLessThan(
      getOperatorPriorityWeight('特异化'),
    );
    expect(getOperatorPriorityWeight('特异化')).toBeLessThan(
      getOperatorPriorityWeight('整备能力'),
    );
    expect(getOperatorPriorityWeight('整备能力')).toBeLessThan(
      getOperatorPriorityWeight('作战能力'),
    );
    expect(getOperatorPriorityWeight('作战能力')).toBeLessThan(
      getOperatorPriorityWeight('其他'),
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  operators,
  prioritySummary,
  tierSummary,
} from '@/entities/operator/model/normalizeOperators';

describe('normalizeOperators', () => {
  it('将干员数据标准化为固定数量', () => {
    expect(operators).toHaveLength(115);
  });

  it('计算出稳定的优先级统计', () => {
    expect(prioritySummary.each_and_layers).toBe(25);
    expect(prioritySummary.layers).toBe(42);
    expect(prioritySummary.gain).toBe(22);
    expect(prioritySummary.same_as).toBe(2);
    expect(prioritySummary.other).toBe(24);
  });

  it('保留原始阶位分布', () => {
    expect(tierSummary['6阶']).toBe(20);
    expect(tierSummary['5阶']).toBe(21);
    expect(tierSummary['4阶']).toBe(20);
    expect(tierSummary['3阶']).toBe(18);
    expect(tierSummary['2阶']).toBe(18);
    expect(tierSummary['1阶']).toBe(18);
  });
});

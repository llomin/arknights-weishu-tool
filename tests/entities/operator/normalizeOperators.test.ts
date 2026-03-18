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
    expect(prioritySummary['持续叠加']).toBe(50);
    expect(prioritySummary['单次叠加']).toBe(17);
    expect(prioritySummary['特异化']).toBe(4);
    expect(prioritySummary['整备能力']).toBe(23);
    expect(prioritySummary['作战能力']).toBe(21);
    expect(prioritySummary['其他']).toBe(0);
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

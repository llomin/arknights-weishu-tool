import { describe, expect, it } from 'vitest';
import { buildRecommendedLineup } from '@/entities/operator/model/buildRecommendedLineup';
import type { OperatorEntity } from '@/shared/types/domain';

function createOperator(operator: Partial<OperatorEntity> & Pick<OperatorEntity, 'id' | 'name' | 'covenants'>): OperatorEntity {
  return {
    traitCategory: '持续叠加',
    traitTags: [],
    description: '',
    tierLabel: '6阶',
    tier: 6,
    priorityBucket: '持续叠加',
    priorityWeight: 0,
    searchText: '',
    ...operator,
  };
}

describe('buildRecommendedLineup', () => {
  it('优先找到满足条件的最省人口组合', () => {
    const operators: OperatorEntity[] = [
      createOperator({ id: 'A', name: '双命中甲', covenants: ['炎', '迅捷'] }),
      createOperator({
        id: 'B',
        name: '双命中乙',
        covenants: ['炎', '迅捷'],
        priorityBucket: '单次叠加',
        priorityWeight: 1,
        tierLabel: '5阶',
        tier: 5,
      }),
      createOperator({
        id: 'C',
        name: '炎补位',
        covenants: ['炎'],
        priorityBucket: '作战能力',
        priorityWeight: 4,
        tierLabel: '4阶',
        tier: 4,
      }),
      createOperator({
        id: 'D',
        name: '迅捷补位',
        covenants: ['迅捷'],
        tierLabel: '4阶',
        tier: 4,
      }),
    ];

    const result = buildRecommendedLineup(
      operators,
      [
        { id: '炎', name: '炎', targetCount: 3 },
        { id: '迅捷', name: '迅捷', targetCount: 2 },
      ],
      8,
    );

    expect(result.reason).toBeNull();
    expect(result.operators.map((operator) => operator.id)).toEqual(['A', 'B', 'C']);
    expect(result.emptySlotCount).toBe(5);
    expect(result.matchedCounts['炎']).toBe(3);
    expect(result.matchedCounts['迅捷']).toBe(2);
  });

  it('独行被选中时不会超出精确人数', () => {
    const operators: OperatorEntity[] = [
      createOperator({
        id: 'X',
        name: '独坚',
        covenants: ['独行', '坚守'],
        tierLabel: '5阶',
        tier: 5,
      }),
      createOperator({
        id: 'Y',
        name: '坚守乙',
        covenants: ['坚守'],
        priorityBucket: '单次叠加',
        priorityWeight: 1,
        tierLabel: '4阶',
        tier: 4,
      }),
      createOperator({
        id: 'Z',
        name: '独行丙',
        covenants: ['独行'],
        priorityBucket: '持续叠加',
        priorityWeight: 0,
        tierLabel: '6阶',
        tier: 6,
      }),
    ];

    const result = buildRecommendedLineup(
      operators,
      [
        { id: '独行', name: '独行', targetCount: 1 },
        { id: '坚守', name: '坚守', targetCount: 2 },
      ],
      8,
    );

    expect(result.reason).toBeNull();
    expect(result.operators.map((operator) => operator.id)).toEqual(['X', 'Y']);
    expect(result.matchedCounts['独行']).toBe(1);
    expect(result.matchedCounts['坚守']).toBe(2);
  });

  it('当盟约阶段超过最大人口时返回无解原因', () => {
    const result = buildRecommendedLineup(
      [],
      [{ id: '炎', name: '炎', targetCount: 9 }],
      8,
    );

    expect(result.reason).toContain('超过当前最大人口 8');
    expect(result.emptySlotCount).toBe(8);
  });
});

import { describe, expect, it } from 'vitest';
import { primaryCovenants, secondaryCovenants } from '@/entities/covenant/model/normalizeCovenants';
import type {
  OperatorEntity,
  OperatorGroupView,
  OperatorPriorityBucket,
} from '@/shared/types/domain';
import {
  buildOperatorCategoryRows,
  compareRecommendedOperatorsForDisplay,
  sortGroupsWithPrimaryFirst,
} from '@/pages/strategy-board/model/strategyBoardDisplay';

function createOperator(
  id: string,
  overrides: Partial<OperatorEntity> = {},
): OperatorEntity {
  const priorityBucket: OperatorPriorityBucket = overrides.priorityBucket ?? '其他';

  return {
    id,
    name: id,
    covenants: [],
    traitCategory: priorityBucket,
    traitTags: [],
    description: `${id} description`,
    tierLabel: '1阶',
    tier: 1,
    priorityBucket,
    priorityWeight: overrides.priorityWeight ?? 6,
    searchText: id,
    ...overrides,
  };
}

function createGroup(covenantId: string, index: number): OperatorGroupView {
  return {
    covenantId,
    covenantName: covenantId,
    activationCount: index + 1,
    operators: [createOperator(`operator-${index}`)],
  };
}

describe('strategyBoardDisplay', () => {
  it('puts primary covenant groups before secondary groups while preserving source order', () => {
    const firstPrimaryId = primaryCovenants[0]?.id;
    const secondPrimaryId = primaryCovenants[1]?.id;
    const firstSecondaryId = secondaryCovenants[0]?.id;
    const secondSecondaryId = secondaryCovenants[1]?.id;

    if (
      !firstPrimaryId ||
      !secondPrimaryId ||
      !firstSecondaryId ||
      !secondSecondaryId
    ) {
      throw new Error('缺少用于测试主次盟约排序的盟约数据');
    }

    const groups = [
      createGroup(firstSecondaryId, 0),
      createGroup(secondPrimaryId, 1),
      createGroup(firstPrimaryId, 2),
      createGroup(secondSecondaryId, 3),
    ];

    expect(sortGroupsWithPrimaryFirst(groups).map((group) => group.covenantId)).toEqual([
      secondPrimaryId,
      firstPrimaryId,
      firstSecondaryId,
      secondSecondaryId,
    ]);
  });

  it('sorts recommended operators by primary match, multi-hit, weight, tier, then name', () => {
    const primaryId = primaryCovenants[0]?.id;
    const secondaryId = secondaryCovenants[0]?.id;

    if (!primaryId || !secondaryId) {
      throw new Error('缺少用于测试推荐排序的盟约数据');
    }

    const selectedCovenantIdSet = new Set([primaryId, secondaryId]);
    const selectedPrimaryCovenantIdSet = new Set([primaryId]);

    const lowerTierPrimaryOperator = createOperator('lowerTierPrimaryOperator', {
      covenants: [primaryId],
      tierLabel: '4阶',
      tier: 4,
      priorityWeight: 5,
      priorityBucket: '作战能力',
    });
    const higherTierMultiHitOperator = createOperator('higherTierMultiHitOperator', {
      covenants: [primaryId, secondaryId],
      tierLabel: '6阶',
      tier: 6,
      priorityWeight: 5,
      priorityBucket: '持续叠加',
    });
    const higherTierNonPrimaryOperator = createOperator('higherTierNonPrimaryOperator', {
      covenants: [secondaryId],
      tierLabel: '6阶',
      tier: 6,
      priorityWeight: 5,
      priorityBucket: '持续叠加',
    });
    const lowerWeightOperator = createOperator('lowerWeightOperator', {
      covenants: [primaryId],
      tierLabel: '5阶',
      tier: 5,
      priorityWeight: 1,
      priorityBucket: '持续叠加',
    });
    const higherTierSameWeightOperator = createOperator('higherTierSameWeightOperator', {
      covenants: [primaryId],
      tierLabel: '6阶',
      tier: 6,
      priorityWeight: 2,
      priorityBucket: '单次叠加',
    });
    const sameTierNameLaterOperator = createOperator('zeta', {
      covenants: [primaryId],
      tierLabel: '6阶',
      tier: 6,
      priorityWeight: 2,
      priorityBucket: '单次叠加',
    });
    const sameTierNameEarlierOperator = createOperator('alpha', {
      covenants: [primaryId],
      tierLabel: '6阶',
      tier: 6,
      priorityWeight: 2,
      priorityBucket: '单次叠加',
    });

    const operators = [
      lowerTierPrimaryOperator,
      higherTierNonPrimaryOperator,
      higherTierMultiHitOperator,
      sameTierNameLaterOperator,
      sameTierNameEarlierOperator,
      higherTierSameWeightOperator,
      lowerWeightOperator,
    ];

    expect(
      [...operators].sort((left, right) =>
        compareRecommendedOperatorsForDisplay(
          left,
          right,
          selectedCovenantIdSet,
          selectedPrimaryCovenantIdSet,
        ),
      ),
    ).toEqual([
      higherTierMultiHitOperator,
      lowerWeightOperator,
      sameTierNameEarlierOperator,
      higherTierSameWeightOperator,
      sameTierNameLaterOperator,
      lowerTierPrimaryOperator,
      higherTierNonPrimaryOperator,
    ]);
  });

  it('builds non-empty operator category rows in configured order', () => {
    const operators = [
      createOperator('setup', {
        priorityBucket: '作战能力',
        priorityWeight: 5,
      }),
      createOperator('continuous', {
        priorityBucket: '持续叠加',
        priorityWeight: 1,
      }),
      createOperator('other', {
        priorityBucket: '其他',
        priorityWeight: 6,
      }),
      createOperator('single', {
        priorityBucket: '单次叠加',
        priorityWeight: 2,
      }),
    ];

    expect(buildOperatorCategoryRows(operators)).toEqual([
      {
        category: '持续叠加',
        operators: [operators[1]],
      },
      {
        category: '单次叠加',
        operators: [operators[3]],
      },
      {
        category: '作战能力',
        operators: [operators[0]],
      },
      {
        category: '其他',
        operators: [operators[2]],
      },
    ]);
  });
});

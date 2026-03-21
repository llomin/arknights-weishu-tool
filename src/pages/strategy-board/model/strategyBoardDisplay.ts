import { covenantMap } from '@/entities/covenant/model/normalizeCovenants';
import type {
  OperatorEntity,
  OperatorGroupView,
  StrategyState,
} from '@/shared/types/domain';

export const highPriorityBuckets = new Set<OperatorEntity['priorityBucket']>([
  '持续叠加',
  '单次叠加',
  '特异化',
]);

export const selectableLevels = [1, 2, 3, 4, 5, 6] as const;
export const selectablePopulations: StrategyState['maxPopulation'][] = [8, 9];

export const operatorCategoryOrder: OperatorEntity['priorityBucket'][] = [
  '持续叠加',
  '单次叠加',
  '特异化',
  '整备能力',
  '作战能力',
  '其他',
];

export const operatorTierRomanMap: Record<OperatorEntity['tier'], string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
};

export function getMatchedSelectedCovenants(
  operator: OperatorEntity,
  selectedCovenantIdSet: Set<string>,
) {
  return operator.covenants.filter((covenantId) =>
    selectedCovenantIdSet.has(covenantId),
  );
}

export function hasMatchedPrimarySelectedCovenant(
  operator: OperatorEntity,
  selectedPrimaryCovenantIdSet: Set<string>,
) {
  return operator.covenants.some((covenantId) =>
    selectedPrimaryCovenantIdSet.has(covenantId),
  );
}

export function isMultiHitSelectedOperator(
  operator: OperatorEntity,
  selectedCovenantIdSet: Set<string>,
) {
  return getMatchedSelectedCovenants(operator, selectedCovenantIdSet).length >= 2;
}

export function isPriorityOperator(operator: OperatorEntity) {
  return highPriorityBuckets.has(operator.priorityBucket);
}

export function buildSectionGroups(
  groups: OperatorGroupView[],
  predicate: (operator: OperatorEntity) => boolean,
): OperatorGroupView[] {
  return groups
    .map((group) => ({
      ...group,
      operators: group.operators.filter(predicate),
    }))
    .filter((group) => group.operators.length > 0);
}

export function sortGroupsWithPrimaryFirst(sectionGroups: OperatorGroupView[]) {
  return sectionGroups
    .map((group, index) => ({
      group,
      index,
      isPrimary: covenantMap[group.covenantId]?.isPrimary ?? false,
    }))
    .sort(
      (left, right) =>
        Number(right.isPrimary) - Number(left.isPrimary) || left.index - right.index,
    )
    .map(({ group }) => group);
}

export function getUniqueOperatorCount(sectionGroups: OperatorGroupView[]) {
  return new Set(
    sectionGroups.flatMap((group) => group.operators.map((operator) => operator.id)),
  ).size;
}

export function buildOperatorCategoryRows(operators: OperatorEntity[]) {
  return operatorCategoryOrder
    .map((category) => ({
      category,
      operators: operators.filter((operator) => operator.priorityBucket === category),
    }))
    .filter((row) => row.operators.length > 0);
}

export function compareRecommendedOperatorsForDisplay(
  left: OperatorEntity,
  right: OperatorEntity,
  selectedCovenantIdSet: Set<string>,
  selectedPrimaryCovenantIdSet: Set<string>,
) {
  return (
    Number(
      hasMatchedPrimarySelectedCovenant(right, selectedPrimaryCovenantIdSet),
    ) -
      Number(
        hasMatchedPrimarySelectedCovenant(left, selectedPrimaryCovenantIdSet),
      ) ||
    Number(isMultiHitSelectedOperator(right, selectedCovenantIdSet)) -
      Number(isMultiHitSelectedOperator(left, selectedCovenantIdSet)) ||
    left.priorityWeight - right.priorityWeight ||
    right.tier - left.tier ||
    left.name.localeCompare(right.name, 'zh-Hans-CN')
  );
}

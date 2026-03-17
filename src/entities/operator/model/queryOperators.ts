import { getSearchKeywords } from '@/shared/lib/searchKeywords';
import type { OperatorEntity } from '@/shared/types/domain';

export function sortOperators(left: OperatorEntity, right: OperatorEntity) {
  return (
    left.priorityWeight - right.priorityWeight ||
    right.tier - left.tier ||
    left.name.localeCompare(right.name, 'zh-Hans-CN')
  );
}

export function matchesOperatorSearch(
  operator: OperatorEntity,
  normalizedKeywords: string[],
) {
  return (
    normalizedKeywords.length === 0 ||
    normalizedKeywords.every((keyword) => operator.searchText.includes(keyword))
  );
}

export function matchesOperatorRemoval(
  operator: OperatorEntity,
  removedOperatorIds: string[],
) {
  return !removedOperatorIds.includes(operator.id);
}

export function matchesOperatorCovenants(
  operator: OperatorEntity,
  selectedCovenantIds: string[],
) {
  return (
    selectedCovenantIds.length > 0 &&
    operator.covenants.some((covenantId) =>
      selectedCovenantIds.includes(covenantId),
    )
  );
}

export function filterOperators(
  operators: OperatorEntity[],
  selectedCovenantIds: string[],
  searchKeyword: string,
  removedOperatorIds: string[] = [],
) {
  if (selectedCovenantIds.length === 0) {
    return [];
  }

  const normalizedKeywords = getSearchKeywords(searchKeyword);

  return operators
    .filter((operator) => matchesOperatorCovenants(operator, selectedCovenantIds))
    .filter((operator) => matchesOperatorRemoval(operator, removedOperatorIds))
    .filter((operator) => matchesOperatorSearch(operator, normalizedKeywords))
    .sort(sortOperators);
}

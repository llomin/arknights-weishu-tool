import { normalizeSearchText } from '@/shared/lib/normalizeSearchText';
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
  normalizedKeyword: string,
) {
  return (
    normalizedKeyword.length === 0 ||
    operator.searchText.includes(normalizedKeyword)
  );
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
) {
  if (selectedCovenantIds.length === 0) {
    return [];
  }

  const normalizedKeyword = normalizeSearchText(searchKeyword);

  return operators
    .filter((operator) => matchesOperatorCovenants(operator, selectedCovenantIds))
    .filter((operator) => matchesOperatorSearch(operator, normalizedKeyword))
    .sort(sortOperators);
}


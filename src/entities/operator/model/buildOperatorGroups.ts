import { covenantMap } from '@/entities/covenant/model/normalizeCovenants';
import { getSearchKeywords } from '@/shared/lib/searchKeywords';
import type { OperatorEntity, OperatorGroupView } from '@/shared/types/domain';
import {
  matchesOperatorRemoval,
  matchesOperatorSearch,
  sortOperators,
} from './queryOperators';

export function buildOperatorGroups(
  operators: OperatorEntity[],
  selectedCovenantIds: string[],
  searchKeyword: string,
  removedOperatorIds: string[] = [],
): OperatorGroupView[] {
  const normalizedKeywords = getSearchKeywords(searchKeyword);

  return selectedCovenantIds
    .map<OperatorGroupView | null>((covenantId) => {
      const covenant = covenantMap[covenantId];

      if (!covenant) {
        return null;
      }

      const visibleOperators = operators
        .filter((operator) => operator.covenants.includes(covenantId))
        .filter((operator) => matchesOperatorRemoval(operator, removedOperatorIds))
        .filter((operator) => matchesOperatorSearch(operator, normalizedKeywords))
        .sort(sortOperators);

      if (visibleOperators.length === 0) {
        return null;
      }

      return {
        covenantId,
        covenantName: covenant.name,
        activationCount: covenant.activationCount,
        operators: visibleOperators,
      };
    })
    .filter((group): group is OperatorGroupView => group !== null);
}

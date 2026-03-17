import { covenantMap } from '@/entities/covenant/model/normalizeCovenants';
import { normalizeSearchText } from '@/shared/lib/normalizeSearchText';
import type { OperatorEntity, OperatorGroupView } from '@/shared/types/domain';
import {
  matchesOperatorSearch,
  sortOperators,
} from './queryOperators';

export function buildOperatorGroups(
  operators: OperatorEntity[],
  selectedCovenantIds: string[],
  searchKeyword: string,
): OperatorGroupView[] {
  const normalizedKeyword = normalizeSearchText(searchKeyword);

  return selectedCovenantIds
    .map<OperatorGroupView | null>((covenantId) => {
      const covenant = covenantMap[covenantId];

      if (!covenant) {
        return null;
      }

      const visibleOperators = operators
        .filter((operator) => operator.covenants.includes(covenantId))
        .filter((operator) => matchesOperatorSearch(operator, normalizedKeyword))
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

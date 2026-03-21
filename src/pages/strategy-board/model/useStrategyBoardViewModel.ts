import { useDeferredValue } from 'react';
import { covenantMap } from '@/entities/covenant/model/normalizeCovenants';
import { buildOperatorGroups } from '@/entities/operator/model/buildOperatorGroups';
import { buildRecommendedLineup } from '@/entities/operator/model/buildRecommendedLineup';
import { operatorMap, operators } from '@/entities/operator/model/normalizeOperators';
import {
  filterOperators,
  matchesOperatorLevel,
  matchesOperatorRemoval,
  matchesOperatorSearch,
  sortOperators,
} from '@/entities/operator/model/queryOperators';
import {
  buildSectionGroups,
  compareRecommendedOperatorsForDisplay,
  isPriorityOperator,
  sortGroupsWithPrimaryFirst,
} from '@/pages/strategy-board/model/strategyBoardDisplay';
import { getSearchKeywords } from '@/shared/lib/searchKeywords';
import type { StrategyState } from '@/shared/types/domain';

export interface UseStrategyBoardViewModelInput {
  currentLevel: StrategyState['currentLevel'];
  maxPopulation: StrategyState['maxPopulation'];
  removedOperatorIds: string[];
  searchKeyword: string;
  selectedCovenantIds: string[];
  selectedCovenantTargetMap: StrategyState['selectedCovenantTargetMap'];
}

export function useStrategyBoardViewModel(
  input: UseStrategyBoardViewModelInput,
) {
  const deferredSearchKeyword = useDeferredValue(input.searchKeyword);
  const searchKeywords = getSearchKeywords(deferredSearchKeyword);
  const selectedCovenantIdSet = new Set(input.selectedCovenantIds);
  const selectedPrimaryCovenantIdSet = new Set(
    input.selectedCovenantIds.filter((covenantId) => covenantMap[covenantId]?.isPrimary),
  );
  const visibleOperators = filterOperators(
    operators,
    input.selectedCovenantIds,
    '',
    input.removedOperatorIds,
    input.currentLevel,
  );
  const groups = buildOperatorGroups(
    operators,
    input.selectedCovenantIds,
    '',
    input.removedOperatorIds,
    input.currentLevel,
  );
  const searchResultOperators =
    searchKeywords.length === 0
      ? []
      : operators
          .filter((operator) => matchesOperatorRemoval(operator, input.removedOperatorIds))
          .filter((operator) => matchesOperatorLevel(operator, input.currentLevel))
          .filter((operator) => matchesOperatorSearch(operator, searchKeywords))
          .sort(sortOperators);
  const removedOperators = input.removedOperatorIds
    .map((operatorId) => operatorMap[operatorId])
    .filter((operator): operator is NonNullable<typeof operator> => Boolean(operator))
    .sort(
      (left, right) =>
        right.tier - left.tier ||
        left.priorityWeight - right.priorityWeight ||
        left.name.localeCompare(right.name, 'zh-Hans-CN'),
    );
  const maxVisibleTier =
    input.currentLevel === null ? null : Math.min(input.currentLevel + 1, 6);
  const selectedCovenantRequirements = input.selectedCovenantIds
    .map((id) => {
      const covenant = covenantMap[id];
      const targetCount = input.selectedCovenantTargetMap[id];

      if (!covenant || targetCount === undefined) {
        return null;
      }

      return {
        id,
        name: covenant.name,
        targetCount,
      };
    })
    .filter((requirement): requirement is NonNullable<typeof requirement> => requirement !== null);
  const recommendedLineup = buildRecommendedLineup(
    visibleOperators,
    selectedCovenantRequirements,
    input.maxPopulation,
  );
  const sortedRecommendedOperators = [...recommendedLineup.operators].sort(
    (left, right) =>
      compareRecommendedOperatorsForDisplay(
        left,
        right,
        selectedCovenantIdSet,
        selectedPrimaryCovenantIdSet,
      ),
  );
  const recommendedCovenantIds = new Set(
    input.selectedCovenantIds.flatMap(
      (id) => covenantMap[id]?.recommendWith ?? [],
    ),
  );
  const priorityGroups = sortGroupsWithPrimaryFirst(
    buildSectionGroups(groups, isPriorityOperator),
  );
  const otherGroups = buildSectionGroups(
    groups,
    (operator) => !isPriorityOperator(operator),
  );

  return {
    groups,
    maxVisibleTier,
    otherGroups,
    priorityGroups,
    recommendedCovenantIds,
    recommendedLineup,
    removedOperators,
    searchKeywords,
    searchResultOperators,
    selectedCovenantIdSet,
    selectedCovenantRequirements,
    selectedPrimaryCovenantIdSet,
    sortedRecommendedOperators,
    visibleOperators,
  };
}

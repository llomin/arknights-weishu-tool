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
import type { OperatorEntity, StrategyState } from '@/shared/types/domain';

export interface UseStrategyBoardViewModelInput {
  blockedRecommendedOperatorIds: string[];
  currentLevel: StrategyState['currentLevel'];
  maxPopulation: StrategyState['maxPopulation'];
  preferredRecommendedOperatorIds: string[];
  removedOperatorIds: string[];
  searchKeyword: string;
  selectedCovenantIds: string[];
  selectedCovenantTargetMap: StrategyState['selectedCovenantTargetMap'];
}

function buildMatchedCountsForOperators(
  operatorsForRecommendation: OperatorEntity[],
  requirementIds: { id: string }[],
) {
  return requirementIds.reduce<Record<string, number>>((counts, requirement) => {
    counts[requirement.id] = operatorsForRecommendation.filter((operator) =>
      operator.covenants.includes(requirement.id),
    ).length;
    return counts;
  }, {});
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
  const recommendationAvailableOperators = operators
    .filter((operator) => matchesOperatorRemoval(operator, input.removedOperatorIds))
    .filter((operator) => matchesOperatorLevel(operator, input.currentLevel))
    .sort(sortOperators);
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
  const blockedRecommendedOperatorIdSet = new Set(input.blockedRecommendedOperatorIds);
  const recommendationAvailableOperatorIdSet = new Set(
    recommendationAvailableOperators.map((operator) => operator.id),
  );
  const preferredRecommendedOperators = input.preferredRecommendedOperatorIds
    .map((operatorId) => operatorMap[operatorId])
    .filter((operator): operator is NonNullable<typeof operator> => Boolean(operator))
    .filter(
      (operator) =>
        !blockedRecommendedOperatorIdSet.has(operator.id) &&
        recommendationAvailableOperatorIdSet.has(operator.id),
    );
  const computedRecommendedLineup = buildRecommendedLineup(
    recommendationAvailableOperators.filter(
      (operator) => !blockedRecommendedOperatorIdSet.has(operator.id),
    ),
    selectedCovenantRequirements,
    input.maxPopulation,
    {
      preferredOperators: preferredRecommendedOperators,
    },
  );
  const recommendedLineup =
    computedRecommendedLineup.reason !== null &&
    preferredRecommendedOperators.length > 0 &&
    preferredRecommendedOperators.length <= input.maxPopulation
      ? {
          operators: preferredRecommendedOperators,
          requirements: selectedCovenantRequirements,
          matchedCounts: buildMatchedCountsForOperators(
            preferredRecommendedOperators,
            selectedCovenantRequirements,
          ),
          maxPopulation: input.maxPopulation,
          emptySlotCount: Math.max(
            input.maxPopulation - preferredRecommendedOperators.length,
            0,
          ),
          reason: computedRecommendedLineup.reason,
        }
      : computedRecommendedLineup;
  const sortedRecommendedOperators = [...recommendedLineup.operators].sort(
    (left, right) =>
      compareRecommendedOperatorsForDisplay(
        left,
        right,
        selectedCovenantIdSet,
        selectedPrimaryCovenantIdSet,
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
    recommendationAvailableOperators,
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

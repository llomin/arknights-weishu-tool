import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
  isPriorityOperator,
  sortGroupsWithPrimaryFirst,
} from '@/pages/strategy-board/model/strategyBoardDisplay';
import { useStrategyBoardViewModel } from '@/pages/strategy-board/model/useStrategyBoardViewModel';
import { getSearchKeywords } from '@/shared/lib/searchKeywords';
import type { OperatorEntity, StrategyState } from '@/shared/types/domain';

function buildSelectedCovenantTargetMap(
  selectedCovenantIds: string[],
  maxPopulation: StrategyState['maxPopulation'],
) {
  const selectedCovenantTargetMap: Record<string, number> = {};

  for (const covenantId of selectedCovenantIds) {
    const activationStage = covenantMap[covenantId]?.activationStages.find(
      (stage) => stage <= maxPopulation,
    );

    if (activationStage === undefined) {
      throw new Error(`盟约 ${covenantId} 缺少可用激活阶段`);
    }

    selectedCovenantTargetMap[covenantId] = activationStage;
  }

  return selectedCovenantTargetMap;
}

function findScenarioOperator() {
  const operator = operators.find(
    (item) =>
      item.covenants.length >= 2 &&
      item.tier <= 5 &&
      item.traitTags.length > 0 &&
      isPriorityOperator(item),
  );

  if (!operator) {
    throw new Error('未找到可用于 StrategyBoardViewModel 测试的干员场景');
  }

  return operator;
}

describe('useStrategyBoardViewModel', () => {
  it('builds the current page derived state from input filters', () => {
    const maxPopulation: StrategyState['maxPopulation'] = 9;
    const currentLevel: StrategyState['currentLevel'] = 4;
    const scenarioOperator = findScenarioOperator();
    const selectedCovenantIds = scenarioOperator.covenants.slice(0, 2);
    const selectedCovenantTargetMap = buildSelectedCovenantTargetMap(
      selectedCovenantIds,
      maxPopulation,
    );
    const searchKeyword = scenarioOperator.traitTags[0] ?? scenarioOperator.description;
    const removedOperatorIds = operators
      .filter((operator) => operator.id !== scenarioOperator.id)
      .slice(0, 2)
      .map((operator) => operator.id);

    if (removedOperatorIds.length < 2) {
      throw new Error('缺少用于 StrategyBoardViewModel 测试的已删干员场景');
    }

    const searchKeywords = getSearchKeywords(searchKeyword);
    const expectedVisibleOperators = filterOperators(
      operators,
      selectedCovenantIds,
      '',
      removedOperatorIds,
      currentLevel,
    );
    const expectedGroups = buildOperatorGroups(
      operators,
      selectedCovenantIds,
      '',
      removedOperatorIds,
      currentLevel,
    );
    const expectedSearchResultOperators = operators
      .filter((operator) => matchesOperatorRemoval(operator, removedOperatorIds))
      .filter((operator) => matchesOperatorLevel(operator, currentLevel))
      .filter((operator) => matchesOperatorSearch(operator, searchKeywords))
      .sort(sortOperators);
    const expectedRemovedOperators = removedOperatorIds
      .map((operatorId) => operatorMap[operatorId])
      .filter((operator): operator is OperatorEntity => Boolean(operator))
      .sort(
        (left, right) =>
          right.tier - left.tier ||
          left.priorityWeight - right.priorityWeight ||
          left.name.localeCompare(right.name, 'zh-Hans-CN'),
      );
    const selectedCovenantRequirements = selectedCovenantIds.map((id) => ({
      id,
      name: covenantMap[id]?.name ?? id,
      targetCount: selectedCovenantTargetMap[id]!,
    }));
    const expectedRecommendedLineup = buildRecommendedLineup(
      expectedVisibleOperators,
      selectedCovenantRequirements,
      maxPopulation,
    );
    const expectedPriorityGroups = sortGroupsWithPrimaryFirst(
      buildSectionGroups(expectedGroups, isPriorityOperator),
    );
    const expectedOtherGroups = buildSectionGroups(
      expectedGroups,
      (operator) => !isPriorityOperator(operator),
    );

    const { result } = renderHook(() =>
      useStrategyBoardViewModel({
        selectedCovenantIds,
        selectedCovenantTargetMap,
        maxPopulation,
        currentLevel,
        searchKeyword,
        removedOperatorIds,
      }),
    );

    expect(result.current.searchKeywords).toEqual(searchKeywords);
    expect(result.current.maxVisibleTier).toBe(5);
    expect(result.current.visibleOperators).toEqual(expectedVisibleOperators);
    expect(result.current.groups).toEqual(expectedGroups);
    expect(result.current.searchResultOperators).toEqual(expectedSearchResultOperators);
    expect(result.current.removedOperators).toEqual(expectedRemovedOperators);
    expect(result.current.selectedCovenantRequirements).toEqual(
      selectedCovenantRequirements,
    );
    expect(result.current.recommendedLineup).toEqual(expectedRecommendedLineup);
    expect(result.current.priorityGroups).toEqual(expectedPriorityGroups);
    expect(result.current.otherGroups).toEqual(expectedOtherGroups);
    expect('recommendedCovenantIds' in result.current).toBe(false);
  });
});

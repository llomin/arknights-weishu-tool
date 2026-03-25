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

function buildSelectionCandidates(covenantIds: string[]) {
  const uniqueCovenantIds = [...new Set(covenantIds)];
  const candidates = uniqueCovenantIds.map((covenantId) => [covenantId]);

  for (let leftIndex = 0; leftIndex < uniqueCovenantIds.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < uniqueCovenantIds.length;
      rightIndex += 1
    ) {
      const leftCovenantId = uniqueCovenantIds[leftIndex];
      const rightCovenantId = uniqueCovenantIds[rightIndex];

      if (!leftCovenantId || !rightCovenantId) {
        continue;
      }

      candidates.push([leftCovenantId, rightCovenantId]);
    }
  }

  return candidates;
}

function findCustomizedRecommendationScenario() {
  const maxPopulation: StrategyState['maxPopulation'] = 9;
  const allCovenantIds = operators.flatMap((operator) => operator.covenants);

  for (const selectedCovenantIds of buildSelectionCandidates(allCovenantIds)) {
    const selectedCovenantTargetMap = buildSelectedCovenantTargetMap(
      selectedCovenantIds,
      maxPopulation,
    );
    const selectedCovenantRequirements = selectedCovenantIds.map((id) => ({
      id,
      name: covenantMap[id]?.name ?? id,
      targetCount: selectedCovenantTargetMap[id]!,
    }));
    const visibleOperators = filterOperators(
      operators,
      selectedCovenantIds,
      '',
      [],
      null,
    );
    const baseRecommendedLineup = buildRecommendedLineup(
      visibleOperators,
      selectedCovenantRequirements,
      maxPopulation,
    );

    if (baseRecommendedLineup.reason || baseRecommendedLineup.operators.length === 0) {
      continue;
    }

    const baseRecommendedOperatorIds = new Set(
      baseRecommendedLineup.operators.map((operator) => operator.id),
    );

    for (const blockedOperator of baseRecommendedLineup.operators) {
      const preferredWithoutBlockedOperator = baseRecommendedLineup.operators.filter(
        (operator) => operator.id !== blockedOperator.id,
      );
      const deleteResult = buildRecommendedLineup(
        visibleOperators.filter((operator) => operator.id !== blockedOperator.id),
        selectedCovenantRequirements,
        maxPopulation,
        {
          preferredOperators: preferredWithoutBlockedOperator,
        },
      );

      if (
        deleteResult.reason ||
        deleteResult.operators.some((operator) => operator.id === blockedOperator.id)
      ) {
        continue;
      }

      const replacementOperator = visibleOperators.find((candidateOperator) => {
        if (baseRecommendedOperatorIds.has(candidateOperator.id)) {
          return false;
        }

        const replacedPreferredOperators = baseRecommendedLineup.operators.map((operator) =>
          operator.id === blockedOperator.id ? candidateOperator : operator,
        );
        const replaceResult = buildRecommendedLineup(
          visibleOperators,
          selectedCovenantRequirements,
          maxPopulation,
          {
            preferredOperators: replacedPreferredOperators,
          },
        );

        return (
          replaceResult.reason === null &&
          replaceResult.operators.some((operator) => operator.id === candidateOperator.id) &&
          replaceResult.operators.every((operator) => operator.id !== blockedOperator.id)
        );
      });

      if (!replacementOperator) {
        continue;
      }

      const addOperator = visibleOperators.find((candidateOperator) => {
        if (
          baseRecommendedOperatorIds.has(candidateOperator.id) ||
          candidateOperator.id === replacementOperator.id
        ) {
          return false;
        }

        const addResult = buildRecommendedLineup(
          visibleOperators,
          selectedCovenantRequirements,
          maxPopulation,
          {
            preferredOperators: [
              replacementOperator,
              ...preferredWithoutBlockedOperator,
              candidateOperator,
            ],
          },
        );

        return (
          addResult.reason === null &&
          addResult.operators.some((operator) => operator.id === replacementOperator.id) &&
          addResult.operators.some((operator) => operator.id === candidateOperator.id) &&
          addResult.operators.every((operator) => operator.id !== blockedOperator.id)
        );
      });

      if (!addOperator) {
        continue;
      }

      return {
        addOperator,
        blockedOperator,
        maxPopulation,
        preferredRecommendedOperatorIds: [
          replacementOperator.id,
          ...preferredWithoutBlockedOperator.map((operator) => operator.id),
          addOperator.id,
        ],
        replacementOperator,
        selectedCovenantIds,
        selectedCovenantRequirements,
        selectedCovenantTargetMap,
      };
    }
  }

  throw new Error('未找到可用于推荐阵容指定干员测试的场景');
}

function findUnrestrictedReplacementScenario() {
  const maxPopulation: StrategyState['maxPopulation'] = 9;
  const allCovenantIds = operators.flatMap((operator) => operator.covenants);

  for (const selectedCovenantIds of buildSelectionCandidates(allCovenantIds)) {
    const selectedCovenantTargetMap = buildSelectedCovenantTargetMap(
      selectedCovenantIds,
      maxPopulation,
    );
    const selectedCovenantRequirements = selectedCovenantIds.map((id) => ({
      id,
      name: covenantMap[id]?.name ?? id,
      targetCount: selectedCovenantTargetMap[id]!,
    }));
    const recommendationAvailableOperators = operators
      .filter((operator) => matchesOperatorRemoval(operator, []))
      .filter((operator) => matchesOperatorLevel(operator, null))
      .sort(sortOperators);
    const baseRecommendedLineup = buildRecommendedLineup(
      recommendationAvailableOperators,
      selectedCovenantRequirements,
      maxPopulation,
    );

    if (baseRecommendedLineup.reason || baseRecommendedLineup.operators.length === 0) {
      continue;
    }

    const baseRecommendedOperatorIds = new Set(
      baseRecommendedLineup.operators.map((operator) => operator.id),
    );

    for (const targetOperator of baseRecommendedLineup.operators) {
      const replacementOperator = recommendationAvailableOperators.find(
        (candidateOperator) =>
          !baseRecommendedOperatorIds.has(candidateOperator.id) &&
          candidateOperator.covenants.every(
            (covenantId) => !selectedCovenantIds.includes(covenantId),
          ),
      );

      if (!replacementOperator) {
        continue;
      }

      return {
        maxPopulation,
        preferredRecommendedOperatorIds: baseRecommendedLineup.operators.map((operator) =>
          operator.id === targetOperator.id ? replacementOperator.id : operator.id,
        ),
        replacementOperator,
        selectedCovenantIds,
        selectedCovenantRequirements,
        selectedCovenantTargetMap,
        targetOperator,
      };
    }
  }

  throw new Error('未找到可用于跨盟约替换推荐阵容的场景');
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
    const expectedRecommendationAvailableOperators = operators
      .filter((operator) => matchesOperatorRemoval(operator, removedOperatorIds))
      .filter((operator) => matchesOperatorLevel(operator, currentLevel))
      .sort(sortOperators);
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
      expectedRecommendationAvailableOperators,
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
        preferredRecommendedOperatorIds: [],
        blockedRecommendedOperatorIds: [],
      }),
    );

    expect(result.current.searchKeywords).toEqual(searchKeywords);
    expect(result.current.maxVisibleTier).toBe(5);
    expect(result.current.visibleOperators).toEqual(expectedVisibleOperators);
    expect(result.current.recommendationAvailableOperators).toEqual(
      expectedRecommendationAvailableOperators,
    );
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

  it('builds the recommended lineup around preferred operators and excluded operators', () => {
    const scenario = findCustomizedRecommendationScenario();
    const expectedRecommendationAvailableOperators = operators
      .filter((operator) => matchesOperatorRemoval(operator, []))
      .filter((operator) => matchesOperatorLevel(operator, null))
      .sort(sortOperators);
    const expectedRecommendedLineup = buildRecommendedLineup(
      expectedRecommendationAvailableOperators.filter(
        (operator) => operator.id !== scenario.blockedOperator.id,
      ),
      scenario.selectedCovenantRequirements,
      scenario.maxPopulation,
      {
        preferredOperators: scenario.preferredRecommendedOperatorIds
          .map((operatorId) => operatorMap[operatorId])
          .filter((operator): operator is OperatorEntity => Boolean(operator)),
      },
    );

    const { result } = renderHook(() =>
      useStrategyBoardViewModel({
        selectedCovenantIds: scenario.selectedCovenantIds,
        selectedCovenantTargetMap: scenario.selectedCovenantTargetMap,
        maxPopulation: scenario.maxPopulation,
        currentLevel: null,
        searchKeyword: '',
        removedOperatorIds: [],
        preferredRecommendedOperatorIds: scenario.preferredRecommendedOperatorIds,
        blockedRecommendedOperatorIds: [scenario.blockedOperator.id],
      }),
    );

    expect(result.current.recommendedLineup).toEqual(expectedRecommendedLineup);
    expect(result.current.recommendedLineup.reason).toBeNull();
    expect(
      result.current.recommendedLineup.operators.map((operator) => operator.id),
    ).toEqual(
      expect.arrayContaining([
        scenario.replacementOperator.id,
        scenario.addOperator.id,
      ]),
    );
    expect(
      result.current.recommendedLineup.operators.map((operator) => operator.id),
    ).not.toContain(scenario.blockedOperator.id);
  });

  it('keeps specified replacement operators visible even if they are outside the selected covenant filters', () => {
    const scenario = findUnrestrictedReplacementScenario();

    const { result } = renderHook(() =>
      useStrategyBoardViewModel({
        selectedCovenantIds: scenario.selectedCovenantIds,
        selectedCovenantTargetMap: scenario.selectedCovenantTargetMap,
        maxPopulation: scenario.maxPopulation,
        currentLevel: null,
        searchKeyword: '',
        removedOperatorIds: [],
        preferredRecommendedOperatorIds: scenario.preferredRecommendedOperatorIds,
        blockedRecommendedOperatorIds: [scenario.targetOperator.id],
      }),
    );

    expect(
      result.current.recommendedLineup.operators.map((operator) => operator.id),
    ).toContain(scenario.replacementOperator.id);
    expect(
      result.current.recommendedLineup.operators.map((operator) => operator.id),
    ).not.toContain(scenario.targetOperator.id);
  });
});

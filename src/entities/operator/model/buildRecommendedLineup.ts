import type { OperatorEntity } from '@/shared/types/domain';

export interface CovenantRequirement {
  id: string;
  name: string;
  targetCount: number;
}

export interface RecommendedLineupResult {
  operators: OperatorEntity[];
  requirements: CovenantRequirement[];
  matchedCounts: Record<string, number>;
  maxPopulation: 8 | 9;
  emptySlotCount: number;
  reason: string | null;
}

export interface BuildRecommendedLineupOptions {
  preferredOperators?: OperatorEntity[];
}

interface LineupState {
  counts: number[];
  operators: OperatorEntity[];
  matchedSelectedCovenantCount: number;
  priorityScore: number;
  tierScore: number;
}

const EXACT_REQUIREMENT_IDS = new Set(['独行']);

function getMatchedRequirementCount(
  operator: OperatorEntity,
  requirementIds: Set<string>,
) {
  return operator.covenants.filter((covenantId) => requirementIds.has(covenantId)).length;
}

function getOperatorCandidateScore(
  operator: OperatorEntity,
  requirementIds: Set<string>,
) {
  const matchedRequirementCount = getMatchedRequirementCount(operator, requirementIds);

  return (
    matchedRequirementCount * 100 +
    (6 - operator.priorityWeight) * 10 +
    operator.tier
  );
}

function compareOperatorsForRecommendation(
  left: OperatorEntity,
  right: OperatorEntity,
  requirementIds: Set<string>,
) {
  return (
    getOperatorCandidateScore(right, requirementIds) -
      getOperatorCandidateScore(left, requirementIds) ||
    left.name.localeCompare(right.name, 'zh-Hans-CN')
  );
}

function isLineupStateBetter(left: LineupState, right: LineupState) {
  return (
    left.operators.length < right.operators.length ||
    (left.operators.length === right.operators.length &&
      (left.matchedSelectedCovenantCount > right.matchedSelectedCovenantCount ||
        (left.matchedSelectedCovenantCount === right.matchedSelectedCovenantCount &&
          (left.priorityScore > right.priorityScore ||
            (left.priorityScore === right.priorityScore &&
              (left.tierScore > right.tierScore ||
                (left.tierScore === right.tierScore &&
                  left.operators
                    .map((operator) => operator.id)
                    .join('|')
                    .localeCompare(
                      right.operators.map((operator) => operator.id).join('|'),
                      'zh-Hans-CN',
                    ) < 0)))))))
  );
}

function buildLineupStateKey(counts: number[]) {
  return counts.join(',');
}

function buildMatchedCounts(
  operators: OperatorEntity[],
  requirements: CovenantRequirement[],
) {
  return requirements.reduce<Record<string, number>>((counts, requirement) => {
    counts[requirement.id] = operators.filter((operator) =>
      operator.covenants.includes(requirement.id),
    ).length;
    return counts;
  }, {});
}

function buildImpossibleResult(
  requirements: CovenantRequirement[],
  maxPopulation: 8 | 9,
  reason: string,
): RecommendedLineupResult {
  return {
    operators: [],
    requirements,
    matchedCounts: Object.fromEntries(
      requirements.map((requirement) => [requirement.id, 0]),
    ),
    maxPopulation,
    emptySlotCount: maxPopulation,
    reason,
  };
}

function getUniquePreferredOperators(preferredOperators: OperatorEntity[] = []) {
  const usedOperatorIdSet = new Set<string>();

  return preferredOperators.filter((operator) => {
    if (usedOperatorIdSet.has(operator.id)) {
      return false;
    }

    usedOperatorIdSet.add(operator.id);
    return true;
  });
}

export function buildRecommendedLineup(
  availableOperators: OperatorEntity[],
  requirements: CovenantRequirement[],
  maxPopulation: 8 | 9,
  options: BuildRecommendedLineupOptions = {},
): RecommendedLineupResult {
  if (requirements.length === 0) {
    const preferredOperators = getUniquePreferredOperators(options.preferredOperators);

    if (preferredOperators.length > maxPopulation) {
      return buildImpossibleResult(
        requirements,
        maxPopulation,
        `已指定 ${preferredOperators.length} 名干员，已超过当前最大人口 ${maxPopulation}。`,
      );
    }

    return {
      operators: preferredOperators,
      requirements,
      matchedCounts: buildMatchedCounts(preferredOperators, requirements),
      maxPopulation,
      emptySlotCount: Math.max(maxPopulation - preferredOperators.length, 0),
      reason: null,
    };
  }

  const preferredOperators = getUniquePreferredOperators(options.preferredOperators);

  if (preferredOperators.length > maxPopulation) {
    return buildImpossibleResult(
      requirements,
      maxPopulation,
      `已指定 ${preferredOperators.length} 名干员，已超过当前最大人口 ${maxPopulation}。`,
    );
  }

  const requirementIds = new Set(requirements.map((requirement) => requirement.id));
  const availableOperatorIdSet = new Set(availableOperators.map((operator) => operator.id));
  const visiblePreferredOperators = preferredOperators.filter((operator) =>
    availableOperatorIdSet.has(operator.id),
  );

  if (visiblePreferredOperators.length !== preferredOperators.length) {
    return buildImpossibleResult(
      requirements,
      maxPopulation,
      '当前已指定干员里存在不满足筛选条件的干员，请重新选择推荐阵容。',
    );
  }

  for (const requirement of requirements) {
    if (requirement.targetCount > maxPopulation) {
      return buildImpossibleResult(
        requirements,
        maxPopulation,
        `${requirement.name} 需要 ${requirement.targetCount} 人，已超过当前最大人口 ${maxPopulation}。`,
      );
    }
  }

  const preferredMatchedCounts = buildMatchedCounts(visiblePreferredOperators, requirements);

  for (const requirement of requirements) {
    const matchedCount = preferredMatchedCounts[requirement.id] ?? 0;

    if (
      EXACT_REQUIREMENT_IDS.has(requirement.id) &&
      matchedCount > requirement.targetCount
    ) {
      return buildImpossibleResult(
        requirements,
        maxPopulation,
        `${requirement.name} 当前已指定 ${matchedCount} 人，超过当前阶段要求 ${requirement.targetCount} 人。`,
      );
    }
  }

  const remainingRequirements = requirements
    .map((requirement) => {
      const matchedCount = preferredMatchedCounts[requirement.id] ?? 0;
      const remainingTargetCount = Math.max(requirement.targetCount - matchedCount, 0);

      if (remainingTargetCount === 0) {
        return null;
      }

      return {
        ...requirement,
        targetCount: remainingTargetCount,
      };
    })
    .filter((requirement): requirement is CovenantRequirement => requirement !== null);
  const remainingPopulation = maxPopulation - visiblePreferredOperators.length;

  if (remainingPopulation < 0) {
    return buildImpossibleResult(
      requirements,
      maxPopulation,
      `已指定 ${visiblePreferredOperators.length} 名干员，已超过当前最大人口 ${maxPopulation}。`,
    );
  }

  if (remainingRequirements.length === 0) {
    const operators = [...visiblePreferredOperators].sort((left, right) =>
      compareOperatorsForRecommendation(left, right, requirementIds),
    );

    return {
      operators,
      requirements,
      matchedCounts: buildMatchedCounts(operators, requirements),
      maxPopulation,
      emptySlotCount: Math.max(maxPopulation - operators.length, 0),
      reason: null,
    };
  }

  const candidateOperators = availableOperators
    .filter((operator) => !visiblePreferredOperators.some((item) => item.id === operator.id))
    .filter((operator) =>
      operator.covenants.some((covenantId) =>
        remainingRequirements.some((requirement) => requirement.id === covenantId),
      ),
    )
    .sort((left, right) =>
      compareOperatorsForRecommendation(left, right, requirementIds),
    );

  for (const requirement of remainingRequirements) {
    const candidateCount = candidateOperators.filter((operator) =>
      operator.covenants.includes(requirement.id),
    ).length;

    const requiredCount = requirement.targetCount;

    if (candidateCount < requiredCount) {
      const totalAvailableCount =
        candidateCount + (preferredMatchedCounts[requirement.id] ?? 0);

      return buildImpossibleResult(
        requirements,
        maxPopulation,
        `${requirement.name} 当前可用干员不足 ${totalAvailableCount}/${requirements.find((item) => item.id === requirement.id)?.targetCount ?? requiredCount} 人，无法满足解锁条件。`,
      );
    }
  }

  const targetCounts = remainingRequirements.map((requirement) => requirement.targetCount);
  const targetKey = buildLineupStateKey(targetCounts);
  let states = new Map<string, LineupState>([
    [
      buildLineupStateKey(targetCounts.map(() => 0)),
      {
        counts: targetCounts.map(() => 0),
        operators: [],
        matchedSelectedCovenantCount: 0,
        priorityScore: 0,
        tierScore: 0,
      },
    ],
  ]);

  for (const operator of candidateOperators) {
    const nextStates = new Map(states);

    for (const state of states.values()) {
      if (state.operators.length >= maxPopulation) {
        continue;
      }

      const nextCounts = [...state.counts];
      let shouldSkip = false;

      remainingRequirements.forEach((requirement, index) => {
        if (!operator.covenants.includes(requirement.id)) {
          return;
        }

        const nextCount = (nextCounts[index] ?? 0) + 1;

        if (
          EXACT_REQUIREMENT_IDS.has(requirement.id) &&
          nextCount > requirement.targetCount
        ) {
          shouldSkip = true;
          return;
        }

        nextCounts[index] = Math.min(nextCount, requirement.targetCount);
      });

      if (shouldSkip) {
        continue;
      }

      const nextState: LineupState = {
        counts: nextCounts,
        operators: [...state.operators, operator],
        matchedSelectedCovenantCount:
          state.matchedSelectedCovenantCount +
          getMatchedRequirementCount(operator, requirementIds),
        priorityScore: state.priorityScore + (6 - operator.priorityWeight),
        tierScore: state.tierScore + operator.tier,
      };
      const nextKey = buildLineupStateKey(nextCounts);
      const currentBestState = nextStates.get(nextKey);

      if (!currentBestState || isLineupStateBetter(nextState, currentBestState)) {
        nextStates.set(nextKey, nextState);
      }
    }

    states = nextStates;
  }

  const bestState = states.get(targetKey);

  if (!bestState) {
    return buildImpossibleResult(
      requirements,
      maxPopulation,
      '当前最大人口、等级限制、已删干员和已指定干员条件下，无法同时满足已选盟约阶段。',
    );
  }

  const operators = [...visiblePreferredOperators, ...bestState.operators].sort((left, right) =>
    compareOperatorsForRecommendation(left, right, requirementIds),
  );

  return {
    operators,
    requirements,
    matchedCounts: buildMatchedCounts(operators, requirements),
    maxPopulation,
    emptySlotCount: Math.max(maxPopulation - operators.length, 0),
    reason: null,
  };
}

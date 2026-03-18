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

export function buildRecommendedLineup(
  availableOperators: OperatorEntity[],
  requirements: CovenantRequirement[],
  maxPopulation: 8 | 9,
): RecommendedLineupResult {
  if (requirements.length === 0) {
    return {
      operators: [],
      requirements,
      matchedCounts: {},
      maxPopulation,
      emptySlotCount: maxPopulation,
      reason: null,
    };
  }

  const requirementIds = new Set(requirements.map((requirement) => requirement.id));

  for (const requirement of requirements) {
    if (requirement.targetCount > maxPopulation) {
      return buildImpossibleResult(
        requirements,
        maxPopulation,
        `${requirement.name} 需要 ${requirement.targetCount} 人，已超过当前最大人口 ${maxPopulation}。`,
      );
    }
  }

  const candidateOperators = availableOperators
    .filter((operator) =>
      operator.covenants.some((covenantId) => requirementIds.has(covenantId)),
    )
    .sort((left, right) =>
      compareOperatorsForRecommendation(left, right, requirementIds),
    );

  for (const requirement of requirements) {
    const candidateCount = candidateOperators.filter((operator) =>
      operator.covenants.includes(requirement.id),
    ).length;

    if (candidateCount < requirement.targetCount) {
      return buildImpossibleResult(
        requirements,
        maxPopulation,
        `${requirement.name} 当前可用干员不足 ${requirement.targetCount} 人，无法满足解锁条件。`,
      );
    }
  }

  const targetCounts = requirements.map((requirement) => requirement.targetCount);
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

      requirements.forEach((requirement, index) => {
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
      '当前最大人口、等级限制和已删干员条件下，无法同时满足已选盟约阶段。',
    );
  }

  const operators = [...bestState.operators].sort((left, right) =>
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

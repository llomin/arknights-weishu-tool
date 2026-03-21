import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  covenantMap,
  primaryCovenants,
  secondaryCovenants,
} from '@/entities/covenant/model/normalizeCovenants';
import { buildRecommendedLineup } from '@/entities/operator/model/buildRecommendedLineup';
import { operators } from '@/entities/operator/model/normalizeOperators';
import { filterOperators } from '@/entities/operator/model/queryOperators';
import { useStrategyStore } from '@/features/strategy/model/useStrategyStore';
import { StrategyBoardPage } from '@/pages/strategy-board/StrategyBoardPage';
import styles from '@/pages/strategy-board/StrategyBoardPage.module.css';
import type { OperatorEntity, StrategyState } from '@/shared/types/domain';

const highPriorityBuckets = new Set(['持续叠加', '单次叠加', '特异化']);
const defaultMaxPopulation: StrategyState['maxPopulation'] = 9;

function resetStrategyStore() {
  window.localStorage.clear();
  useStrategyStore.setState({
    selectedCovenantIds: [],
    selectedCovenantTargetMap: {},
    maxPopulation: 8,
    currentLevel: null,
    searchKeyword: '',
    pickedOperatorIds: [],
    removedOperatorIds: [],
    favoriteOperatorIds: [],
    covenantPresets: [],
  });
}

function buildSelectedCovenantTargetMap(
  selectedCovenantIds: string[],
  maxPopulation: StrategyState['maxPopulation'] = defaultMaxPopulation,
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

function buildSelectedRequirements(
  selectedCovenantIds: string[],
  selectedCovenantTargetMap: Record<string, number>,
) {
  return selectedCovenantIds.map((covenantId) => {
    const covenant = covenantMap[covenantId];
    const targetCount = selectedCovenantTargetMap[covenantId];

    if (!covenant || targetCount === undefined) {
      throw new Error(`盟约 ${covenantId} 的推荐阵容参数不完整`);
    }

    return {
      id: covenantId,
      name: covenant.name,
      targetCount,
    };
  });
}

function applyStrategyScenario(
  selectedCovenantIds: string[],
  maxPopulation: StrategyState['maxPopulation'] = defaultMaxPopulation,
) {
  const selectedCovenantTargetMap = buildSelectedCovenantTargetMap(
    selectedCovenantIds,
    maxPopulation,
  );

  useStrategyStore.setState({
    selectedCovenantIds,
    selectedCovenantTargetMap,
    maxPopulation,
    currentLevel: null,
    searchKeyword: '',
    pickedOperatorIds: [],
    removedOperatorIds: [],
  });

  return {
    selectedCovenantIds,
    selectedCovenantTargetMap,
    maxPopulation,
  };
}

function setupMultiHitPriorityScenario() {
  const operator = operators.find(
    (item) =>
      item.covenants.length >= 2 && highPriorityBuckets.has(item.priorityBucket),
  );

  if (!operator) {
    throw new Error('未找到可用于多盟约优先抓牌测试的干员');
  }

  const selectedCovenantIds = operator.covenants.slice(0, 2);
  const scenario = applyStrategyScenario(selectedCovenantIds);

  return {
    ...scenario,
    operator,
    currentGroupId: selectedCovenantIds[0]!,
    extraSelectedCovenantIds: selectedCovenantIds.slice(1),
  };
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

function setupRecommendationHighlightScenario() {
  for (const operator of operators) {
    if (operator.covenants.length < 2) {
      continue;
    }

    for (const selectedCovenantIds of buildSelectionCandidates(operator.covenants)) {
      if (selectedCovenantIds.length >= operator.covenants.length) {
        continue;
      }

      const selectedCovenantTargetMap = buildSelectedCovenantTargetMap(
        selectedCovenantIds,
      );
      const visibleOperators = filterOperators(
        operators,
        selectedCovenantIds,
        '',
        [],
        null,
      );
      const recommendedLineup = buildRecommendedLineup(
        visibleOperators,
        buildSelectedRequirements(selectedCovenantIds, selectedCovenantTargetMap),
        defaultMaxPopulation,
      );

      if (recommendedLineup.reason) {
        continue;
      }

      const recommendedOperator = recommendedLineup.operators.find(
        (item) => item.id === operator.id,
      );

      if (!recommendedOperator) {
        continue;
      }

      const unselectedCovenantIds = operator.covenants.filter(
        (covenantId) => !selectedCovenantIds.includes(covenantId),
      );

      if (unselectedCovenantIds.length === 0) {
        continue;
      }

      const scenario = applyStrategyScenario(selectedCovenantIds);

      return {
        ...scenario,
        operator,
        highlightedCovenantIds: selectedCovenantIds,
        plainCovenantIds: unselectedCovenantIds,
      };
    }
  }

  throw new Error('未找到可用于推荐阵容高亮测试的干员场景');
}

function getOperatorCardByName(container: HTMLElement, operatorName: string) {
  const operatorNameNode = within(container).getAllByText(operatorName)[0];
  const operatorCard = operatorNameNode?.closest('article');

  if (!operatorCard) {
    throw new Error(`未找到干员 ${operatorName} 的卡片`);
  }

  return operatorCard;
}

function getMatchedSelectedCovenantsForTest(
  operator: OperatorEntity,
  selectedCovenantIds: string[],
) {
  return operator.covenants.filter((covenantId) =>
    selectedCovenantIds.includes(covenantId),
  );
}

function compareCurrentRecommendedOperators(
  left: OperatorEntity,
  right: OperatorEntity,
) {
  return (
    right.tier - left.tier ||
    left.priorityWeight - right.priorityWeight ||
    left.name.localeCompare(right.name, 'zh-Hans-CN')
  );
}

function compareDisplayedRecommendedOperators(
  left: OperatorEntity,
  right: OperatorEntity,
  selectedCovenantIds: string[],
  selectedPrimaryCovenantIdSet: Set<string>,
) {
  const leftHasMatchedPrimarySelectedCovenant = left.covenants.some((covenantId) =>
    selectedPrimaryCovenantIdSet.has(covenantId),
  );
  const rightHasMatchedPrimarySelectedCovenant = right.covenants.some((covenantId) =>
    selectedPrimaryCovenantIdSet.has(covenantId),
  );
  const leftMatchedSelectedCovenantCount = getMatchedSelectedCovenantsForTest(
    left,
    selectedCovenantIds,
  ).length;
  const rightMatchedSelectedCovenantCount = getMatchedSelectedCovenantsForTest(
    right,
    selectedCovenantIds,
  ).length;
  const leftIsMultiHit = leftMatchedSelectedCovenantCount >= 2;
  const rightIsMultiHit = rightMatchedSelectedCovenantCount >= 2;

  return (
    Number(rightHasMatchedPrimarySelectedCovenant) -
      Number(leftHasMatchedPrimarySelectedCovenant) ||
    Number(rightIsMultiHit) - Number(leftIsMultiHit) ||
    compareCurrentRecommendedOperators(left, right)
  );
}

function buildRecommendationScenario(selectedCovenantIds: string[]) {
  const selectedCovenantTargetMap = buildSelectedCovenantTargetMap(
    selectedCovenantIds,
  );
  const visibleOperators = filterOperators(operators, selectedCovenantIds, '', [], null);
  const recommendedLineup = buildRecommendedLineup(
    visibleOperators,
    buildSelectedRequirements(selectedCovenantIds, selectedCovenantTargetMap),
    defaultMaxPopulation,
  );

  if (recommendedLineup.reason) {
    return null;
  }

  return {
    selectedCovenantIds,
    selectedPrimaryCovenantIds: selectedCovenantIds.filter(
      (covenantId) => covenantMap[covenantId]?.isPrimary === true,
    ),
    operators: recommendedLineup.operators,
  };
}

function buildRecommendationSelectionCandidates() {
  const allCovenantIds = [...primaryCovenants, ...secondaryCovenants].map(
    (covenant) => covenant.id,
  );

  return buildSelectionCandidates(allCovenantIds).filter(
    (selectedCovenantIds) =>
      selectedCovenantIds.length === 2 &&
      selectedCovenantIds.some((covenantId) => covenantMap[covenantId]?.isPrimary),
  );
}

function findRecommendationPrimaryPriorityScenario() {
  for (const selectedCovenantIds of buildRecommendationSelectionCandidates()) {
    const scenario = buildRecommendationScenario(selectedCovenantIds);

    if (!scenario || scenario.selectedPrimaryCovenantIds.length === 0) {
      continue;
    }

    const selectedPrimaryCovenantIdSet = new Set(scenario.selectedPrimaryCovenantIds);

    for (const operator of scenario.operators) {
      for (const comparedOperator of scenario.operators) {
        if (operator.id === comparedOperator.id) {
          continue;
        }

        const operatorHasMatchedPrimarySelectedCovenant = operator.covenants.some(
          (covenantId) => selectedPrimaryCovenantIdSet.has(covenantId),
        );
        const comparedOperatorHasMatchedPrimarySelectedCovenant =
          comparedOperator.covenants.some((covenantId) =>
            selectedPrimaryCovenantIdSet.has(covenantId),
          );

        if (
          !operatorHasMatchedPrimarySelectedCovenant ||
          comparedOperatorHasMatchedPrimarySelectedCovenant
        ) {
          continue;
        }

        if (compareCurrentRecommendedOperators(operator, comparedOperator) > 0) {
          return {
            ...scenario,
            primaryOperator: operator,
            nonPrimaryOperator: comparedOperator,
          };
        }
      }
    }
  }

  throw new Error('未找到可用于推荐阵容主要盟约排序测试的场景');
}

function findRecommendationMultiHitPriorityScenario() {
  for (const selectedCovenantIds of buildRecommendationSelectionCandidates()) {
    const scenario = buildRecommendationScenario(selectedCovenantIds);

    if (!scenario) {
      continue;
    }

    const selectedPrimaryCovenantIdSet = new Set(scenario.selectedPrimaryCovenantIds);

    for (const operator of scenario.operators) {
      for (const comparedOperator of scenario.operators) {
        if (operator.id === comparedOperator.id) {
          continue;
        }

        const operatorHasMatchedPrimarySelectedCovenant = operator.covenants.some(
          (covenantId) => selectedPrimaryCovenantIdSet.has(covenantId),
        );
        const comparedOperatorHasMatchedPrimarySelectedCovenant =
          comparedOperator.covenants.some((covenantId) =>
            selectedPrimaryCovenantIdSet.has(covenantId),
          );
        const operatorMatchedSelectedCovenantCount = getMatchedSelectedCovenantsForTest(
          operator,
          selectedCovenantIds,
        ).length;
        const comparedOperatorMatchedSelectedCovenantCount =
          getMatchedSelectedCovenantsForTest(comparedOperator, selectedCovenantIds).length;

        if (
          operatorHasMatchedPrimarySelectedCovenant !==
            comparedOperatorHasMatchedPrimarySelectedCovenant ||
          operatorMatchedSelectedCovenantCount < 2 ||
          comparedOperatorMatchedSelectedCovenantCount >= 2
        ) {
          continue;
        }

        if (compareCurrentRecommendedOperators(operator, comparedOperator) > 0) {
          return {
            ...scenario,
            multiHitOperator: operator,
            singleHitOperator: comparedOperator,
          };
        }
      }
    }
  }

  throw new Error('未找到可用于推荐阵容多盟约排序测试的场景');
}

describe('StrategyBoardPage', () => {
  beforeEach(() => {
    resetStrategyStore();
  });

  afterEach(() => {
    cleanup();
    resetStrategyStore();
  });

  it('在普通盟约分组中只显示额外命中的已选盟约', () => {
    const { operator, currentGroupId, extraSelectedCovenantIds } =
      setupMultiHitPriorityScenario();

    render(createElement(StrategyBoardPage));

    expect(
      screen.queryByRole('heading', { name: '多盟约命中' }),
    ).not.toBeInTheDocument();

    const prioritySectionTitle = screen.getByRole('heading', { name: '优先抓牌' });
    const prioritySection = prioritySectionTitle.closest('section');

    expect(prioritySection).not.toBeNull();

    const currentGroupName = covenantMap[currentGroupId]?.name ?? currentGroupId;
    const currentGroupTitle = within(prioritySection!).getByRole('heading', {
      name: currentGroupName,
    });
    const currentGroup = currentGroupTitle.closest('article');

    expect(currentGroup).not.toBeNull();

    const operatorCard = getOperatorCardByName(currentGroup!, operator.name);

    expect(within(operatorCard).queryByText(currentGroupId)).not.toBeInTheDocument();
    expect(within(operatorCard).queryByText('多盟约命中')).not.toBeInTheDocument();

    for (const covenantId of extraSelectedCovenantIds) {
      expect(within(operatorCard).getByText(covenantId)).toBeInTheDocument();
    }
  });

  it('在推荐阵容中显示全部盟约，并只高亮已选盟约', () => {
    const { operator, highlightedCovenantIds, plainCovenantIds } =
      setupRecommendationHighlightScenario();
    const highlightedChipClassName = styles.matchedCovenantChipHighlighted;

    if (!highlightedChipClassName) {
      throw new Error('推荐阵容高亮样式类缺失');
    }

    render(createElement(StrategyBoardPage));

    const recommendationTitle = screen.getByRole('heading', { name: '推荐阵容' });
    const recommendationSection = recommendationTitle.closest('section');

    expect(recommendationSection).not.toBeNull();

    const operatorCard = getOperatorCardByName(recommendationSection!, operator.name);

    for (const covenantId of highlightedCovenantIds) {
      expect(within(operatorCard).getByText(covenantId)).toHaveClass(
        highlightedChipClassName,
      );
    }

    for (const covenantId of plainCovenantIds) {
      expect(within(operatorCard).getByText(covenantId)).toBeInTheDocument();
      expect(within(operatorCard).getByText(covenantId)).not.toHaveClass(
        highlightedChipClassName,
      );
    }
  });

  it('优先抓牌里主要盟约排在次要盟约前面，并保留各自原有顺序', () => {
    const selectablePrimaryIds = operators
      .flatMap((operator) => operator.covenants)
      .filter((covenantId, index, source) => {
        if (source.indexOf(covenantId) !== index) {
          return false;
        }

        return covenantMap[covenantId]?.isPrimary === true;
      });
    const selectableSecondaryIds = operators
      .flatMap((operator) => operator.covenants)
      .filter((covenantId, index, source) => {
        if (source.indexOf(covenantId) !== index) {
          return false;
        }

        return covenantMap[covenantId]?.isPrimary === false;
      });

    const firstPrimaryId = selectablePrimaryIds[0];
    const secondPrimaryId = selectablePrimaryIds[1];
    const firstSecondaryId = selectableSecondaryIds[0];
    const secondSecondaryId = selectableSecondaryIds[1];

    if (
      !firstPrimaryId ||
      !secondPrimaryId ||
      !firstSecondaryId ||
      !secondSecondaryId
    ) {
      throw new Error('缺少用于验证优先抓牌分组顺序的盟约数据');
    }

    applyStrategyScenario([
      firstSecondaryId,
      secondPrimaryId,
      firstPrimaryId,
      secondSecondaryId,
    ]);

    render(createElement(StrategyBoardPage));

    const prioritySectionTitle = screen.getByRole('heading', { name: '优先抓牌' });
    const prioritySection = prioritySectionTitle.closest('section');

    expect(prioritySection).not.toBeNull();

    const clusterTitles = within(prioritySection!)
      .getAllByRole('heading', { level: 3 })
      .map((element) => element.textContent)
      .filter((value): value is string => Boolean(value));

    expect(clusterTitles).toEqual([
      covenantMap[secondPrimaryId]?.name ?? secondPrimaryId,
      covenantMap[firstPrimaryId]?.name ?? firstPrimaryId,
      covenantMap[firstSecondaryId]?.name ?? firstSecondaryId,
      covenantMap[secondSecondaryId]?.name ?? secondSecondaryId,
    ]);
  });

  it('推荐阵容里命中已选主要盟约的干员会排在更高阶的非主要盟约干员前面', () => {
    const { selectedCovenantIds, primaryOperator, nonPrimaryOperator } =
      findRecommendationPrimaryPriorityScenario();

    applyStrategyScenario(selectedCovenantIds);
    render(createElement(StrategyBoardPage));

    const recommendationTitle = screen.getByRole('heading', { name: '推荐阵容' });
    const recommendationSection = recommendationTitle.closest('section');

    expect(recommendationSection).not.toBeNull();

    const primaryOperatorCard = getOperatorCardByName(
      recommendationSection!,
      primaryOperator.name,
    );
    const nonPrimaryOperatorCard = getOperatorCardByName(
      recommendationSection!,
      nonPrimaryOperator.name,
    );

    const renderedCards = Array.from(
      recommendationSection!.querySelectorAll('article'),
    );

    expect(renderedCards.indexOf(primaryOperatorCard)).toBeGreaterThanOrEqual(0);
    expect(renderedCards.indexOf(nonPrimaryOperatorCard)).toBeGreaterThanOrEqual(0);
    expect(renderedCards.indexOf(primaryOperatorCard)).toBeLessThan(
      renderedCards.indexOf(nonPrimaryOperatorCard),
    );
  });

  it('推荐阵容里多盟约命中的干员会排在同档主要性下更高阶的单盟约干员前面', () => {
    const { selectedCovenantIds, multiHitOperator, singleHitOperator } =
      findRecommendationMultiHitPriorityScenario();

    applyStrategyScenario(selectedCovenantIds);
    render(createElement(StrategyBoardPage));

    const recommendationTitle = screen.getByRole('heading', { name: '推荐阵容' });
    const recommendationSection = recommendationTitle.closest('section');

    expect(recommendationSection).not.toBeNull();

    const multiHitOperatorCard = getOperatorCardByName(
      recommendationSection!,
      multiHitOperator.name,
    );
    const singleHitOperatorCard = getOperatorCardByName(
      recommendationSection!,
      singleHitOperator.name,
    );

    const renderedCards = Array.from(
      recommendationSection!.querySelectorAll('article'),
    );

    expect(renderedCards.indexOf(multiHitOperatorCard)).toBeGreaterThanOrEqual(0);
    expect(renderedCards.indexOf(singleHitOperatorCard)).toBeGreaterThanOrEqual(0);
    expect(renderedCards.indexOf(multiHitOperatorCard)).toBeLessThan(
      renderedCards.indexOf(singleHitOperatorCard),
    );
  });

  it('推荐阵容里命中已选主要盟约的干员会在卡片外层带透黄底片效果', () => {
    const { selectedCovenantIds, primaryOperator, nonPrimaryOperator } =
      findRecommendationPrimaryPriorityScenario();
    const primaryCardClassName = styles.recommendationPrimaryOperatorCard;
    const operatorCardClassName = styles.operatorCard;

    if (!primaryCardClassName || !operatorCardClassName) {
      throw new Error('推荐阵容主要盟约底片结构样式类缺失');
    }

    applyStrategyScenario(selectedCovenantIds);
    render(createElement(StrategyBoardPage));

    const recommendationTitle = screen.getByRole('heading', { name: '推荐阵容' });
    const recommendationSection = recommendationTitle.closest('section');

    expect(recommendationSection).not.toBeNull();

    const primaryOperatorCard = getOperatorCardByName(
      recommendationSection!,
      primaryOperator.name,
    );
    const nonPrimaryOperatorCard = getOperatorCardByName(
      recommendationSection!,
      nonPrimaryOperator.name,
    );

    expect(primaryOperatorCard).toHaveClass(operatorCardClassName);
    expect(primaryOperatorCard).not.toHaveClass(primaryCardClassName);
    expect(primaryOperatorCard.parentElement).not.toBeNull();
    expect(primaryOperatorCard.parentElement).toHaveClass(primaryCardClassName);

    expect(nonPrimaryOperatorCard).toHaveClass(operatorCardClassName);
    expect(nonPrimaryOperatorCard).not.toHaveClass(primaryCardClassName);
    expect(nonPrimaryOperatorCard.parentElement).not.toHaveClass(primaryCardClassName);
  });

  it('保存预设组合后可以恢复主次盟约筛选并支持修改、重命名和删除', () => {
    const primaryCovenant =
      primaryCovenants.find((item) => item.id === '炎') ?? primaryCovenants[0];
    const secondaryCovenant =
      secondaryCovenants.find((item) => item.id === '突袭') ?? secondaryCovenants[0];

    if (!primaryCovenant || !secondaryCovenant) {
      throw new Error('缺少用于预设组合测试的盟约数据');
    }

    const primaryStage = primaryCovenant.activationStages[1] ?? primaryCovenant.activationStages[0];
    const secondaryStage =
      secondaryCovenant.activationStages[0] ?? secondaryCovenant.activationCount;
    const promptSpy = vi
      .spyOn(window, 'prompt')
      .mockReturnValueOnce('炎突组合')
      .mockReturnValueOnce('炎突改名');

    useStrategyStore.setState({
      selectedCovenantIds: [primaryCovenant.id, secondaryCovenant.id],
      selectedCovenantTargetMap: {
        [primaryCovenant.id]: primaryStage!,
        [secondaryCovenant.id]: secondaryStage,
      },
      maxPopulation: 9,
      currentLevel: null,
      searchKeyword: '',
      pickedOperatorIds: [],
      removedOperatorIds: [],
      covenantPresets: [],
    });

    render(createElement(StrategyBoardPage));

    const saveButton = screen.getByRole('button', { name: '保存当前组合' });
    const presetSaveButtonClassName = styles.presetSaveButton;
    const presetSaveButtonActiveClassName = styles.presetSaveButtonActive;

    if (!presetSaveButtonClassName || !presetSaveButtonActiveClassName) {
      throw new Error('预设组合保存按钮样式类缺失');
    }

    expect(saveButton).toHaveClass(presetSaveButtonClassName);
    expect(saveButton).toHaveClass(presetSaveButtonActiveClassName);

    fireEvent.click(saveButton);

    expect(promptSpy).toHaveBeenCalledWith(
      '请输入组合名称',
      `${primaryCovenant.name}${primaryStage}-${secondaryCovenant.name}${secondaryStage}`,
    );
    expect(useStrategyStore.getState().covenantPresets).toHaveLength(1);

    const presetButton = screen.getByRole('button', { name: '炎突组合' });
    const presetMenuButton = screen.getByRole('button', {
      name: '预设组合操作 炎突组合',
    });

    expect(presetButton).toHaveAttribute(
      'title',
      expect.stringContaining(`${primaryCovenant.name} ${primaryStage}人`),
    );
    expect(presetButton).toHaveAttribute(
      'title',
      expect.stringContaining(`${secondaryCovenant.name} ${secondaryStage}人`),
    );

    fireEvent.click(screen.getByRole('button', { name: '重置筛选' }));

    expect(useStrategyStore.getState().selectedCovenantIds).toEqual([]);

    fireEvent.click(presetButton);

    expect(saveButton).toBeDisabled();
    expect(useStrategyStore.getState().selectedCovenantIds).toEqual([
      primaryCovenant.id,
      secondaryCovenant.id,
    ]);
    expect(useStrategyStore.getState().selectedCovenantTargetMap).toEqual({
      [primaryCovenant.id]: primaryStage,
      [secondaryCovenant.id]: secondaryStage,
    });

    fireEvent.click(
      screen.getByRole('button', { name: `${primaryCovenant.name} ${primaryStage}人` }),
    );

    expect(useStrategyStore.getState().selectedCovenantTargetMap).toEqual({
      [primaryCovenant.id]: primaryStage,
      [secondaryCovenant.id]: secondaryStage,
    });

    fireEvent.click(presetButton);

    expect(saveButton).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '预设组合操作 炎突组合' }));
    fireEvent.click(screen.getByRole('button', { name: '修改预设组合 炎突组合' }));

    expect(saveButton).toHaveTextContent('应用修改');
    expect(saveButton).toHaveTextContent('✓');

    fireEvent.click(screen.getByRole('button', { name: '9 人' }));
    fireEvent.click(
      screen.getByRole('button', { name: `${primaryCovenant.name} ${primaryStage}人` }),
    );
    fireEvent.click(saveButton);

    expect(useStrategyStore.getState().covenantPresets[0]?.name).toBe('炎突组合');
    expect(useStrategyStore.getState().covenantPresets[0]?.selectedCovenantTargetMap).toEqual({
      [primaryCovenant.id]: primaryCovenant.activationStages[2] ?? primaryCovenant.activationStages[1] ?? primaryStage,
      [secondaryCovenant.id]: secondaryStage,
    });

    fireEvent.click(presetMenuButton);
    fireEvent.click(screen.getByRole('button', { name: '重命名预设组合 炎突组合' }));

    expect(promptSpy).toHaveBeenCalledWith('请输入新的组合名称', '炎突组合');
    expect(promptSpy).toHaveBeenCalledTimes(2);
    expect(useStrategyStore.getState().covenantPresets[0]?.name).toBe('炎突改名');
    expect(
      screen.queryByRole('button', { name: '炎突组合' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '预设组合操作 炎突改名' }));
    fireEvent.click(screen.getByRole('button', { name: '删除预设组合 炎突改名' }));

    expect(useStrategyStore.getState().covenantPresets).toEqual([]);
    expect(
      screen.queryByRole('button', { name: '炎突改名' }),
    ).not.toBeInTheDocument();

    promptSpy.mockRestore();
  });
});

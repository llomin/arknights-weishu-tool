import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  primaryCovenants,
  secondaryCovenants,
} from '@/entities/covenant/model/normalizeCovenants';
import { operators } from '@/entities/operator/model/normalizeOperators';
import type { RecommendedLineupResult } from '@/entities/operator/model/buildRecommendedLineup';
import { StrategyBoardFilters } from '@/pages/strategy-board/ui/StrategyBoardFilters';
import { StrategyBoardGroupSection } from '@/pages/strategy-board/ui/StrategyBoardGroupSection';
import { StrategyBoardHeader } from '@/pages/strategy-board/ui/StrategyBoardHeader';
import { StrategyBoardRecommendationSection } from '@/pages/strategy-board/ui/StrategyBoardRecommendationSection';

function createEmptyRecommendedLineup(): RecommendedLineupResult {
  return {
    operators: [],
    requirements: [],
    matchedCounts: {},
    maxPopulation: 8,
    emptySlotCount: 8,
    reason: null,
  };
}

describe('StrategyBoard sections', () => {
  it('calls the search callback when the header input changes', () => {
    const onSearchKeywordChange = vi.fn();

    render(
      createElement(StrategyBoardHeader, {
        searchKeyword: '',
        onSearchKeywordChange,
      }),
    );

    fireEvent.change(screen.getByLabelText('描述搜索'), {
      target: { value: '获得 层数' },
    });

    expect(onSearchKeywordChange).toHaveBeenCalledWith('获得 层数');
  });

  it('renders filter chips and triggers filter callbacks', () => {
    const primaryCovenant = primaryCovenants[0];
    const secondaryCovenant = secondaryCovenants[0];
    const onToggleCovenant = vi.fn();
    const onSetMaxPopulation = vi.fn();
    const onToggleCurrentLevel = vi.fn();
    const onReset = vi.fn();

    if (!primaryCovenant || !secondaryCovenant) {
      throw new Error('缺少用于筛选区测试的盟约数据');
    }

    render(
      createElement(StrategyBoardFilters, {
        currentLevel: 4,
        maxPopulation: 9,
        maxVisibleTier: 5,
        recommendedCovenantIdSet: new Set([primaryCovenant.id, secondaryCovenant.id]),
        selectedCovenantIds: [primaryCovenant.id],
        selectedCovenantTargetMap: {
          [primaryCovenant.id]: primaryCovenant.activationStages[0]!,
        },
        onSetMaxPopulation,
        onToggleCovenant,
        onToggleCurrentLevel,
        onReset,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: secondaryCovenant.name }));
    fireEvent.click(screen.getByRole('button', { name: '9 人' }));
    fireEvent.click(screen.getByRole('button', { name: '4 级' }));
    fireEvent.click(screen.getByRole('button', { name: '重置筛选' }));

    expect(onToggleCovenant).toHaveBeenCalledWith(
      secondaryCovenant.id,
      secondaryCovenant.activationStages.filter((stage) => stage <= 9),
    );
    expect(onSetMaxPopulation).toHaveBeenCalledWith(9);
    expect(onToggleCurrentLevel).toHaveBeenCalledWith(4);
    expect(onReset).toHaveBeenCalled();
  });

  it('renders the removed-operator panel and restore action in the recommendation section', () => {
    const removedOperator = operators[0];
    const onRestoreRemovedOperators = vi.fn();

    if (!removedOperator) {
      throw new Error('缺少用于推荐区测试的干员数据');
    }

    render(
      createElement(StrategyBoardRecommendationSection, {
        maxPopulation: 8,
        pickedOperatorIdSet: new Set<string>(),
        recommendedLineup: createEmptyRecommendedLineup(),
        recommendedOperators: [],
        removedOperators: [removedOperator],
        selectedCovenantCount: 0,
        selectedCovenantIdSet: new Set<string>(),
        selectedPrimaryCovenantIdSet: new Set<string>(),
        onRestoreRemovedOperators,
        onToggleOperator: vi.fn(),
        onToggleRemovedOperator: vi.fn(),
      }),
    );

    expect(screen.getByRole('heading', { name: '已删干员' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '全部恢复' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '全部恢复' }));

    expect(onRestoreRemovedOperators).toHaveBeenCalled();
  });

  it('renders the group section title, meta, and group content', () => {
    const operator = operators[0];

    if (!operator || operator.covenants.length === 0) {
      throw new Error('缺少用于分组区测试的干员数据');
    }

    const group = {
      covenantId: operator.covenants[0]!,
      covenantName: operator.covenants[0]!,
      activationCount: 3,
      operators: [operator],
    };

    render(
      createElement(StrategyBoardGroupSection, {
        title: '优先抓牌',
        hint: '先看核心特质',
        sectionVariant: 'primary',
        groups: [group],
        pickedOperatorIdSet: new Set<string>(),
        selectedCovenantIdSet: new Set(group.operators[0]!.covenants),
        selectedPrimaryCovenantIdSet: new Set<string>(),
        onToggleOperator: vi.fn(),
        onToggleRemovedOperator: vi.fn(),
      }),
    );

    const section = screen.getByRole('heading', { name: '优先抓牌' }).closest('section');

    if (!section) {
      throw new Error('未找到分组区节点');
    }

    expect(within(section).getByText('先看核心特质')).toBeInTheDocument();
    expect(within(section).getByText('1 个盟约簇')).toBeInTheDocument();
    expect(within(section).getByText(group.covenantName)).toBeInTheDocument();
    expect(within(section).getByText(`激活 ${group.activationCount} 人`)).toBeInTheDocument();
    expect(within(section).getByText(operator.name)).toBeInTheDocument();
  });
});

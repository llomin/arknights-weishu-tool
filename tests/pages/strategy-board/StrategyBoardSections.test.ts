import { createElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  primaryCovenants,
  secondaryCovenants,
} from '@/entities/covenant/model/normalizeCovenants';
import { operators } from '@/entities/operator/model/normalizeOperators';
import styles from '@/pages/strategy-board/StrategyBoardPage.module.css';
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
    const clickableCovenant = [...primaryCovenants, ...secondaryCovenants].find(
      (item) => item.id !== primaryCovenant?.id && item.id !== secondaryCovenant?.id,
    );
    const onToggleCovenant = vi.fn();
    const onSetMaxPopulation = vi.fn();
    const onToggleCurrentLevel = vi.fn();
    const onReset = vi.fn();
    const onSaveCovenantPreset = vi.fn();
    const onApplyCovenantPreset = vi.fn();
    const onDeleteCovenantPreset = vi.fn();
    const onRenameCovenantPreset = vi.fn();
    const onUpdateCovenantPreset = vi.fn();

    if (!primaryCovenant || !secondaryCovenant || !clickableCovenant) {
      throw new Error('缺少用于筛选区测试的盟约数据');
    }

    const primaryStage = primaryCovenant.activationStages[1] ?? primaryCovenant.activationStages[0];
    const secondaryStage =
      secondaryCovenant.activationStages[0] ?? secondaryCovenant.activationCount;
    const defaultPresetName = `${primaryCovenant.name}${primaryStage}-${secondaryCovenant.name}${secondaryStage}`;
    const promptSpy = vi
      .spyOn(window, 'prompt')
      .mockReturnValueOnce('常用组合')
      .mockReturnValueOnce('新版组合');

    render(
      createElement(StrategyBoardFilters, {
        covenantPresets: [
          {
            id: 'preset-1',
            name: '炎突组合',
            selectedCovenantIds: [primaryCovenant.id, secondaryCovenant.id],
            selectedCovenantTargetMap: {
              [primaryCovenant.id]: primaryStage!,
              [secondaryCovenant.id]: secondaryStage,
            },
          },
        ],
        currentLevel: 4,
        maxPopulation: 9,
        maxVisibleTier: 5,
        selectedCovenantIds: [primaryCovenant.id, secondaryCovenant.id],
        selectedCovenantTargetMap: {
          [primaryCovenant.id]: primaryStage!,
          [secondaryCovenant.id]: secondaryStage,
        },
        onSaveCovenantPreset,
        onApplyCovenantPreset,
        onDeleteCovenantPreset,
        onRenameCovenantPreset,
        onUpdateCovenantPreset,
        onSetMaxPopulation,
        onToggleCovenant,
        onToggleCurrentLevel,
        onReset,
      }),
    );

    const saveButton = screen.getByRole('button', { name: '保存当前组合' });
    const presetButton = screen.getByRole('button', { name: '炎突组合' });
    const presetMenuButton = screen.getByRole('button', { name: '预设组合操作 炎突组合' });
    const presetSaveButtonClassName = styles.presetSaveButton;
    const presetSaveButtonActiveClassName = styles.presetSaveButtonActive;
    const presetChipActiveClassName = styles.presetChipActive;
    const covenantChipLockedClassName = styles.covenantChipLocked;

    if (
      !presetSaveButtonClassName ||
      !presetSaveButtonActiveClassName ||
      !presetChipActiveClassName ||
      !covenantChipLockedClassName
    ) {
      throw new Error('预设组合样式类缺失');
    }

    expect(saveButton).toHaveClass(presetSaveButtonClassName);
    expect(saveButton).toHaveClass(presetSaveButtonActiveClassName);
    expect(saveButton).toHaveTextContent('+');
    expect(screen.getByRole('button', { name: clickableCovenant.name })).toBeInTheDocument();

    expect(presetButton).toHaveAttribute(
      'title',
      expect.stringContaining(`${primaryCovenant.name} ${primaryStage}人`),
    );
    expect(presetButton).toHaveAttribute(
      'title',
      expect.stringContaining(`${secondaryCovenant.name} ${secondaryStage}人`),
    );

    fireEvent.click(saveButton);
    fireEvent.click(presetButton);

    expect(onApplyCovenantPreset).toHaveBeenCalledWith('preset-1');
    expect(saveButton).toBeDisabled();
    expect(presetButton).toHaveClass(presetChipActiveClassName);
    expect(screen.getByRole('button', { name: '炎 6人' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '炎 6人' })).toHaveClass(
      covenantChipLockedClassName,
    );
    expect(screen.getByRole('button', { name: '精准 2人' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '精准 2人' })).toHaveClass(
      covenantChipLockedClassName,
    );

    fireEvent.click(screen.getByRole('button', { name: clickableCovenant.name }));

    fireEvent.click(presetButton);

    expect(saveButton).not.toBeDisabled();
    expect(presetButton).not.toHaveClass(presetChipActiveClassName);
    expect(screen.getByRole('button', { name: clickableCovenant.name })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: clickableCovenant.name })).not.toHaveClass(
      covenantChipLockedClassName,
    );

    expect(
      screen.queryByRole('button', { name: '修改预设组合 炎突组合' }),
    ).not.toBeInTheDocument();
    fireEvent.click(presetMenuButton);
    fireEvent.click(screen.getByRole('button', { name: '修改预设组合 炎突组合' }));

    expect(saveButton).toHaveTextContent('应用修改');
    expect(saveButton).toHaveTextContent('✓');

    fireEvent.click(saveButton);

    fireEvent.click(presetMenuButton);
    fireEvent.click(screen.getByRole('button', { name: '重命名预设组合 炎突组合' }));
    fireEvent.click(presetMenuButton);
    fireEvent.click(screen.getByRole('button', { name: '删除预设组合 炎突组合' }));
    fireEvent.click(screen.getByRole('button', { name: clickableCovenant.name }));
    fireEvent.click(screen.getByRole('button', { name: '9 人' }));
    fireEvent.click(screen.getByRole('button', { name: '4 级' }));
    fireEvent.click(screen.getByRole('button', { name: '重置筛选' }));

    expect(promptSpy).toHaveBeenCalledWith('请输入组合名称', defaultPresetName);
    expect(promptSpy).toHaveBeenCalledWith('请输入新的组合名称', '炎突组合');
    expect(onSaveCovenantPreset).toHaveBeenCalledWith('常用组合');
    expect(onApplyCovenantPreset).toHaveBeenCalledTimes(2);
    expect(onUpdateCovenantPreset).toHaveBeenCalledWith('preset-1');
    expect(onRenameCovenantPreset).toHaveBeenCalledWith('preset-1', '新版组合');
    expect(onDeleteCovenantPreset).toHaveBeenCalledWith('preset-1');
    expect(onToggleCovenant).toHaveBeenCalledWith(
      clickableCovenant.id,
      clickableCovenant.activationStages.filter((stage) => stage <= 9),
    );
    expect(onSetMaxPopulation).toHaveBeenCalledWith(9);
    expect(onToggleCurrentLevel).toHaveBeenCalledWith(4);
    expect(onReset).toHaveBeenCalled();

    promptSpy.mockRestore();
  });

  it('clears the active preset state when reset filters is clicked', () => {
    const primaryCovenant = primaryCovenants[0];
    const secondaryCovenant = secondaryCovenants[0];
    const onReset = vi.fn();

    if (!primaryCovenant || !secondaryCovenant) {
      throw new Error('缺少用于重置预设组合测试的盟约数据');
    }

    const primaryStage = primaryCovenant.activationStages[1] ?? primaryCovenant.activationStages[0];
    const secondaryStage =
      secondaryCovenant.activationStages[0] ?? secondaryCovenant.activationCount;
    const presetChipActiveClassName = styles.presetChipActive;
    const covenantChipLockedClassName = styles.covenantChipLocked;

    if (!presetChipActiveClassName || !covenantChipLockedClassName) {
      throw new Error('预设组合选中态或锁定态样式类缺失');
    }

    render(
      createElement(StrategyBoardFilters, {
        covenantPresets: [
          {
            id: 'preset-1',
            name: '炎突组合',
            selectedCovenantIds: [primaryCovenant.id, secondaryCovenant.id],
            selectedCovenantTargetMap: {
              [primaryCovenant.id]: primaryStage!,
              [secondaryCovenant.id]: secondaryStage,
            },
          },
        ],
        currentLevel: 4,
        maxPopulation: 9,
        maxVisibleTier: 5,
        selectedCovenantIds: [primaryCovenant.id, secondaryCovenant.id],
        selectedCovenantTargetMap: {
          [primaryCovenant.id]: primaryStage!,
          [secondaryCovenant.id]: secondaryStage,
        },
        onSaveCovenantPreset: vi.fn(),
        onApplyCovenantPreset: vi.fn(),
        onDeleteCovenantPreset: vi.fn(),
        onRenameCovenantPreset: vi.fn(),
        onUpdateCovenantPreset: vi.fn(),
        onSetMaxPopulation: vi.fn(),
        onToggleCovenant: vi.fn(),
        onToggleCurrentLevel: vi.fn(),
        onReset,
      }),
    );

    const saveButton = screen.getByRole('button', { name: '保存当前组合' });
    const presetButton = screen.getByRole('button', { name: '炎突组合' });
    const primaryChipButton = screen.getByRole('button', { name: '炎 6人' });
    const resetButton = screen.getByRole('button', { name: '重置筛选' });

    fireEvent.click(presetButton);

    expect(saveButton).toBeDisabled();
    expect(presetButton).toHaveClass(presetChipActiveClassName);
    expect(primaryChipButton).toBeDisabled();
    expect(primaryChipButton).toHaveClass(covenantChipLockedClassName);

    fireEvent.click(resetButton);

    expect(onReset).toHaveBeenCalled();
    expect(saveButton).not.toBeDisabled();
    expect(presetButton).not.toHaveClass(presetChipActiveClassName);
    expect(primaryChipButton).not.toBeDisabled();
    expect(primaryChipButton).not.toHaveClass(covenantChipLockedClassName);
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

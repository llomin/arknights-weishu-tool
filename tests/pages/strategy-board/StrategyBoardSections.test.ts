import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

function readStrategyBoardPageCss() {
  return readFileSync(
    resolve(process.cwd(), 'src/pages/strategy-board/StrategyBoardPage.module.css'),
    'utf8',
  );
}

describe('StrategyBoard sections', () => {
  it('uses an auto-fit mobile recommendation grid with bounded card width', () => {
    const css = readStrategyBoardPageCss();

    expect(css).toMatch(/--strategy-card-width:\s*178px;/);
    expect(css).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*--strategy-card-width:\s*178px;/,
    );
    expect(css).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*\.recommendationLineupGrid\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
    );
    expect(css).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*\.recommendationLineupGrid\s*\{[\s\S]*justify-items:\s*center;/,
    );
    expect(css).toMatch(
      /@media \(min-width: 590px\) and \(max-width: 720px\)\s*\{[\s\S]*\.recommendationLineupGrid\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*var\(--strategy-card-width\)\)\);/,
    );
  });

  it('uses a lighter active tone for the preset menu button', () => {
    const css = readStrategyBoardPageCss();

    expect(css).toMatch(
      /\.presetMenuButtonActive\s*\{[\s\S]*border-color:\s*rgba\(31,\s*127,\s*73,\s*0\.26\);[\s\S]*background:\s*linear-gradient\(180deg,\s*rgba\(236,\s*255,\s*243,\s*0\.98\)\s*0%,\s*rgba\(204,\s*243,\s*220,\s*0\.98\)\s*100%\);[\s\S]*color:\s*#2b6a49;/,
    );
    expect(css).toMatch(
      /\.presetMenuButtonActive:hover\s*\{[\s\S]*border-color:\s*rgba\(31,\s*127,\s*73,\s*0\.34\);[\s\S]*background:\s*linear-gradient\(180deg,\s*rgba\(242,\s*255,\s*247,\s*0\.98\)\s*0%,\s*rgba\(217,\s*248,\s*229,\s*0\.98\)\s*100%\);[\s\S]*color:\s*#23563b;/,
    );
  });

  it('collapses the preset menu button until the preset chip group is hovered, focused, open, or on devices without hover', () => {
    const css = readStrategyBoardPageCss();

    expect(css).toMatch(
      /\.presetMenuSlot\s*\{[\s\S]*width:\s*0;[\s\S]*overflow:\s*hidden;[\s\S]*pointer-events:\s*none;[\s\S]*transition:\s*width 180ms ease;/,
    );
    expect(css).toMatch(
      /\.presetChip\s*\{[\s\S]*border-right-color:\s*rgba\(88,\s*104,\s*134,\s*0\.14\);[\s\S]*transition:[\s\S]*border-right-color 180ms ease[\s\S]*border-radius 180ms ease;/,
    );
    expect(css).toMatch(
      /\.presetChipActive\s*\{[\s\S]*border-right-color:\s*rgba\(31,\s*127,\s*73,\s*0\.34\);/,
    );
    expect(css).toMatch(
      /\.presetChipGroup:hover \.presetChip,\s*\.presetChipGroup:has\(:focus-visible\) \.presetChip,\s*\.presetChipGroupMenuVisible \.presetChip\s*\{[\s\S]*border-right-color:\s*transparent;[\s\S]*border-radius:\s*10px 0 0 10px;/,
    );
    expect(css).toMatch(
      /\.presetChipGroup:hover \.presetMenuSlot,\s*\.presetChipGroup:has\(:focus-visible\) \.presetMenuSlot,\s*\.presetChipGroupMenuVisible \.presetMenuSlot\s*\{[\s\S]*width:\s*34px;[\s\S]*pointer-events:\s*auto;/,
    );
    expect(css).toMatch(
      /\.presetChipGroupMenuVisible \.presetMenuSlot\s*\{[\s\S]*overflow:\s*visible;/,
    );
    expect(css).toMatch(
      /\.presetChipGroup:hover \.presetMenuButton,\s*\.presetChipGroup:has\(:focus-visible\) \.presetMenuButton,\s*\.presetChipGroupMenuVisible \.presetMenuButton\s*\{[\s\S]*opacity:\s*1;[\s\S]*transform:\s*translateX\(0\);/,
    );
    expect(css).toMatch(
      /@media \(hover: none\)\s*\{[\s\S]*\.presetChip\s*\{[\s\S]*border-right-color:\s*transparent;[\s\S]*border-radius:\s*10px 0 0 10px;[\s\S]*}\s*[\s\S]*\.presetMenuSlot\s*\{[\s\S]*width:\s*34px;[\s\S]*pointer-events:\s*auto;[\s\S]*}\s*[\s\S]*\.presetMenuButton\s*\{[\s\S]*opacity:\s*1;[\s\S]*transform:\s*translateX\(0\);/,
    );
  });

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
    const onImportCovenantPresets = vi.fn();
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
        onImportCovenantPresets,
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
    const presetChipGroupMenuVisibleClassName = styles.presetChipGroupMenuVisible;
    const presetMenuButtonActiveClassName = styles.presetMenuButtonActive;
    const covenantChipLockedClassName = styles.covenantChipLocked;
    const presetChipGroup = presetButton.closest(`.${styles.presetChipGroup}`);

    if (
      !presetSaveButtonClassName ||
      !presetSaveButtonActiveClassName ||
      !presetChipActiveClassName ||
      !presetChipGroupMenuVisibleClassName ||
      !presetMenuButtonActiveClassName ||
      !covenantChipLockedClassName ||
      !(presetChipGroup instanceof HTMLElement)
    ) {
      throw new Error('预设组合样式类缺失');
    }

    expect(saveButton).toHaveClass(presetSaveButtonClassName);
    expect(saveButton).toHaveClass(presetSaveButtonActiveClassName);
    expect(saveButton).toHaveTextContent('+');
    expect(presetChipGroup).not.toHaveClass(presetChipGroupMenuVisibleClassName);
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
    expect(saveButton).not.toHaveClass(presetSaveButtonActiveClassName);
    expect(presetButton).toHaveClass(presetChipActiveClassName);
    expect(presetMenuButton).toHaveClass(presetMenuButtonActiveClassName);
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
    expect(presetMenuButton).not.toHaveClass(presetMenuButtonActiveClassName);
    expect(screen.getByRole('button', { name: clickableCovenant.name })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: clickableCovenant.name })).not.toHaveClass(
      covenantChipLockedClassName,
    );
    expect(presetChipGroup).not.toHaveClass(presetChipGroupMenuVisibleClassName);

    expect(
      screen.queryByRole('button', { name: '修改预设组合 炎突组合' }),
    ).not.toBeInTheDocument();
    fireEvent.click(presetMenuButton);
    expect(presetChipGroup).toHaveClass(presetChipGroupMenuVisibleClassName);
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

  it('renders preset import and export buttons before the preset hint text', () => {
    render(
      createElement(StrategyBoardFilters, {
        covenantPresets: [],
        currentLevel: 4,
        maxPopulation: 9,
        maxVisibleTier: 5,
        selectedCovenantIds: [],
        selectedCovenantTargetMap: {},
        onSaveCovenantPreset: vi.fn(),
        onApplyCovenantPreset: vi.fn(),
        onDeleteCovenantPreset: vi.fn(),
        onImportCovenantPresets: vi.fn(),
        onRenameCovenantPreset: vi.fn(),
        onUpdateCovenantPreset: vi.fn(),
        onSetMaxPopulation: vi.fn(),
        onToggleCovenant: vi.fn(),
        onToggleCurrentLevel: vi.fn(),
        onReset: vi.fn(),
      }),
    );

    const presetLabel = screen.getByText('预设组合');
    const presetLabelRow = presetLabel.closest(`.${styles.presetLabelRow}`);

    if (!(presetLabelRow instanceof HTMLElement)) {
      throw new Error('未找到预设组合标题行');
    }

    const importButton = within(presetLabelRow).getByRole('button', { name: '导入' });
    const exportButton = within(presetLabelRow).getByRole('button', { name: '导出全部预设组合' });
    const presetHint = within(presetLabelRow).getByText(
      '点击应用到下方主次盟约；悬浮可查看具体人数',
    );

    expect(
      importButton.compareDocumentPosition(presetHint) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      exportButton.compareDocumentPosition(presetHint) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders preset import and export buttons as link-style actions', () => {
    render(
      createElement(StrategyBoardFilters, {
        covenantPresets: [],
        currentLevel: 4,
        maxPopulation: 9,
        maxVisibleTier: 5,
        selectedCovenantIds: [],
        selectedCovenantTargetMap: {},
        onSaveCovenantPreset: vi.fn(),
        onApplyCovenantPreset: vi.fn(),
        onDeleteCovenantPreset: vi.fn(),
        onImportCovenantPresets: vi.fn(),
        onRenameCovenantPreset: vi.fn(),
        onUpdateCovenantPreset: vi.fn(),
        onSetMaxPopulation: vi.fn(),
        onToggleCovenant: vi.fn(),
        onToggleCurrentLevel: vi.fn(),
        onReset: vi.fn(),
      }),
    );

    const importButton = screen.getByRole('button', { name: '导入' });
    const exportButton = screen.getByRole('button', { name: '导出全部预设组合' });
    const filterLinkButtonClassName = styles.filterLinkButton;
    const ghostButtonClassName = styles.ghostButton;

    if (!filterLinkButtonClassName || !ghostButtonClassName) {
      throw new Error('导入导出 Link 按钮样式类缺失');
    }

    expect(importButton).toHaveClass(filterLinkButtonClassName);
    expect(exportButton).toHaveClass(filterLinkButtonClassName);
    expect(importButton).not.toHaveClass(ghostButtonClassName);
    expect(exportButton).not.toHaveClass(ghostButtonClassName);
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
        onImportCovenantPresets: vi.fn(),
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

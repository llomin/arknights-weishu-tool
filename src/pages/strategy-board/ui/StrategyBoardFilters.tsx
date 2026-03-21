import clsx from 'clsx';
import {
  primaryCovenants,
  secondaryCovenants,
} from '@/entities/covenant/model/normalizeCovenants';
import { selectableLevels, selectablePopulations } from '@/pages/strategy-board/model/strategyBoardDisplay';
import type { OperatorEntity, StrategyState } from '@/shared/types/domain';
import styles from '../StrategyBoardPage.module.css';

export interface StrategyBoardFiltersProps {
  currentLevel: StrategyState['currentLevel'];
  maxPopulation: StrategyState['maxPopulation'];
  maxVisibleTier: number | null;
  onReset: () => void;
  onSetMaxPopulation: (population: StrategyState['maxPopulation']) => void;
  onToggleCovenant: (covenantId: string, activationStages: number[]) => void;
  onToggleCurrentLevel: (level: OperatorEntity['tier']) => void;
  recommendedCovenantIdSet: Set<string>;
  selectedCovenantIds: string[];
  selectedCovenantTargetMap: StrategyState['selectedCovenantTargetMap'];
}

export function StrategyBoardFilters({
  currentLevel,
  maxPopulation,
  maxVisibleTier,
  onReset,
  onSetMaxPopulation,
  onToggleCovenant,
  onToggleCurrentLevel,
  recommendedCovenantIdSet,
  selectedCovenantIds,
  selectedCovenantTargetMap,
}: StrategyBoardFiltersProps) {
  function renderCovenantChip(
    covenantId: string,
    covenantName: string,
    covenantDescription: string,
    isPrimary: boolean,
    activationStages: number[],
  ) {
    const isSelected = selectedCovenantIds.includes(covenantId);
    const isRecommended = recommendedCovenantIdSet.has(covenantId);
    const selectableStages = activationStages.filter((stage) => stage <= maxPopulation);
    const currentTargetCount =
      selectedCovenantTargetMap[covenantId] ?? selectableStages[0];
    const title = `${covenantDescription}\n${
      isSelected
        ? `当前按 ${currentTargetCount} 人阶段计算，继续点击切换到下一阶段，最后一次点击取消。`
        : `点击后按 ${currentTargetCount} 人阶段计算。`
    }`;

    return (
      <button
        key={covenantId}
        type="button"
        className={clsx(
          styles.covenantChip,
          isPrimary ? styles.covenantChipPrimary : styles.covenantChipSecondary,
          isSelected && styles.covenantChipSelected,
          !isSelected && isRecommended && styles.covenantChipRecommended,
        )}
        aria-pressed={isSelected}
        title={title}
        onClick={() => onToggleCovenant(covenantId, selectableStages)}
      >
        <span className={styles.covenantChipContent}>{covenantName}</span>
        {isSelected ? (
          <span className={styles.covenantChipStage}>{currentTargetCount}人</span>
        ) : null}
      </button>
    );
  }

  function renderLevelChip(level: OperatorEntity['tier']) {
    const isSelected = currentLevel === level;

    return (
      <button
        key={`level-${level}`}
        type="button"
        className={clsx(
          styles.covenantChip,
          styles.levelChip,
          isSelected && styles.levelChipSelected,
        )}
        aria-pressed={isSelected}
        onClick={() => onToggleCurrentLevel(level)}
      >
        {level} 级
      </button>
    );
  }

  function renderPopulationChip(population: StrategyState['maxPopulation']) {
    const isSelected = maxPopulation === population;

    return (
      <button
        key={`population-${population}`}
        type="button"
        className={clsx(
          styles.covenantChip,
          styles.levelChip,
          isSelected && styles.levelChipSelected,
        )}
        aria-pressed={isSelected}
        onClick={() => onSetMaxPopulation(population)}
      >
        {population} 人
      </button>
    );
  }

  return (
    <section className={styles.filterSection}>
      <div className={styles.filterMain}>
        <div className={styles.filterHeader}>
          <h2 className={styles.filterTitle}>盟约筛选</h2>
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterLabelRow}>
            <span className={styles.filterLabel}>主要盟约</span>
            <span className={styles.filterHint}>点击后继续点会切换到更高人口阶段</span>
          </div>
          <div className={styles.chipRow}>
            {primaryCovenants.map((covenant) =>
              renderCovenantChip(
                covenant.id,
                covenant.name,
                covenant.description,
                true,
                covenant.activationStages,
              ),
            )}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterLabelRow}>
            <span className={styles.filterLabel}>次要盟约</span>
            <span className={styles.filterHint}>同样支持按人口阶段循环切换</span>
          </div>
          <div className={styles.chipRow}>
            {secondaryCovenants.map((covenant) =>
              renderCovenantChip(
                covenant.id,
                covenant.name,
                covenant.description,
                false,
                covenant.activationStages,
              ),
            )}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterLabelRow}>
            <span className={styles.filterLabel}>最大人口</span>
            <span className={styles.filterHint}>
              只影响推荐阵容搜索上限，富余位置会保留空白
            </span>
          </div>
          <div className={styles.chipRow}>
            {selectablePopulations.map((population) => renderPopulationChip(population))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterLabelRow}>
            <span className={styles.filterLabel}>当前等级</span>
            <span className={styles.filterHint}>
              {maxVisibleTier === null
                ? '默认不限；选择后会过滤掉高于当前等级 + 1 的干员'
                : `已选 ${currentLevel} 级，仅显示 ${maxVisibleTier} 级及以下干员`}
            </span>
          </div>
          <div className={styles.chipRow}>
            {selectableLevels.map((level) => renderLevelChip(level))}
          </div>
        </div>

        {selectedCovenantIds.length > 0 ? (
          <div className={styles.filterActions}>
            <button className={styles.resetButton} type="button" onClick={onReset}>
              重置筛选
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

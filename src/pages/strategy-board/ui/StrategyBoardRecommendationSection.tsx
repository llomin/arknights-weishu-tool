import clsx from 'clsx';
import type { RecommendedLineupResult } from '@/entities/operator/model/buildRecommendedLineup';
import { operatorTierRomanMap } from '@/pages/strategy-board/model/strategyBoardDisplay';
import type { OperatorEntity, StrategyState } from '@/shared/types/domain';
import styles from '../StrategyBoardPage.module.css';
import { OperatorCard } from './OperatorCard';

const tierClassNameMap = {
  6: styles.tier6,
  5: styles.tier5,
  4: styles.tier4,
  3: styles.tier3,
  2: styles.tier2,
  1: styles.tier1,
} as const;

export interface StrategyBoardRecommendationSectionProps {
  maxPopulation: StrategyState['maxPopulation'];
  onRestoreRemovedOperators: () => void;
  onToggleOperator: (operatorId: string) => void;
  onToggleRemovedOperator: (operatorId: string) => void;
  pickedOperatorIdSet: Set<string>;
  recommendedLineup: RecommendedLineupResult;
  recommendedOperators: OperatorEntity[];
  removedOperators: OperatorEntity[];
  selectedCovenantCount: number;
  selectedCovenantIdSet: Set<string>;
  selectedPrimaryCovenantIdSet: Set<string>;
}

export function StrategyBoardRecommendationSection({
  maxPopulation,
  onRestoreRemovedOperators,
  onToggleOperator,
  onToggleRemovedOperator,
  pickedOperatorIdSet,
  recommendedLineup,
  recommendedOperators,
  removedOperators,
  selectedCovenantCount,
  selectedCovenantIdSet,
  selectedPrimaryCovenantIdSet,
}: StrategyBoardRecommendationSectionProps) {
  if (selectedCovenantCount === 0 && removedOperators.length === 0) {
    return null;
  }

  const hasRequirements = recommendedLineup.requirements.length > 0;
  const hasRemovedPanel = removedOperators.length > 0;
  const isImpossible = recommendedLineup.reason !== null;

  return (
    <section
      className={clsx(
        styles.recommendationSection,
        hasRemovedPanel && styles.recommendationSectionWithRemovedPanel,
        isImpossible && styles.recommendationSectionImpossible,
      )}
    >
      <div className={styles.recommendationMain}>
        <header className={styles.recommendationHeader}>
          <div className={styles.prioritySectionHeading}>
            <h2 className={styles.prioritySectionTitle}>推荐阵容</h2>
            <p className={styles.prioritySectionHint}>
              {hasRequirements
                ? '根据已选盟约阶段和最大人口自动搜索；有盈余位置会留空。'
                : '先选择盟约阶段，再生成推荐阵容。'}
            </p>
          </div>

          {hasRequirements ? (
            <div className={styles.groupMeta}>
              <span className={styles.groupMetaItem}>
                已用 {recommendedLineup.operators.length} / {maxPopulation} 人
              </span>
              <span className={styles.groupMetaItem}>
                空位 {recommendedLineup.emptySlotCount} 个
              </span>
            </div>
          ) : null}
        </header>

        {hasRequirements ? (
          <>
            <div className={styles.recommendationRequirementRow}>
              {recommendedLineup.requirements.map((requirement) => (
                <span
                  className={styles.recommendationRequirementChip}
                  key={`requirement-${requirement.id}`}
                >
                  {requirement.name} {recommendedLineup.matchedCounts[requirement.id] ?? 0}/
                  {requirement.targetCount}
                </span>
              ))}
            </div>

            {recommendedLineup.reason ? (
              <p className={styles.recommendationWarning}>{recommendedLineup.reason}</p>
            ) : null}

            <div className={styles.recommendationLineupGrid}>
              {recommendedOperators.map((operator) => (
                <OperatorCard
                  key={`recommended-${operator.id}`}
                  covenantId="recommended"
                  operator={operator}
                  picked={pickedOperatorIdSet.has(operator.id)}
                  selectedCovenantIdSet={selectedCovenantIdSet}
                  selectedPrimaryCovenantIdSet={selectedPrimaryCovenantIdSet}
                  onToggleOperator={onToggleOperator}
                  onToggleRemovedOperator={onToggleRemovedOperator}
                />
              ))}
              {Array.from({ length: recommendedLineup.emptySlotCount }, (_, index) => (
                <div
                  className={styles.recommendationPlaceholder}
                  key={`recommended-empty-${index}`}
                >
                  <span className={styles.recommendationPlaceholderMark}>~</span>
                  <span className={styles.recommendationPlaceholderText}>空位</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.recommendationIdle}>
            还没有可计算的盟约阶段，先在上方点选盟约。
          </div>
        )}
      </div>

      {hasRemovedPanel ? (
        <aside className={styles.removedOperatorPanel}>
          <div className={styles.removedOperatorHeader}>
            <div className={styles.removedOperatorTitleGroup}>
              <h3 className={styles.removedOperatorTitle}>已删干员</h3>
              <span className={styles.removedOperatorCount}>
                {removedOperators.length} 名
              </span>
            </div>
            <button
              className={styles.removedRestoreAllButton}
              type="button"
              onClick={onRestoreRemovedOperators}
            >
              全部恢复
            </button>
          </div>

          <div className={styles.removedOperatorList}>
            {removedOperators.map((operator) => (
              <button
                className={styles.removedOperatorButton}
                key={`removed-${operator.id}`}
                type="button"
                title={`恢复 ${operator.name}`}
                onClick={() => onToggleRemovedOperator(operator.id)}
              >
                <span className={styles.removedOperatorName}>{operator.name}</span>
                <span
                  className={clsx(
                    styles.operatorTier,
                    styles.removedOperatorTier,
                    tierClassNameMap[operator.tier],
                  )}
                  aria-label={operator.tierLabel}
                >
                  {operatorTierRomanMap[operator.tier]}
                </span>
              </button>
            ))}
          </div>
        </aside>
      ) : null}
    </section>
  );
}

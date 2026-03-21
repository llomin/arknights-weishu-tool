import clsx from 'clsx';
import { buildOperatorCategoryRows } from '@/pages/strategy-board/model/strategyBoardDisplay';
import type { OperatorEntity } from '@/shared/types/domain';
import styles from '../StrategyBoardPage.module.css';
import { OperatorCard } from './OperatorCard';

const traitCategoryClassNameMap = {
  持续叠加: styles.traitCategorySingle,
  单次叠加: styles.traitCategoryContinuous,
  特异化: styles.traitCategorySpecialized,
  整备能力: styles.traitCategoryCombat,
  作战能力: styles.traitCategorySetup,
  其他: styles.traitCategoryOther,
} as const;

export interface OperatorGridProps {
  covenantId: string;
  onToggleOperator: (operatorId: string) => void;
  onToggleRemovedOperator: (operatorId: string) => void;
  operators: OperatorEntity[];
  pickedOperatorIdSet: Set<string>;
  searchHighlightKeywords?: string[];
  selectedCovenantIdSet: Set<string>;
  selectedPrimaryCovenantIdSet: Set<string>;
}

export function OperatorGrid({
  covenantId,
  onToggleOperator,
  onToggleRemovedOperator,
  operators,
  pickedOperatorIdSet,
  searchHighlightKeywords = [],
  selectedCovenantIdSet,
  selectedPrimaryCovenantIdSet,
}: OperatorGridProps) {
  const categoryRows = buildOperatorCategoryRows(operators);

  return (
    <div className={styles.operatorGrid}>
      {categoryRows.map(({ category, operators: categoryOperators }) => (
        <section className={styles.operatorCategoryRow} key={`${covenantId}-${category}`}>
          <div className={styles.operatorCategoryRowHeader}>
            <span
              className={clsx(
                styles.traitCategoryBadge,
                styles.operatorCategoryLabel,
                traitCategoryClassNameMap[category],
              )}
            >
              {category}
            </span>
            <span className={styles.operatorCategoryCount}>
              {categoryOperators.length} 名
            </span>
          </div>

          <div className={styles.operatorRowCards}>
            {categoryOperators.map((operator) => (
              <OperatorCard
                key={`${covenantId}-${operator.id}`}
                covenantId={covenantId}
                operator={operator}
                picked={pickedOperatorIdSet.has(operator.id)}
                searchHighlightKeywords={searchHighlightKeywords}
                selectedCovenantIdSet={selectedCovenantIdSet}
                selectedPrimaryCovenantIdSet={selectedPrimaryCovenantIdSet}
                onToggleOperator={onToggleOperator}
                onToggleRemovedOperator={onToggleRemovedOperator}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

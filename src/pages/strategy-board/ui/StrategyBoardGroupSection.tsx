import clsx from 'clsx';
import { getUniqueOperatorCount } from '@/pages/strategy-board/model/strategyBoardDisplay';
import type { OperatorGroupView } from '@/shared/types/domain';
import styles from '../StrategyBoardPage.module.css';
import { OperatorGrid } from './OperatorGrid';

export interface StrategyBoardGroupSectionProps {
  groups: OperatorGroupView[];
  hint: string;
  onToggleOperator: (operatorId: string) => void;
  onToggleRemovedOperator: (operatorId: string) => void;
  pickedOperatorIdSet: Set<string>;
  sectionVariant: 'primary' | 'secondary';
  selectedCovenantIdSet: Set<string>;
  selectedPrimaryCovenantIdSet: Set<string>;
  title: string;
}

export function StrategyBoardGroupSection({
  groups,
  hint,
  onToggleOperator,
  onToggleRemovedOperator,
  pickedOperatorIdSet,
  sectionVariant,
  selectedCovenantIdSet,
  selectedPrimaryCovenantIdSet,
  title,
}: StrategyBoardGroupSectionProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <section
      className={clsx(
        styles.prioritySection,
        sectionVariant === 'primary'
          ? styles.prioritySectionPrimary
          : styles.prioritySectionSecondary,
      )}
    >
      <header className={styles.prioritySectionHeader}>
        <div className={styles.prioritySectionHeading}>
          <h2 className={styles.prioritySectionTitle}>{title}</h2>
          <p className={styles.prioritySectionHint}>{hint}</p>
        </div>
        <div className={styles.groupMeta}>
          <span className={styles.groupMetaItem}>
            {getUniqueOperatorCount(groups)} 名干员
          </span>
          <span className={styles.groupMetaItem}>{groups.length} 个盟约簇</span>
        </div>
      </header>

      <div className={styles.covenantClusterStack}>
        {groups.map((group) => (
          <article className={styles.covenantCluster} key={`${sectionVariant}-${group.covenantId}`}>
            <header className={styles.covenantClusterHeader}>
              <h3 className={styles.covenantClusterTitle}>{group.covenantName}</h3>
              <div className={styles.covenantClusterMeta}>
                <span className={styles.covenantClusterMetaItem}>
                  激活 {group.activationCount} 人
                </span>
                <span className={styles.covenantClusterMetaItem}>
                  {group.operators.length} 名干员
                </span>
              </div>
            </header>

            <OperatorGrid
              covenantId={group.covenantId}
              operators={group.operators}
              pickedOperatorIdSet={pickedOperatorIdSet}
              selectedCovenantIdSet={selectedCovenantIdSet}
              selectedPrimaryCovenantIdSet={selectedPrimaryCovenantIdSet}
              onToggleOperator={onToggleOperator}
              onToggleRemovedOperator={onToggleRemovedOperator}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

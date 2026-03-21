import styles from '../StrategyBoardPage.module.css';
import { OperatorGrid } from './OperatorGrid';

export interface StrategyBoardSearchResultsProps {
  onToggleOperator: (operatorId: string) => void;
  onToggleRemovedOperator: (operatorId: string) => void;
  pickedOperatorIdSet: Set<string>;
  searchKeywords: string[];
  searchResultOperators: import('@/shared/types/domain').OperatorEntity[];
  selectedCovenantIdSet: Set<string>;
  selectedPrimaryCovenantIdSet: Set<string>;
}

export function StrategyBoardSearchResults({
  onToggleOperator,
  onToggleRemovedOperator,
  pickedOperatorIdSet,
  searchKeywords,
  searchResultOperators,
  selectedCovenantIdSet,
  selectedPrimaryCovenantIdSet,
}: StrategyBoardSearchResultsProps) {
  if (searchKeywords.length === 0) {
    return null;
  }

  return (
    <section className={styles.searchResultSection}>
      <header className={styles.searchResultHeader}>
        <div className={styles.prioritySectionHeading}>
          <h2 className={styles.prioritySectionTitle}>搜索结果</h2>
          <p className={styles.prioritySectionHint}>
            独立于盟约筛选展示，支持描述分词搜索。
          </p>
        </div>

        <div className={styles.groupMeta}>
          <span className={styles.groupMetaItem}>
            关键词 {searchKeywords.join(' / ')}
          </span>
          <span className={styles.groupMetaItem}>
            {searchResultOperators.length} 名干员
          </span>
        </div>
      </header>

      {searchResultOperators.length > 0 ? (
        <OperatorGrid
          covenantId="search-results"
          operators={searchResultOperators}
          pickedOperatorIdSet={pickedOperatorIdSet}
          searchHighlightKeywords={searchKeywords}
          selectedCovenantIdSet={selectedCovenantIdSet}
          selectedPrimaryCovenantIdSet={selectedPrimaryCovenantIdSet}
          onToggleOperator={onToggleOperator}
          onToggleRemovedOperator={onToggleRemovedOperator}
        />
      ) : (
        <div className={styles.searchResultEmpty}>
          当前没有命中干员，试试减少关键词或调整当前等级。
        </div>
      )}
    </section>
  );
}

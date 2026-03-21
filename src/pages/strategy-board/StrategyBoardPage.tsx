import { startTransition } from 'react';
import { useStrategyStore } from '@/features/strategy/model/useStrategyStore';
import { useStrategyBoardViewModel } from '@/pages/strategy-board/model/useStrategyBoardViewModel';
import styles from './StrategyBoardPage.module.css';
import { StrategyBoardFilters } from './ui/StrategyBoardFilters';
import { StrategyBoardGroupSection } from './ui/StrategyBoardGroupSection';
import { StrategyBoardHeader } from './ui/StrategyBoardHeader';
import { StrategyBoardRecommendationSection } from './ui/StrategyBoardRecommendationSection';
import { StrategyBoardSearchResults } from './ui/StrategyBoardSearchResults';

export function StrategyBoardPage() {
  const selectedCovenantIds = useStrategyStore(
    (state) => state.selectedCovenantIds,
  );
  const selectedCovenantTargetMap = useStrategyStore(
    (state) => state.selectedCovenantTargetMap,
  );
  const maxPopulation = useStrategyStore((state) => state.maxPopulation);
  const currentLevel = useStrategyStore((state) => state.currentLevel);
  const searchKeyword = useStrategyStore((state) => state.searchKeyword);
  const pickedOperatorIds = useStrategyStore((state) => state.pickedOperatorIds);
  const removedOperatorIds = useStrategyStore((state) => state.removedOperatorIds);
  const restoreRemovedOperators = useStrategyStore(
    (state) => state.restoreRemovedOperators,
  );
  const setMaxPopulation = useStrategyStore((state) => state.setMaxPopulation);
  const toggleCovenant = useStrategyStore((state) => state.toggleCovenant);
  const toggleCurrentLevel = useStrategyStore((state) => state.toggleCurrentLevel);
  const toggleOperator = useStrategyStore((state) => state.toggleOperator);
  const toggleRemovedOperator = useStrategyStore(
    (state) => state.toggleRemovedOperator,
  );
  const setSearchKeyword = useStrategyStore((state) => state.setSearchKeyword);
  const reset = useStrategyStore((state) => state.reset);

  const {
    groups,
    maxVisibleTier,
    otherGroups,
    priorityGroups,
    recommendedCovenantIds,
    recommendedLineup,
    removedOperators,
    searchKeywords,
    searchResultOperators,
    selectedCovenantIdSet,
    selectedPrimaryCovenantIdSet,
    sortedRecommendedOperators,
  } = useStrategyBoardViewModel({
    selectedCovenantIds,
    selectedCovenantTargetMap,
    maxPopulation,
    currentLevel,
    searchKeyword,
    removedOperatorIds,
  });
  const pickedOperatorIdSet = new Set(pickedOperatorIds);

  return (
    <main className={styles.page}>
      <StrategyBoardHeader
        searchKeyword={searchKeyword}
        onSearchKeywordChange={(nextKeyword) => {
          startTransition(() => {
            setSearchKeyword(nextKeyword);
          });
        }}
      />

      <StrategyBoardSearchResults
        searchKeywords={searchKeywords}
        searchResultOperators={searchResultOperators}
        pickedOperatorIdSet={pickedOperatorIdSet}
        selectedCovenantIdSet={selectedCovenantIdSet}
        selectedPrimaryCovenantIdSet={selectedPrimaryCovenantIdSet}
        onToggleOperator={toggleOperator}
        onToggleRemovedOperator={toggleRemovedOperator}
      />

      <StrategyBoardFilters
        currentLevel={currentLevel}
        maxPopulation={maxPopulation}
        maxVisibleTier={maxVisibleTier}
        recommendedCovenantIdSet={recommendedCovenantIds}
        selectedCovenantIds={selectedCovenantIds}
        selectedCovenantTargetMap={selectedCovenantTargetMap}
        onSetMaxPopulation={setMaxPopulation}
        onToggleCovenant={toggleCovenant}
        onToggleCurrentLevel={toggleCurrentLevel}
        onReset={reset}
      />

      <StrategyBoardRecommendationSection
        maxPopulation={maxPopulation}
        pickedOperatorIdSet={pickedOperatorIdSet}
        recommendedLineup={recommendedLineup}
        recommendedOperators={sortedRecommendedOperators}
        removedOperators={removedOperators}
        selectedCovenantCount={selectedCovenantIds.length}
        selectedCovenantIdSet={selectedCovenantIdSet}
        selectedPrimaryCovenantIdSet={selectedPrimaryCovenantIdSet}
        onRestoreRemovedOperators={restoreRemovedOperators}
        onToggleOperator={toggleOperator}
        onToggleRemovedOperator={toggleRemovedOperator}
      />

      {selectedCovenantIds.length === 0 ? (
        <section className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>先选盟约，再看干员</h2>
          <p className={styles.emptyDescription}>
            干员会按已选盟约分组展示，并直接根据特质分类优先级排序。
          </p>
        </section>
      ) : groups.length === 0 ? (
        <section className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>当前条件没有命中干员</h2>
          <p className={styles.emptyDescription}>
            试试减少搜索词，或者点击“恢复已删”把本局删掉的干员加回来。
          </p>
        </section>
      ) : (
        <section className={styles.groupStack}>
          <StrategyBoardGroupSection
            title="优先抓牌"
            hint="先看持续叠加、单次叠加和特异化这三类核心特质"
            sectionVariant="primary"
            groups={priorityGroups}
            pickedOperatorIdSet={pickedOperatorIdSet}
            selectedCovenantIdSet={selectedCovenantIdSet}
            selectedPrimaryCovenantIdSet={selectedPrimaryCovenantIdSet}
            onToggleOperator={toggleOperator}
            onToggleRemovedOperator={toggleRemovedOperator}
          />
          <StrategyBoardGroupSection
            title="其他可选"
            hint="补位、过渡和条件牌"
            sectionVariant="secondary"
            groups={otherGroups}
            pickedOperatorIdSet={pickedOperatorIdSet}
            selectedCovenantIdSet={selectedCovenantIdSet}
            selectedPrimaryCovenantIdSet={selectedPrimaryCovenantIdSet}
            onToggleOperator={toggleOperator}
            onToggleRemovedOperator={toggleRemovedOperator}
          />
        </section>
      )}
    </main>
  );
}

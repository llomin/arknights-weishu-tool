import { startTransition, useDeferredValue } from 'react';
import clsx from 'clsx';
import {
  primaryCovenants,
  secondaryCovenants,
} from '@/entities/covenant/model/normalizeCovenants';
import { buildOperatorGroups } from '@/entities/operator/model/buildOperatorGroups';
import { operators } from '@/entities/operator/model/normalizeOperators';
import { filterOperators } from '@/entities/operator/model/queryOperators';
import { useStrategyStore } from '@/features/strategy/model/useStrategyStore';
import { buildHighlightSegments } from '@/shared/lib/highlightText';
import { getSearchKeywords } from '@/shared/lib/searchKeywords';
import styles from './StrategyBoardPage.module.css';

const tierClassNameMap = {
  6: styles.tier6,
  5: styles.tier5,
  4: styles.tier4,
  3: styles.tier3,
  2: styles.tier2,
  1: styles.tier1,
} as const;

export function StrategyBoardPage() {
  const selectedCovenantIds = useStrategyStore(
    (state) => state.selectedCovenantIds,
  );
  const searchKeyword = useStrategyStore((state) => state.searchKeyword);
  const pickedOperatorIds = useStrategyStore((state) => state.pickedOperatorIds);
  const removedOperatorIds = useStrategyStore((state) => state.removedOperatorIds);
  const restoreRemovedOperators = useStrategyStore(
    (state) => state.restoreRemovedOperators,
  );
  const toggleCovenant = useStrategyStore((state) => state.toggleCovenant);
  const toggleOperator = useStrategyStore((state) => state.toggleOperator);
  const toggleRemovedOperator = useStrategyStore(
    (state) => state.toggleRemovedOperator,
  );
  const setSearchKeyword = useStrategyStore((state) => state.setSearchKeyword);
  const reset = useStrategyStore((state) => state.reset);

  const deferredSearchKeyword = useDeferredValue(searchKeyword);
  const searchKeywords = getSearchKeywords(deferredSearchKeyword);
  const visibleOperators = filterOperators(
    operators,
    selectedCovenantIds,
    deferredSearchKeyword,
    removedOperatorIds,
  );
  const groups = buildOperatorGroups(
    operators,
    selectedCovenantIds,
    deferredSearchKeyword,
    removedOperatorIds,
  );
  const pickedOperatorIdSet = new Set(pickedOperatorIds);
  const pickedVisibleCount = visibleOperators.filter((operator) =>
    pickedOperatorIdSet.has(operator.id),
  ).length;

  function renderCovenantChip(
    covenantId: string,
    covenantName: string,
    isPrimary: boolean,
  ) {
    const isSelected = selectedCovenantIds.includes(covenantId);

    return (
      <button
        key={covenantId}
        type="button"
        className={clsx(
          styles.covenantChip,
          isPrimary ? styles.covenantChipPrimary : styles.covenantChipSecondary,
          isSelected && styles.covenantChipSelected,
        )}
        aria-pressed={isSelected}
        onClick={() => toggleCovenant(covenantId)}
      >
        {covenantName}
      </button>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>Wei Shu Protocol Strategy Board</p>
          <h1 className={styles.title}>卫戍协议助手</h1>
          <p className={styles.description}>
            选择盟约后直接看各组干员描述，搜索支持空格分词。点击卡片标记已拿牌，点“删”可把本局禁用的干员排除掉。
          </p>
        </div>

        <div className={styles.headerTools}>
          <label className={styles.searchBox}>
            <span className={styles.searchLabel}>描述搜索</span>
            <input
              className={styles.searchInput}
              type="text"
              value={searchKeyword}
              placeholder="支持空格分词，例如：获得 层数"
              onChange={(event) => {
                const nextKeyword = event.target.value;

                startTransition(() => {
                  setSearchKeyword(nextKeyword);
                });
              }}
            />
          </label>

          <div className={styles.toolbarRow}>
            <span className={styles.toolbarStat}>命中 {visibleOperators.length}</span>
            <span className={styles.toolbarStat}>已拿 {pickedVisibleCount}</span>
            <span className={styles.toolbarStat}>已删 {removedOperatorIds.length}</span>
            {removedOperatorIds.length > 0 ? (
              <button
                className={styles.ghostButton}
                type="button"
                onClick={() => restoreRemovedOperators()}
              >
                恢复已删
              </button>
            ) : null}
            <button className={styles.resetButton} type="button" onClick={() => reset()}>
              清空本局
            </button>
          </div>
        </div>
      </header>

      <section className={styles.filterSection}>
        <div className={styles.filterHeader}>
          <div>
            <h2 className={styles.filterTitle}>盟约筛选</h2>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterLabelRow}>
            <span className={styles.filterLabel}>主要盟约</span>
            <span className={styles.filterHint}>更常用，优先关注</span>
          </div>
          <div className={styles.chipRow}>
            {primaryCovenants.map((covenant) =>
              renderCovenantChip(covenant.id, covenant.name, true),
            )}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterLabelRow}>
            <span className={styles.filterLabel}>次要盟约</span>
            <span className={styles.filterHint}>按需补充路线</span>
          </div>
          <div className={styles.chipRow}>
            {secondaryCovenants.map((covenant) =>
              renderCovenantChip(covenant.id, covenant.name, false),
            )}
          </div>
        </div>
      </section>

      {selectedCovenantIds.length === 0 ? (
        <section className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>先选盟约，再看干员</h2>
          <p className={styles.emptyDescription}>
            干员会按已选盟约分组展示，并直接根据描述优先级排序。
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
          {groups.map((group) => (
            <article className={styles.groupPanel} key={group.covenantId}>
              <header className={styles.groupHeader}>
                <h2 className={styles.groupTitle}>{group.covenantName}</h2>
                <div className={styles.groupMeta}>
                  <span className={styles.groupMetaItem}>
                    激活 {group.activationCount} 人
                  </span>
                  <span className={styles.groupMetaItem}>
                    {group.operators.length} 名干员
                  </span>
                </div>
              </header>

              <div className={styles.operatorGrid}>
                {group.operators.map((operator) => {
                  const isPicked = pickedOperatorIdSet.has(operator.id);
                  const highlightKeywords = [
                    ...searchKeywords,
                    ...operator.traitTags.filter((tag) =>
                      operator.description.includes(tag),
                    ),
                  ];
                  const descriptionSegments = buildHighlightSegments(
                    operator.description,
                    highlightKeywords,
                  );

                  return (
                    <article
                      key={`${group.covenantId}-${operator.id}`}
                      className={clsx(
                        styles.operatorCard,
                        tierClassNameMap[operator.tier],
                        isPicked && styles.operatorCardPicked,
                      )}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleOperator(operator.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleOperator(operator.id);
                        }
                      }}
                    >
                      <div className={styles.operatorTopRow}>
                        <div className={styles.operatorIdentity}>
                          <span className={styles.operatorName}>{operator.name}</span>
                          <span className={styles.operatorTier}>
                            {operator.tierLabel}
                          </span>
                          {operator.traitTags.map((tag) => (
                            <span className={styles.operatorTag} key={`${operator.id}-${tag}`}>
                              {tag}
                            </span>
                          ))}
                        </div>

                        <button
                          className={styles.removeButton}
                          type="button"
                          onKeyDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleRemovedOperator(operator.id);
                          }}
                        >
                          删
                        </button>
                      </div>

                      <p className={styles.operatorDescription}>
                        {descriptionSegments.map((segment, index) =>
                          segment.highlighted ? (
                            <mark
                              className={styles.descriptionHighlight}
                              key={`${operator.id}-${index}-${segment.text}`}
                            >
                              {segment.text}
                            </mark>
                          ) : (
                            <span key={`${operator.id}-${index}-${segment.text}`}>
                              {segment.text}
                            </span>
                          ),
                        )}
                      </p>
                    </article>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

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
import type { OperatorEntity, OperatorGroupView } from '@/shared/types/domain';
import styles from './StrategyBoardPage.module.css';

const tierClassNameMap = {
  6: styles.tier6,
  5: styles.tier5,
  4: styles.tier4,
  3: styles.tier3,
  2: styles.tier2,
  1: styles.tier1,
} as const;

const highPriorityBuckets = new Set<OperatorEntity['priorityBucket']>([
  'each_and_layers',
  'layers',
]);
const selectableLevels = [1, 2, 3, 4, 5, 6] as const;

export function StrategyBoardPage() {
  const selectedCovenantIds = useStrategyStore(
    (state) => state.selectedCovenantIds,
  );
  const currentLevel = useStrategyStore((state) => state.currentLevel);
  const searchKeyword = useStrategyStore((state) => state.searchKeyword);
  const favoriteOperatorIds = useStrategyStore((state) => state.favoriteOperatorIds);
  const pickedOperatorIds = useStrategyStore((state) => state.pickedOperatorIds);
  const removedOperatorIds = useStrategyStore((state) => state.removedOperatorIds);
  const restoreRemovedOperators = useStrategyStore(
    (state) => state.restoreRemovedOperators,
  );
  const toggleCovenant = useStrategyStore((state) => state.toggleCovenant);
  const toggleCurrentLevel = useStrategyStore((state) => state.toggleCurrentLevel);
  const toggleFavoriteOperator = useStrategyStore(
    (state) => state.toggleFavoriteOperator,
  );
  const toggleOperator = useStrategyStore((state) => state.toggleOperator);
  const toggleRemovedOperator = useStrategyStore(
    (state) => state.toggleRemovedOperator,
  );
  const setSearchKeyword = useStrategyStore((state) => state.setSearchKeyword);
  const reset = useStrategyStore((state) => state.reset);

  const deferredSearchKeyword = useDeferredValue(searchKeyword);
  const searchKeywords = getSearchKeywords(deferredSearchKeyword);
  const selectedCovenantIdSet = new Set(selectedCovenantIds);
  const visibleOperators = filterOperators(
    operators,
    selectedCovenantIds,
    deferredSearchKeyword,
    removedOperatorIds,
    currentLevel,
    favoriteOperatorIds,
  );
  const groups = buildOperatorGroups(
    operators,
    selectedCovenantIds,
    deferredSearchKeyword,
    removedOperatorIds,
    currentLevel,
    favoriteOperatorIds,
  );
  const favoriteOperatorIdSet = new Set(favoriteOperatorIds);
  const pickedOperatorIdSet = new Set(pickedOperatorIds);
  const maxVisibleTier = currentLevel === null ? null : Math.min(currentLevel + 1, 6);

  const recommendedCovenantIds = new Set(
    selectedCovenantIds.flatMap((id) => {
      const covenant = [...primaryCovenants, ...secondaryCovenants].find(
        (c) => c.id === id,
      );
      return covenant?.recommandWith ?? [];
    }),
  );

  function renderCovenantChip(
    covenantId: string,
    covenantName: string,
    covenantDescription: string,
    isPrimary: boolean,
  ) {
    const isSelected = selectedCovenantIds.includes(covenantId);
    const isRecommended = recommendedCovenantIds.has(covenantId);

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
        title={covenantDescription}
        onClick={() => toggleCovenant(covenantId)}
      >
        {covenantName}
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
        onClick={() => toggleCurrentLevel(level)}
      >
        {level} 级
      </button>
    );
  }

  function getMatchedSelectedCovenants(operator: OperatorEntity) {
    return operator.covenants.filter((covenantId) =>
      selectedCovenantIdSet.has(covenantId),
    );
  }

  function isMultiHitOperator(operator: OperatorEntity) {
    return getMatchedSelectedCovenants(operator).length >= 2;
  }

  function isPriorityOperator(operator: OperatorEntity) {
    return !isMultiHitOperator(operator) && highPriorityBuckets.has(operator.priorityBucket);
  }

  function buildSectionGroups(
    predicate: (operator: OperatorEntity) => boolean,
  ): OperatorGroupView[] {
    return groups
      .map((group) => ({
        ...group,
        operators: group.operators.filter(predicate),
      }))
      .filter((group) => group.operators.length > 0);
  }

  function getUniqueOperatorCount(sectionGroups: OperatorGroupView[]) {
    return new Set(
      sectionGroups.flatMap((group) => group.operators.map((operator) => operator.id)),
    ).size;
  }

  function renderOperatorCard(covenantId: string, operator: OperatorEntity) {
    const isFavorite = favoriteOperatorIdSet.has(operator.id);
    const isPicked = pickedOperatorIdSet.has(operator.id);
    const matchedSelectedCovenants = getMatchedSelectedCovenants(operator);
    const traitTagSet = new Set(
      operator.traitTags.map((tag) => tag.toLocaleLowerCase('zh-CN')),
    );
    const highlightKeywords = [
      ...searchKeywords,
      ...operator.traitTags.filter((tag) => operator.description.includes(tag)),
    ];
    const descriptionSegments = buildHighlightSegments(
      operator.description,
      highlightKeywords,
    );

    return (
      <article
        key={`${covenantId}-${operator.id}`}
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
            <button
              className={clsx(
                styles.favoriteButton,
                isFavorite && styles.favoriteButtonActive,
              )}
              type="button"
              aria-label={isFavorite ? `取消收藏 ${operator.name}` : `收藏 ${operator.name}`}
              title={isFavorite ? `取消收藏 ${operator.name}` : `收藏 ${operator.name}`}
              onKeyDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                toggleFavoriteOperator(operator.id);
              }}
            >
              <svg className={styles.favoriteIcon} viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 3.8l2.52 5.11 5.64.82-4.08 3.97.97 5.62L12 16.68 6.95 19.32l.97-5.62-4.08-3.97 5.64-.82L12 3.8z"
                  fill={isFavorite ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <button
            className={styles.removeButton}
            type="button"
            aria-label={`移除 ${operator.name}`}
            title={`移除 ${operator.name}`}
            onKeyDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              toggleRemovedOperator(operator.id);
            }}
          >
            <svg className={styles.removeIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M9.25 3.75h5.5M4.75 6.75h14.5M8 6.75v11a1.5 1.5 0 0 0 1.5 1.5h5a1.5 1.5 0 0 0 1.5-1.5v-11M10.5 10.25v5.5M13.5 10.25v5.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className={styles.operatorDescription}>
          {matchedSelectedCovenants.length >= 2 ? (
            <div className={styles.matchedCovenants}>
              <span className={styles.matchedCovenantsLabel}>命中盟约</span>
              {matchedSelectedCovenants.map((covenantId) => (
                <span
                  className={styles.matchedCovenantChip}
                  key={`${operator.id}-${covenantId}`}
                >
                  {covenantId}
                </span>
              ))}
            </div>
          ) : null}

          <p className={styles.operatorDescriptionText}>
            {descriptionSegments.map((segment, index) => {
              const isTraitTagSegment = traitTagSet.has(
                segment.text.toLocaleLowerCase('zh-CN'),
              );

              if (isTraitTagSegment) {
                return (
                  <span
                    className={styles.operatorTag}
                    key={`${operator.id}-${index}-${segment.text}`}
                  >
                    {segment.text}
                  </span>
                );
              }

              return segment.highlighted ? (
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
              );
            })}
          </p>
        </div>
      </article>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>Wei Shu Protocol Strategy Board</p>
          <h1 className={styles.title}>卫戍协议助手</h1>
          <p className={styles.description}>
            卫？卫！卫？卫！卫？卫！
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
        </div>
      </header>

      <section className={styles.filterSection}>
        <div className={styles.filterMain}>
          <div className={styles.filterHeader}>
            <h2 className={styles.filterTitle}>盟约筛选</h2>
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterLabelRow}>
              <span className={styles.filterLabel}>主要盟约</span>
              <span className={styles.filterHint}>更常用，优先关注</span>
            </div>
            <div className={styles.chipRow}>
              {primaryCovenants.map((covenant) =>
                renderCovenantChip(
                  covenant.id,
                  covenant.name,
                  covenant.description,
                  true,
                ),
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
                renderCovenantChip(
                  covenant.id,
                  covenant.name,
                  covenant.description,
                  false,
                ),
              )}
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
        </div>

        <div className={styles.filterActions}>
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
            重置
          </button>
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
          {(() => {
            const multiHitOperators = visibleOperators.filter(isMultiHitOperator);
            const priorityGroups = buildSectionGroups(isPriorityOperator);
            const otherGroups = buildSectionGroups(
              (operator) => !isMultiHitOperator(operator) && !isPriorityOperator(operator),
            );

            return (
              <>
                {multiHitOperators.length > 0 ? (
                  <section
                    className={clsx(
                      styles.prioritySection,
                      styles.prioritySectionMultiHit,
                    )}
                  >
                    <header className={styles.prioritySectionHeader}>
                      <div className={styles.prioritySectionHeading}>
                        <h2 className={styles.prioritySectionTitle}>多盟约命中</h2>
                        <p className={styles.prioritySectionHint}>
                          同时命中多个已选盟约，先看这批联动牌
                        </p>
                      </div>
                      <div className={styles.groupMeta}>
                        <span className={styles.groupMetaItem}>
                          {multiHitOperators.length} 名干员
                        </span>
                      </div>
                    </header>

                    <div className={styles.operatorGrid}>
                      {multiHitOperators.map((operator) =>
                        renderOperatorCard('multi-hit', operator),
                      )}
                    </div>
                  </section>
                ) : null}

                {priorityGroups.length > 0 ? (
                  <section
                    className={clsx(
                      styles.prioritySection,
                      styles.prioritySectionPrimary,
                    )}
                  >
                    <header className={styles.prioritySectionHeader}>
                      <div className={styles.prioritySectionHeading}>
                        <h2 className={styles.prioritySectionTitle}>优先拿牌</h2>
                        <p className={styles.prioritySectionHint}>
                          先看层数联动和核心收益
                        </p>
                      </div>
                      <div className={styles.groupMeta}>
                        <span className={styles.groupMetaItem}>
                          {getUniqueOperatorCount(priorityGroups)} 名干员
                        </span>
                        <span className={styles.groupMetaItem}>
                          {priorityGroups.length} 个盟约簇
                        </span>
                      </div>
                    </header>

                    <div className={styles.covenantClusterStack}>
                      {priorityGroups.map((group) => (
                        <article
                          className={styles.covenantCluster}
                          key={`priority-${group.covenantId}`}
                        >
                          <header className={styles.covenantClusterHeader}>
                            <h3 className={styles.covenantClusterTitle}>
                              {group.covenantName}
                            </h3>
                            <div className={styles.covenantClusterMeta}>
                              <span className={styles.covenantClusterMetaItem}>
                                激活 {group.activationCount} 人
                              </span>
                              <span className={styles.covenantClusterMetaItem}>
                                {group.operators.length} 名干员
                              </span>
                            </div>
                          </header>

                          <div className={styles.operatorGrid}>
                            {group.operators.map((operator) =>
                              renderOperatorCard(group.covenantId, operator),
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                {otherGroups.length > 0 ? (
                  <section
                    className={clsx(
                      styles.prioritySection,
                      styles.prioritySectionSecondary,
                    )}
                  >
                    <header className={styles.prioritySectionHeader}>
                      <div className={styles.prioritySectionHeading}>
                        <h2 className={styles.prioritySectionTitle}>其他可选</h2>
                        <p className={styles.prioritySectionHint}>
                          补位、过渡和条件牌
                        </p>
                      </div>
                      <div className={styles.groupMeta}>
                        <span className={styles.groupMetaItem}>
                          {getUniqueOperatorCount(otherGroups)} 名干员
                        </span>
                        <span className={styles.groupMetaItem}>
                          {otherGroups.length} 个盟约簇
                        </span>
                      </div>
                    </header>

                    <div className={styles.covenantClusterStack}>
                      {otherGroups.map((group) => (
                        <article
                          className={styles.covenantCluster}
                          key={`other-${group.covenantId}`}
                        >
                          <header className={styles.covenantClusterHeader}>
                            <h3 className={styles.covenantClusterTitle}>
                              {group.covenantName}
                            </h3>
                            <div className={styles.covenantClusterMeta}>
                              <span className={styles.covenantClusterMetaItem}>
                                激活 {group.activationCount} 人
                              </span>
                              <span className={styles.covenantClusterMetaItem}>
                                {group.operators.length} 名干员
                              </span>
                            </div>
                          </header>

                          <div className={styles.operatorGrid}>
                            {group.operators.map((operator) =>
                              renderOperatorCard(group.covenantId, operator),
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
              </>
            );
          })()}
        </section>
      )}
    </main>
  );
}

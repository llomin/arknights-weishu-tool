import { startTransition, useDeferredValue } from 'react';
import clsx from 'clsx';
import {
  primaryCovenants,
  secondaryCovenants,
} from '@/entities/covenant/model/normalizeCovenants';
import { buildOperatorGroups } from '@/entities/operator/model/buildOperatorGroups';
import { operators } from '@/entities/operator/model/normalizeOperators';
import { useStrategyStore } from '@/features/strategy/model/useStrategyStore';
import { buildHighlightSegments } from '@/shared/lib/highlightText';
import { getSearchKeywords } from '@/shared/lib/searchKeywords';
import type { OperatorEntity } from '@/shared/types/domain';
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
  const groups = buildOperatorGroups(
    operators,
    selectedCovenantIds,
    deferredSearchKeyword,
    removedOperatorIds,
  );
  const pickedOperatorIdSet = new Set(pickedOperatorIds);

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

  function renderOperatorCard(covenantId: string, operator: OperatorEntity) {
    const isPicked = pickedOperatorIdSet.has(operator.id);
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

        <p className={styles.operatorDescription}>
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
          {groups.map((group) => {
            const priorityOperators = group.operators.filter((operator) =>
              highPriorityBuckets.has(operator.priorityBucket),
            );
            const otherOperators = group.operators.filter(
              (operator) => !highPriorityBuckets.has(operator.priorityBucket),
            );
            const operatorSections = [
              {
                key: 'priority',
                title: '优先拿牌',
                hint: '先看层数联动和核心收益',
                operators: priorityOperators,
                className: styles.prioritySectionPrimary,
              },
              {
                key: 'other',
                title: '其他可选',
                hint: '补位、过渡和条件牌',
                operators: otherOperators,
                className: styles.prioritySectionSecondary,
              },
            ].filter((section) => section.operators.length > 0);

            return (
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
                    {priorityOperators.length > 0 ? (
                      <span className={styles.groupMetaItem}>
                        优先 {priorityOperators.length}
                      </span>
                    ) : null}
                  </div>
                </header>

                <div className={styles.prioritySections}>
                  {operatorSections.map((section) => (
                    <section
                      className={clsx(styles.prioritySection, section.className)}
                      key={`${group.covenantId}-${section.key}`}
                    >
                      <header className={styles.prioritySectionHeader}>
                        <div className={styles.prioritySectionHeading}>
                          <h3 className={styles.prioritySectionTitle}>{section.title}</h3>
                          <p className={styles.prioritySectionHint}>{section.hint}</p>
                        </div>
                        <span className={styles.prioritySectionCount}>
                          {section.operators.length} 名
                        </span>
                      </header>

                      <div className={styles.operatorGrid}>
                        {section.operators.map((operator) =>
                          renderOperatorCard(group.covenantId, operator),
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

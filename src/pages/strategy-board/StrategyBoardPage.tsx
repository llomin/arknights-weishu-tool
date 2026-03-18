import { startTransition, useDeferredValue } from 'react';
import clsx from 'clsx';
import {
  covenantMap,
  primaryCovenants,
  secondaryCovenants,
} from '@/entities/covenant/model/normalizeCovenants';
import { buildOperatorGroups } from '@/entities/operator/model/buildOperatorGroups';
import { buildRecommendedLineup } from '@/entities/operator/model/buildRecommendedLineup';
import { operatorMap, operators } from '@/entities/operator/model/normalizeOperators';
import {
  filterOperators,
  matchesOperatorLevel,
  matchesOperatorRemoval,
  matchesOperatorSearch,
  sortOperators,
} from '@/entities/operator/model/queryOperators';
import { useStrategyStore } from '@/features/strategy/model/useStrategyStore';
import { buildHighlightSegments } from '@/shared/lib/highlightText';
import { getSearchKeywords } from '@/shared/lib/searchKeywords';
import type {
  OperatorEntity,
  OperatorGroupView,
  StrategyState,
} from '@/shared/types/domain';
import styles from './StrategyBoardPage.module.css';

const tierClassNameMap = {
  6: styles.tier6,
  5: styles.tier5,
  4: styles.tier4,
  3: styles.tier3,
  2: styles.tier2,
  1: styles.tier1,
} as const;

const traitCategoryClassNameMap = {
  持续叠加: styles.traitCategorySingle,
  单次叠加: styles.traitCategoryContinuous,
  特异化: styles.traitCategorySpecialized,
  整备能力: styles.traitCategoryCombat,
  作战能力: styles.traitCategorySetup,
  其他: styles.traitCategoryOther,
} as const;

const highPriorityBuckets = new Set<OperatorEntity['priorityBucket']>([
  '持续叠加',
  '单次叠加',
  '特异化',
]);
const selectableLevels = [1, 2, 3, 4, 5, 6] as const;
const selectablePopulations: StrategyState['maxPopulation'][] = [8, 9];
const operatorCategoryOrder: OperatorEntity['priorityBucket'][] = [
  '持续叠加',
  '单次叠加',
  '特异化',
  '整备能力',
  '作战能力',
  '其他',
];
const operatorTierRomanMap: Record<OperatorEntity['tier'], string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
};

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

  const deferredSearchKeyword = useDeferredValue(searchKeyword);
  const searchKeywords = getSearchKeywords(deferredSearchKeyword);
  const selectedCovenantIdSet = new Set(selectedCovenantIds);
  const visibleOperators = filterOperators(
    operators,
    selectedCovenantIds,
    '',
    removedOperatorIds,
    currentLevel,
  );
  const groups = buildOperatorGroups(
    operators,
    selectedCovenantIds,
    '',
    removedOperatorIds,
    currentLevel,
  );
  const searchResultOperators = searchKeywords.length === 0
    ? []
    : operators
        .filter((operator) => matchesOperatorRemoval(operator, removedOperatorIds))
        .filter((operator) => matchesOperatorLevel(operator, currentLevel))
        .filter((operator) => matchesOperatorSearch(operator, searchKeywords))
        .sort(sortOperators);
  const removedOperators = removedOperatorIds
    .map((operatorId) => operatorMap[operatorId])
    .filter((operator): operator is OperatorEntity => Boolean(operator))
    .sort(
      (left, right) =>
        right.tier - left.tier ||
        left.priorityWeight - right.priorityWeight ||
        left.name.localeCompare(right.name, 'zh-Hans-CN'),
    );
  const pickedOperatorIdSet = new Set(pickedOperatorIds);
  const maxVisibleTier = currentLevel === null ? null : Math.min(currentLevel + 1, 6);
  const selectedCovenantRequirements = selectedCovenantIds
    .map((id) => {
      const covenant = covenantMap[id];
      const targetCount = selectedCovenantTargetMap[id];

      if (!covenant || targetCount === undefined) {
        return null;
      }

      return {
        id,
        name: covenant.name,
        targetCount,
      };
    })
    .filter((requirement): requirement is NonNullable<typeof requirement> => requirement !== null);
  const recommendedLineup = buildRecommendedLineup(
    visibleOperators,
    selectedCovenantRequirements,
    maxPopulation,
  );

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
    activationStages: number[],
  ) {
    const isSelected = selectedCovenantIds.includes(covenantId);
    const isRecommended = recommendedCovenantIds.has(covenantId);
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
        onClick={() => toggleCovenant(covenantId, selectableStages)}
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
        onClick={() => toggleCurrentLevel(level)}
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
        onClick={() => setMaxPopulation(population)}
      >
        {population} 人
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

  function buildOperatorCategoryRows(operators: OperatorEntity[]) {
    return operatorCategoryOrder
      .map((category) => ({
        category,
        operators: operators.filter((operator) => operator.priorityBucket === category),
      }))
      .filter((row) => row.operators.length > 0);
  }

  function renderOperatorCard(
    covenantId: string,
    operator: OperatorEntity,
    extraClassName?: string,
    searchHighlightKeywords: string[] = [],
  ) {
    const isPicked = pickedOperatorIdSet.has(operator.id);
    const isRecommendedCard = covenantId === 'recommended';
    const matchedSelectedCovenants = getMatchedSelectedCovenants(operator);
    const visibleCovenants = isRecommendedCard
      ? operator.covenants
      : matchedSelectedCovenants;
    const traitTagSet = new Set(
      operator.traitTags.map((tag) => tag.toLocaleLowerCase('zh-CN')),
    );
    const highlightKeywords = [
      ...searchHighlightKeywords,
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
          extraClassName,
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
            <div className={styles.operatorNameGroup}>
              <span className={styles.operatorName}>{operator.name}</span>
              <span
                className={styles.operatorTier}
                aria-label={operator.tierLabel}
                title={operator.tierLabel}
              >
                {operatorTierRomanMap[operator.tier]}
              </span>
            </div>
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
          {(isRecommendedCard || matchedSelectedCovenants.length >= 2) &&
          visibleCovenants.length > 0 ? (
            <div className={styles.matchedCovenants}>
              {!isRecommendedCard ? (
                <span className={styles.matchedCovenantsLabel}>命中盟约</span>
              ) : null}
              {visibleCovenants.map((covenantId) => (
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

  function renderOperatorGrid(covenantId: string, operatorList: OperatorEntity[]) {
    return renderOperatorGridWithHighlights(covenantId, operatorList, []);
  }

  function renderOperatorGridWithHighlights(
    covenantId: string,
    operatorList: OperatorEntity[],
    searchHighlightKeywords: string[],
  ) {
    const categoryRows = buildOperatorCategoryRows(operatorList);

    return (
      <div className={styles.operatorGrid}>
        {categoryRows.map(({ category, operators }) => (
          <section
            className={styles.operatorCategoryRow}
            key={`${covenantId}-${category}`}
          >
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
                {operators.length} 名
              </span>
            </div>

            <div className={styles.operatorRowCards}>
              {operators.map((operator) =>
                renderOperatorCard(
                  covenantId,
                  operator,
                  undefined,
                  searchHighlightKeywords,
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    );
  }

  function renderSearchResultSection() {
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
          renderOperatorGridWithHighlights(
            'search-results',
            searchResultOperators,
            searchKeywords,
          )
        ) : (
          <div className={styles.searchResultEmpty}>
            当前没有命中干员，试试减少关键词或调整当前等级。
          </div>
        )}
      </section>
    );
  }

  function renderRecommendationSection() {
    if (selectedCovenantIds.length === 0 && removedOperators.length === 0) {
      return null;
    }

    const hasRequirements = selectedCovenantRequirements.length > 0;
    const hasRemovedPanel = removedOperators.length > 0;
    const isImpossible = recommendedLineup.reason !== null;
    const sortedRecommendedOperators = [...recommendedLineup.operators].sort(
      (left, right) =>
        right.tier - left.tier ||
        left.priorityWeight - right.priorityWeight ||
        left.name.localeCompare(right.name, 'zh-Hans-CN'),
    );

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
                {sortedRecommendedOperators.map((operator) =>
                  renderOperatorCard('recommended', operator),
                )}
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
                onClick={() => restoreRemovedOperators()}
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
                  onClick={() => toggleRemovedOperator(operator.id)}
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

      {renderSearchResultSection()}

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
              {selectablePopulations.map((population) =>
                renderPopulationChip(population),
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
          <button className={styles.resetButton} type="button" onClick={() => reset()}>
            重置
          </button>
        </div>
      </section>

      {renderRecommendationSection()}

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
          {(() => {
            const multiHitOperators = visibleOperators.filter(isMultiHitOperator);
            const priorityGroups = buildSectionGroups(isPriorityOperator);
            const otherGroups = buildSectionGroups(
              (operator) => !isMultiHitOperator(operator) && !isPriorityOperator(operator),
            );

            return (
              <>
                {/* {multiHitOperators.length > 0 ? (
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

                    {renderOperatorGrid('multi-hit', multiHitOperators)}
                  </section>
                ) : null} */}

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
                          先看持续叠加、单次叠加和特异化这三类核心特质
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

                          {renderOperatorGrid(group.covenantId, group.operators)}
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

                          {renderOperatorGrid(group.covenantId, group.operators)}
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

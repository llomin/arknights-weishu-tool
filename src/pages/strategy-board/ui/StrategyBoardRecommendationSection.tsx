import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { createPortal } from 'react-dom';
import { covenantMap } from '@/entities/covenant/model/normalizeCovenants';
import {
  buildRecommendedLineup,
  type RecommendedLineupResult,
} from '@/entities/operator/model/buildRecommendedLineup';
import {
  compareRecommendedOperatorsForDisplay,
  operatorTierRomanMap,
} from '@/pages/strategy-board/model/strategyBoardDisplay';
import { getSearchKeywords } from '@/shared/lib/searchKeywords';
import { normalizeSearchText } from '@/shared/lib/normalizeSearchText';
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

interface RecommendationSelectorState {
  mode: 'replace' | 'add';
  operatorId: string | null;
}

interface RecommendationCandidateEntry {
  operator: OperatorEntity;
  selectable: boolean;
  statusText: string;
}

export interface StrategyBoardRecommendationSectionProps {
  availableOperators?: OperatorEntity[];
  blockedRecommendedOperatorIdSet?: Set<string>;
  currentRecommendedOperatorIds?: string[];
  maxPopulation: StrategyState['maxPopulation'];
  onAddRecommendedOperator?: (
    nextOperatorId: string,
    nextRecommendedOperatorIds: string[],
  ) => void;
  onDeleteRecommendedOperator?: (
    operatorId: string,
    nextRecommendedOperatorIds: string[],
  ) => void;
  onReplaceRecommendedOperator?: (
    currentOperatorId: string,
    nextOperatorId: string,
    nextRecommendedOperatorIds: string[],
  ) => void;
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

function matchesRecommendationCandidateSearch(
  operator: OperatorEntity,
  searchKeywords: string[],
) {
  if (searchKeywords.length === 0) {
    return true;
  }

  const normalizedOperatorName = normalizeSearchText(operator.name);

  return searchKeywords.every(
    (keyword) =>
      normalizedOperatorName.includes(keyword) || operator.searchText.includes(keyword),
  );
}

export function StrategyBoardRecommendationSection({
  availableOperators = [],
  blockedRecommendedOperatorIdSet = new Set<string>(),
  currentRecommendedOperatorIds = [],
  maxPopulation,
  onAddRecommendedOperator = () => {},
  onDeleteRecommendedOperator = () => {},
  onReplaceRecommendedOperator = () => {},
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
  const [openedOperatorMenuId, setOpenedOperatorMenuId] = useState<string | null>(null);
  const [selectorState, setSelectorState] =
    useState<RecommendationSelectorState | null>(null);
  const [candidateSearchKeyword, setCandidateSearchKeyword] = useState('');
  const [candidateCovenantFilterId, setCandidateCovenantFilterId] = useState('all');

  const hasRequirements = recommendedLineup.requirements.length > 0;
  const hasRemovedPanel = removedOperators.length > 0;
  const isImpossible = recommendedLineup.reason !== null;
  const availableOperatorMap = availableOperators.reduce<Record<string, OperatorEntity>>(
    (map, operator) => {
      map[operator.id] = operator;
      return map;
    },
    {},
  );
  const currentRecommendedOperatorIdSet = new Set(currentRecommendedOperatorIds);
  const selectorTargetOperatorId = selectorState?.mode === 'replace' ? selectorState.operatorId : null;
  const selectorTargetOperator =
    selectorTargetOperatorId === null
      ? null
      : availableOperatorMap[selectorTargetOperatorId] ??
        recommendedOperators.find((operator) => operator.id === selectorTargetOperatorId) ??
        null;
  const candidateSearchKeywords = getSearchKeywords(candidateSearchKeyword);

  function closeRecommendationSelector() {
    setSelectorState(null);
    setCandidateSearchKeyword('');
    setCandidateCovenantFilterId('all');
  }

  function openRecommendationSelector(nextSelectorState: RecommendationSelectorState) {
    setOpenedOperatorMenuId(null);
    setCandidateSearchKeyword('');
    setCandidateCovenantFilterId('all');
    setSelectorState(nextSelectorState);
  }

  useEffect(() => {
    if (selectorState === null || typeof document === 'undefined') {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRecommendationSelector();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectorState]);

  if (selectedCovenantCount === 0 && removedOperators.length === 0) {
    return null;
  }

  function buildNextRecommendationLineup(
    nextRecommendedOperatorIds: string[],
    nextBlockedOperatorIds: string[],
  ) {
    return buildRecommendedLineup(
      availableOperators.filter(
        (operator) =>
          !nextBlockedOperatorIds.includes(operator.id) ||
          nextRecommendedOperatorIds.includes(operator.id),
      ),
      recommendedLineup.requirements,
      maxPopulation,
      {
        preferredOperators: nextRecommendedOperatorIds
          .map((operatorId) => availableOperatorMap[operatorId])
          .filter((operator): operator is OperatorEntity => Boolean(operator)),
      },
    );
  }

  function canDeleteRecommendedOperator(operatorId: string) {
    const nextRecommendedOperatorIds = currentRecommendedOperatorIds.filter(
      (currentOperatorId) => currentOperatorId !== operatorId,
    );
    const nextBlockedOperatorIds = [
      ...blockedRecommendedOperatorIdSet,
      operatorId,
    ];
    const nextLineup = buildNextRecommendationLineup(
      nextRecommendedOperatorIds,
      nextBlockedOperatorIds,
    );

    return (
      nextLineup.reason === null &&
      nextLineup.operators.every((operator) => operator.id !== operatorId)
    );
  }

  const candidateFilterCovenantIds =
    selectorState === null
      ? []
      : [
          ...new Set(
            availableOperators.flatMap((operator) => operator.covenants).filter(Boolean),
          ),
        ].sort((left, right) => {
          const leftSelected = selectedCovenantIdSet.has(left);
          const rightSelected = selectedCovenantIdSet.has(right);

          if (leftSelected !== rightSelected) {
            return Number(rightSelected) - Number(leftSelected);
          }

          const leftRequirementIndex = recommendedLineup.requirements.findIndex(
            (requirement) => requirement.id === left,
          );
          const rightRequirementIndex = recommendedLineup.requirements.findIndex(
            (requirement) => requirement.id === right,
          );
          const normalizedLeftRequirementIndex =
            leftRequirementIndex === -1 ? Number.MAX_SAFE_INTEGER : leftRequirementIndex;
          const normalizedRightRequirementIndex =
            rightRequirementIndex === -1 ? Number.MAX_SAFE_INTEGER : rightRequirementIndex;

          if (normalizedLeftRequirementIndex !== normalizedRightRequirementIndex) {
            return normalizedLeftRequirementIndex - normalizedRightRequirementIndex;
          }

          return (covenantMap[left]?.name ?? left).localeCompare(
            covenantMap[right]?.name ?? right,
            'zh-Hans-CN',
          );
        });

  const candidateEntries: RecommendationCandidateEntry[] =
    selectorState === null
      ? []
      : availableOperators
          .filter((operator) =>
            candidateCovenantFilterId === 'all'
              ? true
              : operator.covenants.includes(candidateCovenantFilterId),
          )
          .filter((operator) =>
            matchesRecommendationCandidateSearch(operator, candidateSearchKeywords),
          )
          .map((operator) => {
            if (
              selectorTargetOperatorId !== operator.id &&
              currentRecommendedOperatorIdSet.has(operator.id)
            ) {
              return {
                operator,
                selectable: false,
                statusText: '已在阵容中',
              };
            }

            const nextRecommendedOperatorIds =
              selectorTargetOperatorId === null
                ? [...currentRecommendedOperatorIds, operator.id]
                : currentRecommendedOperatorIds.map((currentOperatorId) =>
                    currentOperatorId === selectorTargetOperatorId
                      ? operator.id
                      : currentOperatorId,
                  );

            if (
              nextRecommendedOperatorIds.length > maxPopulation ||
              new Set(nextRecommendedOperatorIds).size !==
                nextRecommendedOperatorIds.length
            ) {
              return {
                operator,
                selectable: false,
                statusText: '已达上限',
              };
            }

            const nextBlockedOperatorIds = [...blockedRecommendedOperatorIdSet].filter(
              (blockedOperatorId) => blockedOperatorId !== operator.id,
            );
            const selectable =
              selectorState.mode === 'replace'
                ? true
                : (() => {
                    const nextLineup = buildNextRecommendationLineup(
                      nextRecommendedOperatorIds,
                      nextBlockedOperatorIds,
                    );

                    return (
                      nextLineup.reason === null &&
                      nextLineup.operators.some(
                        (recommendedOperator) =>
                          recommendedOperator.id === operator.id,
                      ) &&
                      (selectorTargetOperatorId === null ||
                        nextLineup.operators.every(
                          (recommendedOperator) =>
                            recommendedOperator.id !== selectorTargetOperatorId,
                        ))
                    );
                  })();

            return {
              operator,
              selectable,
              statusText:
                selectable || selectorState.mode === 'replace'
                  ? '可选'
                  : '不满足当前组合',
            };
          })
          .sort(
            (left, right) =>
              Number(right.selectable) - Number(left.selectable) ||
              compareRecommendedOperatorsForDisplay(
                left.operator,
                right.operator,
                selectedCovenantIdSet,
                selectedPrimaryCovenantIdSet,
              ),
          );

  function renderRecommendationActionMenu(operator: OperatorEntity) {
    const isMenuOpen = openedOperatorMenuId === operator.id;
    const canDelete = canDeleteRecommendedOperator(operator.id);

    return (
      <div
        className={clsx(
          styles.operatorActionSlot,
          isMenuOpen && styles.operatorActionSlotVisible,
        )}
      >
        <button
          type="button"
          className={clsx(
            styles.operatorActionButton,
            isMenuOpen && styles.operatorActionButtonActive,
          )}
          aria-label={`推荐卡片操作 ${operator.name}`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setOpenedOperatorMenuId((currentMenuId) =>
              currentMenuId === operator.id ? null : operator.id,
            );
          }}
        >
          ···
        </button>
        <div
          className={styles.operatorActionPanel}
          role="menu"
          aria-label={`${operator.name} 操作`}
        >
          <button
            type="button"
            className={styles.operatorActionItem}
            aria-label={`替换推荐干员 ${operator.name}`}
            onClick={(event) => {
              event.stopPropagation();
              openRecommendationSelector({
                mode: 'replace',
                operatorId: operator.id,
              });
            }}
          >
            替换
          </button>
          <button
            type="button"
            className={clsx(styles.operatorActionItem, styles.operatorActionItemDanger)}
            aria-label={`移除推荐干员 ${operator.name}`}
            disabled={!canDelete}
            onClick={(event) => {
              event.stopPropagation();
              if (!canDelete) {
                return;
              }

              setOpenedOperatorMenuId(null);
              onDeleteRecommendedOperator(
                operator.id,
                currentRecommendedOperatorIds.filter(
                  (currentOperatorId) => currentOperatorId !== operator.id,
                ),
              );
            }}
          >
            移除
          </button>
        </div>
      </div>
    );
  }

  const recommendationSelectorModal =
    selectorState !== null && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={styles.recommendationPickerOverlay}
            onClick={closeRecommendationSelector}
          >
            <div
              className={styles.recommendationPicker}
              role="dialog"
              aria-modal="true"
              aria-label={
                selectorTargetOperator !== null
                  ? `替换 ${selectorTargetOperator.name}`
                  : '填补空位'
              }
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.recommendationPickerHeader}>
                <div className={styles.recommendationPickerTitleGroup}>
                  <h3 className={styles.recommendationPickerTitle}>
                    {selectorTargetOperator !== null
                      ? `替换 ${selectorTargetOperator.name}`
                      : '填补空位'}
                  </h3>
                  <p className={styles.recommendationPickerHint}>
                    先看可选干员，再按盟约或搜索词进一步筛选。
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.recommendationPickerCloseButton}
                  aria-label="关闭候选面板"
                  onClick={closeRecommendationSelector}
                >
                  关闭
                </button>
              </div>

              <div className={styles.recommendationPickerControls}>
                <label className={styles.recommendationPickerSearchLabel}>
                  <span className={styles.filterLabel}>搜索</span>
                  <input
                    className={styles.recommendationPickerSearchInput}
                    type="search"
                    aria-label="搜索候选干员"
                    value={candidateSearchKeyword}
                    onChange={(event) =>
                      setCandidateSearchKeyword(event.currentTarget.value)
                    }
                  />
                </label>

                <div className={styles.recommendationPickerFilterRow}>
                  <button
                    type="button"
                    className={clsx(
                      styles.covenantChip,
                      styles.levelChip,
                      candidateCovenantFilterId === 'all' && styles.levelChipSelected,
                    )}
                    aria-pressed={candidateCovenantFilterId === 'all'}
                    onClick={() => setCandidateCovenantFilterId('all')}
                  >
                    全部
                  </button>
                  {candidateFilterCovenantIds.map((covenantId) => (
                    <button
                      key={`candidate-filter-${covenantId}`}
                      type="button"
                      className={clsx(
                        styles.covenantChip,
                        styles.recommendationPickerFilterChip,
                        selectedCovenantIdSet.has(covenantId) &&
                          styles.recommendationPickerFilterChipSelectedCovenant,
                        candidateCovenantFilterId === covenantId && styles.covenantChipSelected,
                      )}
                      aria-pressed={candidateCovenantFilterId === covenantId}
                      onClick={() => setCandidateCovenantFilterId(covenantId)}
                    >
                      {covenantMap[covenantId]?.name ?? covenantId}
                    </button>
                  ))}
                </div>
              </div>

              {candidateEntries.length > 0 ? (
                <div className={styles.recommendationCandidateGrid}>
                  {candidateEntries.map(({ operator, selectable, statusText }) => (
                    <button
                      key={`candidate-${operator.id}`}
                      type="button"
                      className={clsx(
                        styles.recommendationCandidateButton,
                        tierClassNameMap[operator.tier],
                        !selectable && styles.recommendationCandidateButtonDisabled,
                      )}
                      aria-label={`选择 ${operator.name}`}
                      disabled={!selectable}
                      title={statusText}
                      onClick={() => {
                        const nextRecommendedOperatorIds =
                          selectorTargetOperatorId === null
                            ? [...currentRecommendedOperatorIds, operator.id]
                            : currentRecommendedOperatorIds.map((currentOperatorId) =>
                                currentOperatorId === selectorTargetOperatorId
                                  ? operator.id
                                  : currentOperatorId,
                              );

                        if (selectorTargetOperatorId === null) {
                          onAddRecommendedOperator(operator.id, nextRecommendedOperatorIds);
                        } else {
                          onReplaceRecommendedOperator(
                            selectorTargetOperatorId,
                            operator.id,
                            nextRecommendedOperatorIds,
                          );
                        }

                        closeRecommendationSelector();
                      }}
                    >
                      <span className={styles.recommendationCandidateTopRow}>
                        <span className={styles.recommendationCandidateName}>
                          {operator.name}
                        </span>
                        <span
                          className={styles.operatorTier}
                          aria-label={operator.tierLabel}
                        >
                          {operatorTierRomanMap[operator.tier]}
                        </span>
                      </span>
                      <span
                        className={clsx(
                          styles.recommendationCandidateStatus,
                          !selectable && styles.recommendationCandidateStatusDisabled,
                        )}
                      >
                        {statusText}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={styles.recommendationIdle}>
                  当前筛选没有命中候选干员，试试切换盟约或减少搜索词。
                </div>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

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
                ? '支持替换、移除或为空位指定干员；若指定结果不满足当前盟约，会保留阵容并给出提示。'
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
                  topRightSlot={renderRecommendationActionMenu(operator)}
                  onToggleOperator={onToggleOperator}
                />
              ))}
              {Array.from({ length: recommendedLineup.emptySlotCount }, (_, index) => (
                <button
                  className={clsx(
                    styles.recommendationPlaceholder,
                    styles.recommendationPlaceholderButton,
                  )}
                  key={`recommended-empty-${index}`}
                  type="button"
                  aria-label={`选择空位干员 ${index + 1}`}
                  onClick={() =>
                    openRecommendationSelector({ mode: 'add', operatorId: null })
                  }
                >
                  <span className={styles.recommendationPlaceholderMark}>~</span>
                  <span className={styles.recommendationPlaceholderText}>空位</span>
                </button>
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
      {recommendationSelectorModal}
    </section>
  );
}

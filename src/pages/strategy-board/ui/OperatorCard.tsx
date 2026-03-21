import clsx from 'clsx';
import {
  getMatchedSelectedCovenants,
  hasMatchedPrimarySelectedCovenant,
  operatorTierRomanMap,
} from '@/pages/strategy-board/model/strategyBoardDisplay';
import { buildHighlightSegments } from '@/shared/lib/highlightText';
import type { OperatorEntity } from '@/shared/types/domain';
import styles from '../StrategyBoardPage.module.css';

const tierClassNameMap = {
  6: styles.tier6,
  5: styles.tier5,
  4: styles.tier4,
  3: styles.tier3,
  2: styles.tier2,
  1: styles.tier1,
} as const;

export interface OperatorCardProps {
  covenantId: string;
  extraClassName?: string;
  onToggleOperator: (operatorId: string) => void;
  onToggleRemovedOperator: (operatorId: string) => void;
  operator: OperatorEntity;
  picked: boolean;
  searchHighlightKeywords?: string[];
  selectedCovenantIdSet: Set<string>;
  selectedPrimaryCovenantIdSet: Set<string>;
}

export function OperatorCard({
  covenantId,
  extraClassName,
  onToggleOperator,
  onToggleRemovedOperator,
  operator,
  picked,
  searchHighlightKeywords = [],
  selectedCovenantIdSet,
  selectedPrimaryCovenantIdSet,
}: OperatorCardProps) {
  const isRecommendedCard = covenantId === 'recommended';
  const isRecommendedPrimaryOperatorCard =
    isRecommendedCard &&
    hasMatchedPrimarySelectedCovenant(operator, selectedPrimaryCovenantIdSet);
  const matchedSelectedCovenants = getMatchedSelectedCovenants(
    operator,
    selectedCovenantIdSet,
  );
  const visibleCovenants = isRecommendedCard
    ? operator.covenants
    : selectedCovenantIdSet.has(covenantId)
      ? matchedSelectedCovenants.filter(
          (matchedCovenantId) => matchedCovenantId !== covenantId,
        )
      : matchedSelectedCovenants.length >= 2
        ? matchedSelectedCovenants
        : [];
  const highlightedCovenantIdSet = isRecommendedCard
    ? new Set(
        visibleCovenants.filter((visibleCovenantId) =>
          selectedCovenantIdSet.has(visibleCovenantId),
        ),
      )
    : new Set<string>();
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
  const operatorCardKey = `${covenantId}-${operator.id}`;
  const card = (
    <article
      key={operatorCardKey}
      className={clsx(
        styles.operatorCard,
        tierClassNameMap[operator.tier],
        extraClassName,
        picked && styles.operatorCardPicked,
      )}
      role="button"
      tabIndex={0}
      onClick={() => onToggleOperator(operator.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggleOperator(operator.id);
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
            onToggleRemovedOperator(operator.id);
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
        {visibleCovenants.length > 0 ? (
          <div className={styles.matchedCovenants}>
            {visibleCovenants.map((visibleCovenantId) => (
              <span
                className={clsx(
                  styles.matchedCovenantChip,
                  highlightedCovenantIdSet.has(visibleCovenantId) &&
                    styles.matchedCovenantChipHighlighted,
                )}
                key={`${operator.id}-${visibleCovenantId}`}
              >
                {visibleCovenantId}
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

  if (isRecommendedPrimaryOperatorCard) {
    return (
      <div key={operatorCardKey} className={styles.recommendationPrimaryOperatorCard}>
        {card}
      </div>
    );
  }

  return card;
}

import { createElement } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { covenantMap } from '@/entities/covenant/model/normalizeCovenants';
import { operators } from '@/entities/operator/model/normalizeOperators';
import { OperatorCard } from '@/pages/strategy-board/ui/OperatorCard';
import styles from '@/pages/strategy-board/StrategyBoardPage.module.css';

function findGroupCardScenario() {
  const operator = operators.find((item) => item.covenants.length >= 2);

  if (!operator) {
    throw new Error('未找到可用于普通分组卡片测试的多盟约干员');
  }

  return {
    operator,
    currentGroupId: operator.covenants[0]!,
    selectedCovenantIds: operator.covenants.slice(0, 2),
  };
}

function findRecommendedCardScenario() {
  const operator = operators.find(
    (item) =>
      item.covenants.some((covenantId) => covenantMap[covenantId]?.isPrimary) &&
      item.covenants.length >= 2,
  );

  if (!operator) {
    throw new Error('未找到可用于推荐卡片测试的干员');
  }

  const primarySelectedCovenantId = operator.covenants.find(
    (covenantId) => covenantMap[covenantId]?.isPrimary,
  );

  if (!primarySelectedCovenantId) {
    throw new Error('推荐卡片测试场景缺少已选主要盟约');
  }

  return {
    operator,
    selectedCovenantIds: [primarySelectedCovenantId],
    plainCovenantIds: operator.covenants.filter(
      (covenantId) => covenantId !== primarySelectedCovenantId,
    ),
  };
}

describe('OperatorCard', () => {
  it('shows only extra matched covenants in a normal group card', () => {
    const { operator, currentGroupId, selectedCovenantIds } = findGroupCardScenario();

    render(
      createElement(OperatorCard, {
        covenantId: currentGroupId,
        operator,
        picked: false,
        selectedCovenantIdSet: new Set(selectedCovenantIds),
        selectedPrimaryCovenantIdSet: new Set<string>(),
        onToggleOperator: vi.fn(),
        onToggleRemovedOperator: vi.fn(),
      }),
    );

    expect(screen.queryByText(currentGroupId)).not.toBeInTheDocument();

    for (const covenantId of selectedCovenantIds.slice(1)) {
      expect(screen.getByText(covenantId)).toBeInTheDocument();
    }
  });

  it('highlights only selected covenants in a recommended card', () => {
    const { operator, selectedCovenantIds, plainCovenantIds } =
      findRecommendedCardScenario();
    const highlightedChipClassName = styles.matchedCovenantChipHighlighted;
    const primaryWrapperClassName = styles.recommendationPrimaryOperatorCard;

    if (!highlightedChipClassName || !primaryWrapperClassName) {
      throw new Error('推荐卡片测试缺少关键样式类');
    }

    render(
      createElement(OperatorCard, {
        covenantId: 'recommended',
        operator,
        picked: false,
        selectedCovenantIdSet: new Set(selectedCovenantIds),
        selectedPrimaryCovenantIdSet: new Set(selectedCovenantIds),
        onToggleOperator: vi.fn(),
        onToggleRemovedOperator: vi.fn(),
      }),
    );

    const card = screen.getByRole('button', { name: `禁用 ${operator.name}` }).closest('article');

    if (!card) {
      throw new Error(`未找到干员 ${operator.name} 的卡片`);
    }

    expect(card.parentElement).toHaveClass(primaryWrapperClassName);

    for (const covenantId of selectedCovenantIds) {
      expect(within(card).getByText(covenantId)).toHaveClass(highlightedChipClassName);
    }

    for (const covenantId of plainCovenantIds) {
      expect(within(card).getByText(covenantId)).toBeInTheDocument();
      expect(within(card).getByText(covenantId)).not.toHaveClass(
        highlightedChipClassName,
      );
    }
  });
});

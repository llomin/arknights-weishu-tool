import { startTransition, useDeferredValue } from 'react';
import clsx from 'clsx';
import { covenants } from '@/entities/covenant/model/normalizeCovenants';
import {
  operators,
} from '@/entities/operator/model/normalizeOperators';
import { buildOperatorGroups } from '@/entities/operator/model/buildOperatorGroups';
import { filterOperators } from '@/entities/operator/model/queryOperators';
import { useStrategyStore } from '@/features/strategy/model/useStrategyStore';
import styles from './StrategyBoardPage.module.css';

const priorityLabelMap = {
  each_and_layers: '每 + 层数',
  layers: '层数',
  gain: '获得',
  same_as: '与其相同',
  other: '其他',
} as const;

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
  const toggleCovenant = useStrategyStore((state) => state.toggleCovenant);
  const toggleOperator = useStrategyStore((state) => state.toggleOperator);
  const setSearchKeyword = useStrategyStore((state) => state.setSearchKeyword);
  const reset = useStrategyStore((state) => state.reset);

  const deferredSearchKeyword = useDeferredValue(searchKeyword);
  const visibleOperators = filterOperators(
    operators,
    selectedCovenantIds,
    deferredSearchKeyword,
  );
  const groups = buildOperatorGroups(
    operators,
    selectedCovenantIds,
    deferredSearchKeyword,
  );
  const pickedOperatorIdSet = new Set(pickedOperatorIds);
  const pickedVisibleCount = visibleOperators.filter((operator) =>
    pickedOperatorIdSet.has(operator.id),
  ).length;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <p className={styles.eyebrow}>Wei Shu Protocol Strategy Board</p>
        <h1 className={styles.title}>卫戍协议拿牌策略工具</h1>
        <p className={styles.description}>
          按你这一局准备游玩的盟约快速筛选干员，按规则分组排序，并标记已经拿到的牌。
          搜索会直接匹配干员描述，适合临时调整盟约路线时快速查牌。
        </p>

        <div className={styles.statusGrid}>
          <article className={styles.statusCard}>
            <p className={styles.statusLabel}>已选盟约</p>
            <p className={styles.statusValue}>{selectedCovenantIds.length}</p>
            <p className={styles.statusHint}>
              总盟约 {covenants.length} 个，支持多选与动态调整。
            </p>
          </article>
          <article className={styles.statusCard}>
            <p className={styles.statusLabel}>命中干员</p>
            <p className={styles.statusValue}>{visibleOperators.length}</p>
            <p className={styles.statusHint}>
              交集条件为“已选盟约 + 描述搜索”。
            </p>
          </article>
          <article className={styles.statusCard}>
            <p className={styles.statusLabel}>已拿牌</p>
            <p className={styles.statusValue}>{pickedVisibleCount}</p>
            <p className={styles.statusHint}>
              当前可见结果中已拿牌 {pickedVisibleCount} 张，总计{' '}
              {pickedOperatorIds.length} 张。
            </p>
          </article>
        </div>
      </section>

      <section className={styles.controlGrid}>
        <article className={styles.controlPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>盟约筛选</h2>
              <p className={styles.panelSubtitle}>
                先选本局准备走的盟约路线，再看各组优先级靠前的干员。
              </p>
            </div>
            <button
              className={styles.resetButton}
              type="button"
              onClick={() => reset()}
            >
              清空本局
            </button>
          </div>

          <div className={styles.chipGrid}>
            {covenants.map((covenant) => {
              const isSelected = selectedCovenantIds.includes(covenant.id);

              return (
                <button
                  key={covenant.id}
                  type="button"
                  className={clsx(
                    styles.covenantChip,
                    isSelected && styles.covenantChipSelected,
                  )}
                  aria-pressed={isSelected}
                  onClick={() => toggleCovenant(covenant.id)}
                  title={covenant.description}
                >
                  <span className={styles.covenantChipName}>{covenant.name}</span>
                  <span className={styles.covenantChipMeta}>
                    激活 {covenant.activationCount} 人
                  </span>
                </button>
              );
            })}
          </div>
        </article>

        <article className={styles.controlPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>描述搜索</h2>
              <p className={styles.panelSubtitle}>
                直接搜描述关键字，例如“层数”“获得”“冻结”。
              </p>
            </div>
          </div>

          <label className={styles.searchBox}>
            <span className={styles.searchLabel}>搜索干员描述</span>
            <input
              className={styles.searchInput}
              type="text"
              value={searchKeyword}
              placeholder="输入关键字筛选干员描述"
              onChange={(event) => {
                const nextKeyword = event.target.value;

                startTransition(() => {
                  setSearchKeyword(nextKeyword);
                });
              }}
            />
          </label>

          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>可见分组</span>
              <strong className={styles.summaryValue}>{groups.length}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>搜索状态</span>
              <strong className={styles.summaryValue}>
                {deferredSearchKeyword.trim().length > 0 ? '已过滤' : '全部'}
              </strong>
            </div>
          </div>
        </article>
      </section>

      {selectedCovenantIds.length === 0 ? (
        <section className={styles.emptyState}>
          <p className={styles.emptyEyebrow}>从盟约开始</p>
          <h2 className={styles.emptyTitle}>先选择你这一局准备游玩的盟约</h2>
          <p className={styles.emptyDescription}>
            选择后会自动按盟约分组展示干员，并按照“每 + 层数、层数、获得、与其相同、其他”的优先级排序。
          </p>
        </section>
      ) : groups.length === 0 ? (
        <section className={styles.emptyState}>
          <p className={styles.emptyEyebrow}>没有命中结果</p>
          <h2 className={styles.emptyTitle}>当前搜索没有匹配到干员</h2>
          <p className={styles.emptyDescription}>
            保留已选盟约不变，清空搜索词后会重新展示该路线下的全部干员。
          </p>
        </section>
      ) : (
        <section className={styles.groupStack}>
          {groups.map((group) => (
            <article className={styles.groupPanel} key={group.covenantId}>
              <header className={styles.groupHeader}>
                <div>
                  <p className={styles.groupEyebrow}>盟约分组</p>
                  <h2 className={styles.groupTitle}>{group.covenantName}</h2>
                </div>
                <div className={styles.groupMeta}>
                  <span className={styles.groupMetaItem}>
                    激活 {group.activationCount} 人
                  </span>
                  <span className={styles.groupMetaItem}>
                    命中 {group.operators.length} 名干员
                  </span>
                </div>
              </header>

              <div className={styles.operatorGrid}>
                {group.operators.map((operator) => {
                  const isPicked = pickedOperatorIdSet.has(operator.id);

                  return (
                    <button
                      key={`${group.covenantId}-${operator.id}`}
                      type="button"
                      className={clsx(
                        styles.operatorCard,
                        tierClassNameMap[operator.tier],
                        isPicked && styles.operatorCardPicked,
                      )}
                      aria-pressed={isPicked}
                      onClick={() => toggleOperator(operator.id)}
                    >
                      <div className={styles.operatorCardHeader}>
                        <div>
                          <p className={styles.operatorName}>{operator.name}</p>
                          <div className={styles.operatorMetaRow}>
                            <span className={styles.operatorTier}>
                              {operator.tierLabel}
                            </span>
                            <span className={styles.operatorPriority}>
                              {priorityLabelMap[operator.priorityBucket]}
                            </span>
                          </div>
                        </div>
                        <span
                          className={clsx(
                            styles.pickBadge,
                            isPicked && styles.pickBadgePicked,
                          )}
                        >
                          {isPicked ? '已拿牌' : '未拿牌'}
                        </span>
                      </div>

                      <div className={styles.operatorTags}>
                        {operator.covenants.map((covenantId) => (
                          <span className={styles.operatorTag} key={covenantId}>
                            {covenantId}
                          </span>
                        ))}
                        <span className={styles.operatorTag}>
                          {operator.traitCategory}
                        </span>
                      </div>

                      <p className={styles.operatorDescription}>
                        {operator.description}
                      </p>
                    </button>
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

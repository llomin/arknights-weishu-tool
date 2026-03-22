import { useRef, useState, type ChangeEvent } from 'react';
import clsx from 'clsx';
import {
  covenantMap,
  primaryCovenants,
  secondaryCovenants,
} from '@/entities/covenant/model/normalizeCovenants';
import {
  selectableLevels,
  selectablePopulations,
} from '@/pages/strategy-board/model/strategyBoardDisplay';
import type {
  CovenantPreset,
  OperatorEntity,
  StrategyState,
} from '@/shared/types/domain';
import styles from '../StrategyBoardPage.module.css';

export interface StrategyBoardFiltersProps {
  covenantPresets: CovenantPreset[];
  currentLevel: StrategyState['currentLevel'];
  maxPopulation: StrategyState['maxPopulation'];
  maxVisibleTier: number | null;
  onApplyCovenantPreset: (presetId: string) => void;
  onDeleteCovenantPreset: (presetId: string) => void;
  onImportCovenantPresets: (value: unknown) => void;
  onRenameCovenantPreset: (presetId: string, name: string) => void;
  onReset: () => void;
  onSaveCovenantPreset: (name: string) => void;
  onSetMaxPopulation: (population: StrategyState['maxPopulation']) => void;
  onToggleCovenant: (covenantId: string, activationStages: number[]) => void;
  onToggleCurrentLevel: (level: OperatorEntity['tier']) => void;
  onUpdateCovenantPreset: (presetId: string) => void;
  selectedCovenantIds: string[];
  selectedCovenantTargetMap: StrategyState['selectedCovenantTargetMap'];
}

function formatSelectedCovenantEntry(
  covenantId: string,
  selectedCovenantTargetMap: StrategyState['selectedCovenantTargetMap'],
) {
  const covenantName = covenantMap[covenantId]?.name ?? covenantId;
  const targetCount = selectedCovenantTargetMap[covenantId];

  if (targetCount === undefined) {
    return null;
  }

  return `${covenantName}${targetCount}`;
}

function buildDefaultPresetName(
  selectedCovenantIds: string[],
  selectedCovenantTargetMap: StrategyState['selectedCovenantTargetMap'],
) {
  return selectedCovenantIds
    .map((covenantId) =>
      formatSelectedCovenantEntry(covenantId, selectedCovenantTargetMap),
    )
    .filter((item): item is string => item !== null)
    .join('-');
}

function buildPresetDetailLine(
  preset: CovenantPreset,
  isPrimary: boolean,
) {
  const entries = preset.selectedCovenantIds
    .filter((covenantId) => covenantMap[covenantId]?.isPrimary === isPrimary)
    .map((covenantId) => {
      const covenantName = covenantMap[covenantId]?.name ?? covenantId;
      const targetCount = preset.selectedCovenantTargetMap[covenantId];

      if (targetCount === undefined) {
        return null;
      }

      return `${covenantName} ${targetCount}人`;
    })
    .filter((item): item is string => item !== null);

  return `${isPrimary ? '主要盟约' : '次要盟约'}：${entries.join('、') || '无'}`;
}

function buildPresetTitle(preset: CovenantPreset) {
  return [buildPresetDetailLine(preset, true), buildPresetDetailLine(preset, false)].join(
    '\n',
  );
}

function buildPresetExportPayload(preset: CovenantPreset) {
  return {
    id: preset.id,
    name: preset.name,
    selectedCovenantIds: [...preset.selectedCovenantIds],
    selectedCovenantTargetMap: { ...preset.selectedCovenantTargetMap },
  };
}

function sanitizePresetFileName(name: string) {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return 'preset';
  }

  return trimmedName.replace(/[\\/:*?"<>|]+/g, '-');
}

function downloadJsonFile(filename: string, value: unknown) {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return;
  }

  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const objectUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');

  downloadLink.href = objectUrl;
  downloadLink.download = filename;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(objectUrl);
}

function matchesPresetSelection(
  preset: CovenantPreset,
  selectedCovenantIds: string[],
  selectedCovenantTargetMap: StrategyState['selectedCovenantTargetMap'],
) {
  if (preset.selectedCovenantIds.length !== selectedCovenantIds.length) {
    return false;
  }

  return preset.selectedCovenantIds.every(
    (covenantId) =>
      selectedCovenantIds.includes(covenantId) &&
      selectedCovenantTargetMap[covenantId] === preset.selectedCovenantTargetMap[covenantId],
  );
}

export function StrategyBoardFilters({
  covenantPresets,
  currentLevel,
  maxPopulation,
  maxVisibleTier,
  onApplyCovenantPreset,
  onDeleteCovenantPreset,
  onImportCovenantPresets,
  onRenameCovenantPreset,
  onReset,
  onSaveCovenantPreset,
  onSetMaxPopulation,
  onToggleCovenant,
  onToggleCurrentLevel,
  onUpdateCovenantPreset,
  selectedCovenantIds,
  selectedCovenantTargetMap,
}: StrategyBoardFiltersProps) {
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [openedPresetMenuId, setOpenedPresetMenuId] = useState<string | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const editingPreset = covenantPresets.find((preset) => preset.id === editingPresetId) ?? null;
  const defaultPresetName = buildDefaultPresetName(
    selectedCovenantIds,
    selectedCovenantTargetMap,
  );
  const canSavePreset = defaultPresetName.length > 0;
  const areCovenantFiltersLocked =
    activePresetId !== null && editingPreset === null;
  const isSaveButtonDisabled =
    editingPreset === null
      ? !canSavePreset || activePresetId !== null
      : !canSavePreset;

  function clearPresetState() {
    setActivePresetId(null);
    setEditingPresetId(null);
    setOpenedPresetMenuId(null);
  }

  function handleSavePreset() {
    if (!canSavePreset) {
      return;
    }

    if (editingPreset !== null) {
      onUpdateCovenantPreset(editingPreset.id);
      setEditingPresetId(null);
      setActivePresetId(editingPreset.id);
      return;
    }

    const nextPresetName =
      typeof window === 'undefined'
        ? defaultPresetName
        : window.prompt('请输入组合名称', defaultPresetName);

    if (nextPresetName === null) {
      return;
    }

    onSaveCovenantPreset(nextPresetName.trim() || defaultPresetName);
  }

  function handleApplyPreset(presetId: string) {
    if (activePresetId === presetId) {
      clearPresetState();
      return;
    }

    setEditingPresetId(null);
    setActivePresetId(presetId);
    setOpenedPresetMenuId(null);
    onApplyCovenantPreset(presetId);
  }

  function handleEditPreset(presetId: string) {
    setActivePresetId(presetId);
    setEditingPresetId(presetId);
    setOpenedPresetMenuId(null);
    onApplyCovenantPreset(presetId);
  }

  function handleRenamePreset(preset: CovenantPreset) {
    const nextPresetName =
      typeof window === 'undefined'
        ? preset.name
        : window.prompt('请输入新的组合名称', preset.name);

    setOpenedPresetMenuId(null);

    if (nextPresetName === null) {
      return;
    }

    onRenameCovenantPreset(preset.id, nextPresetName.trim() || preset.name);
  }

  function handleDeletePreset(presetId: string) {
    setOpenedPresetMenuId(null);
    setActivePresetId((currentPresetId) =>
      currentPresetId === presetId ? null : currentPresetId,
    );
    setEditingPresetId((currentPresetId) =>
      currentPresetId === presetId ? null : currentPresetId,
    );
    onDeleteCovenantPreset(presetId);
  }

  function handleExportPreset(preset: CovenantPreset) {
    setOpenedPresetMenuId(null);
    downloadJsonFile(
      `strategy-board-covenant-preset-${sanitizePresetFileName(preset.name)}.json`,
      buildPresetExportPayload(preset),
    );
  }

  function handleExportAllPresets() {
    downloadJsonFile(
      'strategy-board-covenant-presets.json',
      covenantPresets.map((preset) => buildPresetExportPayload(preset)),
    );
  }

  function handleOpenImportPicker() {
    setOpenedPresetMenuId(null);
    importFileInputRef.current?.click();
  }

  async function handleImportPresets(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const importFile = input.files?.[0];

    if (!importFile) {
      return;
    }

    try {
      const rawValue = await importFile.text();
      onImportCovenantPresets(JSON.parse(rawValue));
    } catch {
      // Ignore malformed JSON or unreadable files and keep current presets intact.
    } finally {
      input.value = '';
    }
  }

  function renderCovenantChip(
    covenantId: string,
    covenantName: string,
    covenantDescription: string,
    isPrimary: boolean,
    activationStages: number[],
  ) {
    const isSelected = selectedCovenantIds.includes(covenantId);
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
          areCovenantFiltersLocked && styles.covenantChipLocked,
        )}
        aria-pressed={isSelected}
        title={title}
        disabled={areCovenantFiltersLocked}
        onClick={() => onToggleCovenant(covenantId, selectableStages)}
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
        onClick={() => onToggleCurrentLevel(level)}
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
        onClick={() => onSetMaxPopulation(population)}
      >
        {population} 人
      </button>
    );
  }

  return (
    <section className={styles.filterSection}>
      <div className={styles.filterMain}>
        <div className={styles.filterHeader}>
          <h2 className={styles.filterTitle}>盟约筛选</h2>
        </div>

        <div className={styles.filterGroup}>
          <div className={clsx(styles.filterLabelRow, styles.presetLabelRow)}>
            <span className={styles.filterLabel}>预设组合</span>
            <div className={styles.filterInlineActions}>
              <input
                ref={importFileInputRef}
                type="file"
                accept="application/json,.json"
                className={styles.visuallyHiddenInput}
                aria-label="导入预设组合 JSON"
                onChange={handleImportPresets}
              />
              <button
                type="button"
                className={styles.filterLinkButton}
                title="导入预设组合 JSON"
                onClick={handleOpenImportPicker}
              >
                导入
              </button>
              <button
                type="button"
                className={styles.filterLinkButton}
                aria-label="导出全部预设组合"
                title={
                  covenantPresets.length > 0
                    ? '导出全部预设组合'
                    : '当前没有可导出的预设组合'
                }
                disabled={covenantPresets.length === 0}
                onClick={handleExportAllPresets}
              >
                导出
              </button>
            </div>
            <span className={clsx(styles.filterHint, styles.presetFilterHint)}>
              点击应用到下方主次盟约；悬浮可查看具体人数
            </span>
          </div>
          <div className={styles.presetRow}>
            <button
              type="button"
              className={clsx(
                styles.covenantChip,
                styles.levelChip,
                styles.presetSaveButton,
                canSavePreset &&
                  !isSaveButtonDisabled &&
                  styles.presetSaveButtonActive,
              )}
              onClick={handleSavePreset}
              disabled={isSaveButtonDisabled}
              title={
                editingPreset !== null
                  ? canSavePreset
                    ? `把当前主次盟约修改应用到 ${editingPreset.name}`
                    : `请先选择主次盟约后再应用 ${editingPreset.name} 的修改`
                  : activePresetId !== null
                    ? '当前组合已选中，点击该组合取消选中后才能继续保存'
                  : canSavePreset
                  ? `保存当前组合，默认名称为 ${defaultPresetName}`
                  : '请先选择主次盟约后再保存组合'
              }
            >
              <span aria-hidden="true" className={styles.presetSaveIcon}>
                {editingPreset !== null ? '✓' : '+'}
              </span>
              {editingPreset !== null ? '应用修改' : '保存当前组合'}
            </button>

            {covenantPresets.map((preset) => {
              const isActive = activePresetId === preset.id;
              const isPresetMenuOpen = openedPresetMenuId === preset.id;

              return (
                <div
                  key={preset.id}
                  className={clsx(
                    styles.presetChipGroup,
                    isPresetMenuOpen && styles.presetChipGroupMenuVisible,
                  )}
                >
                  <button
                    type="button"
                    className={clsx(
                      styles.covenantChip,
                      styles.presetChip,
                      isActive && styles.presetChipActive,
                      isActive && styles.covenantChipSelected,
                    )}
                    aria-pressed={isActive}
                    title={buildPresetTitle(preset)}
                    onClick={() => handleApplyPreset(preset.id)}
                  >
                    <span className={styles.covenantChipContent}>{preset.name}</span>
                  </button>
                  <div className={styles.presetMenuSlot}>
                    <button
                      type="button"
                      className={clsx(
                        styles.presetMenuButton,
                        isActive && styles.presetMenuButtonActive,
                      )}
                      aria-label={`预设组合操作 ${preset.name}`}
                      aria-expanded={isPresetMenuOpen}
                      title={`预设组合操作 ${preset.name}`}
                      onClick={() =>
                        setOpenedPresetMenuId((currentId) =>
                          currentId === preset.id ? null : preset.id,
                        )
                      }
                    >
                      ···
                    </button>
                    {openedPresetMenuId === preset.id ? (
                      <div className={styles.presetMenuPanel}>
                        <button
                          type="button"
                          className={styles.presetMenuItem}
                          aria-label={`修改预设组合 ${preset.name}`}
                          onClick={() => handleEditPreset(preset.id)}
                        >
                          修改
                        </button>
                        <button
                          type="button"
                          className={styles.presetMenuItem}
                          aria-label={`重命名预设组合 ${preset.name}`}
                          onClick={() => handleRenamePreset(preset)}
                        >
                          重命名
                        </button>
                        <button
                          type="button"
                          className={styles.presetMenuItem}
                          aria-label={`导出预设组合 ${preset.name}`}
                          onClick={() => handleExportPreset(preset)}
                        >
                          导出
                        </button>
                        <button
                          type="button"
                          className={clsx(
                            styles.presetMenuItem,
                            styles.presetMenuItemDanger,
                          )}
                          aria-label={`删除预设组合 ${preset.name}`}
                          onClick={() => handleDeletePreset(preset.id)}
                        >
                          删除
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
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
            {selectablePopulations.map((population) => renderPopulationChip(population))}
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

        {selectedCovenantIds.length > 0 ? (
          <div className={styles.filterActions}>
            <button
              className={styles.resetButton}
              type="button"
              onClick={() => {
                clearPresetState();
                onReset();
              }}
            >
              重置筛选
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

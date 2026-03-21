import { create } from 'zustand';
import { covenantMap } from '@/entities/covenant/model/normalizeCovenants';
import type { CovenantPreset, StrategyState } from '@/shared/types/domain';

interface StrategyStore extends StrategyState {
  applyCovenantPreset: (presetId: string) => void;
  deleteCovenantPreset: (presetId: string) => void;
  renameCovenantPreset: (presetId: string, name: string) => void;
  reset: () => void;
  restoreRemovedOperators: () => void;
  saveCovenantPreset: (name: string) => void;
  setMaxPopulation: (population: StrategyState['maxPopulation']) => void;
  setSearchKeyword: (keyword: string) => void;
  toggleCovenant: (covenantId: string, activationStages: number[]) => void;
  toggleCurrentLevel: (level: NonNullable<StrategyState['currentLevel']>) => void;
  toggleFavoriteOperator: (operatorId: string) => void;
  toggleOperator: (operatorId: string) => void;
  toggleRemovedOperator: (operatorId: string) => void;
  updateCovenantPreset: (presetId: string) => void;
}

const favoriteStorageKey = 'strategy-board.favoriteOperatorIds';
const covenantPresetStorageKey = 'strategy-board.covenantPresets';

function clampCovenantTargetCount(
  covenantId: string,
  targetCount: number,
  maxPopulation: StrategyState['maxPopulation'],
) {
  const availableStages =
    covenantMap[covenantId]?.activationStages.filter((stage) => stage <= maxPopulation) ?? [];

  if (availableStages.length === 0) {
    return null;
  }

  return availableStages.includes(targetCount)
    ? targetCount
    : availableStages[availableStages.length - 1] ?? null;
}

function buildSelectedCovenantState(
  selectedCovenantIds: string[],
  selectedCovenantTargetMap: Record<string, number>,
  maxPopulation: StrategyState['maxPopulation'],
) {
  const nextSelectedCovenantIds: string[] = [];
  const nextSelectedCovenantTargetMap: Record<string, number> = {};

  for (const covenantId of selectedCovenantIds) {
    if (!covenantMap[covenantId]) {
      continue;
    }

    const targetCount = selectedCovenantTargetMap[covenantId];

    if (targetCount === undefined) {
      continue;
    }

    const clampedTargetCount = clampCovenantTargetCount(
      covenantId,
      targetCount,
      maxPopulation,
    );

    if (clampedTargetCount === null) {
      continue;
    }

    nextSelectedCovenantIds.push(covenantId);
    nextSelectedCovenantTargetMap[covenantId] = clampedTargetCount;
  }

  return {
    selectedCovenantIds: nextSelectedCovenantIds,
    selectedCovenantTargetMap: nextSelectedCovenantTargetMap,
  };
}

function normalizeCovenantPreset(value: unknown): CovenantPreset | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.id !== 'string' || typeof record.name !== 'string') {
    return null;
  }

  if (!Array.isArray(record.selectedCovenantIds)) {
    return null;
  }

  const rawTargetMap =
    record.selectedCovenantTargetMap &&
    typeof record.selectedCovenantTargetMap === 'object'
      ? (record.selectedCovenantTargetMap as Record<string, unknown>)
      : null;

  if (!rawTargetMap) {
    return null;
  }

  const selectedCovenantIds = [...new Set(record.selectedCovenantIds)]
    .filter((item): item is string => typeof item === 'string')
    .filter((covenantId) => Boolean(covenantMap[covenantId]))
    .filter((covenantId) => {
      const targetCount = rawTargetMap[covenantId];
      return typeof targetCount === 'number' && Number.isFinite(targetCount);
    });

  if (selectedCovenantIds.length === 0) {
    return null;
  }

  const selectedCovenantTargetMap = selectedCovenantIds.reduce<Record<string, number>>(
    (map, covenantId) => {
      const targetCount = rawTargetMap[covenantId];

      if (typeof targetCount === 'number' && Number.isFinite(targetCount)) {
        map[covenantId] = targetCount;
      }

      return map;
    },
    {},
  );

  return {
    id: record.id,
    name: record.name.trim() || '未命名组合',
    selectedCovenantIds,
    selectedCovenantTargetMap,
  };
}

function loadCovenantPresets() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(covenantPresetStorageKey);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map((item) => normalizeCovenantPreset(item))
      .filter((item): item is CovenantPreset => item !== null);
  } catch {
    return [];
  }
}

function saveCovenantPresets(covenantPresets: CovenantPreset[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      covenantPresetStorageKey,
      JSON.stringify(covenantPresets),
    );
  } catch {
    // Ignore storage write failures and keep the in-memory state usable.
  }
}

function createCovenantPresetId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadFavoriteOperatorIds() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(favoriteStorageKey);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return [...new Set(parsedValue.filter((item): item is string => typeof item === 'string'))];
  } catch {
    return [];
  }
}

function saveFavoriteOperatorIds(favoriteOperatorIds: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      favoriteStorageKey,
      JSON.stringify(favoriteOperatorIds),
    );
  } catch {
    // Ignore storage write failures and keep the in-memory state usable.
  }
}

const initialState: StrategyState = {
  selectedCovenantIds: [],
  selectedCovenantTargetMap: {},
  covenantPresets: loadCovenantPresets(),
  maxPopulation: 8,
  currentLevel: null,
  searchKeyword: '',
  pickedOperatorIds: [],
  removedOperatorIds: [],
  favoriteOperatorIds: loadFavoriteOperatorIds(),
};

export const useStrategyStore = create<StrategyStore>((set) => ({
  ...initialState,
  applyCovenantPreset: (presetId) =>
    set((state) => {
      const preset = state.covenantPresets.find((item) => item.id === presetId);

      if (!preset) {
        return state;
      }

      return buildSelectedCovenantState(
        preset.selectedCovenantIds,
        preset.selectedCovenantTargetMap,
        state.maxPopulation,
      );
    }),
  deleteCovenantPreset: (presetId) =>
    set((state) => {
      const covenantPresets = state.covenantPresets.filter(
        (item) => item.id !== presetId,
      );

      saveCovenantPresets(covenantPresets);

      return {
        covenantPresets,
      };
    }),
  renameCovenantPreset: (presetId, name) =>
    set((state) => {
      const trimmedName = name.trim();

      if (trimmedName.length === 0) {
        return state;
      }

      const covenantPresets = state.covenantPresets.map((item) =>
        item.id === presetId
          ? {
              ...item,
              name: trimmedName,
            }
          : item,
      );

      saveCovenantPresets(covenantPresets);

      return {
        covenantPresets,
      };
    }),
  reset: () =>
    set((state) => ({
      selectedCovenantIds: [],
      selectedCovenantTargetMap: {},
      covenantPresets: state.covenantPresets,
      maxPopulation: 8,
      currentLevel: null,
      searchKeyword: '',
      pickedOperatorIds: [],
      removedOperatorIds: [],
      favoriteOperatorIds: state.favoriteOperatorIds,
    })),
  restoreRemovedOperators: () =>
    set((state) => ({
      ...state,
      removedOperatorIds: [],
    })),
  saveCovenantPreset: (name) =>
    set((state) => {
      const trimmedName = name.trim();

      if (trimmedName.length === 0) {
        return state;
      }

      const selectedCovenantIds = state.selectedCovenantIds.filter(
        (covenantId) => state.selectedCovenantTargetMap[covenantId] !== undefined,
      );

      if (selectedCovenantIds.length === 0) {
        return state;
      }

      const covenantPresets = [
        ...state.covenantPresets,
        {
          id: createCovenantPresetId(),
          name: trimmedName,
          selectedCovenantIds,
          selectedCovenantTargetMap: selectedCovenantIds.reduce<Record<string, number>>(
            (map, covenantId) => {
              map[covenantId] = state.selectedCovenantTargetMap[covenantId]!;
              return map;
            },
            {},
          ),
        },
      ];

      saveCovenantPresets(covenantPresets);

      return {
        covenantPresets,
      };
    }),
  updateCovenantPreset: (presetId) =>
    set((state) => {
      const preset = state.covenantPresets.find((item) => item.id === presetId);

      if (!preset) {
        return state;
      }

      const nextSelectedCovenantState = buildSelectedCovenantState(
        state.selectedCovenantIds,
        state.selectedCovenantTargetMap,
        state.maxPopulation,
      );

      if (nextSelectedCovenantState.selectedCovenantIds.length === 0) {
        return state;
      }

      const covenantPresets = state.covenantPresets.map((item) =>
        item.id === presetId
          ? {
              ...item,
              selectedCovenantIds: nextSelectedCovenantState.selectedCovenantIds,
              selectedCovenantTargetMap:
                nextSelectedCovenantState.selectedCovenantTargetMap,
            }
          : item,
      );

      saveCovenantPresets(covenantPresets);

      return {
        covenantPresets,
      };
    }),
  setSearchKeyword: (keyword) =>
    set(() => ({
      searchKeyword: keyword,
    })),
  setMaxPopulation: (population) =>
    set((state) => {
      const nextSelectedCovenantState = buildSelectedCovenantState(
        state.selectedCovenantIds,
        state.selectedCovenantTargetMap,
        population,
      );

      return {
        ...nextSelectedCovenantState,
        maxPopulation: population,
      };
    }),
  toggleCovenant: (covenantId, activationStages) =>
    set((state) => {
      const firstStage = activationStages[0];
      const isSelected = state.selectedCovenantIds.includes(covenantId);
      const currentTargetCount = state.selectedCovenantTargetMap[covenantId];

      if (firstStage === undefined) {
        return state;
      }

      if (!isSelected) {
        return {
          selectedCovenantIds: [...state.selectedCovenantIds, covenantId],
          selectedCovenantTargetMap: {
            ...state.selectedCovenantTargetMap,
            [covenantId]: firstStage,
          },
        };
      }

      const currentStageIndex = activationStages.findIndex(
        (stage) => stage === currentTargetCount,
      );
      const nextTargetCount = activationStages[currentStageIndex + 1];

      if (nextTargetCount !== undefined) {
        return {
          selectedCovenantIds: state.selectedCovenantIds,
          selectedCovenantTargetMap: {
            ...state.selectedCovenantTargetMap,
            [covenantId]: nextTargetCount,
          },
        };
      }

      const nextSelectedCovenantTargetMap = { ...state.selectedCovenantTargetMap };
      delete nextSelectedCovenantTargetMap[covenantId];

      return {
        selectedCovenantIds: state.selectedCovenantIds.filter((item) => item !== covenantId),
        selectedCovenantTargetMap: nextSelectedCovenantTargetMap,
      };
    }),
  toggleCurrentLevel: (level) =>
    set((state) => ({
      currentLevel: state.currentLevel === level ? null : level,
    })),
  toggleFavoriteOperator: (operatorId) =>
    set((state) => {
      const favoriteOperatorIds = state.favoriteOperatorIds.includes(operatorId)
        ? state.favoriteOperatorIds.filter((item) => item !== operatorId)
        : [...state.favoriteOperatorIds, operatorId];

      saveFavoriteOperatorIds(favoriteOperatorIds);

      return {
        favoriteOperatorIds,
      };
    }),
  toggleOperator: (operatorId) =>
    set((state) => ({
      pickedOperatorIds: state.pickedOperatorIds.includes(operatorId)
        ? state.pickedOperatorIds.filter((item) => item !== operatorId)
        : [...state.pickedOperatorIds, operatorId],
    })),
  toggleRemovedOperator: (operatorId) =>
    set((state) => {
      const alreadyRemoved = state.removedOperatorIds.includes(operatorId);

      return {
        removedOperatorIds: alreadyRemoved
          ? state.removedOperatorIds.filter((item) => item !== operatorId)
          : [...state.removedOperatorIds, operatorId],
        pickedOperatorIds: alreadyRemoved
          ? state.pickedOperatorIds
          : state.pickedOperatorIds.filter((item) => item !== operatorId),
      };
    }),
}));

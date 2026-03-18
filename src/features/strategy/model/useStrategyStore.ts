import { create } from 'zustand';
import { covenantMap } from '@/entities/covenant/model/normalizeCovenants';
import type { StrategyState } from '@/shared/types/domain';

interface StrategyStore extends StrategyState {
  reset: () => void;
  restoreRemovedOperators: () => void;
  setMaxPopulation: (population: StrategyState['maxPopulation']) => void;
  setSearchKeyword: (keyword: string) => void;
  toggleCovenant: (covenantId: string, activationStages: number[]) => void;
  toggleCurrentLevel: (level: NonNullable<StrategyState['currentLevel']>) => void;
  toggleFavoriteOperator: (operatorId: string) => void;
  toggleOperator: (operatorId: string) => void;
  toggleRemovedOperator: (operatorId: string) => void;
}

const favoriteStorageKey = 'strategy-board.favoriteOperatorIds';

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
  maxPopulation: 8,
  currentLevel: null,
  searchKeyword: '',
  pickedOperatorIds: [],
  removedOperatorIds: [],
  favoriteOperatorIds: loadFavoriteOperatorIds(),
};

export const useStrategyStore = create<StrategyStore>((set) => ({
  ...initialState,
  reset: () =>
    set((state) => ({
      selectedCovenantIds: [],
      selectedCovenantTargetMap: {},
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
  setSearchKeyword: (keyword) =>
    set(() => ({
      searchKeyword: keyword,
    })),
  setMaxPopulation: (population) =>
    set((state) => {
      const nextSelectedCovenantTargetMap = { ...state.selectedCovenantTargetMap };

      for (const covenantId of state.selectedCovenantIds) {
        const covenant = covenantMap[covenantId];
        const availableStages =
          covenant?.activationStages.filter((stage) => stage <= population) ?? [];

        if (availableStages.length === 0) {
          delete nextSelectedCovenantTargetMap[covenantId];
          continue;
        }

        const firstAvailableStage = availableStages[0];
        const lastAvailableStage = availableStages[availableStages.length - 1];

        if (firstAvailableStage === undefined || lastAvailableStage === undefined) {
          continue;
        }

        const currentTargetCount =
          nextSelectedCovenantTargetMap[covenantId] ?? firstAvailableStage;
        const clampedTargetCount = availableStages.includes(currentTargetCount)
          ? currentTargetCount
          : lastAvailableStage;

        nextSelectedCovenantTargetMap[covenantId] = clampedTargetCount;
      }

      return {
        maxPopulation: population,
        selectedCovenantTargetMap: nextSelectedCovenantTargetMap,
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

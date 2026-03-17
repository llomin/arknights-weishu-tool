import { create } from 'zustand';
import type { StrategyState } from '@/shared/types/domain';

interface StrategyStore extends StrategyState {
  reset: () => void;
  restoreRemovedOperators: () => void;
  setSearchKeyword: (keyword: string) => void;
  toggleCovenant: (covenantId: string) => void;
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
  toggleCovenant: (covenantId) =>
    set((state) => ({
      selectedCovenantIds: state.selectedCovenantIds.includes(covenantId)
        ? state.selectedCovenantIds.filter((item) => item !== covenantId)
        : [...state.selectedCovenantIds, covenantId],
    })),
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

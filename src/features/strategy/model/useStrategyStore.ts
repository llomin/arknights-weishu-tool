import { create } from 'zustand';
import type { StrategyState } from '@/shared/types/domain';

interface StrategyStore extends StrategyState {
  reset: () => void;
  restoreRemovedOperators: () => void;
  setSearchKeyword: (keyword: string) => void;
  toggleCovenant: (covenantId: string) => void;
  toggleOperator: (operatorId: string) => void;
  toggleRemovedOperator: (operatorId: string) => void;
}

const initialState: StrategyState = {
  selectedCovenantIds: [],
  searchKeyword: '',
  pickedOperatorIds: [],
  removedOperatorIds: [],
};

export const useStrategyStore = create<StrategyStore>((set) => ({
  ...initialState,
  reset: () => set(initialState),
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

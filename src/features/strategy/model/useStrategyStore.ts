import { create } from 'zustand';
import type { StrategyState } from '@/shared/types/domain';

interface StrategyStore extends StrategyState {
  reset: () => void;
  setSearchKeyword: (keyword: string) => void;
  toggleCovenant: (covenantId: string) => void;
  toggleOperator: (operatorId: string) => void;
}

const initialState: StrategyState = {
  selectedCovenantIds: [],
  searchKeyword: '',
  pickedOperatorIds: [],
};

export const useStrategyStore = create<StrategyStore>((set) => ({
  ...initialState,
  reset: () => set(initialState),
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
}));


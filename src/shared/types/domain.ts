export type OperatorPriorityBucket =
  | '持续叠加'
  | '单次叠加'
  | '特异化'
  | '整备能力'
  | '作战能力'
  | '其他';

export interface CovenantEntity {
  id: string;
  name: string;
  activationCount: number;
  activationStages: number[];
  description: string;
  sortOrder: number;
  isPrimary: boolean;
  recommandWith?: string[];
}

export interface OperatorEntity {
  id: string;
  name: string;
  covenants: string[];
  traitCategory: string;
  traitTags: string[];
  description: string;
  tierLabel: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  priorityBucket: OperatorPriorityBucket;
  priorityWeight: number;
  searchText: string;
}

export interface OperatorGroupView {
  covenantId: string;
  covenantName: string;
  activationCount: number;
  operators: OperatorEntity[];
}

export interface StrategyState {
  selectedCovenantIds: string[];
  selectedCovenantTargetMap: Record<string, number>;
  maxPopulation: 8 | 9;
  currentLevel: OperatorEntity['tier'] | null;
  searchKeyword: string;
  pickedOperatorIds: string[];
  removedOperatorIds: string[];
  favoriteOperatorIds: string[];
}

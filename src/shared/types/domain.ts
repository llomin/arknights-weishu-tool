export type OperatorPriorityBucket =
  | 'each_and_layers'
  | 'layers'
  | 'gain'
  | 'same_as'
  | 'other';

export interface CovenantEntity {
  id: string;
  name: string;
  activationCount: number;
  description: string;
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
  searchKeyword: string;
  pickedOperatorIds: string[];
}


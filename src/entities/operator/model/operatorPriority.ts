import type { OperatorPriorityBucket } from '@/shared/types/domain';

const PRIORITY_WEIGHT_MAP: Record<OperatorPriorityBucket, number> = {
  each_and_layers: 0,
  layers: 1,
  gain: 2,
  same_as: 3,
  other: 4,
};

export function getOperatorPriorityBucket(
  description: string,
): OperatorPriorityBucket {
  if (description.includes('每') && description.includes('层数')) {
    return 'each_and_layers';
  }

  if (description.includes('层数')) {
    return 'layers';
  }

  if (description.includes('获得')) {
    return 'gain';
  }

  if (description.includes('与其相同')) {
    return 'same_as';
  }

  return 'other';
}

export function getOperatorPriorityWeight(bucket: OperatorPriorityBucket) {
  return PRIORITY_WEIGHT_MAP[bucket];
}


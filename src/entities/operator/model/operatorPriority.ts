import type { OperatorPriorityBucket } from '@/shared/types/domain';

const PRIORITY_WEIGHT_MAP: Record<OperatorPriorityBucket, number> = {
  持续叠加: 0,
  单次叠加: 1,
  特异化: 2,
  整备能力: 3,
  作战能力: 4,
  其他: 5,
};

const PRIORITY_BUCKET_SET = new Set<OperatorPriorityBucket>(
  Object.keys(PRIORITY_WEIGHT_MAP) as OperatorPriorityBucket[],
);

export function getOperatorPriorityBucket(category: string): OperatorPriorityBucket {
  return PRIORITY_BUCKET_SET.has(category as OperatorPriorityBucket)
    ? (category as OperatorPriorityBucket)
    : '其他';
}

export function getOperatorPriorityWeight(bucket: OperatorPriorityBucket) {
  return PRIORITY_WEIGHT_MAP[bucket];
}

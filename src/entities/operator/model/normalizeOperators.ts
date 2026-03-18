import rawOperators from '../../../../data/operators.json';
import { normalizeSearchText } from '@/shared/lib/normalizeSearchText';
import type {
  OperatorEntity,
  OperatorPriorityBucket,
} from '@/shared/types/domain';
import {
  getOperatorPriorityBucket,
  getOperatorPriorityWeight,
} from './operatorPriority';
import { rawOperatorRecordSchema } from './operator.schema';

const parsedOperators = rawOperatorRecordSchema.parse(rawOperators);

function parseTier(tierLabel: string): OperatorEntity['tier'] {
  const tier = Number(tierLabel.replace('阶', ''));

  if (tier < 1 || tier > 6) {
    throw new Error(`非法阶位: ${tierLabel}`);
  }

  return tier as OperatorEntity['tier'];
}

function extractTraitTags(description: string) {
  const tags: string[] = [];

  for (const match of description.matchAll(/<([^<>]+)>/g)) {
    const tag = match[1]?.trim();

    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}

function sortOperators(left: OperatorEntity, right: OperatorEntity) {
  return (
    left.priorityWeight - right.priorityWeight ||
    right.tier - left.tier ||
    left.name.localeCompare(right.name, 'zh-Hans-CN')
  );
}

export const operators = Object.entries(parsedOperators)
  .map<OperatorEntity>(([name, value]) => {
    const description = value.trait.description;
    const priorityBucket = getOperatorPriorityBucket(value.trait.category);

    return {
      id: name,
      name,
      covenants: value.covenants,
      traitCategory: value.trait.category,
      traitTags: extractTraitTags(description),
      description,
      tierLabel: value.tier,
      tier: parseTier(value.tier),
      priorityBucket,
      priorityWeight: getOperatorPriorityWeight(priorityBucket),
      searchText: normalizeSearchText(description),
    };
  })
  .sort(sortOperators);

export const operatorMap = operators.reduce<Record<string, OperatorEntity>>(
  (map, operator) => {
    map[operator.id] = operator;
    return map;
  },
  {},
);

export const tierSummary = operators.reduce<Record<string, number>>(
  (summary, operator) => {
    summary[operator.tierLabel] = (summary[operator.tierLabel] ?? 0) + 1;
    return summary;
  },
  {},
);

export const prioritySummary = operators.reduce<
  Record<OperatorPriorityBucket, number>
>(
  (summary, operator) => {
    summary[operator.priorityBucket] += 1;
    return summary;
  },
  {
    持续叠加: 0,
    单次叠加: 0,
    特异化: 0,
    整备能力: 0,
    作战能力: 0,
    其他: 0,
  },
);

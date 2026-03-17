import rawOperators from '../../../../data/data_干员.json';
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

function sortOperators(left: OperatorEntity, right: OperatorEntity) {
  return (
    left.priorityWeight - right.priorityWeight ||
    right.tier - left.tier ||
    left.name.localeCompare(right.name, 'zh-Hans-CN')
  );
}

export const operators = Object.entries(parsedOperators)
  .map<OperatorEntity>(([name, value]) => {
    const description = value.特质.描述;
    const priorityBucket = getOperatorPriorityBucket(description);

    return {
      id: name,
      name,
      covenants: value.盟约,
      traitCategory: value.特质.分类,
      traitTags: value.特质.tag,
      description,
      tierLabel: value.阶位,
      tier: parseTier(value.阶位),
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
    each_and_layers: 0,
    layers: 0,
    gain: 0,
    same_as: 0,
    other: 0,
  },
);


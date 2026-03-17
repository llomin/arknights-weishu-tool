import rawCovenants from '../../../../data/data_盟约.json';
import type { CovenantEntity } from '@/shared/types/domain';
import { rawCovenantRecordSchema } from './covenant.schema';

const parsedCovenants = rawCovenantRecordSchema.parse(rawCovenants);

export const covenants = Object.entries(parsedCovenants)
  .map<CovenantEntity>(([name, value]) => ({
    id: name,
    name,
    activationCount: Number(value.激活需要人数),
    description: value.描述,
  }))
  .sort(
    (left, right) =>
      left.activationCount - right.activationCount ||
      left.name.localeCompare(right.name, 'zh-Hans-CN'),
  );

export const covenantMap = covenants.reduce<Record<string, CovenantEntity>>(
  (map, covenant) => {
    map[covenant.id] = covenant;
    return map;
  },
  {},
);


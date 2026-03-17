import rawCovenants from '../../../../data/data_盟约.json';
import type { CovenantEntity } from '@/shared/types/domain';
import { rawCovenantRecordSchema } from './covenant.schema';

const parsedCovenants = rawCovenantRecordSchema.parse(rawCovenants);
const PRIMARY_COVENANT_COUNT = 8;

export const covenants = Object.entries(parsedCovenants)
  .map<CovenantEntity>(([name, value], index) => ({
    id: name,
    name,
    activationCount: Number(value.激活需要人数),
    description: value.描述,
    sortOrder: index,
    isPrimary: index < PRIMARY_COVENANT_COUNT,
  }));

export const primaryCovenants = covenants.filter((covenant) => covenant.isPrimary);
export const secondaryCovenants = covenants.filter(
  (covenant) => !covenant.isPrimary,
);

export const covenantMap = covenants.reduce<Record<string, CovenantEntity>>(
  (map, covenant) => {
    map[covenant.id] = covenant;
    return map;
  },
  {},
);

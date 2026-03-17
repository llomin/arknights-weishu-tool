import rawCovenants from '../../../../data/covenants.json';
import type { CovenantEntity } from '@/shared/types/domain';
import { rawCovenantRecordSchema } from './covenant.schema';

const parsedCovenants = rawCovenantRecordSchema.parse(rawCovenants);
const PRIMARY_COVENANT_COUNT = 8;

export const covenants = Object.entries(parsedCovenants)
  .map<CovenantEntity>(([name, value], index) => ({
    id: name,
    name,
    activationCount: Number(value.activationCount),
    description: value.description,
    sortOrder: index,
    isPrimary: index < PRIMARY_COVENANT_COUNT,
    recommandWith: value.recommandWith,
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

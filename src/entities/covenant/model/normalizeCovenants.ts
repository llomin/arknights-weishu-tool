import rawCovenants from '../../../../data/covenants.json';
import type { CovenantEntity } from '@/shared/types/domain';
import { rawCovenantRecordSchema } from './covenant.schema';

const parsedCovenants = rawCovenantRecordSchema.parse(rawCovenants);
const PRIMARY_COVENANT_COUNT = 8;

function extractActivationStages(activationCount: number, description: string) {
  const stages = new Set<number>([activationCount]);

  for (const match of description.matchAll(/<在场(\d+)名/g)) {
    const stage = Number(match[1]);

    if (Number.isFinite(stage) && stage > 0) {
      stages.add(stage);
    }
  }

  return [...stages].sort((left, right) => left - right);
}

export const covenants = Object.entries(parsedCovenants)
  .map<CovenantEntity>(([name, value], index) => {
    const activationCount = Number(value.activationCount);

    return {
      id: name,
      name,
      activationCount,
      activationStages: extractActivationStages(activationCount, value.description),
      description: value.description,
      sortOrder: index,
      isPrimary: index < PRIMARY_COVENANT_COUNT,
    };
  });

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

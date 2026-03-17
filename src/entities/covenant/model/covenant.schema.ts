import { z } from 'zod';

export const rawCovenantSchema = z.object({
  activationCount: z.string(),
  description: z.string(),
  recommandWith: z.array(z.string()).optional(),
});

export const rawCovenantRecordSchema = z.record(rawCovenantSchema);

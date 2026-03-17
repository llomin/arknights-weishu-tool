import { z } from 'zod';

export const rawCovenantSchema = z.object({
  activationCount: z.string(),
  description: z.string(),
});

export const rawCovenantRecordSchema = z.record(rawCovenantSchema);

import { z } from 'zod';

export const rawCovenantSchema = z.object({
  激活需要人数: z.string(),
  描述: z.string(),
});

export const rawCovenantRecordSchema = z.record(rawCovenantSchema);


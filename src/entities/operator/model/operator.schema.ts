import { z } from 'zod';

export const rawOperatorSchema = z.object({
  covenants: z.array(z.string()).min(1),
  trait: z.object({
    category: z.string(),
    description: z.string(),
  }),
  tier: z.enum(['1阶', '2阶', '3阶', '4阶', '5阶', '6阶']),
});

export const rawOperatorRecordSchema = z.record(rawOperatorSchema);

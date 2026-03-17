import { z } from 'zod';

export const rawOperatorSchema = z.object({
  盟约: z.array(z.string()).min(1),
  特质: z.object({
    分类: z.string(),
    tag: z.array(z.string()),
    描述: z.string(),
  }),
  阶位: z.enum(['1阶', '2阶', '3阶', '4阶', '5阶', '6阶']),
});

export const rawOperatorRecordSchema = z.record(rawOperatorSchema);


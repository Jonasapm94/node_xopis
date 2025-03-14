import z from 'zod';

export const topProductsReportZod = z.object({
    start_date: z.string({
        message: 'is required'
    }),
    end_date: z.string({
        message: 'is required'
    }),
    breakdown: z.string().optional()
});

export type TopProductsReportZodType = z.infer<typeof topProductsReportZod>;
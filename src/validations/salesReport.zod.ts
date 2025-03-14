import z from 'zod';

export const salesReportZod = z.object({
    start_date: z.string({
        message: 'is required'
    }),
    end_date: z.string({
        message: 'is required'
    }),
    product_id: z.string().optional()
});

export type SalesReportParamsType = z.infer<typeof salesReportZod>;
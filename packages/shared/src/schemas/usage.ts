import { z } from 'zod';

export const joinAgreementSchema = z.object({
  access_code: z.string().trim().toUpperCase().length(6, 'Access code must be 6 characters'),
});
export type JoinAgreementRequest = z.infer<typeof joinAgreementSchema>;

export const logUsageSchema = z.object({
  benefit_id: z.string().min(1, 'Benefit ID is required'),
  amount: z.number().positive('Amount must be positive').max(999999, 'Amount is too large'),
  used_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  note: z.string().trim().max(1000).optional(),
});
export type LogUsageRequest = z.infer<typeof logUsageSchema>;

export const usageQuerySchema = z.object({
  benefit_id: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});
export type UsageQuery = z.infer<typeof usageQuerySchema>;

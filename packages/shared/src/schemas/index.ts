import { z } from 'zod';

export const healthCheckResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;

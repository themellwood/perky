import { z } from 'zod';

export const magicLinkRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;

export const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});
export type VerifyTokenRequest = z.infer<typeof verifyTokenSchema>;

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.enum(['member', 'union_admin', 'platform_admin']),
  created_at: z.string(),
  updated_at: z.string(),
});
export type UserResponse = z.infer<typeof userResponseSchema>;

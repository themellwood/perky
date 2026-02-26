import { z } from 'zod';

export const partnerEnquirySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  unionName: z.string().trim().min(1, 'Union name is required').max(200),
  email: z.string().email('Invalid email address'),
  message: z.string().trim().min(1, 'Message is required').max(5000),
});
export type PartnerEnquiryRequest = z.infer<typeof partnerEnquirySchema>;

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types';
import { partnerEnquirySchema } from '@perky/shared';
import { sendEmail } from '../services/email';

const partners = new Hono<AppEnv>();

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

partners.post('/enquiry', zValidator('json', partnerEnquirySchema), async (c) => {
  const { name, unionName, email, message } = c.req.valid('json');

  const safeName = escapeHtml(name);
  const safeUnionName = escapeHtml(unionName);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);

  const subject = `Partner Enquiry from ${unionName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #15803d; font-size: 24px; margin-bottom: 24px;">New Partner Enquiry</h1>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #374151;">Name</td>
          <td style="padding: 8px 0; color: #374151;">${safeName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #374151;">Union</td>
          <td style="padding: 8px 0; color: #374151;">${safeUnionName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #374151;">Email</td>
          <td style="padding: 8px 0; color: #374151;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
        </tr>
      </table>
      <div style="margin-top: 24px; padding: 16px; background-color: #f3f4f6; border-radius: 6px;">
        <p style="font-weight: bold; color: #374151; margin-bottom: 8px;">Message</p>
        <p style="color: #374151; white-space: pre-wrap;">${safeMessage}</p>
      </div>
    </div>
  `;

  if (!c.env.RESEND_API_KEY || c.env.RESEND_API_KEY === 'your-resend-api-key-here') {
    console.log(`[DEV] Partner enquiry from ${unionName} (${email}): ${message}`);
  } else {
    await sendEmail(c.env.RESEND_API_KEY, {
      to: 'partners@perky.co.nz',
      subject,
      html,
    });
  }

  return c.json({ success: true });
});

export default partners;

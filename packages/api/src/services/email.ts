interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(
  apiKey: string,
  options: SendEmailOptions
): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Perky <onboarding@resend.dev>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
}

export function buildMagicLinkEmail(appUrl: string, token: string): { subject: string; html: string } {
  const link = `${appUrl}/auth/verify?token=${token}`;
  return {
    subject: 'Sign in to Perky',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #15803d; font-size: 24px; margin-bottom: 24px;">Perky</h1>
        <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
          Click the button below to sign in to your account. This link expires in 15 minutes.
        </p>
        <a href="${link}" style="display: inline-block; background-color: #16a34a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: 500;">
          Sign in to Perky
        </a>
        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
          If you didn't request this email, you can safely ignore it.
        </p>
      </div>
    `,
  };
}

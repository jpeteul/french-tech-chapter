import { Resend } from 'resend';

export const FROM_EMAIL = 'La French Tech Boston <noreply@mail.frenchtech-boston.com>';

type CloudflareRuntime = { env?: { RESEND_API_KEY?: string } };

// Helper to get Resend client with Cloudflare runtime API key support
export function getResend(runtime?: CloudflareRuntime): Resend | null {
  const apiKey = runtime?.env?.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not available');
    return null;
  }
  return new Resend(apiKey);
}

// Helper to get FROM email address
export function getFromEmail(): string {
  return FROM_EMAIL;
}

import { Resend } from 'resend';
import { getFromEmail } from './chapter-config';

export const FROM_EMAIL = getFromEmail();

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

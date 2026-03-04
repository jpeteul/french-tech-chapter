import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';
import { getResend, FROM_EMAIL } from '../../../lib/resend';
import { generateWelcomeEmail, WELCOME_EMAIL_SUBJECT } from '../../../lib/emails/welcome';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const authResult = await requireAdmin(cookies, (locals as any).runtime, request);
    if ('redirect' in authResult) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);
    if (!supabaseAdmin) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { email, type = 'welcome' } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email address is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get WhatsApp URL from site settings
    let whatsappUrl = '';
    const { data: setting } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', 'whatsapp_community_url')
      .maybeSingle();
    whatsappUrl = setting?.value || '';

    const resend = getResend((locals as any).runtime);
    if (!resend) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (type === 'welcome') {
      const html = generateWelcomeEmail({
        firstName: 'Test User',
        whatsappUrl,
      });

      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `[TEST] ${WELCOME_EMAIL_SUBJECT}`,
        html,
      });

      if (sendError) {
        console.error('Failed to send test email:', sendError);
        return new Response(JSON.stringify({ error: `Failed to send: ${sendError.message}` }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Test welcome email sent to ${email}`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown email type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

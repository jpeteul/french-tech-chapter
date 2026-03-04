import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';
import { getResend, FROM_EMAIL } from '../../../lib/resend';
import { generateNewsletterEmail } from '../../../lib/emails/newsletter';

export const prerender = false;

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000; // 1 second between batches

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface ContentSection {
  title?: string;
  text: string;
  imageUrl?: string;
  imageAlt?: string;
  imagePosition?: 'top' | 'left' | 'right';
}

interface NewsletterPayload {
  subject: string;
  headline: string;
  introduction: string;
  heroImageUrl?: string;
  heroImageAlt?: string;
  sections: ContentSection[];
  ctaText?: string;
  ctaUrl?: string;
  testEmail?: string;
}

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

    const resend = getResend((locals as any).runtime);
    if (!resend) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: NewsletterPayload = await request.json();
    const {
      subject,
      headline,
      introduction,
      heroImageUrl,
      heroImageAlt,
      sections,
      ctaText,
      ctaUrl,
      testEmail,
    } = body;

    if (!subject || !headline || !introduction) {
      return new Response(JSON.stringify({ error: 'Subject, headline, and introduction are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!sections || sections.length === 0) {
      return new Response(JSON.stringify({ error: 'At least one content section is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const unsubscribeUrl = 'https://www.frenchtech-boston.com/dashboard';

    // Test mode: send to a single email
    if (testEmail) {
      const html = generateNewsletterEmail({
        firstName: 'Test User',
        headline,
        introduction,
        heroImageUrl,
        heroImageAlt,
        sections,
        ctaText,
        ctaUrl,
        unsubscribeUrl,
      });

      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: testEmail,
        subject: `[TEST] ${subject}`,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
        },
      });

      if (sendError) {
        console.error('Failed to send test newsletter:', sendError);
        return new Response(JSON.stringify({ error: `Failed to send: ${sendError.message}` }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Test newsletter sent to ${testEmail}`,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Bulk mode: send to all active members
    const { data: members, error: membersError } = await supabaseAdmin
      .from('members')
      .select('id, email, name')
      .eq('status', 'active');

    if (membersError) {
      console.error('Failed to fetch members:', membersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch members' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ error: 'No active members found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      const batch = members.slice(i, i + BATCH_SIZE);

      // Send emails in parallel within the batch
      const results = await Promise.allSettled(
        batch.map(async (member) => {
          const firstName = member.name.split(' ')[0];
          const html = generateNewsletterEmail({
            firstName,
            headline,
            introduction,
            heroImageUrl,
            heroImageAlt,
            sections,
            ctaText,
            ctaUrl,
            unsubscribeUrl,
          });

          return resend.emails.send({
            from: FROM_EMAIL,
            to: member.email,
            subject,
            html,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
            },
          });
        })
      );

      // Count successes and failures
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && !result.value.error) {
          sent++;
        } else {
          failed++;
          const email = batch[index]?.email || 'unknown';
          const errorMsg = result.status === 'rejected'
            ? result.reason?.message
            : result.value?.error?.message;
          errors.push(`${email}: ${errorMsg || 'Unknown error'}`);
        }
      });

      // Delay between batches (except after the last batch)
      if (i + BATCH_SIZE < members.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    const message = `Sent ${sent} of ${members.length} newsletters${failed > 0 ? ` (${failed} failed)` : ''}`;

    return new Response(JSON.stringify({
      success: true,
      message,
      details: {
        total: members.length,
        sent,
        failed,
        errors: errors.slice(0, 10),
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Newsletter error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

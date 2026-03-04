import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';
import { getResend, FROM_EMAIL } from '../../../lib/resend';
import { generateEventInviteEmail, generateEventInviteSubject } from '../../../lib/emails/event-invite';

export const prerender = false;

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000; // 1 second between batches

function formatEventDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatEventTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

    const body = await request.json();
    const { eventId, testEmail } = body;

    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Event ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const eventDate = new Date(event.date);
    const formattedDate = formatEventDate(eventDate);
    const formattedTime = formatEventTime(eventDate);
    const eventUrl = `https://www.frenchtech-boston.com/events/${event.slug}`;
    const unsubscribeUrl = 'https://www.frenchtech-boston.com/dashboard';
    const eventStartISO = event.date; // Already ISO format from database
    const eventEndISO = event.end_date || undefined;

    // Test mode: send to a single email
    if (testEmail) {
      const subject = `[TEST] ${generateEventInviteSubject(event.title)}`;
      const html = generateEventInviteEmail({
        firstName: 'Test User',
        eventTitle: event.title,
        eventDate: formattedDate,
        eventTime: formattedTime,
        eventLocation: event.location,
        eventDescription: event.description || undefined,
        registrationUrl: event.registration_url || undefined,
        eventUrl,
        unsubscribeUrl,
        eventStartISO,
        eventEndISO,
      });

      const { error: sendError } = await resend.emails.send({
        from: FROM_EMAIL,
        to: testEmail,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
        },
      });

      if (sendError) {
        console.error('Failed to send test event invite:', sendError);
        return new Response(JSON.stringify({ error: `Failed to send: ${sendError.message}` }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Test invite sent to ${testEmail}`,
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

    const subject = generateEventInviteSubject(event.title);
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
          const html = generateEventInviteEmail({
            firstName,
            eventTitle: event.title,
            eventDate: formattedDate,
            eventTime: formattedTime,
            eventLocation: event.location,
            eventDescription: event.description || undefined,
            registrationUrl: event.registration_url || undefined,
            eventUrl,
            unsubscribeUrl,
            eventStartISO,
            eventEndISO,
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

    const message = `Sent ${sent} of ${members.length} invites${failed > 0 ? ` (${failed} failed)` : ''}`;

    return new Response(JSON.stringify({
      success: true,
      message,
      details: {
        total: members.length,
        sent,
        failed,
        errors: errors.slice(0, 10), // Limit error details
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Event invite error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

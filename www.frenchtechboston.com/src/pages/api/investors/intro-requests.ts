import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { getMember } from '../../../lib/auth';
import { getResend, FROM_EMAIL } from '../../../lib/resend';

export const prerender = false;

// GET: Fetch intro requests for current member (sent or received)
export const GET: APIRoute = async ({ request, cookies, locals }) => {
  const member = await getMember(cookies, (locals as any).runtime, request);
  if (!member) {
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

  try {
    // Fetch requests where member is requester or contact
    const { data: requests, error } = await supabaseAdmin
      .from('intro_requests')
      .select(`
        *,
        investor:investor_id (
          id,
          name,
          firm
        ),
        requester:requester_id (
          id,
          name,
          company,
          role,
          email,
          linkedin
        ),
        contact:contact_id (
          id,
          name,
          company,
          role,
          email,
          linkedin
        )
      `)
      .or(`requester_id.eq.${member.id},contact_id.eq.${member.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching intro requests:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch requests' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Separate into sent and received
    const sent = requests.filter((r) => r.requester_id === member.id);
    const received = requests.filter((r) => r.contact_id === member.id);

    return new Response(JSON.stringify({ sent, received, member_id: member.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in intro requests GET:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST: Create a new intro request
export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const member = await getMember(cookies, (locals as any).runtime, request);
  if (!member) {
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

  try {
    const { investor_id, contact_id, message } = await request.json();

    // Validate required fields
    if (!investor_id || !contact_id || !message?.trim()) {
      return new Response(JSON.stringify({ error: 'Investor, contact, and message are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Can't request intro to yourself
    if (contact_id === member.id) {
      return new Response(JSON.stringify({ error: 'Cannot request an introduction from yourself' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for existing pending request
    const { data: existing } = await supabaseAdmin
      .from('intro_requests')
      .select('id, status')
      .eq('investor_id', investor_id)
      .eq('requester_id', member.id)
      .eq('contact_id', contact_id)
      .single();

    if (existing) {
      if (existing.status === 'pending') {
        return new Response(JSON.stringify({ error: 'You already have a pending request for this introduction' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Allow re-requesting if previous was declined
    }

    // Get investor and contact details for the email
    const { data: investor } = await supabaseAdmin
      .from('investors')
      .select('name, firm')
      .eq('id', investor_id)
      .single();

    const { data: contact } = await supabaseAdmin
      .from('members')
      .select('email, name')
      .eq('id', contact_id)
      .single();

    if (!investor || !contact) {
      return new Response(JSON.stringify({ error: 'Investor or contact not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create the intro request
    const { data: introRequest, error } = await supabaseAdmin
      .from('intro_requests')
      .insert({
        investor_id,
        requester_id: member.id,
        contact_id,
        message: message.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating intro request:', error);
      return new Response(JSON.stringify({ error: 'Failed to create request' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send email notification to contact
    const resend = getResend((locals as any).runtime);
    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: contact.email,
          subject: `Introduction Request: ${investor.name}${investor.firm ? ` (${investor.firm})` : ''}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e3a5f;">Introduction Request</h2>
              <p><strong>${member.name}</strong>${member.company ? ` from ${member.company}` : ''} is requesting an introduction to <strong>${investor.name}</strong>${investor.firm ? ` at ${investor.firm}` : ''}.</p>

              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-style: italic;">"${message.trim()}"</p>
              </div>

              <p>You can accept or decline this request in your member dashboard:</p>
              <p><a href="https://frenchtech-boston.com/members/investors/requests" style="display: inline-block; background: #e63946; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Request</a></p>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Remember: Introductions are earned, not owed. Feel free to decline if you don't feel comfortable making this introduction.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send intro request email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(JSON.stringify({ success: true, request: introRequest }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in intro requests POST:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PATCH: Respond to an intro request (accept/decline)
export const PATCH: APIRoute = async ({ request, cookies, locals }) => {
  const member = await getMember(cookies, (locals as any).runtime, request);
  if (!member) {
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

  try {
    const { request_id, status } = await request.json();

    if (!request_id || !['accepted', 'declined'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Valid request_id and status (accepted/declined) required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the request and verify ownership
    const { data: introRequest, error: fetchError } = await supabaseAdmin
      .from('intro_requests')
      .select(`
        *,
        investor:investor_id (name, firm),
        requester:requester_id (name, email, company, linkedin)
      `)
      .eq('id', request_id)
      .single();

    if (fetchError || !introRequest) {
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Only the contact can respond
    if (introRequest.contact_id !== member.id) {
      return new Response(JSON.stringify({ error: 'Not authorized to respond to this request' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Can't respond to already responded requests
    if (introRequest.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'This request has already been responded to' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the request
    const { error: updateError } = await supabaseAdmin
      .from('intro_requests')
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq('id', request_id);

    if (updateError) {
      console.error('Error updating intro request:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update request' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send email to requester
    const requester = introRequest.requester as any;
    const investor = introRequest.investor as any;

    const resendPatch = getResend((locals as any).runtime);
    if (resendPatch) {
      try {
        if (status === 'accepted') {
          await resendPatch.emails.send({
            from: FROM_EMAIL,
            to: requester.email,
            subject: `Introduction Accepted: ${investor.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e3a5f;">Good News!</h2>
                <p><strong>${member.name}</strong> has agreed to introduce you to <strong>${investor.name}</strong>${investor.firm ? ` at ${investor.firm}` : ''}.</p>

                <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Contact ${member.name} directly:</strong></p>
                  <p style="margin: 5px 0;">Email: <a href="mailto:${member.email}">${member.email}</a></p>
                  ${member.linkedin ? `<p style="margin: 5px 0;">LinkedIn: <a href="https://linkedin.com/in/${member.linkedin}">linkedin.com/in/${member.linkedin}</a></p>` : ''}
                </div>

                <p style="color: #666; font-size: 14px;">
                  Reach out to ${member.name} to coordinate the introduction. Be respectful of their time and follow up appropriately.
                </p>
              </div>
            `,
          });
        } else {
          await resendPatch.emails.send({
            from: FROM_EMAIL,
            to: requester.email,
            subject: `Introduction Request Update: ${investor.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e3a5f;">Introduction Request Update</h2>
                <p>Unfortunately, <strong>${member.name}</strong> is unable to make an introduction to <strong>${investor.name}</strong>${investor.firm ? ` at ${investor.firm}` : ''} at this time.</p>

                <p>Don't be discouraged. There may be other members in the community who can help. Check the investor directory to see if someone else knows this investor.</p>

                <p><a href="https://frenchtech-boston.com/members/investors" style="display: inline-block; background: #e63946; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Browse Investor Directory</a></p>
              </div>
            `,
          });
        }
      } catch (emailError) {
        console.error('Failed to send response email:', emailError);
      }
    }

    return new Response(JSON.stringify({ success: true, status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in intro requests PATCH:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

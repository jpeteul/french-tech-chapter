import type { APIRoute } from 'astro';
import { createServerClient, getSupabaseAdmin } from '../../../lib/supabase';
import { getMember } from '../../../lib/auth';
import { getResend, FROM_EMAIL } from '../../../lib/resend';

export const prerender = false;

// GET - Fetch all connection requests for the current user
export const GET: APIRoute = async ({ request, cookies, locals }) => {
  const member = await getMember(cookies, (locals as any).runtime, request);
  if (!member) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createServerClient(cookies, request);
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabase || !supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get requests sent by user (use admin to bypass RLS)
  const { data: sent } = await supabaseAdmin
    .from('connection_requests')
    .select(`
      id,
      message,
      status,
      response_message,
      created_at,
      responded_at,
      receiver:receiver_id (id, name, company, role)
    `)
    .eq('requester_id', member.id)
    .order('created_at', { ascending: false });

  // Get requests received by user (use admin to bypass RLS)
  const { data: received } = await supabaseAdmin
    .from('connection_requests')
    .select(`
      id,
      message,
      status,
      response_message,
      created_at,
      responded_at,
      requester:requester_id (id, name, company, role, email, linkedin)
    `)
    .eq('receiver_id', member.id)
    .order('created_at', { ascending: false });

  return new Response(JSON.stringify({ sent: sent || [], received: received || [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST - Create a new connection request
export const POST: APIRoute = async ({ cookies, request, locals }) => {
  const member = await getMember(cookies, (locals as any).runtime, request);
  if (!member) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createServerClient(cookies, request);
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabase || !supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { receiver_id, message } = body;

  if (!receiver_id) {
    return new Response(JSON.stringify({ error: 'Receiver ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (receiver_id === member.id) {
    return new Response(JSON.stringify({ error: 'Cannot request connection with yourself' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if request already exists
  const { data: existing } = await supabase
    .from('connection_requests')
    .select('id, status')
    .or(`and(requester_id.eq.${member.id},receiver_id.eq.${receiver_id}),and(requester_id.eq.${receiver_id},receiver_id.eq.${member.id})`)
    .single();

  if (existing) {
    const statusMsg = existing.status === 'pending'
      ? 'A connection request is already pending'
      : existing.status === 'accepted'
        ? 'You are already connected'
        : 'A previous request was declined';
    return new Response(JSON.stringify({ error: statusMsg }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get receiver's info for the email (use admin client to bypass RLS)
  const { data: receiver } = await supabaseAdmin
    .from('members')
    .select('name, email')
    .eq('id', receiver_id)
    .single();

  if (!receiver) {
    return new Response(JSON.stringify({ error: 'Member not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create the request (use admin client to bypass RLS)
  const { data: connectionRequest, error } = await supabaseAdmin
    .from('connection_requests')
    .insert({
      requester_id: member.id,
      receiver_id,
      message: message || null,
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send email notification to receiver
  const resend = getResend((locals as any).runtime);
  if (resend && receiver.email) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: receiver.email,
        subject: `${member.name} wants to connect with you`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1C1B3A;">New Connection Request</h2>
            <p><strong>${member.name}</strong>${member.company ? ` from ${member.company}` : ''} would like to connect with you on La French Tech Boston.</p>
            ${message ? `<p style="background: #f5f5f5; padding: 12px; border-radius: 8px; font-style: italic;">"${message}"</p>` : ''}
            <p>
              <a href="${import.meta.env.PUBLIC_SITE_URL || 'https://frenchtech-boston.com'}/members/connections"
                 style="display: inline-block; background: #E1000F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                View Request
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">You can accept or decline this request from your connections page.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send connection request email:', emailError);
    }
  }

  return new Response(JSON.stringify({ success: true, request: connectionRequest }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

// PATCH - Respond to a connection request (accept/decline)
export const PATCH: APIRoute = async ({ cookies, request, locals }) => {
  const member = await getMember(cookies, (locals as any).runtime, request);
  if (!member) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createServerClient(cookies, request);
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabase || !supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { request_id, status, response_message } = body;

  if (!request_id || !status || !['accepted', 'declined'].includes(status)) {
    return new Response(JSON.stringify({ error: 'Valid request_id and status (accepted/declined) are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify this request is for the current user (use admin to bypass RLS)
  const { data: connectionRequest } = await supabaseAdmin
    .from('connection_requests')
    .select(`
      id,
      status,
      requester:requester_id (id, name, email, company)
    `)
    .eq('id', request_id)
    .eq('receiver_id', member.id)
    .single();

  if (!connectionRequest) {
    return new Response(JSON.stringify({ error: 'Connection request not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (connectionRequest.status !== 'pending') {
    return new Response(JSON.stringify({ error: 'This request has already been responded to' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Update the request (use admin to bypass RLS)
  const { error } = await supabaseAdmin
    .from('connection_requests')
    .update({
      status,
      response_message: status === 'accepted' ? (response_message || null) : null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', request_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send email notification to requester
  const requester = connectionRequest.requester as any;
  const resendPatch = getResend((locals as any).runtime);
  if (resendPatch && requester?.email) {
    try {
      if (status === 'accepted') {
        await resendPatch.emails.send({
          from: FROM_EMAIL,
          to: requester.email,
          subject: `${member.name} accepted your connection request!`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1C1B3A;">Connection Accepted!</h2>
              <p>Great news! <strong>${member.name}</strong>${member.company ? ` from ${member.company}` : ''} has accepted your connection request.</p>
              ${response_message ? `
                <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p style="margin: 0 0 8px 0; font-weight: bold;">Message from ${member.name}:</p>
                  <p style="margin: 0; font-style: italic;">"${response_message}"</p>
                </div>
              ` : ''}
              <p><strong>Contact Information:</strong></p>
              <ul>
                <li>Email: <a href="mailto:${member.email}">${member.email}</a></li>
                ${member.linkedin ? `<li>LinkedIn: <a href="https://linkedin.com/in/${member.linkedin}">linkedin.com/in/${member.linkedin}</a></li>` : ''}
              </ul>
              <p>
                <a href="${import.meta.env.PUBLIC_SITE_URL || 'https://frenchtech-boston.com'}/members/connections"
                   style="display: inline-block; background: #E1000F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  View Your Connections
                </a>
              </p>
            </div>
          `,
        });
      } else {
        await resendPatch.emails.send({
          from: FROM_EMAIL,
          to: requester.email,
          subject: `Update on your connection request`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1C1B3A;">Connection Request Update</h2>
              <p>Unfortunately, your connection request was not accepted at this time.</p>
              <p>Don't be discouraged. Continue exploring the member directory to find other connections!</p>
              <p>
                <a href="${import.meta.env.PUBLIC_SITE_URL || 'https://frenchtech-boston.com'}/members/directory"
                   style="display: inline-block; background: #E1000F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Browse Directory
                </a>
              </p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error('Failed to send response email:', emailError);
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

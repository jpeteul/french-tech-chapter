import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

// GET - List all subscribers with member status
export const GET: APIRoute = async ({ locals }) => {
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: subscribers, error } = await supabaseAdmin
    .from('newsletter_subscribers')
    .select('*')
    .is('unsubscribed_at', null)
    .order('subscribed_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get member emails for cross-reference
  const { data: members } = await supabaseAdmin
    .from('members')
    .select('email')
    .eq('status', 'active');

  const memberEmails = new Set((members || []).map(m => m.email?.toLowerCase()));

  // Add isMember flag to each subscriber
  const enrichedSubscribers = subscribers?.map(sub => ({
    ...sub,
    isMember: memberEmails.has(sub.email?.toLowerCase()),
  }));

  return new Response(JSON.stringify({ subscribers: enrichedSubscribers }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// DELETE - Unsubscribe (soft delete)
export const DELETE: APIRoute = async ({ request, locals }) => {
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Subscriber ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Soft delete by setting unsubscribed_at
  const { error } = await supabaseAdmin
    .from('newsletter_subscribers')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

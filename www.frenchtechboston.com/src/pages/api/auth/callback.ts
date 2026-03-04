import type { APIRoute } from 'astro';
import { createServerClient, getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

// POST - Handle tokens from implicit flow (hash redirect)
// This is a fallback for when PKCE flow redirects with tokens in hash
export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    // Clone request before reading body (body can only be read once)
    const clonedRequest = request.clone();
    const body = await request.json();
    const { access_token, refresh_token } = body;

    if (!access_token || !refresh_token) {
      return new Response(JSON.stringify({ error: 'Missing tokens' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use SSR client for proper cookie handling
    const supabase = createServerClient(cookies, clonedRequest);
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Auth not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Set the session to get user info
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error || !data.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // SSR client automatically sets session cookies via setAll callback

    // Link user_id to member row by email
    const userEmail = data.user.email?.toLowerCase();
    const userId = data.user.id;
    let redirect = '/members';

    const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

    if (userEmail && supabaseAdmin) {
      // Look for a member row matching this email (case-insensitive)
      const { data: member } = await supabaseAdmin
        .from('members')
        .select('id, user_id, login_count')
        .ilike('email', userEmail)
        .single();

      if (member && !member.user_id) {
        // Link the Supabase auth user to the pre-loaded member row
        await supabaseAdmin
          .from('members')
          .update({ user_id: userId })
          .eq('id', member.id);
      }

      if (member) {
        // Update login activity tracking
        await supabaseAdmin
          .from('members')
          .update({
            last_seen_at: new Date().toISOString(),
            login_count: (member as any).login_count ? (member as any).login_count + 1 : 1,
          })
          .eq('id', member.id);
      }

      if (!member) {
        // Not a member — redirect to apply page
        redirect = '/apply?not_member=true';
      }
    }

    return new Response(JSON.stringify({ success: true, redirect }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Callback error:', err);
    return new Response(JSON.stringify({ error: 'Something went wrong' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

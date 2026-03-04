import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { getMember } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
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

    // Update member's whatsapp_prompt_dismissed flag
    const { error } = await supabaseAdmin
      .from('members')
      .update({ whatsapp_prompt_dismissed: true })
      .eq('id', member.id);

    if (error) {
      console.error('Dismiss WhatsApp error:', error);
      return new Response(JSON.stringify({ error: 'Failed to update' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Dismiss WhatsApp error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const authResult = await requireAdmin(cookies, (locals as any).runtime, request);
    if ('redirect' in authResult) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

    if (!supabaseAdmin) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 500 });
    }

    const { key, value } = await request.json();

    if (!key || value === undefined) {
      return new Response(JSON.stringify({ error: 'Key and value are required' }), { status: 400 });
    }

    // Check if setting exists
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('site_settings')
      .select('key')
      .eq('key', key)
      .maybeSingle();

    if (selectError) {
      console.error('Settings select error:', selectError);
      return new Response(JSON.stringify({ error: 'Failed to save setting' }), { status: 500 });
    }

    const memberId = authResult.member?.id || null;

    let error;
    if (existing) {
      // Update existing setting
      const result = await supabaseAdmin
        .from('site_settings')
        .update({
          value,
          updated_at: new Date().toISOString(),
          ...(memberId && { updated_by: memberId }),
        })
        .eq('key', key);
      error = result.error;
    } else {
      // Insert new setting
      const result = await supabaseAdmin
        .from('site_settings')
        .insert({
          key,
          value,
          updated_at: new Date().toISOString(),
          ...(memberId && { updated_by: memberId }),
        });
      error = result.error;
    }

    if (error) {
      console.error('Settings update error:', error);
      return new Response(JSON.stringify({ error: 'Failed to save setting' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Settings error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const authResult = await requireAdmin(cookies, (locals as any).runtime, request);
    if ('redirect' in authResult) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

    if (!supabaseAdmin) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 500 });
    }

    const { data: settings, error } = await supabaseAdmin
      .from('site_settings')
      .select('*');

    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), { status: 500 });
    }

    return new Response(JSON.stringify({ settings }), { status: 200 });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};

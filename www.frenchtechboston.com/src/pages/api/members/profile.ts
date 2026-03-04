import type { APIRoute } from 'astro';
import { getMember } from '../../../lib/auth';
import { createServerClient } from '../../../lib/supabase';

export const prerender = false;

export const PUT: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const member = await getMember(cookies, (locals as any).runtime, request);

    if (!member) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Clone request before reading body
    const clonedRequest = request.clone();
    const body = await request.json();
    const { name, company, role, linkedin, industry, bio } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createServerClient(cookies, clonedRequest);

    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase
      .from('members')
      .update({
        name,
        company,
        role,
        linkedin,
        industry,
        bio,
      })
      .eq('id', member.id);

    if (error) {
      console.error('Profile update error:', error);
      return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Profile updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

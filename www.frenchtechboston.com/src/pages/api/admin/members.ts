import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

export const prerender = false;

// POST - Create a new member
export const POST: APIRoute = async ({ cookies, request, locals }) => {
  const authResult = await requireAdmin(cookies, (locals as any).runtime, request);
  if ('redirect' in authResult) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { email, name, company, role, linkedin, member_role, status } = body;

  if (!email || !name) {
    return new Response(JSON.stringify({ error: 'Email and name are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if member with this email already exists
  const { data: existing } = await supabaseAdmin
    .from('members')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    return new Response(JSON.stringify({ error: 'A member with this email already exists' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabaseAdmin
    .from('members')
    .insert({
      email,
      name,
      company: company || null,
      role: role || null,
      linkedin: linkedin || null,
      member_role: member_role || 'member',
      status: status || 'active',
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ member: data }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

// PATCH - Update member status or role
export const PATCH: APIRoute = async ({ cookies, request, locals }) => {
  const authResult = await requireAdmin(cookies, (locals as any).runtime, request);
  if ('redirect' in authResult) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { id, status, member_role } = body;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Member ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updates: Record<string, string> = {};
  if (status) updates.status = status;
  if (member_role) updates.member_role = member_role;

  const { data, error } = await supabaseAdmin
    .from('members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ member: data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

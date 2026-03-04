import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

// GET - List all team members
export const GET: APIRoute = async ({ locals }) => {
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: members, error } = await supabaseAdmin
    .from('team_members')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ members }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST - Create new team member
export const POST: APIRoute = async ({ request, locals }) => {
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { name, role, linkedin, image_url, display_order } = body;

  if (!name) {
    return new Response(JSON.stringify({ error: 'Name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get max display_order if not provided
  let order = display_order;
  if (order === undefined || order === null) {
    const { data: maxOrder } = await supabaseAdmin
      .from('team_members')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();
    order = (maxOrder?.display_order || 0) + 1;
  }

  const { data: member, error } = await supabaseAdmin
    .from('team_members')
    .insert({
      name,
      role: role || '',
      linkedin: linkedin || '',
      image_url: image_url || null,
      display_order: order,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ member }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT - Update team member
export const PUT: APIRoute = async ({ request, locals }) => {
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { id, name, role, linkedin, image_url, display_order, is_active } = body;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Team member ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updateData: Record<string, any> = {};
  if (name !== undefined) updateData.name = name;
  if (role !== undefined) updateData.role = role;
  if (linkedin !== undefined) updateData.linkedin = linkedin;
  if (image_url !== undefined) updateData.image_url = image_url;
  if (display_order !== undefined) updateData.display_order = display_order;
  if (is_active !== undefined) updateData.is_active = is_active;

  const { data: member, error } = await supabaseAdmin
    .from('team_members')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ member }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// DELETE - Delete team member
export const DELETE: APIRoute = async ({ request, locals }) => {
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);
  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Team member ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error } = await supabaseAdmin
    .from('team_members')
    .delete()
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

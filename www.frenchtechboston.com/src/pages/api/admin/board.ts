import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

// GET - List all board members
export const GET: APIRoute = async ({ locals }) => {
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: members, error } = await supabaseAdmin
    .from('board_members')
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

// POST - Create new board member
export const POST: APIRoute = async ({ request, locals }) => {
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { name, title, company, linkedin, image_url, display_order, board_role } = body;

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
      .from('board_members')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();
    order = (maxOrder?.display_order || 0) + 1;
  }

  const { email } = body;

  const { data: member, error } = await supabaseAdmin
    .from('board_members')
    .insert({
      name,
      title: title || '',
      company: company || '',
      linkedin: linkedin || '',
      image_url: image_url || null,
      email: email || null,
      board_role: board_role || null,
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

// PUT - Update board member
export const PUT: APIRoute = async ({ request, locals }) => {
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { id, name, title, company, linkedin, image_url, display_order, is_active, email, board_role } = body;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Board member ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updateData: Record<string, any> = {};
  if (name !== undefined) updateData.name = name;
  if (title !== undefined) updateData.title = title;
  if (company !== undefined) updateData.company = company;
  if (linkedin !== undefined) updateData.linkedin = linkedin;
  if (image_url !== undefined) updateData.image_url = image_url;
  if (display_order !== undefined) updateData.display_order = display_order;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (email !== undefined) updateData.email = email;
  if (board_role !== undefined) updateData.board_role = board_role;

  const { data: member, error } = await supabaseAdmin
    .from('board_members')
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

// DELETE - Delete board member
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
    return new Response(JSON.stringify({ error: 'Board member ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error } = await supabaseAdmin
    .from('board_members')
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

import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { getMember } from '../../../../lib/auth';

export const prerender = false;

// PATCH: Update relationship note
export const PATCH: APIRoute = async ({ params, request, cookies, locals }) => {
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

  const { id } = params;

  try {
    // Verify ownership
    const { data: contact, error: fetchError } = await supabaseAdmin
      .from('investor_contacts')
      .select('id, member_id')
      .eq('id', id)
      .single();

    if (fetchError || !contact) {
      return new Response(JSON.stringify({ error: 'Contact not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (contact.member_id !== member.id) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { relationship_note } = await request.json();

    const { error: updateError } = await supabaseAdmin
      .from('investor_contacts')
      .update({ relationship_note })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating contact:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update contact' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in contact PATCH:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE: Remove yourself as a contact
export const DELETE: APIRoute = async ({ params, request, cookies, locals }) => {
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

  const { id } = params;

  try {
    // Verify ownership
    const { data: contact, error: fetchError } = await supabaseAdmin
      .from('investor_contacts')
      .select('id, member_id')
      .eq('id', id)
      .single();

    if (fetchError || !contact) {
      return new Response(JSON.stringify({ error: 'Contact not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (contact.member_id !== member.id) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('investor_contacts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting contact:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to remove contact' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in contact DELETE:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

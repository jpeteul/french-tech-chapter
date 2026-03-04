import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

export const prerender = false;

// Upload new photo
export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const authResult = await requireAdmin(cookies, (locals as any).runtime, request);
    if ('redirect' in authResult) {
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const altText = formData.get('alt_text') as string;
    const isWide = formData.get('is_wide') === 'true';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `event-${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('event-photos')
      .upload(filename, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('event-photos')
      .getPublicUrl(filename);

    // Get current max display order
    const { data: maxOrder } = await supabaseAdmin
      .from('event_photos')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const displayOrder = (maxOrder?.display_order || 0) + 1;

    // Insert into database
    const { data: photo, error: dbError } = await supabaseAdmin
      .from('event_photos')
      .insert({
        filename,
        url: urlData.publicUrl,
        alt_text: altText || null,
        is_wide: isWide,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file
      await supabaseAdmin.storage.from('event-photos').remove([filename]);
      return new Response(JSON.stringify({ error: 'Failed to save photo' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, photo }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Event photos error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Update photo (edit or reorder)
export const PATCH: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const authResult = await requireAdmin(cookies, (locals as any).runtime, request);
    if ('redirect' in authResult) {
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

    const { id, alt_text, is_wide, display_order } = await request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'No photo ID provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updates: Record<string, any> = {};
    if (alt_text !== undefined) updates.alt_text = alt_text;
    if (is_wide !== undefined) updates.is_wide = is_wide;
    if (display_order !== undefined) updates.display_order = display_order;

    const { data: photo, error: dbError } = await supabaseAdmin
      .from('event_photos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (dbError) {
      console.error('Update error:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to update photo' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, photo }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Update photo error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Delete photo
export const DELETE: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const authResult = await requireAdmin(cookies, (locals as any).runtime, request);
    if ('redirect' in authResult) {
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

    const { id } = await request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'No photo ID provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the photo to find filename
    const { data: photo } = await supabaseAdmin
      .from('event_photos')
      .select('filename')
      .eq('id', id)
      .single();

    if (photo) {
      // Delete from storage
      await supabaseAdmin.storage.from('event-photos').remove([photo.filename]);
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin
      .from('event_photos')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Delete error:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to delete photo' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete photo error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

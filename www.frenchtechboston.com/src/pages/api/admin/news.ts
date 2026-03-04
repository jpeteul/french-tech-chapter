import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

// GET - List all news articles
export const GET: APIRoute = async ({ locals }) => {
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: articles, error } = await supabaseAdmin
    .from('news')
    .select('*')
    .order('published_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ articles }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST - Create new article
export const POST: APIRoute = async ({ request, locals }) => {
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { title, slug, excerpt, content, category, image_url, is_published, author_name } = body;

  if (!title || !slug) {
    return new Response(JSON.stringify({ error: 'Title and slug are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: article, error } = await supabaseAdmin
    .from('news')
    .insert({
      title,
      slug,
      excerpt: excerpt || '',
      content: content || '',
      category: category || 'News',
      image_url: image_url || null,
      is_published: is_published || false,
      published_at: is_published ? new Date().toISOString() : null,
      author_name: author_name || null,
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ article }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT - Update article
export const PUT: APIRoute = async ({ request, locals }) => {
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);
  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { id, title, slug, excerpt, content, category, image_url, is_published, author_name } = body;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Article ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get current article to check if we're publishing for the first time
  const { data: currentArticle } = await supabaseAdmin
    .from('news')
    .select('is_published, published_at')
    .eq('id', id)
    .single();

  const updateData: Record<string, any> = {};
  if (title !== undefined) updateData.title = title;
  if (slug !== undefined) updateData.slug = slug;
  if (excerpt !== undefined) updateData.excerpt = excerpt;
  if (content !== undefined) updateData.content = content;
  if (category !== undefined) updateData.category = category;
  if (image_url !== undefined) updateData.image_url = image_url;
  if (author_name !== undefined) updateData.author_name = author_name;

  if (is_published !== undefined) {
    updateData.is_published = is_published;
    // Set published_at when first publishing
    if (is_published && !currentArticle?.published_at) {
      updateData.published_at = new Date().toISOString();
    }
  }

  const { data: article, error } = await supabaseAdmin
    .from('news')
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

  return new Response(JSON.stringify({ article }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// DELETE - Delete article
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
    return new Response(JSON.stringify({ error: 'Article ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error } = await supabaseAdmin
    .from('news')
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

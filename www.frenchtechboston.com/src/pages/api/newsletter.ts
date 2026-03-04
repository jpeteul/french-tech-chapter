import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);
  try {
    const body = await request.json();
    const { email, name, source = 'homepage' } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!supabaseAdmin) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if already subscribed
    const { data: existing } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('id, unsubscribed_at')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      // If they previously unsubscribed, resubscribe them
      if (existing.unsubscribed_at) {
        await supabaseAdmin
          .from('newsletter_subscribers')
          .update({
            unsubscribed_at: null,
            subscribed_at: new Date().toISOString(),
            name: name || null,
            source,
          })
          .eq('id', existing.id);

        return new Response(JSON.stringify({
          success: true,
          message: 'Welcome back! You\'ve been resubscribed.'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Already subscribed
      return new Response(JSON.stringify({
        success: true,
        message: 'You\'re already subscribed!'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // New subscriber
    const { error } = await supabaseAdmin
      .from('newsletter_subscribers')
      .insert({
        email: email.toLowerCase(),
        name: name || null,
        source,
        subscribed_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Newsletter subscription error:', error);
      return new Response(JSON.stringify({ error: 'Failed to subscribe' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Thanks for subscribing!'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(JSON.stringify({ error: 'Failed to subscribe' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

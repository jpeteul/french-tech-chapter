import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, url, cookies }) => {
  try {
    // Clone request before reading body (body can only be read once)
    const clonedRequest = request.clone();
    const body = await request.json();
    const { email, redirect = '/members' } = body;

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

    // Use SSR client which stores PKCE code_verifier in cookies
    const supabase = createServerClient(cookies, clonedRequest);
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Authentication not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build callback URL
    const callbackUrl = new URL('/auth/callback', url.origin);
    callbackUrl.searchParams.set('redirect', redirect);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      console.error('Login error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Check your email for the login link'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Failed to send login link' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

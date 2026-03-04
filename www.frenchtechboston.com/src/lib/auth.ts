import type { AstroCookies } from 'astro';
import { createServerClient, getSupabaseAdmin } from './supabase';

type CloudflareRuntime = { env?: { SUPABASE_SERVICE_ROLE_KEY?: string } };

export async function getUser(cookies: AstroCookies, request?: Request) {
  const supabase = createServerClient(cookies, request);
  if (!supabase) return null;

  // The SSR client handles session from cookies automatically
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    // Session invalid or expired
    clearAuthCookies(cookies);
    return null;
  }

  return user;
}

export async function getMember(cookies: AstroCookies, runtime?: CloudflareRuntime, request?: Request) {
  // Use supabaseAdmin to bypass RLS (with Cloudflare runtime support)
  const supabaseAdmin = getSupabaseAdmin(runtime);
  if (!supabaseAdmin) return null;

  const user = await getUser(cookies, request);
  if (!user) return null;

  // Look up member by user_id using admin client
  const { data: member } = await supabaseAdmin
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return member;
}

export async function requireAuth(cookies: AstroCookies, redirectTo = '/auth/login', request?: Request) {
  const user = await getUser(cookies, request);

  if (!user) {
    return { redirect: redirectTo };
  }

  return { user };
}

export async function requireAdmin(cookies: AstroCookies, runtime?: CloudflareRuntime, request?: Request) {
  const member = await getMember(cookies, runtime, request);

  if (!member) {
    return { redirect: '/auth/login' };
  }

  if (member.member_role !== 'admin') {
    return { redirect: '/members' };
  }

  return { member };
}

export function setAuthCookies(
  cookies: AstroCookies,
  accessToken: string,
  refreshToken: string
) {
  cookies.set('sb-access-token', accessToken, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  cookies.set('sb-refresh-token', refreshToken, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearAuthCookies(cookies: AstroCookies) {
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });
}

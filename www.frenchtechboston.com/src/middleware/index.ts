import { defineMiddleware } from 'astro:middleware';
import { getUser, getMember } from '../lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Protected routes that require authentication
  const protectedPaths = ['/members', '/admin'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtectedPath) {
    const user = await getUser(context.cookies, context.request);

    if (!user) {
      const redirectUrl = `/auth/login?redirect=${encodeURIComponent(pathname)}`;
      return context.redirect(redirectUrl);
    }

    // Check that authenticated user is actually a member (pass runtime for Cloudflare)
    const member = await getMember(context.cookies, (context.locals as any).runtime, context.request);
    if (!member) {
      return context.redirect('/apply?not_member=true');
    }
  }

  return next();
});

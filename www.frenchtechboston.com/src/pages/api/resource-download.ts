import type { APIRoute } from 'astro';
import { getResend, FROM_EMAIL } from '../../lib/resend';
import { getSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { email, name, resource: resourceSlug, skipEmail } = body;

    if (!email || !name) {
      return new Response(JSON.stringify({ error: 'Email and name are required' }), {
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

    const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

    // Get resource info
    let resourceTitle = 'Resource';
    let downloadUrl = '';

    if (supabaseAdmin && resourceSlug) {
      const { data: resource } = await supabaseAdmin
        .from('resources')
        .select('title, file_url')
        .eq('slug', resourceSlug)
        .single();

      if (resource) {
        resourceTitle = resource.title;
        downloadUrl = resource.file_url
          ? `https://www.frenchtech-boston.com${resource.file_url}`
          : '';
      }
    }

    // Store in newsletter_subscribers for lead tracking
    if (supabaseAdmin) {
      const source = resourceSlug ? `resource-${resourceSlug}` : 'resource-download';
      await supabaseAdmin
        .from('newsletter_subscribers')
        .upsert(
          { email, name, source },
          { onConflict: 'email', ignoreDuplicates: false }
        );
    }

    // Send email with download link (unless skipEmail is true for immediate downloads)
    if (!skipEmail) {
      const resend = getResend((locals as any).runtime);
      if (resend && downloadUrl) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `Your ${resourceTitle} - La French Tech Boston`,
            html: `
              <h2>Here's your ${resourceTitle}!</h2>
              <p>Hi ${name},</p>
              <p>Thank you for your interest. You can download your copy using the link below:</p>
              <p><a href="${downloadUrl}" style="background-color: #E1000F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Download ${resourceTitle}</a></p>
              <p>We hope you find it useful! If you have any questions, don't hesitate to reach out.</p>
              <p>Best regards,<br>La French Tech Boston Team</p>
            `,
          });
        } catch (emailError) {
          console.error('Failed to send resource email:', emailError);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Check your email for the download link!'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Resource download request error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

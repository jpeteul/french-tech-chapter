import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';
import { getResend, FROM_EMAIL } from '../../../lib/resend';
import { generateWelcomeEmail, WELCOME_EMAIL_SUBJECT } from '../../../lib/emails/welcome';

export const prerender = false;

// POST - Approve or reject an application
export const POST: APIRoute = async ({ cookies, request, locals }) => {
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
      return new Response(JSON.stringify({ error: 'Database unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { id, action } = body;

  if (!id || !action) {
    return new Response(JSON.stringify({ error: 'Application ID and action are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action !== 'approve' && action !== 'reject') {
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get the application
  const { data: application, error: fetchError } = await supabaseAdmin
    .from('applications')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !application) {
    return new Response(JSON.stringify({ error: 'Application not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'approve') {
    // Check if member with this email already exists
    const { data: existing } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('email', application.email)
      .single();

    if (existing) {
      // Update application status anyway
      await supabaseAdmin
        .from('applications')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', id);

      return new Response(JSON.stringify({
        error: 'A member with this email already exists. Application marked as approved.',
        member: existing
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create member from application
    const { data: newMember, error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        email: application.email,
        name: application.name,
        company: application.company || null,
        role: application.role || null,
        linkedin: application.linkedin || null,
        member_role: 'member',
        status: 'active',
      })
      .select()
      .single();

    if (memberError) {
      return new Response(JSON.stringify({ error: memberError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update application status
    await supabaseAdmin
      .from('applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    // Get WhatsApp URL from site settings
    let whatsappUrl = '';
    const { data: setting } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', 'whatsapp_community_url')
      .single();
    whatsappUrl = setting?.value || '';

    // Send welcome email
    const resend = getResend((locals as any).runtime);
    if (resend) {
      try {
        const firstName = application.name.split(' ')[0];
        const html = generateWelcomeEmail({ firstName, whatsappUrl });

        await resend.emails.send({
          from: FROM_EMAIL,
          to: application.email,
          subject: WELCOME_EMAIL_SUBJECT,
          html,
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the approval if email fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      member: newMember,
      message: 'Application approved and member created'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    // Reject application
    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Application rejected'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  } catch (error: any) {
    console.error('Application API error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
      details: String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE - Clear all applications (for testing/admin purposes)
export const DELETE: APIRoute = async ({ cookies, request, locals }) => {
  const authResult = await requireAdmin(cookies, (locals as any).runtime, request);
  if ('redirect' in authResult) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const clearAll = url.searchParams.get('all') === 'true';

  if (clearAll) {
    // Delete all applications
    const { error } = await supabaseAdmin
      .from('applications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'All applications cleared'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Specify ?all=true to clear all applications' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
};

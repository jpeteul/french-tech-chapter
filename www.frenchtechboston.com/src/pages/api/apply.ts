import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../lib/supabase';
import { getResend, FROM_EMAIL } from '../../lib/resend';

export const prerender = false;

const CONTACT_EMAIL = 'frenchtechboston@gmail.com';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { name, email, company, role, linkedin, reason } = body;

    if (!name || !email || !reason) {
      return new Response(JSON.stringify({ error: 'Name, email, and reason are required' }), {
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

    if (supabaseAdmin) {
      // Check if email is already a member
      const { data: existingMember } = await supabaseAdmin
        .from('members')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existingMember) {
        return new Response(JSON.stringify({ error: 'This email is already registered as a member' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check if there's already a pending application with this email
      const { data: existingApplication } = await supabaseAdmin
        .from('applications')
        .select('id, status')
        .eq('email', email.toLowerCase())
        .eq('status', 'pending')
        .single();

      if (existingApplication) {
        return new Response(JSON.stringify({ error: 'An application with this email is already pending review' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Save application to Supabase
      const { error: insertError } = await supabaseAdmin
        .from('applications')
        .insert({
          name,
          email: email.toLowerCase(),
          company: company || null,
          role: role || null,
          linkedin: linkedin || null,
          reason,
        });

      if (insertError) {
        console.error('Failed to save application:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to save application' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('New application saved:', { name, email, company, role, linkedin, reason });

    // Send email notification to admins
    const resend = getResend((locals as any).runtime);
    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: CONTACT_EMAIL,
          subject: `[New Application] ${name} - ${company || 'No company'}`,
          html: `
            <h2>New Membership Application</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Company:</strong> ${company || 'Not provided'}</p>
            <p><strong>Role:</strong> ${role || 'Not provided'}</p>
            <p><strong>LinkedIn:</strong> ${linkedin ? `<a href="${linkedin}">${linkedin}</a>` : 'Not provided'}</p>
            <p><strong>Reason for joining:</strong></p>
            <p>${reason.replace(/\n/g, '<br>')}</p>
          `,
        });

        // Send confirmation to applicant
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: 'Application Received - La French Tech Boston',
          html: `
            <h2>Thank you for your application!</h2>
            <p>Hi ${name},</p>
            <p>We've received your application to join La French Tech Boston. Our team will review it and get back to you soon.</p>
            <p>In the meantime, follow us on <a href="https://www.linkedin.com/company/la-french-tech-boston/">LinkedIn</a> for updates and announcements.</p>
            <p>Best regards,<br>La French Tech Boston Team</p>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send emails:', emailError);
        // Don't fail the application if email fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Application submitted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Application submission error:', error);
    return new Response(JSON.stringify({ error: 'Failed to submit application' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

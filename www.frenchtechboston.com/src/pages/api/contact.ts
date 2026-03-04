import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../lib/supabase';
import { getResend, FROM_EMAIL } from '../../lib/resend';

export const prerender = false;

const CONTACT_EMAIL = 'frenchtechboston@gmail.com';

export const POST: APIRoute = async ({ request, locals }) => {
  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), {
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

    // Save to database (always)
    if (supabaseAdmin) {
      const { error: dbError } = await supabaseAdmin
        .from('contact_submissions')
        .insert({
          name,
          email,
          subject,
          message,
        });

      if (dbError) {
        console.error('Failed to save contact submission:', dbError);
        // Continue anyway - we'll still try to send email
      }
    }

    // Send email notification
    const resend = getResend((locals as any).runtime);
    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: CONTACT_EMAIL,
          replyTo: email,
          subject: `[Contact Form] ${subject} - from ${name}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This message has also been saved to the admin dashboard.</p>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the request - message is saved in database
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Message sent successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(JSON.stringify({ error: 'Failed to send message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

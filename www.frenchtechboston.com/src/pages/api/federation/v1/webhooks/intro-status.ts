import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../../lib/supabase';
import { CHAPTER } from '../../../../../lib/chapter-config';
import { verifyFederationRequest } from '../../../../../lib/federation/auth';
import { getChapter } from '../../../../../lib/federation/network-registry';
import { getResend, getFromEmail } from '../../../../../lib/resend';
import type { FederationWebhookPayload } from '../../../../../lib/federation/types';

export const prerender = false;

// CORS headers for federation requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Federation-Version',
};

/**
 * POST /api/federation/v1/webhooks/intro-status
 *
 * Receives status updates for cross-chapter intro requests.
 * Called by remote chapters when a contact accepts/declines.
 *
 * Body (FederationWebhookPayload):
 * - type: 'intro_status_update'
 * - requestId: The remote request ID
 * - status: New status (accepted/declined)
 * - contactInfo: (only on acceptance) Contact email and LinkedIn
 * - timestamp: ISO timestamp
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime;

  // Verify federation token (scope not strictly required for webhooks)
  const authResult = await verifyFederationRequest(
    request,
    [], // No specific scope required for webhooks
    runtime
  );

  if (!authResult.valid) {
    return new Response(
      JSON.stringify({ error: authResult.error }),
      {
        status: authResult.statusCode,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  const { payload: tokenPayload } = authResult;
  const originChapter = getChapter(tokenPayload.iss);

  if (!originChapter) {
    return new Response(
      JSON.stringify({ error: 'Unknown origin chapter' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  const supabaseAdmin = getSupabaseAdmin(runtime);
  if (!supabaseAdmin) {
    return new Response(
      JSON.stringify({ error: 'Database not configured' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }

  try {
    const body: FederationWebhookPayload = await request.json();
    const { type, requestId, status, contactInfo, timestamp } = body;

    // Validate webhook type
    if (type !== 'intro_status_update') {
      return new Response(
        JSON.stringify({ error: 'Unknown webhook type' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Validate status
    if (!['accepted', 'declined'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Find the local request by remote ID
    const { data: localRequest, error: findError } = await supabaseAdmin
      .from('federated_intro_requests')
      .select(`
        id,
        requester_id,
        target_chapter_slug,
        target_investor_id,
        status,
        members:requester_id (
          id,
          name,
          email
        )
      `)
      .eq('remote_request_id', requestId)
      .eq('target_chapter_slug', tokenPayload.iss)
      .single();

    if (findError || !localRequest) {
      console.error('Federation request not found:', requestId, findError);
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Update local request status
    const { error: updateError } = await supabaseAdmin
      .from('federated_intro_requests')
      .update({ status })
      .eq('id', localRequest.id);

    if (updateError) {
      console.error('Error updating federated request status:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update request' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Send email to requester about the result
    const resend = getResend(runtime);
    const requester = localRequest.members as any;

    if (resend && requester?.email) {
      try {
        if (status === 'accepted' && contactInfo) {
          // Send acceptance email with contact info
          await resend.emails.send({
            from: getFromEmail(),
            to: requester.email,
            subject: `Introduction Accepted - ${originChapter.name}`,
            html: generateAcceptanceEmail({
              requesterName: requester.name,
              originChapterName: originChapter.name,
              contactEmail: contactInfo.email,
              contactLinkedin: contactInfo.linkedin,
            }),
          });
        } else if (status === 'declined') {
          // Send decline email
          await resend.emails.send({
            from: getFromEmail(),
            to: requester.email,
            subject: `Introduction Request Update - ${originChapter.name}`,
            html: generateDeclineEmail({
              requesterName: requester.name,
              originChapterName: originChapter.name,
            }),
          });
        }
      } catch (emailError) {
        console.error('Error sending webhook notification email:', emailError);
        // Don't fail the webhook, status was updated
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Error processing federation webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

/**
 * OPTIONS /api/federation/v1/webhooks/intro-status
 *
 * CORS preflight for webhook endpoint.
 */
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      'Access-Control-Max-Age': '86400',
    },
  });
};

/**
 * Generate acceptance email with contact info
 */
function generateAcceptanceEmail(params: {
  requesterName: string;
  originChapterName: string;
  contactEmail: string;
  contactLinkedin: string | null;
}): string {
  const { requesterName, originChapterName, contactEmail, contactLinkedin } = params;

  const linkedinSection = contactLinkedin
    ? `<p style="margin: 10px 0; color: #374151; font-size: 15px;">
         <strong>LinkedIn:</strong>
         <a href="${contactLinkedin}" style="color: #2563eb; text-decoration: none;">${contactLinkedin}</a>
       </p>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Introduction Accepted</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; text-align: center;">
              <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 30px;">✓</span>
              </div>
              <h1 style="margin: 0; color: white; font-size: 22px; font-weight: 600;">
                Introduction Accepted!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${requesterName},
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Great news! Your introduction request from <strong>${originChapterName}</strong> has been accepted. Here's their contact information:
              </p>

              <!-- Contact Card -->
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px; color: #374151; font-size: 15px;">
                  <strong>Email:</strong>
                  <a href="mailto:${contactEmail}" style="color: #2563eb; text-decoration: none;">${contactEmail}</a>
                </p>
                ${linkedinSection}
              </div>

              <p style="margin: 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                We recommend reaching out within 48 hours while the connection is fresh. Good luck!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                ${CHAPTER.name}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate decline email
 */
function generateDeclineEmail(params: {
  requesterName: string;
  originChapterName: string;
}): string {
  const { requesterName, originChapterName } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Introduction Request Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 22px; font-weight: 600;">
                Introduction Request Update
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${requesterName},
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Unfortunately, your introduction request from <strong>${originChapterName}</strong> was not accepted at this time.
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Don't be discouraged - there could be many reasons unrelated to you. Keep networking and exploring other connections in the French Tech community!
              </p>

              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
                  <strong>Tip:</strong> Review the investor's thesis and portfolio to ensure strong alignment before your next request.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                ${CHAPTER.name}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

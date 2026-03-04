import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { CHAPTER } from '../../../../lib/chapter-config';
import { verifyFederationRequest } from '../../../../lib/federation/auth';
import { getChapter } from '../../../../lib/federation/network-registry';
import { getResend, getFromEmail } from '../../../../lib/resend';
import type {
  FederationIntroRequestPayload,
  FederationIntroRequestResponse,
} from '../../../../lib/federation/types';

export const prerender = false;

// CORS headers for federation requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Federation-Version',
};

/**
 * POST /api/federation/v1/intro-requests
 *
 * Receives a cross-chapter intro request from another chapter.
 * Creates an incoming request record and emails the contact.
 *
 * Body:
 * - investorId: ID of the investor in THIS chapter
 * - contactMemberId: ID of the contact member in THIS chapter
 * - message: Introduction request message
 * - webhookUrl: URL to call when status changes
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime;

  // Verify federation token
  const authResult = await verifyFederationRequest(
    request,
    ['request:intro'],
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

  const { payload } = authResult;
  const originChapter = getChapter(payload.iss);

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
    const body: FederationIntroRequestPayload = await request.json();
    const { investorId, contactMemberId, message, webhookUrl } = body;

    // Validate required fields
    if (!investorId || !contactMemberId || !message || !webhookUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Verify investor exists
    const { data: investor, error: investorError } = await supabaseAdmin
      .from('investors')
      .select('id, name, firm')
      .eq('id', investorId)
      .single();

    if (investorError || !investor) {
      return new Response(
        JSON.stringify({ error: 'Investor not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Verify contact member exists and is active
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('members')
      .select('id, name, email, company')
      .eq('id', contactMemberId)
      .eq('status', 'active')
      .single();

    if (contactError || !contact) {
      return new Response(
        JSON.stringify({ error: 'Contact member not found or inactive' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Check for duplicate requests
    const { data: existingRequest } = await supabaseAdmin
      .from('incoming_federation_requests')
      .select('id, status')
      .eq('origin_chapter_slug', payload.iss)
      .eq('origin_requester_member_id', payload.sub.memberId)
      .eq('investor_id', investorId)
      .eq('contact_id', contactMemberId)
      .in('status', ['pending', 'sent'])
      .single();

    if (existingRequest) {
      return new Response(
        JSON.stringify({
          error: 'A pending request already exists',
          requestId: existingRequest.id,
          status: existingRequest.status,
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Create incoming request record
    const { data: incomingRequest, error: createError } = await supabaseAdmin
      .from('incoming_federation_requests')
      .insert({
        origin_chapter_slug: payload.iss,
        origin_chapter_name: originChapter.name,
        origin_requester_name: payload.sub.name,
        origin_requester_company: payload.sub.company,
        origin_requester_member_id: payload.sub.memberId,
        investor_id: investorId,
        contact_id: contactMemberId,
        message,
        status: 'pending',
        webhook_url: webhookUrl,
      })
      .select()
      .single();

    if (createError || !incomingRequest) {
      console.error('Error creating incoming federation request:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create request' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Send email to contact
    const resend = getResend(runtime);
    if (resend) {
      try {
        const investorName = investor.firm
          ? `${investor.name} (${investor.firm})`
          : investor.name;

        await resend.emails.send({
          from: getFromEmail(),
          to: contact.email,
          subject: `Cross-Chapter Intro Request: ${payload.sub.name} → ${investor.name}`,
          html: generateCrossChapterIntroEmail({
            contactName: contact.name,
            requesterName: payload.sub.name,
            requesterCompany: payload.sub.company,
            originChapterName: originChapter.name,
            investorName,
            message,
            requestId: incomingRequest.id,
          }),
        });

        // Update status to 'sent'
        await supabaseAdmin
          .from('incoming_federation_requests')
          .update({ status: 'sent' })
          .eq('id', incomingRequest.id);

        incomingRequest.status = 'sent';
      } catch (emailError) {
        console.error('Error sending cross-chapter intro email:', emailError);
        // Don't fail the request, the record was created
      }
    }

    const response: FederationIntroRequestResponse = {
      success: true,
      requestId: incomingRequest.id,
      status: incomingRequest.status,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'X-Federation-Version': '1',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Error in federation intro-requests API:', error);
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
 * OPTIONS /api/federation/v1/intro-requests
 *
 * CORS preflight for intro-requests endpoint.
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
 * Generate email HTML for cross-chapter intro request
 */
function generateCrossChapterIntroEmail(params: {
  contactName: string;
  requesterName: string;
  requesterCompany: string | null;
  originChapterName: string;
  investorName: string;
  message: string;
  requestId: string;
}): string {
  const {
    contactName,
    requesterName,
    requesterCompany,
    originChapterName,
    investorName,
    message,
    requestId,
  } = params;

  const requesterDisplay = requesterCompany
    ? `${requesterName} (${requesterCompany})`
    : requesterName;

  const dashboardUrl = `${CHAPTER.websiteUrl}/members/intro-requests?id=${requestId}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cross-Chapter Introduction Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 22px; font-weight: 600;">
                Cross-Chapter Introduction Request
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                From ${originChapterName}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${contactName},
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                <strong>${requesterDisplay}</strong> from <strong>${originChapterName}</strong> is requesting an introduction to <strong>${investorName}</strong> through your network.
              </p>

              <!-- Request Card -->
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Their message:
                </p>
                <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6; font-style: italic;">
                  "${message}"
                </p>
              </div>

              <!-- Privacy Notice -->
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
                  <strong>Privacy note:</strong> ${requesterName}'s contact information (email, LinkedIn) will only be shared with you if you accept this introduction request.
                </p>
              </div>

              <p style="margin: 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                You can review and respond to this request in your dashboard:
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
                <tr>
                  <td>
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                      Review Request
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                Thank you for helping connect the French Tech community across chapters!
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

/**
 * Federation Introduction Email Templates
 *
 * Email templates for cross-chapter introduction requests.
 */

import { CHAPTER } from '../chapter-config';

interface CrossChapterIntroEmailParams {
  contactName: string;
  requesterName: string;
  requesterCompany: string | null;
  originChapterName: string;
  investorName: string;
  message: string;
  requestId: string;
}

/**
 * Generate email for a cross-chapter intro request to the contact
 */
export function generateCrossChapterIntroRequestEmail(params: CrossChapterIntroEmailParams): string {
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

interface IntroAcceptanceEmailParams {
  requesterName: string;
  originChapterName: string;
  contactName: string;
  contactEmail: string;
  contactLinkedin: string | null;
  investorName: string;
}

/**
 * Generate email to requester when their intro request is accepted
 */
export function generateIntroAcceptanceEmail(params: IntroAcceptanceEmailParams): string {
  const {
    requesterName,
    originChapterName,
    contactName,
    contactEmail,
    contactLinkedin,
    investorName,
  } = params;

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
              <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px; line-height: 60px;">
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
                Great news! <strong>${contactName}</strong> from <strong>${originChapterName}</strong> has accepted your request for an introduction to <strong>${investorName}</strong>.
              </p>

              <!-- Contact Card -->
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 5px; color: #166534; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Contact Information
                </p>
                <p style="margin: 10px 0; color: #374151; font-size: 15px;">
                  <strong>Name:</strong> ${contactName}
                </p>
                <p style="margin: 10px 0; color: #374151; font-size: 15px;">
                  <strong>Email:</strong>
                  <a href="mailto:${contactEmail}" style="color: #2563eb; text-decoration: none;">${contactEmail}</a>
                </p>
                ${linkedinSection}
              </div>

              <!-- Tips -->
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; font-weight: 600;">
                  Tips for a successful introduction:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.6;">
                  <li>Reach out within 48 hours while the connection is fresh</li>
                  <li>Reference ${contactName}'s introduction in your opening</li>
                  <li>Be concise and clear about your ask</li>
                  <li>Follow up with ${contactName} to thank them</li>
                </ul>
              </div>

              <p style="margin: 20px 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Good luck with your conversation!
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

interface IntroDeclineEmailParams {
  requesterName: string;
  originChapterName: string;
  investorName: string;
}

/**
 * Generate email to requester when their intro request is declined
 */
export function generateIntroDeclineEmail(params: IntroDeclineEmailParams): string {
  const { requesterName, originChapterName, investorName } = params;

  const dashboardUrl = `${CHAPTER.websiteUrl}/members/investors`;

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
                Unfortunately, your introduction request for <strong>${investorName}</strong> through <strong>${originChapterName}</strong> was not accepted at this time.
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Don't be discouraged - there could be many reasons unrelated to you or your company. The contact may not have a strong enough relationship with the investor at this time, or the timing may not be right.
              </p>

              <!-- Tips -->
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0 0 10px; color: #1e40af; font-size: 14px; font-weight: 600;">
                  Next steps:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.6;">
                  <li>Review the investor's thesis and portfolio for stronger alignment</li>
                  <li>Explore other contacts who may know this investor</li>
                  <li>Continue building your network across French Tech chapters</li>
                </ul>
              </div>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
                <tr>
                  <td>
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                      Browse Investor Directory
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                Keep networking - the right connection is out there!
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

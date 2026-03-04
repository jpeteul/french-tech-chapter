// Event invite email template for members

interface EventInviteEmailParams {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventDescription?: string;
  registrationUrl?: string;
  eventUrl: string;
  unsubscribeUrl: string;
  eventStartISO: string; // ISO 8601 date string for calendar links
  eventEndISO?: string; // Optional end time, defaults to +2 hours
}

export const EVENT_INVITE_SUBJECT_PREFIX = "You're Invited:";

export function generateEventInviteSubject(eventTitle: string): string {
  return `${EVENT_INVITE_SUBJECT_PREFIX} ${eventTitle}`;
}

// Generate Google Calendar URL
function generateGoogleCalendarUrl(
  title: string,
  startISO: string,
  endISO: string,
  location: string,
  description: string
): string {
  // Google Calendar needs format: YYYYMMDDTHHmmssZ
  const formatForGoogle = (iso: string) => {
    return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatForGoogle(startISO)}/${formatForGoogle(endISO)}`,
    location: location,
    details: description,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Generate Outlook Calendar URL
function generateOutlookCalendarUrl(
  title: string,
  startISO: string,
  endISO: string,
  location: string,
  description: string
): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: title,
    startdt: startISO,
    enddt: endISO,
    location: location,
    body: description,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function generateEventInviteEmail({
  firstName,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  eventDescription,
  registrationUrl,
  eventUrl,
  unsubscribeUrl,
  eventStartISO,
  eventEndISO,
}: EventInviteEmailParams): string {
  const websiteUrl = 'https://www.frenchtech-boston.com';
  const linkedinUrl = 'https://www.linkedin.com/company/french-tech-boston';
  const contactEmail = 'frenchtechboston@gmail.com';

  const ctaUrl = registrationUrl || eventUrl;
  const ctaText = registrationUrl ? 'Register Now' : 'View Event Details';

  // Default to 2 hours if no end time provided
  const endISO = eventEndISO || new Date(new Date(eventStartISO).getTime() + 2 * 60 * 60 * 1000).toISOString();

  // Calendar description
  const calendarDescription = eventDescription
    ? `${eventDescription}\n\nMore info: ${eventUrl}`
    : `Join us for ${eventTitle}!\n\nMore info: ${eventUrl}`;

  const googleCalUrl = generateGoogleCalendarUrl(eventTitle, eventStartISO, endISO, eventLocation, calendarDescription);
  const outlookCalUrl = generateOutlookCalendarUrl(eventTitle, eventStartISO, endISO, eventLocation, calendarDescription);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${eventTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #1e3a5f; background-image: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
              <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                La French Tech Boston
              </p>
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; line-height: 1.3;">
                ${eventTitle}
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">

              <!-- Greeting -->
              <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">
                Hi ${firstName},
              </p>

              <p style="font-size: 16px; color: #4b5563; line-height: 1.7; margin: 0 0 25px 0;">
                We're excited to invite you to our upcoming event! Join us and connect with fellow members of the French Tech Boston community.
              </p>

              <!-- Event Details Card -->
              <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #e63946;">

                <!-- Date & Time -->
                <div style="margin-bottom: 15px;">
                  <p style="font-size: 13px; color: #6b7280; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                    When
                  </p>
                  <p style="font-size: 16px; color: #1f2937; margin: 0; font-weight: 600;">
                    ${eventDate} at ${eventTime}
                  </p>
                </div>

                <!-- Location -->
                <div style="margin-bottom: ${eventDescription ? '15px' : '0'};">
                  <p style="font-size: 13px; color: #6b7280; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                    Where
                  </p>
                  <p style="font-size: 16px; color: #1f2937; margin: 0; font-weight: 600;">
                    ${eventLocation}
                  </p>
                </div>

                ${eventDescription ? `
                <!-- Description -->
                <div>
                  <p style="font-size: 13px; color: #6b7280; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                    About
                  </p>
                  <p style="font-size: 15px; color: #4b5563; margin: 0; line-height: 1.6;">
                    ${eventDescription}
                  </p>
                </div>
                ` : ''}
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${ctaUrl}" style="display: inline-block; background: #e63946; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  ${ctaText}
                </a>
              </div>

              <!-- Add to Calendar -->
              <div style="text-align: center; margin: 20px 0;">
                <p style="font-size: 14px; color: #6b7280; margin: 0 0 12px 0;">Add to your calendar:</p>
                <a href="${googleCalUrl}" style="display: inline-block; background: #ffffff; color: #1f2937; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; border: 1px solid #e5e7eb; margin: 0 5px;">
                  Google Calendar
                </a>
                <a href="${outlookCalUrl}" style="display: inline-block; background: #ffffff; color: #1f2937; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; border: 1px solid #e5e7eb; margin: 0 5px;">
                  Outlook
                </a>
              </div>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <!-- Why Attend -->
              <h3 style="font-size: 17px; color: #1f2937; margin: 0 0 15px 0;">
                Why attend?
              </h3>
              <ul style="font-size: 15px; color: #4b5563; line-height: 1.8; margin: 0 0 25px 0; padding-left: 20px;">
                <li>Connect with entrepreneurs, tech executives, and innovators</li>
                <li>Expand your network within the French-American tech ecosystem</li>
                <li>Learn from peers who understand your journey</li>
                <li>Discover opportunities for collaboration and growth</li>
              </ul>

              <!-- Closing -->
              <p style="font-size: 16px; color: #4b5563; line-height: 1.7; margin: 0 0 20px 0;">
                We hope to see you there!
              </p>

              <p style="font-size: 16px; color: #1f2937; margin: 0;">
                <em>The French Tech Boston Team</em>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 13px; color: #6b7280; margin: 0 0 10px 0;">
                La French Tech Boston
              </p>
              <p style="font-size: 13px; margin: 0 0 15px 0;">
                <a href="${websiteUrl}" style="color: #2563eb; text-decoration: none;">frenchtech-boston.com</a>
                &nbsp;|&nbsp;
                <a href="${linkedinUrl}" style="color: #2563eb; text-decoration: none;">LinkedIn</a>
                &nbsp;|&nbsp;
                <a href="mailto:${contactEmail}" style="color: #2563eb; text-decoration: none;">Contact</a>
              </p>
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                You're receiving this because you're a member of La French Tech Boston.<br>
                <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from event notifications</a>
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

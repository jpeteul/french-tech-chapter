// Welcome email template for new members

import { CHAPTER, getDashboardUrl } from '../chapter-config';

interface WelcomeEmailParams {
  firstName: string;
  whatsappUrl?: string;
}

export const WELCOME_EMAIL_SUBJECT = `Welcome to ${CHAPTER.name}!`;

export function generateWelcomeEmail({ firstName, whatsappUrl }: WelcomeEmailParams): string {
  const dashboardUrl = getDashboardUrl();
  const linkedinUrl = CHAPTER.socialLinks.linkedin;
  const websiteUrl = CHAPTER.websiteUrl;
  const contactEmail = CHAPTER.contactEmail;
  const chapterName = CHAPTER.name;
  const cityName = CHAPTER.city;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${chapterName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #1e3a5f; background-image: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                Welcome to ${chapterName}!
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

              <p style="font-size: 16px; color: #1f2937; line-height: 1.7; margin: 0 0 20px 0;">
                <strong>Welcome to ${chapterName}!</strong>
              </p>

              <p style="font-size: 16px; color: #4b5563; line-height: 1.7; margin: 0 0 20px 0;">
                You've just joined a community of <strong>${CHAPTER.stats.members} entrepreneurs</strong>, tech executives, and innovators building the bridge between France and the US. People who get where you're coming from, and want to see you succeed.
              </p>

              <p style="font-size: 16px; color: #4b5563; line-height: 1.7; margin: 0 0 30px 0; font-style: italic; background: #f8fafc; padding: 15px 20px; border-left: 4px solid #e63946; border-radius: 0 8px 8px 0;">
                If you're new to ${cityName} or to the community, you're in the right place — many of our members started exactly where you are.
              </p>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <!-- Get Started Section -->
              <h2 style="font-size: 20px; color: #1f2937; margin: 0 0 25px 0;">
                Get started in 3 steps:
              </h2>

              <!-- Step 1 -->
              <div style="margin-bottom: 25px;">
                <p style="font-size: 16px; color: #1f2937; margin: 0 0 10px 0;">
                  <strong>1. Log in to your dashboard</strong>
                </p>
                <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 15px 0;">
                  Make sure your profile is up to date to maximize your opportunities, explore the member directory, and check out upcoming events.
                </p>
                <a href="${dashboardUrl}" style="display: inline-block; background: #e63946; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Log In to Your Dashboard
                </a>
              </div>

              <!-- Step 2 - WhatsApp -->
              ${whatsappUrl ? `
              <div style="margin-bottom: 25px; background: #f0fdf4; padding: 20px; border-radius: 8px;">
                <p style="font-size: 16px; color: #1f2937; margin: 0 0 10px 0;">
                  <strong>2. Join our WhatsApp community</strong>
                </p>
                <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 5px 0;">
                  <span style="margin-right: 5px;">&#128172;</span> <strong>General</strong>: the main space where the whole community connects
                </p>
                <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 5px 0;">
                  <span style="margin-right: 5px;">&#128640;</span> <strong>Amplify</strong>: share your LinkedIn posts, job offers, press features, and wins
                </p>
                <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 15px 0;">
                  <span style="margin-right: 5px;">&#128227;</span> <strong>Announcements</strong>: key news and upcoming events
                </p>
                <a href="${whatsappUrl}" style="display: inline-block; background: #22c55e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Join on WhatsApp
                </a>
                <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 15px 0 0 0; font-style: italic;">
                  When you're ready, feel free to introduce yourself in the General WhatsApp group so the community can get to know you.
                </p>
              </div>
              ` : ''}

              <!-- Step 3 -->
              <div style="margin-bottom: 30px;">
                <p style="font-size: 16px; color: #1f2937; margin: 0 0 10px 0;">
                  <strong>${whatsappUrl ? '3' : '2'}. Follow us and stay connected</strong>
                </p>
                <p style="font-size: 14px; color: #4b5563; line-height: 1.8; margin: 0;">
                  <span style="margin-right: 5px;">&#128188;</span> <a href="${linkedinUrl}" style="color: #2563eb; text-decoration: none;">${chapterName} on LinkedIn</a><br>
                  <span style="margin-right: 5px;">&#127760;</span> <a href="${websiteUrl}" style="color: #2563eb; text-decoration: none;">${websiteUrl.replace('https://', '').replace('http://', '')}</a><br>
                  <span style="margin-right: 5px;">&#128233;</span> <a href="mailto:${contactEmail}" style="color: #2563eb; text-decoration: none;">${contactEmail}</a>
                </p>
              </div>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <!-- Investor Directory -->
              <div style="margin-bottom: 25px;">
                <h3 style="font-size: 17px; color: #1f2937; margin: 0 0 10px 0;">
                  &#129517; Unlock warm introductions to investors
                </h3>
                <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0;">
                  One of the most valuable things in this community: our shared investor directory. Members catalog the investors they know personally, so you can browse by stage, sector, and geography, then request a warm introduction through a fellow member. Start by exploring the directory in your dashboard, and consider adding investors you know to help others.
                </p>
              </div>

              <!-- Entrepreneur Introductions -->
              <div style="margin-bottom: 30px;">
                <h3 style="font-size: 17px; color: #1f2937; margin: 0 0 10px 0;">
                  &#129489;&#8205;&#128187; Get introductions to entrepreneurs who've been there
                </h3>
                <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0;">
                  Whether it's setting up your US entity, hiring your first employee, choosing a health insurance plan, or navigating visas, someone in the community has already gone through it. Ask your question in WhatsApp, look up members in the directory, and don't hesitate to reach out directly — this network is designed so you don't have to figure everything out alone.
                </p>
              </div>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <!-- What's Waiting -->
              <h3 style="font-size: 17px; color: #1f2937; margin: 0 0 15px 0;">
                &#10024; What's waiting for you:
              </h3>
              <ul style="font-size: 15px; color: #4b5563; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px;">
                <li>Events roughly once a month: networking nights, panels, workshops, and fireside chats</li>
                <li>A curated member directory to find and connect with the right people</li>
                <li>A space to share expertise, ask questions, and amplify your work</li>
                <li>Visibility for you and your business across the local innovation ecosystem</li>
                <li>Access to French Tech America events across the US and Canada</li>
              </ul>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <!-- Give Back Section -->
              <h3 style="font-size: 17px; color: #1f2937; margin: 0 0 15px 0;">
                &#129309; This community is as alive as its members
              </h3>
              <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 15px 0;">
                ${chapterName} runs on the generosity of its members. There's no membership fee, no paywall. Here are ways to give back, whatever your situation:
              </p>
              <ul style="font-size: 14px; color: #4b5563; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px;">
                <li><strong>Got 5 minutes?</strong> React to a post on WhatsApp, answer a question from a fellow member, or share an event with a friend who should join.</li>
                <li><strong>Got an hour?</strong> Attend an event. Introduce yourself to someone new. Share a job opening or a freelancer recommendation on Amplify.</li>
                <li><strong>Got expertise?</strong> Add investors you know to the directory. Offer to speak at an event or lead a workshop. Share a resource that helped you navigate a challenge others are facing.</li>
                <li><strong>Got a venue or a budget?</strong> Host a community event at your office. Sponsor a networking night. Every contribution, big or small, makes this community stronger for everyone.</li>
              </ul>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <!-- Closing -->
              <p style="font-size: 16px; color: #1f2937; line-height: 1.7; margin: 0 0 20px 0;">
                We're excited to have you with us — see you soon at an event or in the WhatsApp groups.
              </p>

              <p style="font-size: 16px; color: #1f2937; margin: 0;">
                <em>The ${chapterName} Team</em>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 13px; color: #6b7280; margin: 0 0 10px 0;">
                ${chapterName}
              </p>
              <p style="font-size: 13px; margin: 0;">
                <a href="${websiteUrl}" style="color: #2563eb; text-decoration: none;">${websiteUrl.replace('https://', '').replace('http://', '')}</a>
                &nbsp;|&nbsp;
                <a href="${linkedinUrl}" style="color: #2563eb; text-decoration: none;">LinkedIn</a>
                &nbsp;|&nbsp;
                <a href="mailto:${contactEmail}" style="color: #2563eb; text-decoration: none;">Contact</a>
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

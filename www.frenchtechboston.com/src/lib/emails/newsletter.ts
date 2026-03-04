// Structured newsletter email template for members

interface ContentSection {
  title?: string;
  text: string;
  imageUrl?: string;
  imageAlt?: string;
  imagePosition?: 'top' | 'left' | 'right'; // 'top' = full width above text
}

interface NewsletterEmailParams {
  firstName: string;
  headline: string;
  introduction: string;
  heroImageUrl?: string;
  heroImageAlt?: string;
  sections: ContentSection[];
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export function generateNewsletterEmail({
  firstName,
  headline,
  introduction,
  heroImageUrl,
  heroImageAlt,
  sections,
  ctaText,
  ctaUrl,
  unsubscribeUrl,
}: NewsletterEmailParams): string {
  const websiteUrl = 'https://www.frenchtech-boston.com';
  const linkedinUrl = 'https://www.linkedin.com/company/french-tech-boston';
  const contactEmail = 'frenchtechboston@gmail.com';

  // Generate sections HTML
  const sectionsHtml = sections.map((section, index) => {
    const isLast = index === sections.length - 1;
    const marginBottom = isLast ? '0' : '30px';

    // Full-width image on top
    if (section.imageUrl && section.imagePosition === 'top') {
      return `
        <div style="margin-bottom: ${marginBottom};">
          <img src="${section.imageUrl}" alt="${section.imageAlt || ''}" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 15px;" />
          ${section.title ? `<h3 style="font-size: 18px; color: #1f2937; margin: 0 0 10px 0; font-weight: 600;">${section.title}</h3>` : ''}
          <p style="font-size: 16px; color: #4b5563; line-height: 1.7; margin: 0;">${section.text}</p>
        </div>
      `;
    }

    // Image on left
    if (section.imageUrl && section.imagePosition === 'left') {
      return `
        <div style="margin-bottom: ${marginBottom};">
          ${section.title ? `<h3 style="font-size: 18px; color: #1f2937; margin: 0 0 15px 0; font-weight: 600;">${section.title}</h3>` : ''}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="width: 180px; vertical-align: top; padding-right: 20px;">
                <img src="${section.imageUrl}" alt="${section.imageAlt || ''}" style="width: 160px; height: auto; border-radius: 8px;" />
              </td>
              <td style="vertical-align: top;">
                <p style="font-size: 16px; color: #4b5563; line-height: 1.7; margin: 0;">${section.text}</p>
              </td>
            </tr>
          </table>
        </div>
      `;
    }

    // Image on right
    if (section.imageUrl && section.imagePosition === 'right') {
      return `
        <div style="margin-bottom: ${marginBottom};">
          ${section.title ? `<h3 style="font-size: 18px; color: #1f2937; margin: 0 0 15px 0; font-weight: 600;">${section.title}</h3>` : ''}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align: top;">
                <p style="font-size: 16px; color: #4b5563; line-height: 1.7; margin: 0;">${section.text}</p>
              </td>
              <td style="width: 180px; vertical-align: top; padding-left: 20px;">
                <img src="${section.imageUrl}" alt="${section.imageAlt || ''}" style="width: 160px; height: auto; border-radius: 8px;" />
              </td>
            </tr>
          </table>
        </div>
      `;
    }

    // Text only (no image)
    return `
      <div style="margin-bottom: ${marginBottom};">
        ${section.title ? `<h3 style="font-size: 18px; color: #1f2937; margin: 0 0 10px 0; font-weight: 600;">${section.title}</h3>` : ''}
        <p style="font-size: 16px; color: #4b5563; line-height: 1.7; margin: 0;">${section.text}</p>
      </div>
    `;
  }).join('');

  // CTA button HTML
  const ctaHtml = ctaText && ctaUrl ? `
    <div style="text-align: center; margin: 35px 0;">
      <a href="${ctaUrl}" style="display: inline-block; background: #e63946; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        ${ctaText}
      </a>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #1e3a5f; background-image: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; text-align: center;">
              <p style="color: #ffffff; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                La French Tech Boston
              </p>
            </td>
          </tr>

          ${heroImageUrl ? `
          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="${heroImageUrl}" alt="${heroImageAlt || ''}" style="width: 100%; height: auto; display: block;" />
            </td>
          </tr>
          ` : ''}

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">

              <!-- Headline -->
              <h1 style="font-size: 26px; color: #1f2937; margin: 0 0 20px 0; font-weight: 700; line-height: 1.3;">
                ${headline}
              </h1>

              <!-- Greeting & Introduction -->
              <p style="font-size: 16px; color: #4b5563; line-height: 1.7; margin: 0 0 10px 0;">
                Hi ${firstName},
              </p>
              <p style="font-size: 16px; color: #4b5563; line-height: 1.7; margin: 0 0 30px 0;">
                ${introduction}
              </p>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 30px 0;">

              <!-- Content Sections -->
              ${sectionsHtml}

              <!-- CTA Button -->
              ${ctaHtml}

              <!-- Closing -->
              <p style="font-size: 16px; color: #1f2937; margin: 30px 0 0 0;">
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
                <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from newsletters</a>
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

# French Tech Chapter Website Template

A modern, full-featured website platform for French Tech chapters in the United States. Built with Astro, Tailwind CSS, and Supabase.

## Features

- **Member Directory**: Searchable database of community members
- **Investor Directory**: Shared database of investors with warm introduction requests
- **Events Management**: Create and manage community events with RSVPs
- **Resources Library**: Gated content and resources for members
- **News/Blog**: Share community news and updates
- **Admin Dashboard**: Full admin panel for managing all content
- **Authentication**: LinkedIn OAuth login via Supabase Auth
- **Membership Applications**: Review and approve new member applications
- **Email Notifications**: Automated welcome emails and notifications

## Tech Stack

- **Framework**: [Astro](https://astro.build/) 5.x with SSR
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) 4.x
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication**: Supabase Auth with LinkedIn OAuth
- **Email**: [Resend](https://resend.com/)
- **Hosting**: [Cloudflare Pages](https://pages.cloudflare.com/)

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- A Supabase account (free tier works)
- A Resend account (free tier works)
- A Cloudflare account (free tier works)
- A LinkedIn Developer account (for OAuth)
- A custom domain (recommended)

---

## Step-by-Step Setup Guide

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_ORG/french-tech-chapter.git
cd french-tech-chapter
npm install
```

### 2. Configure Your Chapter

Edit `src/lib/chapter-config.ts` with your chapter's information:

```typescript
export const CHAPTER: ChapterConfig = {
  name: 'La French Tech San Francisco',
  shortName: 'FT SF',
  slug: 'sf',
  city: 'San Francisco',
  region: 'California',
  country: 'USA',
  timezone: 'America/Los_Angeles',
  contactEmail: 'contact@frenchtech-sf.com',
  websiteUrl: 'https://frenchtech-sf.com',
  mailDomain: 'mail.frenchtech-sf.com',
  socialLinks: {
    linkedin: 'https://www.linkedin.com/company/french-tech-sf/',
    twitter: 'https://twitter.com/FrenchTechSF',
  },
  twitterHandle: 'FrenchTechSF',
  stats: {
    members: '100+',
    eventsPerYear: '10+',
    yearsActive: '5+',
  },
  description: 'The community of French entrepreneurs and tech executives in the Bay Area.',
};
```

---

### 3. Set Up Supabase (Database & Authentication)

#### 3.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter a project name (e.g., `french-tech-sf`)
5. Set a strong database password (save this!)
6. Select a region close to your users
7. Click "Create new project" and wait for provisioning

#### 3.2 Run Database Migrations

The database schema is defined in `supabase/migrations/`. Run them in order:

1. Go to your Supabase Dashboard > **SQL Editor**
2. Click "New Query"
3. Open each file in `supabase/migrations/` in order (sorted by filename)
4. Copy the contents and paste into the SQL Editor
5. Click "Run" for each migration

**Migration files to run (in order):**
```
001_initial_schema.sql
002_applications.sql
003_events.sql
004_rsvps.sql
005_resources.sql
006_investors.sql
007_investor_contacts.sql
008_intro_requests.sql
009_connections.sql
010_board_members.sql
011_site_settings.sql
012_news.sql
013_event_photos.sql
```

#### 3.3 Set Up LinkedIn OAuth Authentication

**Create a LinkedIn App:**

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click "Create App"
3. Fill in:
   - App name: `French Tech SF` (your chapter name)
   - LinkedIn Page: Your chapter's LinkedIn page
   - App logo: Your chapter logo
4. Accept the terms and create

**Configure OAuth:**

1. In your LinkedIn App, go to "Auth" tab
2. Under "OAuth 2.0 settings":
   - Add redirect URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
   - (Find YOUR_PROJECT in Supabase Settings > API > Project URL)
3. Under "Products", request access to "Sign In with LinkedIn using OpenID Connect"
4. Copy your **Client ID** and **Client Secret**

**Add to Supabase:**

1. Go to Supabase Dashboard > **Authentication** > **Providers**
2. Find "LinkedIn (OIDC)" and click to expand
3. Toggle "Enable Sign in with LinkedIn (OIDC)"
4. Paste your LinkedIn Client ID and Client Secret
5. Click "Save"

#### 3.4 Configure Email Templates (Optional)

1. Go to **Authentication** > **Email Templates**
2. Customize the templates for:
   - Confirm signup
   - Magic Link
   - Reset Password

#### 3.5 Get Your API Keys

1. Go to **Settings** > **API**
2. Copy these values for your `.env` file:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **anon public** key → `PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

---

### 4. Set Up Resend (Email Service)

#### 4.1 Create a Resend Account

1. Go to [resend.com](https://resend.com) and sign up
2. Verify your email

#### 4.2 Add and Verify Your Domain

1. Go to **Domains** in the Resend dashboard
2. Click "Add Domain"
3. Enter your email subdomain (e.g., `mail.frenchtech-sf.com`)
4. Resend will show you DNS records to add:
   - **MX record** for receiving (optional)
   - **TXT record** for SPF
   - **CNAME records** for DKIM

5. Add these records in your domain's DNS settings:
   - If using Cloudflare: Go to DNS > Add records
   - If using another provider: Check their documentation

6. Wait for verification (usually 5-30 minutes)
7. Click "Verify" in Resend once records propagate

#### 4.3 Create an API Key

1. Go to **API Keys** in Resend dashboard
2. Click "Create API Key"
3. Name it (e.g., `french-tech-sf-production`)
4. Set permissions to "Sending access"
5. Copy the key → `RESEND_API_KEY` in your `.env`

---

### 5. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your values:

```env
# Supabase (from step 3.5)
PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Resend (from step 4.3)
RESEND_API_KEY=re_123456789...
```

---

### 6. Update Deployment Configs

**astro.config.mjs** - Update line 10:
```javascript
const SITE_URL = 'https://frenchtech-sf.com';  // Your domain
```

**wrangler.jsonc** - Update:
```jsonc
{
  "name": "french-tech-sf",  // Your chapter slug
  "vars": {
    "PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
    "PUBLIC_SUPABASE_ANON_KEY": "your-anon-key"
  }
}
```

---

### 7. Replace Branding Assets

Replace these files in `/public/images/`:

| Path | Description | Dimensions |
|------|-------------|------------|
| `logo/ft-chapter-logo.png` | Main logo | ~400x100px |
| `logo/ft-chapter-logo-white.png` | White version | ~400x100px |
| `board/member-name.jpg` | Board member photos | 400x400px |
| `og-image.jpg` | Social sharing image | 1200x630px |
| `favicon.png` | Site favicon | 32x32px or 180x180px |

---

### 8. Test Locally

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321)

Test the following:
- [ ] Homepage loads correctly
- [ ] LinkedIn login works
- [ ] Apply page submits correctly
- [ ] Admin can access /admin (after setting up first admin)

---

### 9. Deploy to Cloudflare Pages

#### 9.1 Push to GitHub

1. Create a new GitHub repository
2. Push your code:
```bash
git remote add origin https://github.com/YOUR_ORG/french-tech-sf.git
git branch -M main
git push -u origin main
```

#### 9.2 Connect to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account
3. Go to **Workers & Pages** > **Create**
4. Select **Pages** tab > **Connect to Git**
5. Authorize GitHub and select your repository
6. Configure build settings:
   - **Production branch**: `main`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

#### 9.3 Add Environment Variables

1. Before deploying, click **Environment variables**
2. Add these variables for **Production**:

| Variable | Value | Encrypt? |
|----------|-------|----------|
| `PUBLIC_SUPABASE_URL` | Your Supabase URL | No |
| `PUBLIC_SUPABASE_ANON_KEY` | Your anon key | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | **Yes** |
| `RESEND_API_KEY` | Your Resend API key | **Yes** |

3. Click "Save and Deploy"

#### 9.4 Set Up Custom Domain

1. After deployment, go to your Pages project
2. Click **Custom domains** > **Set up a custom domain**
3. Enter your domain (e.g., `frenchtech-sf.com`)
4. Cloudflare will configure DNS automatically if your domain is on Cloudflare
5. If not, add the provided CNAME record to your DNS

#### 9.5 Update Supabase Redirect URLs

1. Go to Supabase > **Authentication** > **URL Configuration**
2. Add your production URL to **Redirect URLs**:
   - `https://frenchtech-sf.com/**`
   - `https://frenchtech-sf.com/auth/callback`

---

### 10. Set Up Your First Admin

1. Go to your live site and sign up via LinkedIn
2. Go to Supabase > **Table Editor** > **members**
3. Find your record
4. Edit the row:
   - Set `status` to `active`
   - Set `member_role` to `admin`
5. Refresh your site - you should now see the Admin menu

---

## Configuration Reference

### Files to Customize

| File | Purpose |
|------|---------|
| `src/lib/chapter-config.ts` | Chapter name, city, contact info, social links |
| `src/lib/constants.ts` | Board members (fallback), navigation links |
| `astro.config.mjs` | Site URL for sitemaps and SEO |
| `wrangler.jsonc` | Cloudflare project name, Supabase credentials |
| `public/images/logo/` | Chapter logo files |
| `public/images/board/` | Board member photos |

### Database Tables

| Table | Purpose |
|-------|---------|
| `members` | Community members |
| `applications` | Membership applications |
| `events` | Community events |
| `rsvps` | Event RSVPs |
| `resources` | Gated resources and guides |
| `investors` | Investor directory |
| `investor_contacts` | Member-investor relationships |
| `intro_requests` | Introduction requests |
| `board_members` | Board member profiles |
| `site_settings` | Dynamic site configuration |

## Commands

| Command | Action |
|---------|--------|
| `npm install` | Install dependencies |
| `npm run dev` | Start local dev server at `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview build locally |

---

## Troubleshooting

### LinkedIn Login Not Working

1. Check that your LinkedIn App has "Sign In with LinkedIn using OpenID Connect" enabled
2. Verify the redirect URL in LinkedIn matches your Supabase callback URL
3. Ensure the Client ID and Secret are correctly entered in Supabase

### Emails Not Sending

1. Verify your domain in Resend is showing "Verified"
2. Check that DNS records are correctly configured
3. Verify your API key has sending permissions

### Deployment Fails on Cloudflare

1. Check the build logs for errors
2. Ensure all environment variables are set
3. Verify the build command and output directory are correct

### Database Errors

1. Ensure all migrations were run in order
2. Check that RLS (Row Level Security) policies are enabled
3. Verify your service role key is set in Cloudflare secrets

---

## Multi-Chapter Database Architecture

This template is designed to support isolated but potentially communicating databases across chapters:

1. **Each chapter has its own Supabase project** - Complete data isolation
2. **Shared schema** - All chapters use the same database structure
3. **Future: Cross-chapter API** - We're planning an API layer to enable:
   - Searching investors across all chapters
   - Cross-chapter introduction requests
   - Unified member directory (opt-in)
   - Shared events calendar

---

## Contributing

This template is maintained by La French Tech Boston. Contributions welcome!

## License

MIT License - Feel free to use and modify for your French Tech chapter.

## Support

- GitHub Issues: Report bugs or request features
- French Tech Boston: [frenchtech-boston.com](https://frenchtech-boston.com)

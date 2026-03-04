import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Auth features will be disabled.');
}

// Admin client with service role key - bypasses RLS
// Only use on server-side for privileged operations
// Try build-time env first, fall back to null (will use runtime version)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Get admin client using Cloudflare runtime env (for secrets not available at build time)
export function getSupabaseAdmin(runtime?: { env?: { SUPABASE_SERVICE_ROLE_KEY?: string } }): SupabaseClient | null {
  // First try build-time admin client
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  // Then try runtime env (Cloudflare)
  const runtimeServiceKey = runtime?.env?.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && runtimeServiceKey) {
    return createClient(supabaseUrl, runtimeServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return null;
}

// Create SSR-compatible Supabase client with cookie-based PKCE storage
// This properly persists the code_verifier across serverless requests
export function createServerClient(cookies: AstroCookies, request?: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Parse all cookies from request header or AstroCookies
        const allCookies: { name: string; value: string }[] = [];

        // Try to get raw cookie header from request if available
        const cookieHeader = request?.headers.get('cookie');
        if (cookieHeader) {
          // Parse all cookies from the header
          const pairs = cookieHeader.split(';');
          for (const pair of pairs) {
            const [name, ...valueParts] = pair.trim().split('=');
            if (name) {
              allCookies.push({
                name: name.trim(),
                value: valueParts.join('=') // Handle values with = in them
              });
            }
          }
        } else {
          // Fallback: try to get known Supabase cookies by name patterns
          // Supabase uses sb-<project-ref>-auth-token pattern
          const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || '';
          const authCookieName = `sb-${projectRef}-auth-token`;
          const codeVerifierName = `sb-${projectRef}-auth-token-code-verifier`;

          const authCookie = cookies.get(authCookieName)?.value;
          const codeVerifier = cookies.get(codeVerifierName)?.value;

          if (authCookie) {
            allCookies.push({ name: authCookieName, value: authCookie });
          }
          if (codeVerifier) {
            allCookies.push({ name: codeVerifierName, value: codeVerifier });
          }

          // Also check legacy cookie names for backwards compatibility
          const legacyAccess = cookies.get('sb-access-token')?.value;
          const legacyRefresh = cookies.get('sb-refresh-token')?.value;
          if (legacyAccess) {
            allCookies.push({ name: 'sb-access-token', value: legacyAccess });
          }
          if (legacyRefresh) {
            allCookies.push({ name: 'sb-refresh-token', value: legacyRefresh });
          }
        }

        return allCookies;
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, {
            path: options?.path || '/',
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: 'lax',
            maxAge: options?.maxAge || 60 * 60 * 24 * 7, // Default 1 week
          });
        }
      },
    },
  });
}

// Legacy export for backwards compatibility - creates SSR client
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Investor directory enums
export type InvestorStage = 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'growth' | 'late-stage';
export type InvestorSector = 'ai-ml' | 'fintech' | 'healthtech' | 'biotech' | 'saas' | 'consumer' | 'hardware' | 'climate' | 'cybersecurity' | 'edtech' | 'proptech' | 'deeptech' | 'other';
export type InvestorGeo = 'us-northeast' | 'us-west' | 'us-southeast' | 'us-midwest' | 'europe' | 'france' | 'uk' | 'asia' | 'global';

// Human-readable labels for enums
export const STAGE_LABELS: Record<InvestorStage, string> = {
  'pre-seed': 'Pre-Seed',
  'seed': 'Seed',
  'series-a': 'Series A',
  'series-b': 'Series B',
  'series-c': 'Series C',
  'growth': 'Growth',
  'late-stage': 'Late Stage',
};

export const SECTOR_LABELS: Record<InvestorSector, string> = {
  'ai-ml': 'AI/ML',
  'fintech': 'Fintech',
  'healthtech': 'Healthtech',
  'biotech': 'Biotech',
  'saas': 'SaaS',
  'consumer': 'Consumer',
  'hardware': 'Hardware & Robotics',
  'climate': 'Climate',
  'cybersecurity': 'Cybersecurity',
  'edtech': 'Edtech',
  'proptech': 'Proptech',
  'deeptech': 'Deeptech',
  'other': 'Other',
};

export const GEO_LABELS: Record<InvestorGeo, string> = {
  'us-northeast': 'US Northeast',
  'us-west': 'US West',
  'us-southeast': 'US Southeast',
  'us-midwest': 'US Midwest',
  'europe': 'Europe',
  'france': 'France',
  'uk': 'UK',
  'asia': 'Asia',
  'global': 'Global',
};

export type Database = {
  public: {
    Tables: {
      members: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          name: string;
          company: string | null;
          role: string | null;
          linkedin: string | null;
          bio: string | null;
          industry: string | null;
          skills: string[] | null;
          status: 'active' | 'inactive' | 'pending';
          member_role: 'member' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['members']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['members']['Insert']>;
      };
      applications: {
        Row: {
          id: string;
          email: string;
          name: string;
          company: string | null;
          role: string | null;
          linkedin: string | null;
          reason: string;
          status: 'pending' | 'approved' | 'rejected';
          reviewed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['applications']['Row'], 'id' | 'created_at' | 'updated_at' | 'status' | 'reviewed_by'>;
        Update: Partial<Database['public']['Tables']['applications']['Insert']>;
      };
      events: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string;
          date: string;
          end_date: string | null;
          location: string;
          is_members_only: boolean;
          image_url: string | null;
          registration_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      rsvps: {
        Row: {
          id: string;
          event_id: string;
          member_id: string;
          status: 'attending' | 'maybe' | 'not_attending';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rsvps']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['rsvps']['Insert']>;
      };
      resources: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          icon: string;
          type: 'guide' | 'article' | 'link' | 'file' | 'member_page';
          is_gated: boolean;
          is_members_only: boolean;
          is_featured: boolean;
          content: string | null;
          file_url: string | null;
          link_url: string | null;
          slug: string | null;
          display_order: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['resources']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['resources']['Insert']>;
      };
      connection_requests: {
        Row: {
          id: string;
          requester_id: string;
          receiver_id: string;
          message: string | null;
          status: 'pending' | 'accepted' | 'declined';
          response_message: string | null;
          created_at: string;
          responded_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['connection_requests']['Row'], 'id' | 'created_at' | 'responded_at' | 'status'>;
        Update: Partial<Database['public']['Tables']['connection_requests']['Insert']> & { status?: 'pending' | 'accepted' | 'declined'; response_message?: string; responded_at?: string };
      };
      investors: {
        Row: {
          id: string;
          name: string;
          firm: string | null;
          website: string | null;
          stage_focus: InvestorStage[];
          sector_focus: InvestorSector[];
          geo_focus: InvestorGeo[];
          check_size_min: number | null;
          check_size_max: number | null;
          notes: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['investors']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['investors']['Insert']>;
      };
      investor_contacts: {
        Row: {
          id: string;
          investor_id: string;
          member_id: string;
          relationship_note: string | null;
          added_at: string;
        };
        Insert: Omit<Database['public']['Tables']['investor_contacts']['Row'], 'id' | 'added_at'>;
        Update: Partial<Database['public']['Tables']['investor_contacts']['Insert']>;
      };
      intro_requests: {
        Row: {
          id: string;
          investor_id: string;
          requester_id: string;
          contact_id: string;
          message: string;
          status: 'pending' | 'accepted' | 'declined';
          created_at: string;
          responded_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['intro_requests']['Row'], 'id' | 'created_at' | 'responded_at' | 'status'>;
        Update: { status?: 'pending' | 'accepted' | 'declined'; responded_at?: string };
      };
    };
  };
};

// Convenience types for use in components
export type Investor = Database['public']['Tables']['investors']['Row'];
export type InvestorContact = Database['public']['Tables']['investor_contacts']['Row'];
export type IntroRequest = Database['public']['Tables']['intro_requests']['Row'];
export type Member = Database['public']['Tables']['members']['Row'];
export type Resource = Database['public']['Tables']['resources']['Row'];

// Extended types with joins
export type InvestorWithContacts = Investor & {
  contact_count: number;
  contacts?: (InvestorContact & { member: Member })[];
};

export type IntroRequestWithDetails = IntroRequest & {
  investor: Investor;
  requester: Member;
  contact: Member;
};

import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { CHAPTER } from '../../../../lib/chapter-config';
import { verifyFederationRequest } from '../../../../lib/federation/auth';
import type {
  FederatedInvestor,
  FederatedContact,
  FederationInvestorsResponse,
} from '../../../../lib/federation/types';

export const prerender = false;

// CORS headers for federation requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Federation-Version',
};

/**
 * GET /api/federation/v1/investors
 *
 * Returns the chapter's investor directory for federation.
 * Requires valid federation token with 'read:investors' scope.
 *
 * Query params:
 * - search: Filter by name/firm
 * - stage: Filter by stage focus (can repeat)
 * - sector: Filter by sector focus (can repeat)
 * - cursor: Pagination cursor
 * - limit: Max results (default 50, max 100)
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime;

  // Verify federation token
  const authResult = await verifyFederationRequest(
    request,
    ['read:investors'],
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
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const stages = url.searchParams.getAll('stage');
    const sectors = url.searchParams.getAll('sector');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    // Build query
    let query = supabaseAdmin
      .from('investors')
      .select(`
        id,
        name,
        firm,
        stage_focus,
        sector_focus,
        geo_focus,
        check_size_min,
        check_size_max,
        notes,
        investor_contacts (
          id,
          added_at,
          members:member_id (
            id,
            name,
            company
          )
        )
      `)
      .order('name', { ascending: true })
      .limit(limit);

    // Apply text search
    if (search) {
      query = query.or(`name.ilike.%${search}%,firm.ilike.%${search}%`);
    }

    // Apply filters
    if (stages.length > 0) {
      query = query.overlaps('stage_focus', stages);
    }
    if (sectors.length > 0) {
      query = query.overlaps('sector_focus', sectors);
    }

    const { data: investors, error } = await query;

    if (error) {
      console.error('Error fetching investors for federation:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch investors' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Transform to federation format (privacy-respecting)
    const federatedInvestors: FederatedInvestor[] = investors.map((investor: any) => {
      const contacts: FederatedContact[] = (investor.investor_contacts || []).map((contact: any) => ({
        id: contact.id,
        memberName: contact.members?.name || 'Unknown',
        memberCompany: contact.members?.company || null,
        addedAt: contact.added_at,
      }));

      return {
        id: investor.id,
        name: investor.name,
        firm: investor.firm,
        stageFocus: investor.stage_focus,
        sectorFocus: investor.sector_focus,
        geoFocus: investor.geo_focus,
        checkSizeMin: investor.check_size_min,
        checkSizeMax: investor.check_size_max,
        notes: investor.notes,
        contactCount: contacts.length,
        contacts,
      };
    });

    // Sort by contact count (most connected first)
    federatedInvestors.sort((a, b) => {
      if (b.contactCount !== a.contactCount) {
        return b.contactCount - a.contactCount;
      }
      return a.name.localeCompare(b.name);
    });

    const response: FederationInvestorsResponse = {
      investors: federatedInvestors,
      chapter: {
        slug: CHAPTER.slug,
        name: CHAPTER.name,
      },
      pagination: {
        cursor: null, // TODO: Implement cursor-based pagination
        hasMore: federatedInvestors.length >= limit,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Federation-Version': '1',
        'X-Chapter': CHAPTER.slug,
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Error in federation investors API:', error);
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
 * OPTIONS /api/federation/v1/investors
 *
 * CORS preflight for investors endpoint.
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

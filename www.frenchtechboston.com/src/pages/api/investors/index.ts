import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { getMember } from '../../../lib/auth';
import type { InvestorStage, InvestorSector, InvestorGeo } from '../../../lib/supabase';

export const prerender = false;

// GET: List investors with optional search and filters
export const GET: APIRoute = async ({ request, cookies, locals }) => {
  const member = await getMember(cookies, (locals as any).runtime, request);
  if (!member) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const stages = url.searchParams.getAll('stage') as InvestorStage[];
  const sectors = url.searchParams.getAll('sector') as InvestorSector[];
  const geos = url.searchParams.getAll('geo') as InvestorGeo[];

  try {
    // Build query
    let query = supabaseAdmin
      .from('investors')
      .select(`
        *,
        investor_contacts (
          id,
          member_id,
          added_at,
          members:member_id (
            id,
            name,
            company,
            role,
            linkedin
          )
        )
      `)
      .order('name', { ascending: true });

    // Apply text search
    if (search) {
      query = query.or(`name.ilike.%${search}%,firm.ilike.%${search}%`);
    }

    // Apply filters (using overlap operator for arrays)
    if (stages.length > 0) {
      query = query.overlaps('stage_focus', stages);
    }
    if (sectors.length > 0) {
      query = query.overlaps('sector_focus', sectors);
    }
    if (geos.length > 0) {
      query = query.overlaps('geo_focus', geos);
    }

    const { data: investors, error } = await query;

    if (error) {
      console.error('Error fetching investors:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch investors' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Transform data to include contact count and mask relationship notes
    const transformedInvestors = investors.map((investor) => ({
      ...investor,
      contact_count: investor.investor_contacts?.length || 0,
      contacts: investor.investor_contacts?.map((contact: any) => ({
        id: contact.id,
        member_id: contact.member_id,
        added_at: contact.added_at,
        member: contact.members,
        is_current_user: contact.member_id === member.id,
      })) || [],
      investor_contacts: undefined, // Remove raw join data
    }));

    // Sort by contact count (most connected first), then by name
    transformedInvestors.sort((a, b) => {
      if (b.contact_count !== a.contact_count) {
        return b.contact_count - a.contact_count;
      }
      return a.name.localeCompare(b.name);
    });

    return new Response(JSON.stringify({ investors: transformedInvestors, member_id: member.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in investors API:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST: Add a new investor (or add self as contact to existing)
export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const member = await getMember(cookies, (locals as any).runtime, request);
  if (!member) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const {
      name,
      firm,
      website,
      stage_focus,
      sector_focus,
      geo_focus,
      check_size_min,
      check_size_max,
      notes,
      relationship_note,
      existing_investor_id, // If adding self to existing investor
    } = body;

    // If linking to existing investor
    if (existing_investor_id) {
      // Check if already a contact
      const { data: existing } = await supabaseAdmin
        .from('investor_contacts')
        .select('id')
        .eq('investor_id', existing_investor_id)
        .eq('member_id', member.id)
        .single();

      if (existing) {
        return new Response(JSON.stringify({ error: 'You are already listed as a contact for this investor' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Add as contact
      const { data: contact, error: contactError } = await supabaseAdmin
        .from('investor_contacts')
        .insert({
          investor_id: existing_investor_id,
          member_id: member.id,
          relationship_note,
        })
        .select()
        .single();

      if (contactError) {
        console.error('Error adding contact:', contactError);
        return new Response(JSON.stringify({ error: 'Failed to add contact' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, contact }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Creating new investor
    if (!name?.trim()) {
      return new Response(JSON.stringify({ error: 'Investor name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for duplicate (case-insensitive name + firm match)
    const { data: duplicates } = await supabaseAdmin
      .from('investors')
      .select('id, name, firm')
      .ilike('name', name.trim())
      .ilike('firm', firm?.trim() || '');

    if (duplicates && duplicates.length > 0) {
      return new Response(JSON.stringify({
        error: 'duplicate',
        message: 'An investor with this name and firm already exists',
        existing: duplicates[0],
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create investor
    const { data: investor, error: investorError } = await supabaseAdmin
      .from('investors')
      .insert({
        name: name.trim(),
        firm: firm?.trim() || null,
        website: website?.trim() || null,
        stage_focus: stage_focus || [],
        sector_focus: sector_focus || [],
        geo_focus: geo_focus || [],
        check_size_min: check_size_min || null,
        check_size_max: check_size_max || null,
        notes: notes?.trim() || null,
        created_by: member.id,
      })
      .select()
      .single();

    if (investorError) {
      console.error('Error creating investor:', investorError);
      return new Response(JSON.stringify({ error: 'Failed to create investor' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Add creator as contact
    const { error: contactError } = await supabaseAdmin
      .from('investor_contacts')
      .insert({
        investor_id: investor.id,
        member_id: member.id,
        relationship_note,
      });

    if (contactError) {
      console.error('Error adding creator as contact:', contactError);
      // Don't fail the whole request, investor was created
    }

    return new Response(JSON.stringify({ success: true, investor }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in investors POST:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

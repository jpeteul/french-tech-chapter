import type { APIRoute } from 'astro';
import { getMember } from '../../../../lib/auth';
import { CHAPTER } from '../../../../lib/chapter-config';
import { createFederationToken, addFederationAuth } from '../../../../lib/federation/auth';
import { getChapter, buildFederationUrl, isValidChapter } from '../../../../lib/federation/network-registry';
import type { FederationInvestorsResponse } from '../../../../lib/federation/types';

export const prerender = false;

/**
 * GET /api/federation/proxy/investors
 *
 * Proxy endpoint that fetches investors from another chapter.
 * Handles user authentication and federation token creation.
 *
 * Query params:
 * - chapter: Target chapter slug (required)
 * - search: Search term (optional)
 * - stage: Stage filter (can repeat)
 * - sector: Sector filter (can repeat)
 */
export const GET: APIRoute = async ({ request, cookies, locals }) => {
  const runtime = (locals as any).runtime;

  // Verify user is authenticated
  const member = await getMember(cookies, runtime, request);
  if (!member) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const chapterSlug = url.searchParams.get('chapter');

  if (!chapterSlug) {
    return new Response(JSON.stringify({ error: 'Missing chapter parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // If requesting local chapter, redirect to normal endpoint
  if (chapterSlug === CHAPTER.slug) {
    return new Response(JSON.stringify({ error: 'Use /api/investors for local chapter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate target chapter
  if (!isValidChapter(chapterSlug)) {
    return new Response(JSON.stringify({ error: 'Unknown or inactive chapter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Create federation token
    const token = await createFederationToken({
      targetChapter: chapterSlug,
      member: {
        id: member.id,
        name: member.name,
        company: member.company,
      },
      scopes: ['read:investors'],
      runtime,
    });

    // Build target URL with query params
    const targetUrl = buildFederationUrl(chapterSlug, '/v1/investors');
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Could not build federation URL' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Forward search/filter params
    const targetParams = new URLSearchParams();
    const search = url.searchParams.get('search');
    if (search) targetParams.set('search', search);

    url.searchParams.getAll('stage').forEach((s) => targetParams.append('stage', s));
    url.searchParams.getAll('sector').forEach((s) => targetParams.append('sector', s));

    const fullUrl = targetParams.toString()
      ? `${targetUrl}?${targetParams.toString()}`
      : targetUrl;

    // Make federated request
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });
    addFederationAuth(headers, token);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Federation request failed: ${response.status}`, errorText);

      // Return user-friendly error
      if (response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ error: 'Federation authentication failed' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Failed to fetch from remote chapter' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data: FederationInvestorsResponse = await response.json();

    // Transform federated investors to match local format
    // Add chapter info and adjust contact data
    const targetChapter = getChapter(chapterSlug);
    const transformedInvestors = data.investors.map((investor) => ({
      id: investor.id,
      name: investor.name,
      firm: investor.firm,
      website: null, // Not shared in federation
      stage_focus: investor.stageFocus,
      sector_focus: investor.sectorFocus,
      geo_focus: investor.geoFocus,
      check_size_min: investor.checkSizeMin,
      check_size_max: investor.checkSizeMax,
      notes: investor.notes,
      contact_count: investor.contactCount,
      // Transform contacts to match local format
      contacts: investor.contacts.map((contact) => ({
        id: contact.id,
        member_id: contact.id, // Use contact ID as member ID for federated
        added_at: contact.addedAt,
        member: {
          id: contact.id,
          name: contact.memberName,
          company: contact.memberCompany,
          role: null,
          linkedin: null, // Not shared until intro accepted
        },
        is_current_user: false, // Never true for federated contacts
        is_federated: true,
        federated_chapter: {
          slug: chapterSlug,
          name: targetChapter?.name || chapterSlug,
        },
      })),
      // Add federation metadata
      is_federated: true,
      federated_chapter: {
        slug: chapterSlug,
        name: targetChapter?.name || chapterSlug,
      },
    }));

    return new Response(JSON.stringify({
      investors: transformedInvestors,
      member_id: member.id,
      federated: true,
      chapter: data.chapter,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Federation proxy error:', error);

    // Check if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new Response(JSON.stringify({ error: 'Could not reach remote chapter' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

import type { APIRoute } from 'astro';
import { getMember } from '../../../../lib/auth';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { CHAPTER } from '../../../../lib/chapter-config';
import { createFederationToken, addFederationAuth } from '../../../../lib/federation/auth';
import { getChapter, buildFederationUrl, isValidChapter } from '../../../../lib/federation/network-registry';
import type { FederationIntroRequestResponse } from '../../../../lib/federation/types';

export const prerender = false;

/**
 * POST /api/federation/proxy/intro-requests
 *
 * Proxy endpoint for sending intro requests to other chapters.
 * Creates a local tracking record and forwards to remote chapter.
 *
 * Body:
 * - chapter: Target chapter slug
 * - investorId: ID of the investor in the target chapter
 * - contactMemberId: ID of the contact member in the target chapter
 * - message: Introduction request message
 */
export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const runtime = (locals as any).runtime;

  // Verify user is authenticated
  const member = await getMember(cookies, runtime, request);
  if (!member) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = getSupabaseAdmin(runtime);
  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { chapter: chapterSlug, investorId, contactMemberId, message } = body;

    // Validate required fields
    if (!chapterSlug || !investorId || !contactMemberId || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate message length
    if (message.trim().length < 50) {
      return new Response(JSON.stringify({
        error: 'Please provide a more detailed message (at least 50 characters)',
      }), {
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

    if (chapterSlug === CHAPTER.slug) {
      return new Response(JSON.stringify({
        error: 'Use /api/investors/intro-requests for local chapter requests',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for existing pending request
    const { data: existingRequest } = await supabaseAdmin
      .from('federated_intro_requests')
      .select('id, status')
      .eq('requester_id', member.id)
      .eq('target_chapter_slug', chapterSlug)
      .eq('target_investor_id', investorId)
      .eq('target_contact_member_id', contactMemberId)
      .in('status', ['pending', 'sent'])
      .single();

    if (existingRequest) {
      return new Response(JSON.stringify({
        error: 'You already have a pending request for this introduction',
        requestId: existingRequest.id,
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create local tracking record
    const { data: localRequest, error: createError } = await supabaseAdmin
      .from('federated_intro_requests')
      .insert({
        requester_id: member.id,
        target_chapter_slug: chapterSlug,
        target_investor_id: investorId,
        target_contact_member_id: contactMemberId,
        message: message.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (createError || !localRequest) {
      console.error('Error creating federated intro request:', createError);
      return new Response(JSON.stringify({ error: 'Failed to create request' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create federation token
    const token = await createFederationToken({
      targetChapter: chapterSlug,
      member: {
        id: member.id,
        name: member.name,
        company: member.company,
      },
      scopes: ['request:intro'],
      runtime,
    });

    // Build webhook URL for status updates
    const webhookUrl = `${CHAPTER.websiteUrl}/api/federation/v1/webhooks/intro-status`;

    // Send request to remote chapter
    const targetUrl = buildFederationUrl(chapterSlug, '/v1/intro-requests');
    if (!targetUrl) {
      // Rollback local record
      await supabaseAdmin
        .from('federated_intro_requests')
        .delete()
        .eq('id', localRequest.id);

      return new Response(JSON.stringify({ error: 'Could not build federation URL' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });
    addFederationAuth(headers, token);

    let remoteResponse: Response;
    try {
      remoteResponse = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          investorId,
          contactMemberId,
          message: message.trim(),
          webhookUrl,
        }),
      });
    } catch (fetchError) {
      console.error('Federation request failed:', fetchError);

      // Update local record to indicate failure
      await supabaseAdmin
        .from('federated_intro_requests')
        .update({ status: 'pending' }) // Keep as pending for retry
        .eq('id', localRequest.id);

      return new Response(JSON.stringify({ error: 'Could not reach remote chapter' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!remoteResponse.ok) {
      const errorData = await remoteResponse.json().catch(() => ({}));
      console.error('Remote chapter rejected request:', remoteResponse.status, errorData);

      // Update local record
      await supabaseAdmin
        .from('federated_intro_requests')
        .update({ status: 'declined' })
        .eq('id', localRequest.id);

      return new Response(JSON.stringify({
        error: errorData.error || 'Remote chapter rejected the request',
      }), {
        status: remoteResponse.status === 404 ? 404 : 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const remoteData: FederationIntroRequestResponse = await remoteResponse.json();

    // Update local record with remote ID and status
    await supabaseAdmin
      .from('federated_intro_requests')
      .update({
        remote_request_id: remoteData.requestId,
        status: remoteData.status,
      })
      .eq('id', localRequest.id);

    const targetChapter = getChapter(chapterSlug);

    return new Response(JSON.stringify({
      success: true,
      requestId: localRequest.id,
      remoteRequestId: remoteData.requestId,
      status: remoteData.status,
      targetChapter: {
        slug: chapterSlug,
        name: targetChapter?.name || chapterSlug,
      },
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in federation intro-requests proxy:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

export const prerender = false;

// GET - Fetch member analytics stats
export const GET: APIRoute = async ({ cookies, request, locals }) => {
  const authResult = await requireAdmin(cookies, (locals as any).runtime, request);
  if ('redirect' in authResult) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = getSupabaseAdmin((locals as any).runtime);

  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get summary stats
    const [
      { count: totalMembers },
      { count: active7d },
      { count: active30d },
      { count: totalInvestors },
      { count: totalContacts },
      { count: totalIntroRequests },
      { count: acceptedIntros },
      { count: introsLast30d },
    ] = await Promise.all([
      supabaseAdmin.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('last_seen_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabaseAdmin.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('last_seen_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabaseAdmin.from('investors').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('investor_contacts').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('intro_requests').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('intro_requests').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
      supabaseAdmin.from('intro_requests').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Get top contributors (members who added most investors)
    const { data: topContributors } = await supabaseAdmin
      .from('investor_contacts')
      .select('member_id, members(name, company)')
      .order('member_id');

    // Aggregate by member_id
    const contributorMap = new Map<string, { name: string; company: string | null; count: number }>();
    (topContributors || []).forEach((ic: any) => {
      const memberId = ic.member_id;
      if (!contributorMap.has(memberId)) {
        contributorMap.set(memberId, {
          name: ic.members?.name || 'Unknown',
          company: ic.members?.company,
          count: 0,
        });
      }
      contributorMap.get(memberId)!.count++;
    });

    const topContributorsList = Array.from(contributorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get most active members (by login count) - only those with at least 1 login
    const { data: mostActiveMembers } = await supabaseAdmin
      .from('members')
      .select('name, company, login_count, last_seen_at')
      .eq('status', 'active')
      .gt('login_count', 0)
      .order('login_count', { ascending: false })
      .limit(10);

    // Get recent activity (members who logged in recently)
    const { data: recentActivity } = await supabaseAdmin
      .from('members')
      .select('name, company, last_seen_at')
      .eq('status', 'active')
      .not('last_seen_at', 'is', null)
      .gt('login_count', 0)
      .order('last_seen_at', { ascending: false })
      .limit(10);

    // Get members with most intro requests sent
    const { data: topRequesters } = await supabaseAdmin
      .from('intro_requests')
      .select('requester_id, members!intro_requests_requester_id_fkey(name, company)');

    const requesterMap = new Map<string, { name: string; company: string | null; count: number }>();
    (topRequesters || []).forEach((ir: any) => {
      const requesterId = ir.requester_id;
      if (!requesterMap.has(requesterId)) {
        requesterMap.set(requesterId, {
          name: ir.members?.name || 'Unknown',
          company: ir.members?.company,
          count: 0,
        });
      }
      requesterMap.get(requesterId)!.count++;
    });

    const topRequestersList = Array.from(requesterMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return new Response(JSON.stringify({
      summary: {
        totalMembers: totalMembers || 0,
        active7d: active7d || 0,
        active30d: active30d || 0,
        totalInvestors: totalInvestors || 0,
        totalContacts: totalContacts || 0,
        totalIntroRequests: totalIntroRequests || 0,
        acceptedIntros: acceptedIntros || 0,
        introsLast30d: introsLast30d || 0,
        introAcceptRate: totalIntroRequests ? Math.round(((acceptedIntros || 0) / totalIntroRequests) * 100) : 0,
      },
      topContributors: topContributorsList,
      mostActiveMembers: mostActiveMembers || [],
      recentActivity: recentActivity || [],
      topRequesters: topRequestersList,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

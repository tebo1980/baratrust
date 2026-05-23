import { NextResponse } from 'next/server'
import { db } from '@/db'
import { leads } from '@/db/schema'
import { desc, eq, and, sql } from 'drizzle-orm'

const VALID_STATUSES = new Set(['new', 'sent', 'replied', 'converted', 'discarded', 'pending_review', 'all'])
const VALID_BANDS = new Set(['hot', 'warm', 'cold', 'all'])

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const statusRaw = searchParams.get('status') ?? 'all'
  const bandRaw = searchParams.get('band') ?? 'all'
  const limitRaw = searchParams.get('limit')

  const status = VALID_STATUSES.has(statusRaw) ? statusRaw : 'all'
  // Currently skipping 'band' mapping since there is no score column on the new 'leads' schema yet.
  // const band = VALID_BANDS.has(bandRaw) ? bandRaw : 'all'
  const limit = limitRaw ? Math.max(1, Math.min(500, parseInt(limitRaw, 10) || 0)) : 200

  try {
    let conditions = undefined;
    if (status !== 'all') {
      conditions = eq(leads.status, status);
    }

    const leadsData = await db
      .select()
      .from(leads)
      .where(conditions)
      .orderBy(desc(leads.createdAt))
      .limit(limit);

    // Map `leadsData` into the format that the ProspectList frontend component expects
    const prospects = leadsData.map(lead => ({
        id: lead.id,
        source_url: lead.source || '#',
        post_excerpt: lead.originalText,
        drafted_message: lead.draftReply,
        status: lead.status || 'new',
        found_at: lead.createdAt?.toISOString() || new Date().toISOString(),
        total_score: 0, // Placeholder
        matched_keywords: [], // Placeholder
        intent_score: 0,
        intent_tier: 'Unknown',
        specificity: 0,
        location_match: 0,
        recency: 0,
        budget_signals: 0,
    }));

    // Provide dummy counts to avoid breaking the UI
    const counts = {
      total: prospects.length,
      hot: 0,
      warm: 0,
      cold: prospects.length,
      byStatus: {
        new: prospects.filter(p => p.status === 'new').length,
        sent: prospects.filter(p => p.status === 'sent').length,
        replied: prospects.filter(p => p.status === 'replied').length,
        converted: prospects.filter(p => p.status === 'converted').length,
        discarded: prospects.filter(p => p.status === 'discarded').length,
      }
    };

    return NextResponse.json({ prospects, counts })
  } catch (err) {
    console.error('list prospects failed:', err)
    return NextResponse.json(
      { error: 'Database read failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}

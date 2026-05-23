import { NextResponse } from 'next/server'
import { db } from '@/db'
import { leads } from '@/db/schema'
import { eq } from 'drizzle-orm'

const VALID_STATUSES = ['new', 'sent', 'replied', 'converted', 'discarded', 'pending_review']

interface PatchBody {
  status?: string
  notes?: string | null
  contractor_slug?: string | null
  contractor_name?: string | null
  conversion_value_monthly?: number | null
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  try {
    const rowData = await db.select().from(leads).where(eq(leads.id, id)).limit(1)
    const row = rowData[0]

    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const mappedRow = {
        id: row.id,
        source_url: row.source || '#',
        post_excerpt: row.originalText,
        drafted_message: row.draftReply,
        status: row.status || 'new',
        found_at: row.createdAt?.toISOString() || new Date().toISOString(),
        total_score: 0,
        matched_keywords: [],
        intent_score: 0,
        intent_tier: 'Unknown',
        specificity: 0,
        location_match: 0,
        recency: 0,
        budget_signals: 0,
    }

    return NextResponse.json({ prospect: mappedRow })
  } catch (err) {
    console.error('get prospect failed:', err)
    return NextResponse.json({ error: 'Database read failed' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  let body: PatchBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 })
  }

  if (
    body.conversion_value_monthly !== undefined &&
    body.conversion_value_monthly !== null &&
    (typeof body.conversion_value_monthly !== 'number' || body.conversion_value_monthly < 0)
  ) {
    return NextResponse.json({ error: 'conversion_value_monthly must be a non-negative number' }, { status: 400 })
  }

  try {
    const updateData: any = {};
    if (body.status) {
        updateData.status = body.status;
    }
    // We omit the other notes and conversion mappings for now as they are not on the `leads` schema.

    await db.update(leads).set(updateData).where(eq(leads.id, id))

    const rowData = await db.select().from(leads).where(eq(leads.id, id)).limit(1)
    const row = rowData[0]

    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const mappedRow = {
        id: row.id,
        source_url: row.source || '#',
        post_excerpt: row.originalText,
        drafted_message: row.draftReply,
        status: row.status || 'new',
        found_at: row.createdAt?.toISOString() || new Date().toISOString(),
        total_score: 0,
        matched_keywords: [],
        intent_score: 0,
        intent_tier: 'Unknown',
        specificity: 0,
        location_match: 0,
        recency: 0,
        budget_signals: 0,
    }

    return NextResponse.json({ prospect: mappedRow })
  } catch (err) {
    console.error('update prospect failed:', err)
    return NextResponse.json({ error: 'Database write failed' }, { status: 500 })
  }
}

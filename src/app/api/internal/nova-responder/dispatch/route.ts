import { NextResponse } from 'next/server'
import { db } from '@/db'
import { leads } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const prospectId = parseInt(body.prospectId, 10)

    if (Number.isNaN(prospectId)) {
      return NextResponse.json({ error: 'Invalid or missing prospectId' }, { status: 400 })
    }

    // 1. Fetch the prospect row from the database
    const prospectRows = await db.select().from(leads).where(eq(leads.id, prospectId)).limit(1)
    const prospect = prospectRows[0]

    if (!prospect) {
      return NextResponse.json({ error: `Prospect with id ${prospectId} not found` }, { status: 404 })
    }

    // 2. Read the pre-generated AI draft text
    const messageToSend = prospect.draftReply

    if (!messageToSend) {
      return NextResponse.json({ error: 'No drafted message available to dispatch for this prospect' }, { status: 422 })
    }

    // 3. Simulate outward transmission payload
    // (This represents Nova firing the text/email intake alert)
    console.log(`[NOVA DISPATCH] Transmitting message for Prospect ID: ${prospectId}`)
    console.log(`[NOVA DISPATCH] Target URL: ${prospect.source}`)
    console.log(`[NOVA DISPATCH] Message Payload: "${messageToSend}"`)

    // TODO: In production, integrate your actual third-party email/SMS provider (e.g. SendGrid, Twilio, Resend) here.

    // 4. Update the prospect's status column to 'sent'
    // Note: The schema's ProspectStatus type uses 'sent'. Moving it out of the 'New' column is achieved by changing status to 'sent'.
    await db.update(leads).set({ status: 'sent' }).where(eq(leads.id, prospectId))
    const updatedProspectRows = await db.select().from(leads).where(eq(leads.id, prospectId)).limit(1)
    const updatedProspect = updatedProspectRows[0]

    // Map the updated prospect to match the frontend expectations
    const mappedUpdatedProspect = {
        id: updatedProspect.id,
        source_url: updatedProspect.source || '#',
        post_excerpt: updatedProspect.originalText,
        drafted_message: updatedProspect.draftReply,
        status: updatedProspect.status || 'new',
        found_at: updatedProspect.createdAt?.toISOString() || new Date().toISOString(),
        total_score: 0,
        matched_keywords: [],
        intent_score: 0,
        intent_tier: 'Unknown',
        specificity: 0,
        location_match: 0,
        recency: 0,
        budget_signals: 0,
    }

    return NextResponse.json({
      success: true,
      message: 'Nova payload dispatched successfully',
      prospect: mappedUpdatedProspect
    })

  } catch (err) {
    console.error('Nova Dispatch Error:', err)
    return NextResponse.json(
      { error: 'Internal Server Error', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}

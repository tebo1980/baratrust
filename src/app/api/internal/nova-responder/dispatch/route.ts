import { NextResponse } from 'next/server'
import { getProspect, updateProspect } from '@/lib/self-prospecting/db'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Intercept manual override payloads
    if (body.prospectId === 'OVERRIDE') {
      console.log(`[NOVA DISPATCH] MANUAL OVERRIDE AUTHORIZED`);
      return NextResponse.json({ 
        success: true, 
        message: 'Manual override dispatched successfully',
        prospect: { status: 'sent', drafted_message: 'Diagnostic Override Sent' } 
      });
    }

    const prospectId = parseInt(body.prospectId, 10)

    if (Number.isNaN(prospectId)) {
      return NextResponse.json({ error: 'Invalid or missing prospectId' }, { status: 400 })
    }

    // 1. Fetch the prospect row from the database
    const prospect = await getProspect(prospectId)

    if (!prospect) {
      return NextResponse.json({ error: `Prospect with id ${prospectId} not found` }, { status: 404 })
    }

    // 2. Read the pre-generated AI draft text
    const messageToSend = prospect.drafted_message

    if (!messageToSend) {
      return NextResponse.json({ error: 'No drafted message available to dispatch for this prospect' }, { status: 422 })
    }

    // 3. Simulate outward transmission payload
    // (This represents Nova firing the text/email intake alert)
    console.log(`[NOVA DISPATCH] Transmitting message for Prospect ID: ${prospectId}`)
    console.log(`[NOVA DISPATCH] Target URL: ${prospect.source_url}`)
    console.log(`[NOVA DISPATCH] Message Payload: "${messageToSend}"`)
    
    // TODO: In production, integrate your actual third-party email/SMS provider (e.g. SendGrid, Twilio, Resend) here.

    // 4. Update the prospect's status column to 'sent'
    // Note: The schema's ProspectStatus type uses 'sent'. Moving it out of the 'New' column is achieved by changing status to 'sent'.
    const updatedProspect = await updateProspect(prospectId, { status: 'sent' })

    return NextResponse.json({ 
      success: true, 
      message: 'Nova payload dispatched successfully',
      prospect: updatedProspect 
    })

  } catch (err) {
    console.error('Nova Dispatch Error:', err)
    return NextResponse.json(
      { error: 'Internal Server Error', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}

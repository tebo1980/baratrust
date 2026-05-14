import { NextResponse } from 'next/server'
import { getProspect, updateProspect, type ProspectStatus } from '@/lib/self-prospecting/db'

const VALID_STATUSES: ProspectStatus[] = ['new', 'sent', 'replied', 'converted', 'discarded']

interface PatchBody {
  status?: ProspectStatus
  notes?: string | null
  contractor_slug?: string | null
  contractor_name?: string | null
  conversion_value_monthly?: number | null
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  try {
    const row = await getProspect(id)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ prospect: row })
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
    const row = await updateProspect(id, body)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ prospect: row })
  } catch (err) {
    console.error('update prospect failed:', err)
    return NextResponse.json({ error: 'Database write failed' }, { status: 500 })
  }
}

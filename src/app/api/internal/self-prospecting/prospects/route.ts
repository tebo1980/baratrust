import { NextResponse } from 'next/server'
import { listProspects, getCounts, type ProspectStatus } from '@/lib/self-prospecting/db'

const VALID_STATUSES = new Set(['new', 'sent', 'replied', 'converted', 'discarded', 'all'])
const VALID_BANDS = new Set(['hot', 'warm', 'cold', 'all'])

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const statusRaw = searchParams.get('status') ?? 'all'
  const bandRaw = searchParams.get('band') ?? 'all'
  const sinceHoursRaw = searchParams.get('sinceHours')
  const limitRaw = searchParams.get('limit')

  const status = VALID_STATUSES.has(statusRaw) ? (statusRaw as ProspectStatus | 'all') : 'all'
  const band = VALID_BANDS.has(bandRaw) ? (bandRaw as 'hot' | 'warm' | 'cold' | 'all') : 'all'
  const sinceHours = sinceHoursRaw ? Math.max(1, parseInt(sinceHoursRaw, 10) || 0) : undefined
  const limit = limitRaw ? Math.max(1, Math.min(500, parseInt(limitRaw, 10) || 0)) : 200

  try {
    const [prospects, counts] = await Promise.all([
      listProspects({ status, band, sinceHours, limit }),
      getCounts(),
    ])
    return NextResponse.json({ prospects, counts })
  } catch (err) {
    console.error('list prospects failed:', err)
    return NextResponse.json(
      { error: 'Database read failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Retired legacy prototype checkout endpoint containing placeholder price configuration (F-01 maintenance).
 * Active BaraTrust Business Pulse checkout uses the verified Stripe Payment Link on /pricing.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'This legacy prototype checkout endpoint has been retired.' },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'This legacy prototype checkout endpoint has been retired.' },
    { status: 410 }
  );
}

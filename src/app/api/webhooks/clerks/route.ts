import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { businesses } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('[CLERK_WEBHOOK_ERROR] CLERK_WEBHOOK_SECRET is not configured.');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const headerPayload = headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Error occurred -- missing svix headers', { status: 400 });
  }

  // Verify against exact raw body string so Svix HMAC never breaks on whitespace differences
  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying Clerk webhook:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  if (evt.type === 'user.created') {
    const { id, first_name, last_name, email_addresses } = evt.data;
    const rawEmail =
      Array.isArray(email_addresses) && email_addresses.length > 0
        ? email_addresses[0].email_address
        : null;
    const primaryEmail = rawEmail ? rawEmail.trim().toLowerCase() : null;
    const fullName =
      [first_name, last_name].filter(Boolean).join(' ').trim() || 'New User';

    // If the user already paid via the public Stripe Payment Link before signing up in Clerk,
    // link their real Clerk ID onto that existing paid record rather than creating a duplicate row.
    if (primaryEmail) {
      const [existingByEmail] = await db
        .select()
        .from(businesses)
        .where(sql`lower(${businesses.ownerEmail}) = ${primaryEmail}`)
        .limit(1);

      if (existingByEmail) {
        if (existingByEmail.clerkId.startsWith('stripe_')) {
          await db
            .update(businesses)
            .set({
              clerkId: id,
              ownerName:
                existingByEmail.ownerName === 'Business Pulse Member'
                  ? fullName
                  : existingByEmail.ownerName,
              updatedAt: new Date(),
            })
            .where(eq(businesses.id, existingByEmail.id));
        }
        return new Response('', { status: 200 });
      }
    }

    await db
      .insert(businesses)
      .values({
        clerkId: id,
        ownerName: fullName,
        ownerEmail: primaryEmail,
        businessName: `${first_name || 'New'}'s Business`,
        region: 'Louisville/New Albany',
      })
      .onConflictDoNothing({ target: businesses.clerkId });
  }

  return new Response('', { status: 200 });
}

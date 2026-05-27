import { NextResponse } from 'next/server';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { chromium } from 'playwright';

// This is a placeholder for the actual extraction logic you'll need to build.
// You'll likely want to use Gemini to parse the raw text/HTML or use more specific DOM selectors.
async function extractListings(page: any) {
  // Wait for the main grid to render
  await page.waitForSelector('div[role="main"]', { timeout: 15000 }).catch(() => console.log("Main grid not found, continuing anyway..."));

  // Extract raw text from the likely container elements
  const rawTextContents = await page.evaluate(() => {
    // This is highly dependent on Facebook's current DOM structure and will need constant tweaking.
    // We grab all elements that look like cards or list items.
    const elements = Array.from(document.querySelectorAll('div[data-testid="marketplace_search_feed_content"] div > span > div > div'));

    return elements.map(el => {
      // Get all text content
      const text = el.textContent || '';
      // Try to find a link
      const linkEl = el.querySelector('a[href*="/marketplace/item/"]');
      const link = linkEl ? (linkEl as HTMLAnchorElement).href : null;
      return { text, link };
    }).filter(item => item.text.length > 20); // Filter out empty or very small nodes
  });

  console.log(`Extracted ${rawTextContents.length} potential raw listings from DOM.`);
  return rawTextContents;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body.query || 'hvac services';
    const city = body.city || 'louisville';

    console.log(`[FETCH ENGINE] Booting up Playwright for Facebook Marketplace search: "${query}" in ${city}`);

    const context = await chromium.launchPersistentContext('./user_data', {
      headless: true, // Run headless in the API route
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    });

    const page = await context.newPage();

    // Override the navigator.webdriver property so JS checks think a human is driving
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const searchQuery = encodeURIComponent(query);
    const searchUrl = `https://www.facebook.com/marketplace/${city}/search?query=${searchQuery}`;

    console.log(`[FETCH ENGINE] Navigating to ${searchUrl}`);
    await page.goto(searchUrl);

    console.log("[FETCH ENGINE] Waiting for heavy Marketplace grid to render...");
    await page.waitForTimeout(10000);

    console.log("[FETCH ENGINE] Executing infinite scroll sequence (Max 12 loops)...");
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(2000);
    }

    console.log("[FETCH ENGINE] Extracting DOM data...");
    const rawListings = await extractListings(page);

    await context.close();
    console.log("[FETCH ENGINE] Browser session closed to flush memory.");

    if (rawListings.length === 0) {
        return NextResponse.json({ success: false, message: "No raw listings found. DOM might have changed." }, { status: 404 });
    }

    console.log("[FETCH ENGINE] Parsing raw DOM blocks and routing to database...");

    let insertedCount = 0;
    for (const listing of rawListings) {
        const snippet = listing.text.substring(0, 50) + '...';

        try {
            await db.insert(leads).values({
                title: snippet,
                source: listing.link || 'Facebook Marketplace',
                originalText: listing.text,
                status: 'new',
                city: city
            }).onConflictDoNothing({ target: leads.source }); // Prevent duplicates using the UNIQUE source/link target

            insertedCount++;
        } catch (dbErr: any) {
            console.error("Database insert error:", dbErr);
        }
    }

    return NextResponse.json({
        success: true,
        message: `Fetch sequence complete. Captured and stored ${insertedCount} new potential leads.`,
        rawExtractions: rawListings.length
    });

  } catch (err) {
    console.error('[FETCH ENGINE ERROR]:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }
}

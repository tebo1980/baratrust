import { chromium } from 'playwright';

async function testFacebookConnection() {
  console.log("Initializing local headful browser session with saved profile...");

  // Launch a persistent context to use our cached, authenticated session
  const context = await chromium.launchPersistentContext('./user_data', {
    headless: false, 
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  // URL targeting local Marketplace services for a specific trade and location
  const searchQuery = encodeURIComponent('hvac services');
  // You can change 'louisville' to 'newalbany' or another local city slug if needed
  const searchUrl = `https://www.facebook.com/marketplace/louisville/search?query=${searchQuery}`;

  console.log(`Navigating directly to Marketplace Leads: ${searchUrl}`);
  await page.goto(searchUrl);

  console.log("Waiting for the heavy Marketplace image grid to fully render (10s)...");
  await page.waitForTimeout(10000);

  console.log("Scrolling down to trigger lazy-loading of Marketplace listings...");
  // Inject a script to scroll the page window down physically
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 1000));
    console.log(`Scroll pass ${i + 1}/3 complete. Loading images...`);
    await page.waitForTimeout(2000); // Wait 2 seconds between scrolls for images to pop in
  }

  console.log("Taking snapshot of the loaded grid...");
  await page.screenshot({ path: 'facebook-marketplace-leads.png', fullPage: true });
  
  console.log("Mission accomplished! Screenshot successfully saved as 'facebook-marketplace-leads.png'.");
  
  // Clean up and close the browser session
  await context.close();
  console.log("Test complete!");
}

testFacebookConnection().catch(console.error);
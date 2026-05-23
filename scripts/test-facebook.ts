import { chromium } from 'playwright';

async function testFacebookConnection() {
  console.log("Initializing residential connection test...");

  // Use a persistent context to mimic a natural browser session and save cookies/storage
  const context = await chromium.launchPersistentContext('./user_data', {
    headless: false, // Make it visible!
    args: ['--disable-blink-features=AutomationControlled'], // Helps bypass basic bot detection
  });

  const page = await context.newPage();

  console.log("Navigating to Facebook...");
  await page.goto('https://www.facebook.com');

  console.log("Waiting for the layout to settle...");
  // Wait for 5 seconds to ensure the page has fully loaded visually
  await page.waitForTimeout(5000);

  console.log("Taking diagnostic screenshot...");
  await page.screenshot({ path: 'facebook-diagnostic.png' });

  console.log("Screenshot saved as 'facebook-diagnostic.png'.");

  // Close the browser to clean up
  await context.close();
  console.log("Connection test complete.");
}

testFacebookConnection().catch(console.error);

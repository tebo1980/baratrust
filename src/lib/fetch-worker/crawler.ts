import { chromium, Browser, BrowserContext } from 'playwright';

interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

interface ScraperConfig {
  proxy?: ProxyConfig;
  userAgent?: string;
  headless?: boolean;
}

export async function setupBrowserContext(config: ScraperConfig): Promise<{ browser: Browser, context: BrowserContext }> {
  console.log("Setting up Playwright browser context...");

  // Launch options with proxy if provided
  const launchOptions: any = {
    headless: config.headless !== undefined ? config.headless : true,
  };

  if (config.proxy) {
    launchOptions.proxy = {
      server: config.proxy.server,
      username: config.proxy.username,
      password: config.proxy.password,
    };
    console.log(`Configuring proxy server: ${config.proxy.server}`);
  }

  const browser = await chromium.launch(launchOptions);

  // Context options to mimic a standard desktop browser
  const defaultUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  const context = await browser.newContext({
    userAgent: config.userAgent || defaultUserAgent,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    // Add realistic locale and timezone to look less bot-like
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

  return { browser, context };
}

// === Main Execution Loop ===
export async function runCrawler() {
  try {
    const { browser, context } = await setupBrowserContext({
      // Pass your residential proxy credentials here
      /*
      proxy: {
        server: 'http://my.proxy.network:8080',
        username: 'res_proxy_user',
        password: 'res_proxy_password'
      },
      */
      headless: true
    });

    console.log("Launching new page...");
    const page = await context.newPage();

    // Navigate to our specific Louisville Plumber search query on Old Reddit
    console.log("Navigating to target Reddit URL...");
    await page.goto('https://old.reddit.com/r/Louisville/search/?q=plumber&sort=new&restrict_sr=on');
    console.log("Successfully loaded:", await page.title());

    // Wait for the search results container to appear
    await page.waitForSelector('.search-result', { timeout: 10000 }).catch(() => {
      console.log("Warning: Could not find .search-result elements in time. Page structure may differ.");
    });

    console.log("Extracting posts from the DOM...");
    
    const posts = await page.evaluate(() => {
      // Old Reddit typically wraps search results in .search-result classes
      const resultNodes = Array.from(document.querySelectorAll('.search-result'));
      
      // Grab the first 5 results
      return resultNodes.slice(0, 5).map(node => {
        const titleEl = node.querySelector('.search-title');
        const authorEl = node.querySelector('.author');
        // Descriptions in search results are sometimes nested in a summary or body block
        const bodyEl = node.querySelector('.search-result-summary, .search-result-body');
        
        // Extract URL, or fallback to a dummy URL if missing
        let extractedUrl = titleEl?.getAttribute('href') || '';
        if (extractedUrl && !extractedUrl.startsWith('http')) {
          extractedUrl = `https://old.reddit.com${extractedUrl}`;
        }
        const finalUrl = extractedUrl || `https://old.reddit.com/r/Louisville/comments/mock_${Math.random().toString(36).substr(2, 9)}`;

        return {
          title: titleEl?.textContent?.trim() || 'No Title Found',
          author: authorEl?.textContent?.trim() || 'Unknown Author',
          description: bodyEl?.textContent?.trim() || 'No description preview available.',
          url: finalUrl
        };
      });
    });

    console.log(`\n=== EXTRACTED ${posts.length} REDDIT POSTS ===\n`);
    
    posts.forEach((post, i) => {
      console.log(`[Post ${i + 1}]`);
      console.log(`Title: ${post.title}`);
      console.log(`Author: ${post.author}`);
      console.log(`Snippet: ${post.description.substring(0, 150)}${post.description.length > 150 ? '...' : ''}\n`);
    });

    console.log("\n=== TRANSMITTING PAYLOADS TO MOTHERSHIP ===");
    for (const post of posts) {
      try {
        const response = await fetch('http://localhost:3000/api/internal/self-prospecting/ingest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: post.url,
            postText: `${post.title}\n\n${post.description}`,
            platform: 'Reddit',
            author: post.author
          })
        });

        if (response.ok) {
          console.log(`✅ Transmission Successful: "${post.title.substring(0, 30)}..."`);
        } else {
          console.error(`❌ Transmission Failed (${response.status}): Mothership rejected lead.`);
        }
      } catch (error) {
        console.error(`❌ Transmission Error: Could not reach localhost.`);
      }
    }

    await browser.close();
    console.log("Browser safely closed. Extraction complete.");
    
  } catch (err) {
    console.error("Crawler encountered an error:", err);
  }
}

// Execute
runCrawler();

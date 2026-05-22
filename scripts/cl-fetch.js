import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { chromium } from 'playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
}

async function runCraigslistFetch() {
    console.log("1. Fetch is waking up for a Live Database Sweep...");

    // ==========================================
    // CLOUD DATABASE SETUP (Vercel Neon)
    // ==========================================
    const dbClient = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Vercel/Neon connections
    });

    try {
        await dbClient.connect();
        console.log("☁️ Successfully connected to the BaraTrust Live Database.");
    } catch (err) {
        console.error("❌ Database connection failed. Check your .env file.", err);
        return; // Stop the script if we can't reach the cloud
    }

    // ==========================================
    // THE MEMORY BANK (Pre-loading from Cloud)
    // ==========================================
    const seenTitles = new Set();

    try {
        // Create the table if it hasn't been built yet
        await dbClient.query(`
            CREATE TABLE IF NOT EXISTS leads (
                id SERIAL PRIMARY KEY,
                title TEXT UNIQUE,
                price TEXT,
                summary TEXT,
                city TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Load existing titles into the Memory Bank to prevent duplicate DB hits
        const res = await dbClient.query('SELECT title FROM leads');
        res.rows.forEach(row => seenTitles.add(row.title));
        console.log(`🧠 Cloud Memory Bank loaded: Fetch remembers ${seenTitles.size} previous leads.`);
    } catch (err) {
        console.log("Warning: Could not sync memory bank.", err.message);
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    const regions = ['louisville', 'indianapolis', 'cincinnati', 'lexington'];
    const searchTerms = ['water heater', 'broken AC', 'scrap metal', 'appliances'];
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const encodedTerm = encodeURIComponent(randomTerm);

    console.log(`\n🎯 BARA-TRUST TARGET INITIATED: Searching for "${randomTerm}"...`);

    for (const city of regions) {
        console.log(`\n🚗 ========================================`);
        console.log(` 🌆 ARRIVING IN: ${city.toUpperCase()} `);
        console.log(`========================================`);

        await page.goto(`https://${city}.craigslist.org/search/sss?query=${encodedTerm}`, { waitUntil: 'networkidle' });

        let currentPage = 1;
        const maxPages = 3;
        let hasNextPage = true;

        while (currentPage <= maxPages && hasNextPage) {
            console.log(`\n📄 --- SCANNING ${city.toUpperCase()} - PAGE ${currentPage} OF ${maxPages} --- `);
            console.log("-> Waiting for the grid to paint...");
            await page.waitForTimeout(3000);

            console.log("-> Taking a visual snapshot of the grid...");
            await page.screenshot({ path: 'cl-vision.png' });

            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });

            const imagePart = fileToGenerativePart("cl-vision.png", "image/png");

            const targetingPrompt = `
            Look at this screenshot of Craigslist.
            Find up to 3 valid listings related to "${randomTerm}" in the main grid.
            Estimate the exact center location of each listing's main photo or text link.
            You MUST return ONLY a valid JSON array of objects matching this exact format:
            [
              { "x": 28, "y": 35 },
              { "x": 55, "y": 35 },
              { "x": 82, "y": 35 }
            ]
            Rules:
            1. 'x' is the horizontal percentage from the left edge (0-100).
            2. 'y' is the vertical percentage from the top edge (0-100).
            3. Return a maximum of 3 targets.
            `;

            const targetResult = await model.generateContent([targetingPrompt, imagePart]);
            const decisions = JSON.parse(targetResult.response.text());

            console.log(`--- BRAIN DECISION ---`);
            console.log(`Found ${decisions.length} targets on this page.\n`);

            for (let i = 0; i < decisions.length; i++) {
                const target = decisions[i];
                console.log(`--- EXECUTING HIT ${i + 1} OF ${decisions.length} ---`);

                try {
                    const clickX = (target.x / 100) * 1280;
                    const clickY = (target.y / 100) * 720;

                    await page.mouse.click(clickX, clickY);
                    await page.waitForTimeout(2000);

                    const insidePath = `cl-inside-${i}.png`;
                    await page.screenshot({ path: insidePath });

                    const insideImagePart = fileToGenerativePart(insidePath, "image/png");

                    const harvestPrompt = `
                    Look at this screenshot of a Craigslist listing.
                    Extract the data into this exact JSON format:
                    {
                      "title": "Title of the listing",
                      "price": "Price if listed, or 'Unknown'",
                      "description": "A brief summary of the item's condition or details."
                    }
                    Return ONLY valid JSON.
                    `;

                    const harvestResult = await model.generateContent([harvestPrompt, insideImagePart]);
                    const leadData = JSON.parse(harvestResult.response.text());

                    const cleanTitle = (leadData.title || "Unknown").trim();
                    const cleanPrice = (leadData.price || "Unknown").trim();
                    const cleanSummary = (leadData.description || "No summary").trim();

                    if (seenTitles.has(cleanTitle)) {
                        console.log(`⚠️ DUPLICATE DETECTED: Skipping save.`);
                    } else {
                        // ==========================================
                        // LIVE DATABASE INJECTION
                        // ==========================================
                        const insertQuery = `
                            INSERT INTO leads (title, price, summary, city)
                            VALUES ($1, $2, $3, $4)
                            ON CONFLICT (title) DO NOTHING;
                        `;
                        await dbClient.query(insertQuery, [cleanTitle, cleanPrice, cleanSummary, city]);

                        seenTitles.add(cleanTitle);
                        console.log(`🚀 LEAD LIVE IN CLOUD [${city.toUpperCase()}]: ${cleanTitle}`);
                    }

                    await page.goBack({ waitUntil: 'networkidle' });
                    await page.waitForTimeout(1500);

                } catch (err) {
                    console.log(`Hit ${i + 1} failed. Error:`, err.message);
                    try { await page.goBack({ waitUntil: 'networkidle' }); } catch (e) { }
                }
            }

            if (currentPage < maxPages) {
                const nextButton = await page.$('.button.next');
                if (nextButton) {
                    console.log("-> Advancing to the next page...");
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle' }),
                        nextButton.click()
                    ]);
                    currentPage++;
                } else {
                    console.log(`-> No more pages in ${city.toUpperCase()}.`);
                    hasNextPage = false;
                }
            } else {
                break;
            }
        }

        console.log(`-> Swept ${city.toUpperCase()}. Taking a brief breather before hitting the highway...`);
        await page.waitForTimeout(4000);
    }

    console.log("\n9. Entire region swept. Disconnecting from live server.");
    await browser.close();
    await dbClient.end(); // Cleanly close the DB connection
}

runCraigslistFetch();
import { chromium } from 'playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Replace with your actual key
const GEMINI_API_KEY = "AIzaSyAW-_PZ6WRlxQm2EHb74eZjq4AMMVoQeh8";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function extractAndAnalyzeLeads() {
    console.log("Establishing CDP Bridge to Ghost node...");

    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const page = context.pages().find(p => p.url().includes('nextdoor.com')) || await context.newPage();

    if (!page.url().includes('nextdoor.com')) {
        await page.goto('https://nextdoor.com');
    }

    console.log("Infiltrated Nextdoor feed. Extracting data...");
    await page.waitForTimeout(3000);
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(2500);

    const posts = await page.evaluate(() => {
        const postElements = Array.from(document.querySelectorAll('div[data-testid="post-card"], article, div[data-story-id]'));
        if (postElements.length > 0) {
            return postElements.slice(0, 3).map(el => el.textContent?.trim() || '').filter(text => text.length > 10);
        } else {
            const paragraphs = Array.from(document.querySelectorAll('span, p')).filter(p => p.textContent!.length > 100);
            return paragraphs.slice(0, 3).map(p => p.textContent?.trim() || '');
        }
    });

    console.log(`\n=== EXTRACTED ${posts.length} POSTS. ENGAGING GEMINI BRAIN ===\n`);

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        console.log(`\n[Analyzing Post ${i + 1}...]`);

        const prompt = `
    You are an expert lead generation AI for BaraTrust, serving home service trades (HVAC, Plumbing, Electrical).
    Read the following local Nextdoor post:
    "${post}"

    1. Is this a potential lead for a home service trade? (Answer YES or NO).
    2. If YES, write a short, friendly, empathetic Direct Message offering help from BaraTrust's local network. If NO, say "N/A".

    Format your response exactly like this:
    LEAD: [YES/NO]
    MESSAGE: [Your drafted message or N/A]
    `;

        try {
            const result = await model.generateContent(prompt);
            const aiResponse = result.response.text();
            console.log(aiResponse);

            // Parse the AI's decision
            if (aiResponse.includes("LEAD: YES")) {
                console.log("🔥 HIGH INTENT DETECTED! Transmitting to Mothership...");

                const messagePart = aiResponse.split("MESSAGE:")[1]?.trim() || "No draft provided.";

                // The Payload Drop to Next.js
                const response = await fetch('http://localhost:3000/api/leads', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        originalPost: post,
                        draftMessage: messagePart,
                        source: 'Nextdoor'
                    })
                });

                if (response.ok) {
                    console.log("✅ Transmission Successful: Lead is in the dashboard.");
                } else {
                    console.log("❌ Transmission Failed: Mothership did not respond.");
                }
            }
        } catch (error) {
            console.error("\n=== ACTUAL GEMINI ERROR ===");
            console.error(error);
            console.error("===========================\n");
        }
    }

    await browser.close();
    console.log("\nBridge disconnected. Analysis complete.");
}

extractAndAnalyzeLeads();
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Environment Variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const LEAD_PIONEER_SECRET = process.env.LEAD_PIONEER_SECRET;

// 1. Mock Data: Fake Craigslist post
const rawScrapedText = `Need an HVAC tech in Louisville to fix a broken AC unit ASAP. Willing to pay $500. Link: craigslist.org/fake-post`;

async function runHunter() {
  if (!GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY environment variable.");
    return;
  }

  if (!LEAD_PIONEER_SECRET) {
    console.error("Missing LEAD_PIONEER_SECRET environment variable.");
    return;
  }

  // 2. The Brain: Initialize Gemini and prompt it
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  // Instruct the model to return JSON directly
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const prompt = `
    Analyze the following scraped text and extract the relevant information into a JSON object.

    The JSON must contain exactly these keys:
    - "source" (string): Where the post originated based on context (e.g., "Craigslist").
    - "jobScope" (string): A brief description of the job.
    - "estimatedPay" (integer or null): The estimated pay converted to integer cents. (e.g., $500 becomes 50000). Set to null if not specified.
    - "region" (string): The city or region mentioned.
    - "sourceUrl" (string): The URL provided in the text.

    Scraped Text:
    "${rawScrapedText}"
  `;

  try {
    console.log("Analyzing scraped text with Gemini...");
    const result = await model.generateContent(prompt);

    // Because we set responseMimeType to application/json, the response will be pure JSON
    const jsonText = result.response.text();
    const payload = JSON.parse(jsonText);

    console.log("Extracted JSON Payload:");
    console.log(JSON.stringify(payload, null, 2));

    // 3. The Delivery: Send the JSON payload via POST to the webhook
    const webhookUrl = "http://localhost:3000/api/webhooks/lead-pioneer";

    console.log(`\nSending payload to ${webhookUrl}...`);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LEAD_PIONEER_SECRET}`
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log("Success! Delivered payload to BaraTrust.");
    } else {
      console.error(`Failed to deliver payload. Status: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error("Error details:", errorText);
    }

  } catch (err) {
    console.error("Hunter encountered an error:", err);
  }
}

runHunter();

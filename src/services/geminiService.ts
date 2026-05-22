import { GoogleGenAI, Type } from "@google/genai";
import { JobLead } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const geminiService = {
  async searchLeads(region: string, category: string): Promise<JobLead[]> {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set.");
      return [];
    }

    const prompt = `Search for job listings for ${category} in ${region} on sites like Facebook Marketplace, Craigslist, and local job boards.
    Find at least 5 leads if possible. For each lead, extract:
    - Title of the job
    - Description (brief)
    - Pay (if mentioned, otherwise "Negotiable")
    - Region (be specific)
    - Source URL
    - Source Site (e.g. Craigslist, Facebook)

    Return the results in a structured JSON format.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                pay: { type: Type.STRING },
                region: { type: Type.STRING },
                sourceUrl: { type: Type.STRING },
                sourceSite: { type: Type.STRING },
                category: { type: Type.STRING }
              },
              required: ["title", "region", "sourceUrl"]
            }
          },
          tools: [
            { googleSearch: {} }
          ],
          toolConfig: { includeServerSideToolInvocations: true }
        }
      });

      const text = response.text || "[]";
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini search error:", error);
      return [];
    }
  }
};

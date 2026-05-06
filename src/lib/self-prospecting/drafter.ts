import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSubredditRule, type SubredditRule } from './subreddit-rules'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are drafting a public REPLY (not a DM) from Todd Tebo, founder of BaraTrust. Todd built BaraTrust because he watched too many small business owners get burned by marketing agencies. His voice is warm, plain-spoken, and direct. He never uses marketing jargon.

The message must:
- Lead with genuine acknowledgment or helpful context, not a pitch
- Reference what the original poster actually said
- Mention BaraTrust naturally as "I built X to solve this"
- Offer a free 20-minute call or a soft "happy to take a look"
- Close with "DMs are open if useful"
- Be 3-4 sentences max
- Use plain text only — no markdown, no headers, no bullet points, no emoji

Forbidden words: "transform," "level up," "crush it," "guarantee," "results-driven," "synergy," "leverage," "ROI," "scale," "10x," "game-changer."

Output ONLY the reply text. No preamble. No quotes.`;

const SYSTEM_PROMPT_NO_MENTION = `You are drafting a public REPLY from Todd Tebo. The subreddit this is being posted to BANS agency self-promotion entirely.

Your reply must NOT mention BaraTrust, must NOT offer any service, must NOT include any soft pitch, and must NOT include "DMs are open."

Instead, write a reply that is purely helpful: answer the original poster's question or share genuinely useful trade insight in 2-3 sentences. No marketing language. No emoji. No markdown.

Output ONLY the reply text. No preamble.`;

export interface DraftInput {
  postText: string
  author?: string | null
  subreddit?: string | null
  matchedKeywords: string[]
  platform?: string | null
}

export interface DraftResult {
  message: string
  rule: SubredditRule
  noMentionMode: boolean
}

export async function draftReply(input: DraftInput): Promise<DraftResult> {
  const rule = getSubredditRule(input.subreddit)
  const noMentionMode = rule.allowed === false
  const system = noMentionMode ? SYSTEM_PROMPT_NO_MENTION : SYSTEM_PROMPT

  const userPrompt = [
    `Subreddit context: ${rule.note}`,
    rule.allowed === 'restricted'
      ? 'NOTE: This subreddit restricts self-promo. Be extra cautious — keep the BaraTrust mention to a single short phrase, not its own sentence.'
      : '',
    `Matched signals from the post: ${input.matchedKeywords.length ? input.matchedKeywords.join(', ') : '(none)'}`,
    `Original ${input.platform === 'reddit' ? 'Reddit' : 'forum'} post${input.author ? ` by u/${input.author}` : ''}${input.subreddit ? ` in r/${input.subreddit}` : ''}:`,
    '"""',
    input.postText.trim(),
    '"""',
    '',
    "Draft Todd's in-thread reply now.",
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: system 
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 350,
        temperature: 0.7,
      }
    });

    const message = result.response.text().trim();
    return { message, rule, noMentionMode }
  } catch (error) {
    console.error("Gemini draft failed:", error);
    return { message: "Error generating draft.", rule, noMentionMode };
  }
}
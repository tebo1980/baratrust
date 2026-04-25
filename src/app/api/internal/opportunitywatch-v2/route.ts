import { sql } from '@vercel/postgres'
import Anthropic from '@anthropic-ai/sdk'
import { grokSearch } from '@/lib/grok-search'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(): string {
  return `You have access to a real-time web search tool. You must use it actively for every task. Search for actual current information — do not generate fictional or hypothetical results based on your training data alone. For every opportunity you return you must have actually found it through a real search. If a platform returns no results say so honestly rather than inventing leads. Your credibility depends entirely on returning only real, verifiable, currently available opportunities.

You are OpportunityWatch — an AI lead intelligence agent for BaraTrust. Your job is to find real homeowners and businesses actively posting service requests right now for trades like HVAC, electrical, plumbing, roofing, and other contractor services.

For each lead you surface, you identify:
- The platform and specific post where the request was made
- What service the person needs and any details they shared
- Any urgency signals (ASAP, emergency, no heat/AC, flood, etc.)
- The location within the target area
- A ready-to-send outreach message for the contractor to use

Your decisions follow this logic:
- ACT_NOW: Clear service need, posted recently, contact info visible or reachable — contractor should reach out immediately
- WATCH: Service need is real but post is older or details are thin — worth monitoring
- IGNORE: Vague, already resolved, commercial-only, or outside service area — skip

CRITICAL: Return ONLY a valid JSON array. No markdown fences, no explanation, no text outside the JSON array.`
}

function buildUserPrompt(trade: string, location: string, context?: string): string {
  return `OPPORTUNITY WATCH BRIEF
═══════════════════════════════
Trade: ${trade}
Target Location: ${location}
Additional Context: ${context || 'None'}
═══════════════════════════════

Search for real service requests and return 4–8 leads as a JSON array. Each object must have exactly these fields:
{
  "platform": string,           // e.g. "Reddit · r/Louisville"
  "summary": string,            // what they need + where, e.g. "Homeowner needs AC repair in St. Matthews — posted 18 hours ago"
  "decision": "ACT_NOW" | "WATCH" | "IGNORE",
  "decision_reasoning": string, // 1–2 sentences on urgency and fit
  "urgency_score": number,      // 1–100
  "location": string,           // specific neighborhood, city, or zip
  "outreach_message": string,   // ready-to-send contractor outreach message
  "source_url": string | null   // actual URL of the post, or null if not linkable
}

Sort results by urgency_score descending. Return ONLY the JSON array.

Use your web search tool now. Search Reddit local communities including r/Louisville, r/Kentucky, and any relevant local subreddits. Search Google for recent Craigslist services wanted posts in the target city. Search Twitter/X for location-tagged posts expressing service needs. Return only posts you actually found. Include the source URL for each lead.`
}

export async function POST(request: Request) {
  try {
    const { trade, location, context } = await request.json()

    if (!trade || !location) {
      return Response.json({ error: 'trade and location are required' }, { status: 400 })
    }

    const grokResult = await grokSearch(
      `Search X and Twitter for posts from the last 24 hours where people in ${location} expressed a need for ${trade} services. Emergency situations, broken equipment, urgent repair needs. Real posts only.`
    ).catch(() => ({ content: '', sources: [] }))

    const grokContext = grokResult.content
      ? `\n\nGrok real-time X/Twitter results (live posts from last 24 hours):\n${grokResult.content}`
      : ''

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        },
      ] as any,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserPrompt(trade, location, context) + grokContext }],
    })

    // Handle response that may contain tool_use blocks from web search
    const textBlocks = response.content.filter(block => block.type === 'text')
    const fullText = textBlocks.map((block: any) => block.text).join('')

    // Extract JSON array from the response
    const jsonMatch = fullText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('No JSON array found in response:', fullText)
      return Response.json({ error: 'Agent did not return structured results' }, { status: 500 })
    }

    let leads
    try {
      leads = JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('Failed to parse JSON:', jsonMatch[0])
      return Response.json({ error: 'Agent returned malformed JSON' }, { status: 500 })
    }

    if (!Array.isArray(leads)) {
      return Response.json({ error: 'Agent did not return an array' }, { status: 500 })
    }

    // Ensure table and source_url column exist
    await sql`
      CREATE TABLE IF NOT EXISTS opportunity_watch_leads (
        id SERIAL PRIMARY KEY,
        trade TEXT NOT NULL,
        location TEXT NOT NULL,
        platform TEXT,
        summary TEXT,
        decision TEXT,
        decision_reasoning TEXT,
        urgency_score INTEGER,
        lead_location TEXT,
        outreach_message TEXT,
        source_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    await sql`ALTER TABLE opportunity_watch_leads ADD COLUMN IF NOT EXISTS source_url TEXT`

    for (const lead of leads) {
      await sql`
        INSERT INTO opportunity_watch_leads (
          trade, location, platform, summary, decision,
          decision_reasoning, urgency_score, lead_location,
          outreach_message, source_url
        ) VALUES (
          ${trade}, ${location}, ${lead.platform}, ${lead.summary},
          ${lead.decision}, ${lead.decision_reasoning}, ${lead.urgency_score},
          ${lead.location || null}, ${lead.outreach_message || null},
          ${lead.source_url || null}
        )
      `
    }

    return Response.json({ success: true, leads })
  } catch (error) {
    console.error('OpportunityWatch V2 error:', error)
    return Response.json({ error: 'Agent failed' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { fetchPost } from '@/lib/self-prospecting/fetcher'
import { scoreProspect, scoreBand } from '@/lib/self-prospecting/scorer'
import { draftReply } from '@/lib/self-prospecting/drafter'
import { insertProspect } from '@/lib/self-prospecting/db'

interface IngestBody {
  url: string
  postText?: string
  platform?: string | null
  subreddit?: string | null
  author?: string | null
  postedAt?: string | null
}

export async function POST(req: Request) {
  let body: IngestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.url || typeof body.url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  // 1. Try to fetch the post. If fetch fails, fall back to user-pasted text.
  let text = ''
  let author: string | null = body.author ?? null
  let subreddit: string | null = body.subreddit ?? null
  let postedAt: string | null = body.postedAt ?? null
  let platform: string | null = body.platform ?? null
  let fetchNote: string | null = null

  const fetched = await fetchPost(body.url)
  if (fetched.ok) {
    text = fetched.text
    author = fetched.author ?? author
    subreddit = fetched.subreddit ?? subreddit
    postedAt = fetched.postedAt ?? postedAt
    platform = platform ?? fetched.platform
  } else {
    fetchNote = fetched.reason
    if (!body.postText || !body.postText.trim()) {
      return NextResponse.json(
        {
          error: `Could not fetch the URL automatically: ${fetched.reason}`,
          hint: 'Paste the post text into the postText field and resubmit.',
        },
        { status: 422 },
      )
    }
    text = body.postText.trim()
  }

  if (!text) {
    return NextResponse.json({ error: 'No post text available to score' }, { status: 422 })
  }

  // 2. Score
  const score = scoreProspect({ text, postedAt })
  const band = scoreBand(score.total)

  // 3. Draft (only if score warrants it). Below the cold threshold we skip
  // the Haiku call to avoid burning tokens on noise.
  let draftedMessage: string | null = null
  let noMentionMode = false
  let subredditNote: string | null = null

  if (band !== 'discard') {
    try {
      const draft = await draftReply({
        postText: text,
        author,
        subreddit,
        matchedKeywords: score.matchedKeywords,
        platform,
      })
      draftedMessage = draft.message
      noMentionMode = draft.noMentionMode
      subredditNote = draft.rule.note
    } catch (err) {
      // Don't fail the whole request if drafting fails — the score still
      // saves and Todd can rescore later.
      console.error('drafter failed:', err)
      subredditNote = `Draft failed: ${err instanceof Error ? err.message : 'unknown error'}`
    }
  } else {
    subredditNote = 'Score below cold threshold — no draft generated'
  }

  // 4. Save (deduped on source_url; updates if exists)
  const excerpt = text.length > 400 ? text.slice(0, 400).trim() + '…' : text
  let row
  try {
    row = await insertProspect({
      sourceUrl: body.url,
      sourcePlatform: platform,
      subreddit,
      author,
      postExcerpt: excerpt,
      postFullText: text,
      postedAt,
      score,
      draftedMessage,
      noMentionMode,
      subredditNote,
    })
  } catch (err) {
    console.error('insertProspect failed:', err)
    return NextResponse.json(
      { error: 'Database write failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    prospect: row,
    band,
    fetchNote,
  })
}

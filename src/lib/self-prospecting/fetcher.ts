// Best-effort URL fetcher for self-prospecting.
// Reddit URLs are fetched via the unauth `.json` endpoint. Anything else is
// returned as { ok: false } and the caller falls back to manually-pasted text.
//
// Reddit ToS: this is a manual lookup tool (not a polling scraper). One fetch
// per Todd-pasted URL. We still send a polite User-Agent.

const UA = 'BaraTrust-SelfProspecting/1.0 (manual lookup, contact: todd@baratrust.com)'

export interface FetchedPost {
  ok: true
  text: string
  author: string | null
  subreddit: string | null
  postedAt: string | null
  platform: 'reddit' | 'unknown'
}

export interface FetchFailure {
  ok: false
  reason: string
}

export type FetchResult = FetchedPost | FetchFailure

function isRedditUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return /(^|\.)reddit\.com$/.test(u.hostname)
  } catch {
    return false
  }
}

function toRedditJsonUrl(url: string): string {
  const u = new URL(url)
  // Normalize to www.reddit.com and append .json (Reddit serves JSON for any
  // post URL with .json suffixed before the query string).
  u.hostname = 'www.reddit.com'
  // Strip trailing slash, append .json
  const path = u.pathname.replace(/\/$/, '')
  u.pathname = `${path}.json`
  // Keep query but drop fragments
  u.hash = ''
  return u.toString()
}

interface RedditChildData {
  title?: string
  selftext?: string
  body?: string
  author?: string
  subreddit?: string
  created_utc?: number
}
interface RedditListing {
  data?: { children?: { data?: RedditChildData }[] }
}

async function fetchReddit(url: string): Promise<FetchResult> {
  const jsonUrl = toRedditJsonUrl(url)
  let res: Response
  try {
    res = await fetch(jsonUrl, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      // Reddit can be slow; bound the wait.
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
  } catch (err) {
    return { ok: false, reason: `Reddit fetch failed: ${err instanceof Error ? err.message : 'network error'}` }
  }
  if (!res.ok) {
    return { ok: false, reason: `Reddit returned HTTP ${res.status}. Post may be deleted, private, or rate-limited. Paste the post text manually.` }
  }
  let body: unknown
  try {
    body = await res.json()
  } catch {
    return { ok: false, reason: 'Reddit returned non-JSON. Paste the post text manually.' }
  }

  // Reddit returns either a single listing (e.g. user page) or an array
  // [postListing, commentListing] for a post permalink.
  const listings: RedditListing[] = Array.isArray(body)
    ? (body as RedditListing[])
    : [body as RedditListing]

  const post = listings[0]?.data?.children?.[0]?.data
  if (!post) {
    return { ok: false, reason: 'Reddit JSON had no post data. Paste the text manually.' }
  }

  // For a post permalink: title + selftext. For a comment permalink: body.
  const title = post.title?.trim() ?? ''
  const selftext = post.selftext?.trim() ?? ''
  const commentBody = post.body?.trim() ?? ''
  const text = [title, selftext, commentBody].filter(Boolean).join('\n\n').trim()

  if (!text) {
    return { ok: false, reason: 'Post had no text body (e.g. image-only post). Paste any visible context manually.' }
  }

  const postedAt = post.created_utc
    ? new Date(post.created_utc * 1000).toISOString()
    : null

  return {
    ok: true,
    text,
    author: post.author ?? null,
    subreddit: post.subreddit ?? null,
    postedAt,
    platform: 'reddit',
  }
}

export async function fetchPost(url: string): Promise<FetchResult> {
  if (!url) return { ok: false, reason: 'URL is empty.' }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, reason: 'Not a valid URL.' }
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return { ok: false, reason: 'Only http(s) URLs are supported.' }
  }
  if (isRedditUrl(url)) return fetchReddit(url)
  return {
    ok: false,
    reason: 'Auto-fetch is only supported for Reddit URLs. Paste the post text into the form for any other platform.',
  }
}

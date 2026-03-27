// Publish a single social post to its platform
// Supports: Twitter (OAuth 1.0a), LinkedIn (OAuth 2.0)

import { createServerSupabaseClient } from '@/lib/supabase'
import crypto from 'crypto'

function verifyOwner(request: Request): boolean {
  const pw = request.headers.get('x-owner-password')
  return pw === (process.env.OWNER_PASSWORD ?? 'council2024')
}

// ─── Twitter OAuth 1.0a ───────────────────────────────────────────────────────

function buildTwitterAuthHeader(method: string, url: string): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: process.env.TWITTER_API_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.TWITTER_ACCESS_TOKEN!,
    oauth_version: '1.0',
  }

  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join('&')

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&')

  const signingKey = `${encodeURIComponent(process.env.TWITTER_API_SECRET!!)}&${encodeURIComponent(process.env.TWITTER_ACCESS_TOKEN_SECRET!!)}`
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')

  const allParams = { ...oauthParams, oauth_signature: signature }
  return (
    'OAuth ' +
    Object.keys(allParams)
      .sort()
      .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(allParams[k])}"`)
      .join(', ')
  )
}

async function postToTwitter(text: string, hashtags: string[]): Promise<{ id: string }> {
  const fullText = hashtags.length > 0
    ? `${text}\n\n${hashtags.map(h => `#${h}`).join(' ')}`
    : text

  // Truncate to 280 chars if needed
  const truncated = fullText.length > 280 ? fullText.slice(0, 277) + '...' : fullText

  const url = 'https://api.twitter.com/2/tweets'
  const authHeader = buildTwitterAuthHeader('POST', url)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ text: truncated }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Twitter API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return { id: data.data.id }
}

// ─── LinkedIn UGC Posts ───────────────────────────────────────────────────────

async function postToLinkedIn(text: string, hashtags: string[]): Promise<{ id: string }> {
  const fullText = hashtags.length > 0
    ? `${text}\n\n${hashtags.map(h => `#${h}`).join(' ')}`
    : text

  const personUrn = process.env.LINKEDIN_PERSON_URN!

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${personUrn}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: fullText },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LinkedIn API error ${res.status}: ${err}`)
  }

  const postId = res.headers.get('x-restli-id') ?? 'unknown'
  return { id: postId }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!verifyOwner(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabaseClient()

  try {
    // Fetch the post
    const { data: post, error: fetchError } = await supabase
      .from('social_posts')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !post) {
      return Response.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.status === 'posted') {
      return Response.json({ error: 'Already posted' }, { status: 400 })
    }

    let platformId: string

    if (post.platform === 'twitter') {
      if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_ACCESS_TOKEN) {
        return Response.json({ error: 'Twitter credentials not configured' }, { status: 400 })
      }
      const result = await postToTwitter(post.post_text, post.hashtags ?? [])
      platformId = result.id

      await supabase
        .from('social_posts')
        .update({ status: 'posted', posted_at: new Date().toISOString(), twitter_post_id: platformId })
        .eq('id', params.id)

    } else if (post.platform === 'linkedin') {
      if (!process.env.LINKEDIN_ACCESS_TOKEN || !process.env.LINKEDIN_PERSON_URN) {
        return Response.json({ error: 'LinkedIn credentials not configured' }, { status: 400 })
      }
      const result = await postToLinkedIn(post.post_text, post.hashtags ?? [])
      platformId = result.id

      await supabase
        .from('social_posts')
        .update({ status: 'posted', posted_at: new Date().toISOString(), linkedin_post_id: platformId })
        .eq('id', params.id)

    } else {
      return Response.json({ error: `Platform ${post.platform} not yet supported for direct publishing` }, { status: 400 })
    }

    console.log(`[social/publish] posted to ${post.platform}: ${platformId}`)

    return Response.json({ ok: true, platform: post.platform, platform_id: platformId })

  } catch (err) {
    console.error('[social/publish]', err)

    // Mark as failed in DB
    await supabase
      .from('social_posts')
      .update({ status: 'failed', error_message: String(err) })
      .eq('id', params.id)

    return Response.json({ error: String(err) }, { status: 500 })
  }
}

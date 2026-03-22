// Client-side analytics tracking
// Generates a session ID stored in sessionStorage and fires events to /api/analytics/track

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem('_ic_session')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('_ic_session', id)
  }
  return id
}

export function trackEvent(
  eventType: string,
  options: {
    page?: string
    feature?: string
    metadata?: Record<string, unknown>
    durationMs?: number
  } = {}
) {
  if (typeof window === 'undefined') return
  const payload = {
    event_type: eventType,
    page: options.page ?? window.location.pathname,
    feature: options.feature,
    metadata: options.metadata,
    session_id: getSessionId(),
    duration_ms: options.durationMs,
  }
  // Fire and forget — don't await
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {}) // silently ignore failures
}

export function trackPageView(page: string, metadata?: Record<string, unknown>) {
  trackEvent('page_view', { page, metadata })
}

export function trackFeature(feature: string, metadata?: Record<string, unknown>) {
  trackEvent('feature_used', { feature, metadata })
}

export function trackError(feature: string, error: string) {
  trackEvent('error', { feature, metadata: { error } })
}

// Server-side: log API usage to Supabase (call from API routes)
export async function logApiUsage(supabase: any, options: {
  apiName: string
  endpoint: string
  tokensInput?: number
  tokensOutput?: number
  costUsd?: number
  durationMs?: number
  success?: boolean
  errorMessage?: string
  metadata?: Record<string, unknown>
}) {
  try {
    await supabase.from('api_usage').insert({
      api_name: options.apiName,
      endpoint: options.endpoint,
      tokens_input: options.tokensInput ?? null,
      tokens_output: options.tokensOutput ?? null,
      cost_usd: options.costUsd ?? null,
      duration_ms: options.durationMs ?? null,
      success: options.success ?? true,
      error_message: options.errorMessage ?? null,
      metadata: options.metadata ?? null,
    })
  } catch {} // never let analytics break the main flow
}

// Claude cost estimator (claude-sonnet-4-6 pricing)
export function estimateClaudeCost(inputTokens: number, outputTokens: number): number {
  // claude-sonnet-4-6: $3/M input, $15/M output
  return (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15
}

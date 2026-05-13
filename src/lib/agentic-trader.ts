import { createServerSupabaseClient } from '@/lib/supabase'

export interface ATSignal {
  symbol: string
  funding_rate: number | null
  funding_bias: string | null
  oi_trend: string | null
  oi_change_pct: number | null
  liq_level_long: number | null
  liq_level_short: number | null
  lstm_signal: string | null
  lstm_confidence: number | null
  long_short_ratio: number | null
  updated_at: string
}

export async function fetchATSignals(symbols?: string[]): Promise<ATSignal[]> {
  try {
    const supabase = createServerSupabaseClient()
    let query = supabase
      .from('at_signals')
      .select('*')
      .order('updated_at', { ascending: false })
    if (symbols?.length) query = query.in('symbol', symbols)
    const { data, error } = await query
    if (error || !data?.length) return []
    return data as ATSignal[]
  } catch { return [] }
}

export function formatATSignalsForPrompt(signals: ATSignal[]): string {
  if (!signals.length) return ''
  const lines = signals.map(s => {
    const base = `${s.symbol}: ${s.lstm_signal ?? 'N/A'} | model confidence: ${((s.lstm_confidence ?? 0) * 100).toFixed(0)}%`
    const fundingPart = s.funding_bias != null && s.funding_rate != null
      ? ` | funding: ${s.funding_bias} (${s.funding_rate})`
      : ''
    const oiPart = s.oi_trend != null
      ? ` | OI: ${s.oi_trend}`
      : ''
    return `  ${base}${fundingPart}${oiPart}`
  })
  const age = signals[0]?.updated_at ? ` ${new Date(signals[0].updated_at).toUTCString()}` : ''
  return `\nAGENTIC TRADER SIGNALS — Latest:${age}\n${lines.join('\n')}\n`
}

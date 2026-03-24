'use client'

import { useState, useEffect, useCallback } from 'react'

interface OwnerStats {
  today: {
    page_views: number
    feature_events: number
    api_calls: number
    errors: number
  }
  week: {
    total_events: number
    claude_calls: number
    total_cost_usd: number
    picks_generated: number
  }
  feature_popularity: Array<{ feature: string; count: number; pct: number }>
  top_pages: Array<{ page: string; views: number }>
  picks_performance: {
    win_rate: number
    total_evaluated: number
    options_win_rate: number
    options_evaluated: number
  }
  api_costs: Array<{ api_name: string; calls: number; total_cost: number; avg_cost: number }>
  recent_events: Array<{ created_at: string; event_type: string; page: string | null; feature: string | null; session_id: string | null }>
  recent_errors: Array<{ created_at: string; feature: string | null; metadata: any }>
}

const PASSWORD_KEY = '_ic_owner'

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/owner/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) {
      sessionStorage.setItem(PASSWORD_KEY, pw)
      onLogin()
    } else {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '12px', padding: '40px', width: '320px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔒</div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#111', marginBottom: '4px' }}>Owner Dashboard</div>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '24px' }}>Investment Council</div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              padding: '10px 14px', borderRadius: '8px',
              border: `1px solid ${error ? '#dc2626' : '#e4e4e7'}`,
              fontSize: '14px', fontFamily: 'inherit', outline: 'none',
              background: error ? '#fff5f5' : '#fff',
            }}
          />
          <button type="submit" style={{
            padding: '10px', borderRadius: '8px', border: 'none',
            background: '#111', color: '#fff', fontSize: '13px',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Enter
          </button>
          {error && <div style={{ fontSize: '11px', color: '#dc2626' }}>Incorrect password</div>}
        </form>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color = '#111' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '16px 20px' }}>
      <div style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

export default function OwnerPage() {
  const [authed, setAuthed] = useState(false)
  const [stats, setStats] = useState<OwnerStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem(PASSWORD_KEY)
    if (saved) setAuthed(true)
  }, [])

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/owner/stats')
      if (res.ok) {
        setStats(await res.json())
        setLastUpdated(new Date())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed) loadStats()
  }, [authed, loadStats])

  function handleLogout() {
    sessionStorage.removeItem(PASSWORD_KEY)
    setAuthed(false)
  }

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f5', fontFamily: 'inherit', color: '#111' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e4e4e7', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700 }}>📊 Owner Dashboard</div>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>Investment Council</div>
        {lastUpdated && (
          <div style={{ fontSize: '10px', color: '#9ca3af', marginLeft: 'auto' }}>
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        )}
        <button
          onClick={loadStats}
          disabled={loading}
          style={{ background: '#f4f4f5', border: '1px solid #e4e4e7', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, cursor: loading ? 'default' : 'pointer', color: loading ? '#9ca3af' : '#374151', fontFamily: 'inherit' }}
        >
          {loading ? '↻ Loading...' : '↻ Refresh'}
        </button>
        <button
          onClick={handleLogout}
          style={{ background: 'transparent', border: '1px solid #e4e4e7', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', color: '#9ca3af', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Logout
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        {!stats ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af' }}>Loading metrics...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Today */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.1em', marginBottom: '12px' }}>TODAY</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <StatCard label="PAGE VIEWS" value={stats.today.page_views} color="#2563eb" />
                <StatCard label="FEATURE EVENTS" value={stats.today.feature_events} color="#16a34a" />
                <StatCard label="API CALLS" value={stats.today.api_calls} color="#d97706" />
                <StatCard label="ERRORS" value={stats.today.errors} color={stats.today.errors > 0 ? '#dc2626' : '#9ca3af'} />
              </div>
            </div>

            {/* This week */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.1em', marginBottom: '12px' }}>THIS WEEK</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <StatCard label="TOTAL EVENTS" value={stats.week.total_events} />
                <StatCard label="CLAUDE API CALLS" value={stats.week.claude_calls} color="#6d28d9" />
                <StatCard label="EST. API COST" value={`$${stats.week.total_cost_usd.toFixed(4)}`} color="#d97706" />
                <StatCard label="PICKS GENERATED" value={stats.week.picks_generated} color="#16a34a" />
              </div>
            </div>

            {/* Feature popularity + Top pages */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Feature popularity */}
              <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', marginBottom: '16px' }}>Feature Popularity <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '10px' }}>last 30 days</span></div>
                {stats.feature_popularity.length === 0 ? (
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>No data yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.feature_popularity.slice(0, 10).map(f => (
                      <div key={f.feature} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, fontSize: '11px', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.feature || '(unknown)'}</div>
                        <div style={{ width: '100px', background: '#f0f0f0', borderRadius: '3px', height: '6px' }}>
                          <div style={{ height: '100%', borderRadius: '3px', background: '#2563eb', width: `${f.pct}%` }} />
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280', fontVariantNumeric: 'tabular-nums', width: '40px', textAlign: 'right' }}>{f.count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top pages */}
              <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', marginBottom: '16px' }}>Top Pages <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '10px' }}>last 30 days</span></div>
                {stats.top_pages.length === 0 ? (
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>No data yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.top_pages.slice(0, 10).map(p => (
                      <div key={p.page} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, fontSize: '11px', color: '#374151', fontFamily: 'monospace' }}>{p.page || '/'}</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', fontVariantNumeric: 'tabular-nums' }}>{p.views}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Performance + API Costs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* AI picks performance */}
              <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', marginBottom: '16px' }}>AI Picks Performance</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>STOCK/CRYPTO WIN RATE</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: stats.picks_performance.win_rate >= 55 ? '#16a34a' : stats.picks_performance.win_rate >= 45 ? '#d97706' : '#dc2626' }}>
                      {stats.picks_performance.total_evaluated > 0 ? `${stats.picks_performance.win_rate.toFixed(1)}%` : '—'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>{stats.picks_performance.total_evaluated} evaluated</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.07em', marginBottom: '4px' }}>OPTIONS WIN RATE</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: stats.picks_performance.options_win_rate >= 55 ? '#16a34a' : stats.picks_performance.options_win_rate >= 45 ? '#d97706' : '#dc2626' }}>
                      {stats.picks_performance.options_evaluated > 0 ? `${stats.picks_performance.options_win_rate.toFixed(1)}%` : '—'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>{stats.picks_performance.options_evaluated} evaluated</div>
                  </div>
                </div>
              </div>

              {/* API cost breakdown */}
              <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', marginBottom: '16px' }}>API Cost Breakdown <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '10px' }}>all time</span></div>
                {stats.api_costs.length === 0 ? (
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>No API usage logged yet</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr>
                        {['API', 'Calls', 'Total Cost', 'Avg/Call'].map(h => (
                          <th key={h} style={{ textAlign: h === 'API' ? 'left' : 'right', padding: '4px 8px', color: '#9ca3af', fontWeight: 600, fontSize: '9px', letterSpacing: '0.07em', borderBottom: '1px solid #f0f0f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.api_costs.map(r => (
                        <tr key={r.api_name}>
                          <td style={{ padding: '6px 8px', color: '#374151', fontWeight: 600 }}>{r.api_name}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{r.calls}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', color: '#d97706', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${r.total_cost.toFixed(4)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>${r.avg_cost.toFixed(5)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Recent activity */}
            <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', marginBottom: '16px' }}>Recent Activity <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '10px' }}>last 50 events</span></div>
              {stats.recent_events.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>No events yet</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr>
                        {['Time', 'Event', 'Page', 'Feature', 'Session'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '4px 10px', color: '#9ca3af', fontWeight: 600, fontSize: '9px', letterSpacing: '0.07em', borderBottom: '1px solid #f0f0f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recent_events.map((e, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #fafafa' }}>
                          <td style={{ padding: '5px 10px', color: '#9ca3af', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontSize: '10px' }}>
                            {new Date(e.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td style={{ padding: '5px 10px' }}>
                            <span style={{
                              fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em',
                              color: e.event_type === 'error' ? '#dc2626' : e.event_type === 'page_view' ? '#2563eb' : '#16a34a',
                              background: e.event_type === 'error' ? '#fee2e2' : e.event_type === 'page_view' ? '#dbeafe' : '#dcfce7',
                              borderRadius: '3px', padding: '1px 5px',
                            }}>
                              {e.event_type}
                            </span>
                          </td>
                          <td style={{ padding: '5px 10px', color: '#6b7280', fontFamily: 'monospace', fontSize: '10px' }}>{e.page ?? '—'}</td>
                          <td style={{ padding: '5px 10px', color: '#374151' }}>{e.feature ?? '—'}</td>
                          <td style={{ padding: '5px 10px', color: '#9ca3af', fontFamily: 'monospace', fontSize: '10px' }}>{e.session_id?.slice(0, 8) ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent errors */}
            {stats.recent_errors.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', marginBottom: '16px' }}>⚠️ Recent Errors</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {stats.recent_errors.map((e, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', fontSize: '11px', padding: '8px 10px', background: '#fff5f5', borderRadius: '6px' }}>
                      <div style={{ color: '#9ca3af', whiteSpace: 'nowrap', fontSize: '10px' }}>
                        {new Date(e.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ color: '#6b7280' }}>{e.feature ?? '—'}</div>
                      <div style={{ color: '#dc2626', flex: 1 }}>{e.metadata?.error ?? JSON.stringify(e.metadata)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', paddingBottom: '16px' }}>
              Investment Council · Owner Dashboard · Data from Supabase
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

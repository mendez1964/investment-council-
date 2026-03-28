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
  users: {
    total: number
    free: number
    trader: number
    pro: number
    new_signups_week: number
    sessions_today: number
  }
  feature_popularity: Array<{ feature: string; count: number; pct: number }>
  top_features_week: Array<{ feature: string; count: number }>
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

function LoginScreen({ onLogin }: { onLogin: (pw: string) => void }) {
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
      onLogin(pw)
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

interface ManagedUser {
  id: string
  email: string
  created_at: string
  tier: 'free' | 'trader' | 'pro'
  stripe_customer_id: string | null
  display_name: string | null
  admin_granted: boolean
}

const TIER_COLOR: Record<string, string> = { free: '#6b7280', trader: '#d97706', pro: '#7c3aed' }
const TIER_BG: Record<string, string>    = { free: '#f3f4f6', trader: '#fffbeb', pro: '#f5f3ff' }

function RecentLoginsPanel({ password }: { password: string }) {
  const [users, setUsers] = useState<Array<{
    id: string; email: string; display_name: string | null
    tier: string; created_at: string; last_sign_in_at: string | null
  }>>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'free' | 'trader' | 'pro'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/owner/logins', { headers: { 'x-owner-password': password } })
      .then(r => r.json())
      .then(data => { setUsers(data.users ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = users.filter(u => {
    if (filter !== 'all' && u.tier !== filter) return false
    if (search && !u.email.toLowerCase().includes(search.toLowerCase()) &&
        !(u.display_name ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (mins < 2)   return 'just now'
    if (mins < 60)  return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 30)  return `${days}d ago`
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>User Logins</div>
          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>All accounts sorted by most recent login</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search email..."
            style={{ padding: '5px 10px', fontSize: '11px', border: '1px solid #e4e4e7', borderRadius: '6px', outline: 'none', fontFamily: 'inherit', width: '160px' }}
          />
          {(['all', 'free', 'trader', 'pro'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: '4px 10px', fontSize: '10px', fontWeight: 700, borderRadius: '5px', cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${filter === t ? (t === 'all' ? '#111' : TIER_COLOR[t]) : '#e4e4e7'}`,
                background: filter === t ? (t === 'all' ? '#111' : TIER_BG[t]) : 'transparent',
                color: filter === t ? (t === 'all' ? '#fff' : TIER_COLOR[t]) : '#9ca3af',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: '11px', color: '#9ca3af', padding: '20px 0' }}>Loading...</div>
      ) : (
        <>
          <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '8px' }}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>
                  {['Email', 'Name', 'Tier', 'Last Login', 'Joined'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '5px 10px', color: '#9ca3af', fontWeight: 600, fontSize: '9px', letterSpacing: '0.07em', borderBottom: '1px solid #f0f0f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #fafafa' }}>
                    <td style={{ padding: '7px 10px', color: '#374151', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</td>
                    <td style={{ padding: '7px 10px', color: '#6b7280', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name ?? <span style={{ color: '#d1d5db' }}>—</span>}</td>
                    <td style={{ padding: '7px 10px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: TIER_COLOR[u.tier] ?? '#6b7280', background: TIER_BG[u.tier] ?? '#f3f4f6', borderRadius: '3px', padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {u.tier}
                      </span>
                    </td>
                    <td style={{ padding: '7px 10px', color: u.last_sign_in_at ? '#374151' : '#d1d5db', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : 'never'}
                    </td>
                    <td style={{ padding: '7px 10px', color: '#9ca3af', whiteSpace: 'nowrap', fontSize: '10px' }}>
                      {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function ManageUsers({ password }: { password: string }) {
  const [email, setEmail] = useState('')
  const [found, setFound] = useState<ManagedUser | null>(null)
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedTier, setSavedTier] = useState<string | null>(null)
  const [grantTier, setGrantTier] = useState<'free' | 'trader' | 'pro'>('pro')
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearching(true)
    setFound(null)
    setNotFound(false)
    setSavedTier(null)
    setDeleted(false)
    setConfirmDelete(false)
    const res = await fetch(`/api/owner/users?email=${encodeURIComponent(email)}`, {
      headers: { 'x-owner-password': password },
    })
    setSearching(false)
    if (res.ok) {
      const data = await res.json()
      setFound(data)
      setGrantTier(data.tier === 'free' ? 'pro' : data.tier)
    } else {
      setNotFound(true)
    }
  }

  async function handleGrant() {
    if (!found) return
    setSaving(true)
    const res = await fetch('/api/owner/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-owner-password': password },
      body: JSON.stringify({ user_id: found.id, tier: grantTier }),
    })
    setSaving(false)
    if (res.ok) {
      setSavedTier(grantTier)
      setFound(prev => prev ? { ...prev, tier: grantTier, admin_granted: grantTier !== 'free' } : prev)
    }
  }

  async function handleRevoke() {
    if (!found) return
    setSaving(true)
    const res = await fetch('/api/owner/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-owner-password': password },
      body: JSON.stringify({ user_id: found.id, tier: 'free' }),
    })
    setSaving(false)
    if (res.ok) {
      setSavedTier('free')
      setFound(prev => prev ? { ...prev, tier: 'free', admin_granted: false } : prev)
    }
  }

  async function handleDelete() {
    if (!found) return
    setDeleting(true)
    const res = await fetch('/api/owner/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-owner-password': password },
      body: JSON.stringify({ user_id: found.id }),
    })
    setDeleting(false)
    if (res.ok) {
      setDeleted(true)
      setFound(null)
      setConfirmDelete(false)
    }
  }

  const tierColor = (t: string) => t === 'pro' ? '#7c3aed' : t === 'trader' ? '#d97706' : '#6b7280'

  return (
    <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '20px' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', marginBottom: '4px' }}>Manage Users</div>
      <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '16px' }}>Grant or revoke tier access. Delete accounts permanently. Admin-granted users get full IC chat access without API key expiry.</div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="user@email.com"
          required
          style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #e4e4e7', fontSize: '12px', fontFamily: 'inherit', outline: 'none' }}
        />
        <button type="submit" disabled={searching} style={{
          padding: '8px 16px', borderRadius: '6px', border: 'none',
          background: '#111', color: '#fff', fontSize: '12px', fontWeight: 600,
          cursor: searching ? 'default' : 'pointer', fontFamily: 'inherit',
        }}>
          {searching ? 'Searching...' : 'Find User'}
        </button>
      </form>

      {notFound && (
        <div style={{ fontSize: '12px', color: '#dc2626', padding: '10px 14px', background: '#fff5f5', borderRadius: '6px' }}>
          No user found with that email address.
        </div>
      )}

      {deleted && (
        <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, padding: '10px 14px', background: '#fff5f5', borderRadius: '6px' }}>
          User account has been permanently deleted.
        </div>
      )}

      {found && (
        <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>{found.email}</div>
              {found.display_name && <div style={{ fontSize: '11px', color: '#6b7280' }}>{found.display_name}</div>}
              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                Joined {new Date(found.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: tierColor(found.tier), textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{found.tier}</div>
              {found.admin_granted && <div style={{ fontSize: '9px', color: '#7c3aed', background: '#ede9fe', borderRadius: '3px', padding: '1px 5px', marginTop: '3px' }}>Admin Granted</div>}
              {found.stripe_customer_id && <div style={{ fontSize: '9px', color: '#16a34a', background: '#dcfce7', borderRadius: '3px', padding: '1px 5px', marginTop: '3px' }}>Stripe Subscriber</div>}
            </div>
          </div>

          {savedTier ? (
            <div style={{ fontSize: '12px', color: savedTier === 'free' ? '#d97706' : '#16a34a', fontWeight: 600, padding: '8px 12px', background: savedTier === 'free' ? '#fffbeb' : '#f0fdf4', borderRadius: '6px' }}>
              {savedTier === 'free'
                ? `✓ Access revoked — ${found.email} has been set back to Free.`
                : `✓ Access granted — ${found.email} is now on the ${savedTier} plan with full IC chat access.`}
            </div>
          ) : (
            <>
              {/* Grant tier row */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#374151', fontWeight: 600 }}>Grant tier:</div>
                {(['free', 'trader', 'pro'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setGrantTier(t)}
                    style={{
                      padding: '4px 12px', borderRadius: '5px', border: `1px solid ${grantTier === t ? tierColor(t) : '#e4e4e7'}`,
                      background: grantTier === t ? `${tierColor(t)}15` : 'transparent',
                      color: grantTier === t ? tierColor(t) : '#6b7280',
                      fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                    }}
                  >
                    {t}
                  </button>
                ))}
                <button
                  onClick={handleGrant}
                  disabled={saving || grantTier === found.tier}
                  style={{
                    marginLeft: 'auto', padding: '6px 16px', borderRadius: '6px', border: 'none',
                    background: grantTier === found.tier ? '#f0f0f0' : '#7c3aed',
                    color: grantTier === found.tier ? '#9ca3af' : '#fff',
                    fontSize: '12px', fontWeight: 700, cursor: saving || grantTier === found.tier ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {saving ? 'Saving...' : grantTier === found.tier ? 'Already on this tier' : `Grant ${grantTier} access`}
                </button>
              </div>

              {/* Revoke / Delete row */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f4f4f5' }}>
                {found.tier !== 'free' && (
                  <button
                    onClick={handleRevoke}
                    disabled={saving}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', border: '1px solid #d97706',
                      background: 'transparent', color: '#d97706',
                      fontSize: '11px', fontWeight: 700, cursor: saving ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {saving ? 'Saving...' : 'Revoke Access → Free'}
                  </button>
                )}
                <div style={{ marginLeft: 'auto' }}>
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      style={{
                        padding: '6px 14px', borderRadius: '6px', border: '1px solid #fecaca',
                        background: 'transparent', color: '#dc2626',
                        fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Delete Account
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>Permanently delete {found.email}?</div>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{
                          padding: '5px 12px', borderRadius: '5px', border: 'none',
                          background: '#dc2626', color: '#fff',
                          fontSize: '11px', fontWeight: 700, cursor: deleting ? 'default' : 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {deleting ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        style={{
                          padding: '5px 12px', borderRadius: '5px', border: '1px solid #e4e4e7',
                          background: 'transparent', color: '#6b7280',
                          fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface AffiliateRow {
  user_id: string
  email: string
  code: string
  total: number
  converted: number
  paid: number
  pending_credit: number
}

interface ReferralRow {
  id: string
  referrer_id: string
  referred_user_id: string | null
  referrer_email: string
  referred_email: string | null
  code: string
  status: string
  converted_at: string | null
  paid_at: string | null
  created_at: string
}

function AffiliatesPanel({ password }: { password: string }) {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([])
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/owner/affiliates', { headers: { 'x-owner-password': password } })
    if (res.ok) {
      const data = await res.json()
      setAffiliates(data.affiliates ?? [])
      setReferrals(data.referrals ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function markPaid(referralId: string) {
    await fetch('/api/owner/affiliates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-owner-password': password },
      body: JSON.stringify({ referral_id: referralId }),
    })
    load()
  }

  const totalReferrers  = affiliates.length
  const totalReferrals  = referrals.length
  const totalConverted  = referrals.filter(r => r.status === 'converted' || r.status === 'paid').length
  const totalPending    = referrals.filter(r => r.status === 'pending').length

  const statusColor = (s: string) =>
    s === 'converted' ? '#16a34a' : s === 'paid' ? '#2563eb' : '#d97706'
  const statusBg = (s: string) =>
    s === 'converted' ? '#dcfce7' : s === 'paid' ? '#dbeafe' : '#fffbeb'

  return (
    <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>Affiliates & Referrals</div>
          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>Only counts after first real payment — not trial starts</div>
        </div>
        <button
          onClick={load}
          style={{ background: '#f4f4f5', border: '1px solid #e4e4e7', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ fontSize: '11px', color: '#9ca3af', padding: '20px 0' }}>Loading...</div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'REFERRERS', value: totalReferrers, color: '#111' },
              { label: 'TOTAL CLICKS', value: totalReferrals, color: '#6b7280' },
              { label: 'CONVERTED (PAID)', value: totalConverted, color: '#16a34a' },
              { label: 'PENDING TRIAL', value: totalPending, color: '#d97706' },
            ].map(s => (
              <div key={s.label} style={{ background: '#f9fafb', border: '1px solid #f0f0f0', borderRadius: '8px', padding: '12px 16px' }}>
                <div style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Affiliates table */}
          {affiliates.length === 0 ? (
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '20px' }}>No referral codes generated yet.</div>
          ) : (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '8px' }}>ALL REFERRERS</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr>
                    {['Email', 'Code', 'Clicks', 'Converted', 'Pending Credit'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Email' ? 'left' : 'right', padding: '5px 10px', color: '#9ca3af', fontWeight: 600, fontSize: '9px', letterSpacing: '0.07em', borderBottom: '1px solid #f0f0f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {affiliates.map(a => (
                    <tr key={a.user_id} style={{ borderBottom: '1px solid #fafafa' }}>
                      <td style={{ padding: '7px 10px', color: '#374151', fontWeight: 600 }}>{a.email}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#7c3aed', fontWeight: 700, letterSpacing: '0.08em' }}>{a.code}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{a.total}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#16a34a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{a.converted}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                        {a.pending_credit > 0 ? (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', padding: '2px 7px' }}>
                            {a.pending_credit} mo
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Referrals log */}
          {referrals.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: '8px' }}>REFERRAL LOG</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr>
                    {['Date', 'Referrer', 'Referred', 'Status', 'Converted', ''].map(h => (
                      <th key={h} style={{ textAlign: h === '' ? 'right' : 'left', padding: '5px 10px', color: '#9ca3af', fontWeight: 600, fontSize: '9px', letterSpacing: '0.07em', borderBottom: '1px solid #f0f0f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {referrals.slice(0, 50).map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #fafafa' }}>
                      <td style={{ padding: '6px 10px', color: '#9ca3af', fontSize: '10px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '6px 10px', fontSize: '11px', color: '#374151', fontWeight: 600, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.referrer_email}
                      </td>
                      <td style={{ padding: '6px 10px', fontSize: '11px', color: '#6b7280', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.referred_email ?? <span style={{ color: '#d1d5db' }}>pending signup</span>}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: statusColor(r.status), background: statusBg(r.status), borderRadius: '3px', padding: '1px 6px' }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', color: '#6b7280', fontSize: '10px', whiteSpace: 'nowrap' }}>
                        {r.converted_at ? new Date(r.converted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                        {r.status === 'converted' && (
                          <button
                            onClick={() => markPaid(r.id)}
                            style={{ fontSize: '9px', fontWeight: 700, color: '#2563eb', background: 'transparent', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Mark Paid
                          </button>
                        )}
                        {r.status === 'paid' && (
                          <span style={{ fontSize: '9px', color: '#9ca3af' }}>
                            {r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'paid'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const OWNER_TABS = [
  { id: 'overview',   label: '📊 Overview' },
  { id: 'users',      label: '👥 Users' },
  { id: 'affiliates', label: '🔗 Affiliates' },
  { id: 'social',     label: '📣 Social' },
]

export default function OwnerPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPasswordState] = useState('')
  const [stats, setStats] = useState<OwnerStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const saved = sessionStorage.getItem(PASSWORD_KEY)
    if (saved) { setAuthed(true); setPasswordState(saved) }
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
    setPasswordState('')
  }

  if (!authed) return <LoginScreen onLogin={(pw) => { setAuthed(true); setPasswordState(pw) }} />

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

      {/* Tab nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e4e4e7', padding: '0 32px', display: 'flex', gap: '4px' }}>
        {OWNER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px', fontSize: '12px', fontWeight: 600,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', borderBottom: `2px solid ${activeTab === tab.id ? '#111' : 'transparent'}`,
              color: activeTab === tab.id ? '#111' : '#9ca3af',
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        {!stats ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af' }}>Loading metrics...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Today — Overview tab */}
            {activeTab === 'overview' && <>
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

            {/* Users */}
            {stats.users && (
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.1em', marginBottom: '12px' }}>USERS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
                  <StatCard label="TOTAL USERS" value={stats.users.total ?? 0} color="#111" />
                  <StatCard label="FREE" value={stats.users.free ?? 0} color="#6b7280" />
                  <StatCard label="TRADER" value={stats.users.trader ?? 0} color="#d97706" />
                  <StatCard label="PRO" value={stats.users.pro ?? 0} color="#7c3aed" />
                  <StatCard label="NEW THIS WEEK" value={stats.users.new_signups_week ?? 0} color="#16a34a" sub="approx. from login events" />
                  <StatCard label="SESSIONS TODAY" value={stats.users.sessions_today ?? 0} color="#2563eb" />
                </div>
              </div>
            )}

            </>}

            {/* Users tab */}
            {activeTab === 'users' && <>
            <RecentLoginsPanel password={password} />
            <ManageUsers password={password} />

            {/* Top features this week */}
            <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', marginBottom: '16px' }}>
                User Behavior — Top Features This Week
                <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '10px', marginLeft: '8px' }}>what users are doing most</span>
              </div>
              {(stats.top_features_week ?? []).length === 0 ? (
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>No feature events this week</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 32px' }}>
                  {(stats.top_features_week ?? []).map((f, i) => {
                    const max = (stats.top_features_week ?? [])[0]?.count ?? 1
                    const pct = Math.round((f.count / max) * 100)
                    return (
                      <div key={f.feature} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '18px', fontSize: '10px', color: '#9ca3af', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</div>
                        <div style={{ flex: 1, fontSize: '11px', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.feature || '(unknown)'}</div>
                        <div style={{ width: '80px', background: '#f0f0f0', borderRadius: '3px', height: '6px' }}>
                          <div style={{ height: '100%', borderRadius: '3px', background: '#7c3aed', width: `${pct}%` }} />
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', fontVariantNumeric: 'tabular-nums', width: '32px', textAlign: 'right' }}>{f.count}</div>
                      </div>
                    )
                  })}
                </div>
              )}
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

            </>}

            {/* Affiliates tab */}
            {activeTab === 'affiliates' && <AffiliatesPanel password={password} />}

            {/* Social tab */}
            {activeTab === 'social' && <SocialPanel password={password} />}

            <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', paddingBottom: '16px' }}>
              Investment Council · Owner Dashboard · Data from Supabase
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Social Media Engine Panel ────────────────────────────────────────────────

interface SocialPost {
  id: string
  platform: string
  theme: string
  post_text: string
  hashtags: string[]
  status: string
  scheduled_at: string | null
  posted_at: string | null
  created_at: string
  error_message: string | null
}

const PLATFORM_COLOR: Record<string, string> = {
  twitter: '#1d9bf0',
  linkedin: '#0a66c2',
  medium: '#000000',
  reddit: '#ff4500',
}

const PLATFORM_LABEL: Record<string, string> = {
  twitter: 'Twitter/X',
  linkedin: 'LinkedIn',
  medium: 'Medium',
  reddit: 'Reddit',
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#9ca3af',
  approved: '#d97706',
  scheduled: '#2563eb',
  posted: '#16a34a',
  failed: '#dc2626',
}

function SocialPanel({ password }: { password: string }) {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [summary, setSummary] = useState({ pending: 0, approved: 0, scheduled: 0, posted: 0, failed: 0 })
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [schedulingId, setSchedulingId] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [publishingId, setPublishingId] = useState<string | null>(null)

  const loadPosts = useCallback(async (statusFilter = filter) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/social/posts?status=${statusFilter}&limit=30`, {
        headers: { 'x-owner-password': password },
      })
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts ?? [])
        setSummary(data.summary ?? summary)
      }
    } finally {
      setLoading(false)
    }
  }, [filter, password, summary])

  useEffect(() => { loadPosts() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    setGenerating(true)
    setGenResult(null)
    try {
      const res = await fetch('/api/admin/social/generate', {
        method: 'POST',
        headers: { 'x-owner-password': password },
      })
      const data = await res.json()
      if (res.ok) {
        setGenResult(`Generated ${data.generated} posts from picks data`)
        await loadPosts('pending')
        setFilter('pending')
      } else {
        setGenResult(`Error: ${data.error}`)
      }
    } finally {
      setGenerating(false)
    }
  }

  async function handleApprove(id: string) {
    await fetch(`/api/admin/social/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-owner-password': password },
      body: JSON.stringify({ status: 'approved' }),
    })
    await loadPosts()
  }

  async function handleReject(id: string) {
    await fetch(`/api/admin/social/posts/${id}`, {
      method: 'DELETE',
      headers: { 'x-owner-password': password },
    })
    await loadPosts()
  }

  async function handleSaveEdit(id: string) {
    await fetch(`/api/admin/social/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-owner-password': password },
      body: JSON.stringify({ post_text: editText }),
    })
    setEditingId(null)
    await loadPosts()
  }

  async function handleSchedule(id: string) {
    if (!scheduleDate) return
    await fetch(`/api/admin/social/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-owner-password': password },
      body: JSON.stringify({ status: 'scheduled', scheduled_at: new Date(scheduleDate).toISOString() }),
    })
    setSchedulingId(null)
    setScheduleDate('')
    await loadPosts()
  }

  async function handlePublishNow(id: string) {
    setPublishingId(id)
    try {
      const res = await fetch(`/api/admin/social/publish/${id}`, {
        method: 'POST',
        headers: { 'x-owner-password': password },
      })
      const data = await res.json()
      if (!res.ok) alert(`Publish failed: ${data.error}`)
      await loadPosts()
    } finally {
      setPublishingId(null)
    }
  }

  const filters = ['pending', 'approved', 'scheduled', 'posted', 'failed', 'all']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.1em' }}>SOCIAL MEDIA ENGINE</div>

      {/* Summary + Generate */}
      <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: '10px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' as const, marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>Auto-Promotion Posts</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
            {Object.entries(summary).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUS_COLOR[status] ?? '#9ca3af' }} />
                <span style={{ fontSize: '11px', color: '#6b7280' }}>{status}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>{count}</span>
              </div>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => loadPosts()}
              disabled={loading}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #e4e4e7', background: 'transparent', color: '#6b7280', fontSize: '11px', fontWeight: 600, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit' }}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: generating ? '#9ca3af' : '#111', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: generating ? 'default' : 'pointer', fontFamily: 'inherit' }}
            >
              {generating ? 'Generating...' : 'Generate Posts'}
            </button>
          </div>
        </div>

        {genResult && (
          <div style={{ fontSize: '11px', padding: '8px 12px', borderRadius: '6px', background: genResult.startsWith('Error') ? '#fff5f5' : '#f0fdf4', color: genResult.startsWith('Error') ? '#dc2626' : '#16a34a', marginBottom: '12px' }}>
            {genResult}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          {filters.map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); loadPosts(f) }}
              style={{
                padding: '4px 12px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' as const,
                background: filter === f ? '#111' : '#f4f4f5',
                color: filter === f ? '#fff' : '#6b7280',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Post cards */}
        {posts.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#9ca3af', padding: '24px', textAlign: 'center' }}>
            {filter === 'pending' ? 'No pending posts — click Generate Posts to create some' : `No ${filter} posts`}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {posts.map(post => (
              <div key={post.id} style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff', background: PLATFORM_COLOR[post.platform] ?? '#111', borderRadius: '4px', padding: '2px 7px' }}>
                    {PLATFORM_LABEL[post.platform] ?? post.platform}
                  </span>
                  <span style={{ fontSize: '10px', color: '#9ca3af', background: '#f4f4f5', borderRadius: '4px', padding: '2px 7px' }}>
                    {post.theme.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: STATUS_COLOR[post.status] ?? '#9ca3af', marginLeft: 'auto' }}>
                    {post.status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '9px', color: '#9ca3af' }}>
                    {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {/* Post text */}
                {editingId === post.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={4}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #2563eb', fontSize: '12px', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' as const }}
                    />
                    <div style={{ fontSize: '10px', color: editText.length > 280 ? '#dc2626' : '#9ca3af' }}>{editText.length} chars {post.platform === 'twitter' && editText.length > 280 ? '— over Twitter limit' : ''}</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleSaveEdit(post.id)} style={{ padding: '5px 14px', borderRadius: '5px', border: 'none', background: '#111', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '5px 12px', borderRadius: '5px', border: '1px solid #e4e4e7', background: 'transparent', color: '#6b7280', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{post.post_text}</div>
                )}

                {/* Hashtags */}
                {post.hashtags?.length > 0 && editingId !== post.id && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                    {post.hashtags.map(h => (
                      <span key={h} style={{ fontSize: '10px', color: '#2563eb', background: '#eff6ff', borderRadius: '4px', padding: '2px 7px' }}>#{h}</span>
                    ))}
                  </div>
                )}

                {/* Schedule input */}
                {schedulingId === post.id && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      style={{ padding: '5px 8px', borderRadius: '5px', border: '1px solid #e4e4e7', fontSize: '11px', fontFamily: 'inherit', outline: 'none' }}
                    />
                    <button onClick={() => handleSchedule(post.id)} style={{ padding: '5px 12px', borderRadius: '5px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Schedule</button>
                    <button onClick={() => setSchedulingId(null)} style={{ padding: '5px 10px', borderRadius: '5px', border: '1px solid #e4e4e7', background: 'transparent', color: '#6b7280', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  </div>
                )}

                {/* Scheduled time display */}
                {post.scheduled_at && post.status === 'scheduled' && (
                  <div style={{ fontSize: '10px', color: '#2563eb' }}>
                    Scheduled: {new Date(post.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                {/* Posted info */}
                {post.status === 'posted' && post.posted_at && (
                  <div style={{ fontSize: '10px', color: '#16a34a' }}>
                    Posted: {new Date(post.posted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                {/* Error */}
                {post.error_message && (
                  <div style={{ fontSize: '10px', color: '#dc2626', background: '#fff5f5', padding: '6px 8px', borderRadius: '4px' }}>{post.error_message}</div>
                )}

                {/* Actions */}
                {post.status !== 'posted' && editingId !== post.id && schedulingId !== post.id && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, paddingTop: '4px', borderTop: '1px solid #f4f4f5' }}>
                    {post.status === 'pending' && (
                      <button onClick={() => handleApprove(post.id)} style={{ padding: '4px 12px', borderRadius: '5px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Approve</button>
                    )}
                    {(post.status === 'pending' || post.status === 'approved') && (
                      <>
                        <button
                          onClick={() => { setEditingId(post.id); setEditText(post.post_text) }}
                          style={{ padding: '4px 12px', borderRadius: '5px', border: '1px solid #e4e4e7', background: 'transparent', color: '#374151', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { setSchedulingId(post.id); setScheduleDate('') }}
                          style={{ padding: '4px 12px', borderRadius: '5px', border: '1px solid #2563eb', background: 'transparent', color: '#2563eb', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Schedule
                        </button>
                        <button
                          onClick={() => handlePublishNow(post.id)}
                          disabled={publishingId === post.id}
                          style={{ padding: '4px 12px', borderRadius: '5px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: publishingId === post.id ? 'default' : 'pointer', fontFamily: 'inherit' }}
                        >
                          {publishingId === post.id ? 'Posting...' : 'Post Now'}
                        </button>
                      </>
                    )}
                    {post.status === 'scheduled' && (
                      <button
                        onClick={() => handlePublishNow(post.id)}
                        disabled={publishingId === post.id}
                        style={{ padding: '4px 12px', borderRadius: '5px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: publishingId === post.id ? 'default' : 'pointer', fontFamily: 'inherit' }}
                      >
                        {publishingId === post.id ? 'Posting...' : 'Post Now'}
                      </button>
                    )}
                    <button
                      onClick={() => handleReject(post.id)}
                      style={{ padding: '4px 12px', borderRadius: '5px', border: '1px solid #fecaca', background: 'transparent', color: '#dc2626', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from '@/navigation'

const YES_OPTIONS   = ['Yes', 'Somewhat', 'No']
const DAILY_OPTIONS = ['Yes', 'Maybe', 'Not yet']
const REC_OPTIONS   = ['Yes', 'Maybe', 'No']
const FEATURES      = ['AI Picks', 'AI Chat', 'AI Battle', 'Options Picks', 'Market Guardian', 'Morning Briefing', 'Fear & Greed', 'BTC Dashboard', 'Other']

function ChoiceButton({ label, selected, onClick, color = '#2563eb' }: { label: string; selected: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: 'pointer',
        border: `2px solid ${selected ? color : '#e5e7eb'}`,
        background: selected ? `${color}12` : '#fafafa',
        color: selected ? color : '#6b7280',
        fontFamily: 'inherit', transition: 'all 0.12s',
      }}
    >
      {label}
    </button>
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 36, lineHeight: 1, transition: 'transform 0.1s', transform: hover >= star || value >= star ? 'scale(1.15)' : 'scale(1)' }}
        >
          <span style={{ color: (hover || value) >= star ? '#f59e0b' : '#e5e7eb' }}>★</span>
        </button>
      ))}
      {value > 0 && (
        <span style={{ fontSize: 13, color: '#9ca3af', alignSelf: 'center', marginLeft: 4 }}>
          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][value]}
        </span>
      )}
    </div>
  )
}

export default function ReviewPage() {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0 = form, 1 = done
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [rating, setRating]               = useState(0)
  const [picksHelpful, setPicksHelpful]   = useState('')
  const [aiTrust, setAiTrust]             = useState('')
  const [easyToUse, setEasyToUse]         = useState('')
  const [savesTime, setSavesTime]         = useState('')
  const [wouldUseDaily, setWouldUseDaily] = useState('')
  const [topFeature, setTopFeature]       = useState('')
  const [improve, setImprove]             = useState('')
  const [recommend, setRecommend]         = useState('')
  const [email, setEmail]                 = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { setError('Please give a star rating before submitting.'); return }
    setError('')
    setSubmitting(true)
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating, picks_helpful: picksHelpful, ai_trustworthy: aiTrust,
        easy_to_use: easyToUse, saves_time: savesTime, would_use_daily: wouldUseDaily,
        top_feature: topFeature, improve, would_recommend: recommend, email,
      }),
    })
    setSubmitting(false)
    if (res.ok) setStep(1)
    else setError('Something went wrong — please try again.')
  }

  if (step === 1) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🙏</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: '0 0 12px', letterSpacing: '-0.02em' }}>Thank you!</h1>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, margin: '0 0 32px' }}>
            Your feedback genuinely helps us build a better platform. We read every single response.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/app')}
              style={{ padding: '12px 28px', fontSize: 14, fontWeight: 700, background: '#111', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}
            >
              Back to App
            </button>
            <button
              onClick={() => router.push('/app')}
              style={{ padding: '12px 24px', fontSize: 14, fontWeight: 600, background: 'transparent', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 10, cursor: 'pointer' }}
            >
              View Plans →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: 580, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', letterSpacing: '0.08em', marginBottom: 8 }}>INVESTMENT COUNCIL</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111', margin: '0 0 10px', letterSpacing: '-0.02em' }}>How was your experience?</h1>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>Takes 2 minutes. Your honest feedback shapes what we build next.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Star rating */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '24px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 16 }}>Overall, how would you rate Investment Council?</div>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Yes/Somewhat/No questions */}
          {[
            { label: 'Did the daily picks give you enough information to act on?', value: picksHelpful, set: setPicksHelpful, opts: YES_OPTIONS },
            { label: 'Did the AI analysis feel accurate and trustworthy?',          value: aiTrust,      set: setAiTrust,       opts: YES_OPTIONS },
            { label: 'Was the platform easy to navigate?',                          value: easyToUse,    set: setEasyToUse,     opts: YES_OPTIONS },
            { label: 'Did the market briefings save you research time?',            value: savesTime,    set: setSavesTime,     opts: YES_OPTIONS },
          ].map(q => (
            <div key={q.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 14 }}>{q.label}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {q.opts.map(o => (
                  <ChoiceButton key={o} label={o} selected={q.value === o} onClick={() => q.set(o)} color="#2563eb" />
                ))}
              </div>
            </div>
          ))}

          {/* Would use daily */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 14 }}>Would you use Investment Council as your daily research tool?</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAILY_OPTIONS.map(o => (
                <ChoiceButton key={o} label={o} selected={wouldUseDaily === o} onClick={() => setWouldUseDaily(o)} color="#16a34a" />
              ))}
            </div>
          </div>

          {/* Top feature */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 14 }}>What feature did you use the most?</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FEATURES.map(f => (
                <ChoiceButton key={f} label={f} selected={topFeature === f} onClick={() => setTopFeature(f)} color="#7c3aed" />
              ))}
            </div>
          </div>

          {/* Open text */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 6 }}>What would make Investment Council a must-have for you? <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></div>
            <textarea
              value={improve}
              onChange={e => setImprove(e.target.value)}
              rows={3}
              placeholder="Anything you'd like to see..."
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' as const, color: '#111' }}
            />
          </div>

          {/* Recommend */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 14 }}>Would you recommend Investment Council to another trader?</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {REC_OPTIONS.map(o => (
                <ChoiceButton key={o} label={o} selected={recommend === o} onClick={() => setRecommend(o)} color="#f59e0b" />
              ))}
            </div>
          </div>

          {/* Email (optional) */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 4 }}>Your email <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Only used if we want to follow up on your feedback.</div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
            />
          </div>

          {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            style={{ width: '100%', padding: 15, fontSize: 15, fontWeight: 800, background: submitting ? '#9ca3af' : '#111', color: '#fff', border: 'none', borderRadius: 12, cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing: '-0.01em' }}
          >
            {submitting ? 'Submitting…' : 'Submit My Review →'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 12, color: '#d1d5db' }}>
            Takes 2 minutes · Completely anonymous if you prefer
          </div>
        </form>
      </div>
    </div>
  )
}

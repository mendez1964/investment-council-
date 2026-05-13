'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/navigation'

interface Props {
  trialEndsAt: string | null
  tier: string
}

export default function ReviewPrompt({ trialEndsAt, tier }: Props) {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [reason, setReason] = useState<'last_day' | 'expired'>('last_day')

  useEffect(() => {
    if (!trialEndsAt) return
    const dismissed = localStorage.getItem('review_prompt_dismissed')
    if (dismissed) return

    const trialEnd = new Date(trialEndsAt).getTime()
    const now = Date.now()
    const hoursLeft = (trialEnd - now) / 3_600_000

    if (now > trialEnd) {
      // Trial expired
      setReason('expired')
      setShow(true)
    } else if (hoursLeft <= 24) {
      // Last day
      setReason('last_day')
      setShow(true)
    }
  }, [trialEndsAt])

  function dismiss() {
    localStorage.setItem('review_prompt_dismissed', '1')
    setShow(false)
  }

  function goReview() {
    localStorage.setItem('review_prompt_dismissed', '1')
    setShow(false)
    router.push('/review')
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      width: 320, background: '#fff', borderRadius: 16,
      border: '1px solid #e5e7eb', boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
      padding: '20px 20px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      animation: 'slideUp 0.3s ease',
    }}>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontSize: 22 }}>{reason === 'expired' ? '⏰' : '⭐'}</div>
        <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
      </div>

      <div style={{ fontSize: 14, fontWeight: 800, color: '#111', marginBottom: 6 }}>
        {reason === 'expired' ? 'Your trial has ended' : 'One day left on your trial'}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, marginBottom: 16 }}>
        {reason === 'expired'
          ? 'Before you decide — would you take 2 minutes to share your experience? It really helps us improve.'
          : 'How has Investment Council been so far? Your feedback takes 2 minutes and means a lot to us.'}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={goReview}
          style={{ flex: 1, padding: '9px', fontSize: 12, fontWeight: 700, background: '#111', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          Leave a Review →
        </button>
        <button
          onClick={dismiss}
          style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, background: 'transparent', color: '#9ca3af', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}
        >
          Later
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { PRICES } from '@/lib/stripe-prices'

interface UpgradeModalProps {
  onClose: () => void
  onSelectPlan: (priceId: string) => void
  currentTier: 'free' | 'trader' | 'pro' | null
}

export default function UpgradeModal({ onClose, onSelectPlan, currentTier }: UpgradeModalProps) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  const plans = [
    {
      name: 'Trader',
      tier: 'trader' as const,
      monthly: { price: '$29.99', priceId: PRICES.trader.monthly },
      yearly: { price: '$24.99', priceId: PRICES.trader.yearly, note: '$299.88/yr' },
      features: [
        'Unlimited queries',
        'All 18 frameworks',
        'AI Daily Picks',
        'Email alerts',
        'Full council scans',
        'Pine Script generator',
      ],
    },
    {
      name: 'Pro',
      tier: 'pro' as const,
      monthly: { price: '$49.99', priceId: PRICES.pro.monthly },
      yearly: { price: '$41.66', priceId: PRICES.pro.yearly, note: '$499.92/yr' },
      features: [
        'Everything in Trader',
        'Priority AI responses',
        'Advanced portfolio tools',
        'Options flow analysis',
        'Institutional-grade reports',
        'Early access to new features',
      ],
      highlight: true,
    },
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d0d0d',
          border: '1px solid #222',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '620px',
          width: '100%',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#e5e5e5' }}>
              {currentTier === 'trader' ? 'Upgrade to Pro' : 'Upgrade Your Plan'}
            </div>
            <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
              {currentTier === 'trader' ? 'Cancel anytime' : '7-day free trial · Cancel anytime'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Billing toggle */}
        <div style={{ display: 'flex', gap: '4px', background: '#111', border: '1px solid #1f1f1f', borderRadius: '8px', padding: '4px', marginBottom: '24px', width: 'fit-content' }}>
          {(['monthly', 'yearly'] as const).map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'inherit',
                background: billing === b ? '#1a472a' : 'transparent',
                color: billing === b ? '#7ec8a0' : '#555',
              }}
            >
              {b === 'monthly' ? 'Monthly' : 'Yearly (save ~17%)'}
            </button>
          ))}
        </div>

        {/* Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {plans.map(plan => {
            const isCurrentPlan = currentTier === plan.tier
            const info = billing === 'monthly' ? plan.monthly : plan.yearly
            return (
              <div
                key={plan.tier}
                style={{
                  border: `1px solid ${plan.highlight ? '#2d6a4f' : '#1f1f1f'}`,
                  borderRadius: '10px',
                  padding: '20px',
                  background: plan.highlight ? '#0a1f14' : '#111',
                  position: 'relative',
                }}
              >
                {plan.highlight && (
                  <div style={{
                    position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                    background: '#16a34a', color: '#fff', fontSize: '10px', fontWeight: 700,
                    padding: '2px 10px', borderRadius: '20px', whiteSpace: 'nowrap',
                  }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#e5e5e5', marginBottom: '4px' }}>{plan.name}</div>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{info.price}</span>
                  <span style={{ fontSize: '12px', color: '#555' }}>/mo</span>
                  {'note' in info && (
                    <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{(info as any).note}</div>
                  )}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ fontSize: '12px', color: '#888', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isCurrentPlan && onSelectPlan(info.priceId)}
                  disabled={isCurrentPlan}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: isCurrentPlan ? 'default' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    background: isCurrentPlan ? '#1a1a1a' : plan.highlight ? '#16a34a' : '#1a472a',
                    color: isCurrentPlan ? '#444' : '#fff',
                  }}
                >
                  {isCurrentPlan ? 'Current Plan' : currentTier === 'trader' && plan.tier === 'pro' ? 'Upgrade to Pro' : 'Start 7-Day Trial'}
                </button>
              </div>
            )
          })}
        </div>

        {currentTier !== 'trader' && (
          <div style={{ marginTop: '16px', fontSize: '11px', color: '#333', textAlign: 'center' }}>
            No charge during trial · Cancel before trial ends to avoid billing
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import {
  Search, Sun, Sunrise, Sunset, Activity, RefreshCw, Globe, Gauge,
  TrendingUp, Zap, CalendarDays, Newspaper, ScanLine, User, Users,
  Microscope, Calculator, Shield, Target, Scissors, BarChart2,
  UserCheck, Building2, FileText, BarChart, Rocket, Sparkles, LineChart,
  CandlestickChart, Bitcoin, Link, Waves, Hexagon, Layers,
  ChevronDown, ChevronRight, X, type LucideIcon,
} from 'lucide-react'

export type SidebarItem = {
  label: string
  prompt: string
  icon?: string
  needsTicker?: boolean
  isAnalysis?: 'stock' | 'crypto'
  isCalendar?: boolean
  isMovers?: boolean
  isFearGreed?: boolean
  isAIPicks?: boolean
  isIPO?: boolean
  isNews?: boolean
  isChart?: boolean
  isEconCalendar?: boolean
  isCalculators?: boolean
  isPatterns?: boolean
  isCryptoDashboard?: boolean
}

export type SidebarSection = { id: string; title: string; items: SidebarItem[] }

const ICON_MAP: Record<string, LucideIcon> = {
  'Analyze a Stock / ETF': Search,
  'Analyze a Crypto': Search,
  'Pre-Market Briefing': Sunrise,
  'End of Day Summary': Sunset,
  'Market Health': Activity,
  'Sector Rotation': RefreshCw,
  'Macro Environment': Globe,
  'Fear & Greed': Gauge,
  'Yield Curve': TrendingUp,
  'Volatility Check': Zap,
  'Economic Calendar': CalendarDays,
  'News Feed': Newspaper,
  'Full Council Scan': ScanLine,
  'Full Council View': Users,
  'Analyze a Setup': Microscope,
  'Position Sizing': Calculator,
  'Risk Assessment': Shield,
  'Entry / Stop / Target': Target,
  'Hold or Cut': Scissors,
  'Stock Quote': BarChart2,
  'Insider Transactions': UserCheck,
  '13F Holdings': Building2,
  'SEC Filings': FileText,
  'Economic Data': BarChart,
  'Earnings Calendar': CalendarDays,
  'IPO Calendar': Rocket,
  'Market Movers': Zap,
  'AI Daily Picks': Sparkles,
  'Chart a Ticker': LineChart,
  'Financial Calculators': Calculator,
  'Candlestick Patterns': CandlestickChart,
  'Full Crypto Council': Users,
  'Bitcoin Deep Dive': Bitcoin,
  'Ethereum & DeFi': Hexagon,
  'Cycle Position': RefreshCw,
  'On-Chain Health': Link,
  'Derivatives Positioning': BarChart2,
  'Macro Crypto View': Globe,
  'Altcoin Season': Waves,
  'Institutional Flow': Building2,
  'Bitcoin Cycle Scan': ScanLine,
  'Macro Crypto Scan': Globe,
  'Derivatives Scan': BarChart2,
  'On-Chain Scan': Link,
  'Altcoin Season Scan': Waves,
  'DeFi Ecosystem Scan': Layers,
  'Crypto Prices': TrendingUp,
  'Crypto News': Newspaper,
  'Crypto Dashboard': BarChart2,
}

const PERSON_LABELS = new Set([
  'Tudor Jones', 'Livermore', 'Buffett', 'Lynch', 'Graham', 'Grantham',
  'Dalio', 'Burry', 'Roubini', 'Soros', 'Damodaran',
  'Michael Saylor', 'PlanB', 'Raoul Pal', 'Arthur Hayes', 'Vitalik Buterin',
  'Cathie Wood', 'Andreas Antonopoulos', 'Charles Hoskinson',
])

function getIcon(item: SidebarItem): LucideIcon {
  if (ICON_MAP[item.label]) return ICON_MAP[item.label]
  if (PERSON_LABELS.has(item.label)) return User
  return Sun
}

function isFeatureItem(item: SidebarItem) {
  return !!(
    item.isCalendar || item.isMovers || item.isFearGreed || item.isAIPicks ||
    item.isIPO || item.isNews || item.isChart || item.isEconCalendar ||
    item.isAnalysis || item.isCalculators || item.isPatterns || item.isCryptoDashboard
  )
}

interface SidebarProps {
  mode: 'stocks' | 'crypto'
  onModeChange: (mode: 'stocks' | 'crypto') => void
  sections: SidebarSection[]
  expandedSections: Set<string>
  onToggleSection: (id: string) => void
  onItemClick: (item: SidebarItem) => void
  isLoading: boolean
  mobileOpen: boolean
  onMobileClose: () => void
}

function SidebarContent({
  mode, onModeChange, sections, expandedSections, onToggleSection,
  onItemClick, isLoading, collapsed, setCollapsed, isMobile, onClose,
}: {
  mode: 'stocks' | 'crypto'
  onModeChange: (mode: 'stocks' | 'crypto') => void
  sections: SidebarSection[]
  expandedSections: Set<string>
  onToggleSection: (id: string) => void
  onItemClick: (item: SidebarItem) => void
  isLoading: boolean
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  isMobile: boolean
  onClose?: () => void
}) {
  const accentColor = mode === 'stocks' ? '#2d6a4f' : '#b45309'
  const accentText = mode === 'stocks' ? '#7ec8a0' : '#fbbf24'
  const accentBg = mode === 'stocks' ? '#1a472a' : '#451a03'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#070707' }}>

      {/* Top bar: mode toggle + collapse */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: collapsed ? '8px 6px' : '10px 10px 8px',
        borderBottom: '1px solid #0f0f0f',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{
            display: 'flex',
            flex: 1,
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #141414',
            background: '#0a0a0a',
          }}>
            {(['stocks', 'crypto'] as const).map(m => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  background: mode === m ? accentBg : 'transparent',
                  border: 'none',
                  color: mode === m ? accentText : '#2e2e2e',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                }}
                onMouseEnter={e => { if (mode !== m) e.currentTarget.style.color = '#555' }}
                onMouseLeave={e => { if (mode !== m) e.currentTarget.style.color = '#2e2e2e' }}
              >
                {m === 'stocks' ? <TrendingUp size={11} /> : <Bitcoin size={11} />}
                {m === 'stocks' ? 'Stocks' : 'Crypto'}
              </button>
            ))}
          </div>
        )}

        {/* Collapse / close button */}
        {isMobile ? (
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#404040', cursor: 'pointer', padding: '5px', borderRadius: '5px', display: 'flex', marginLeft: 'auto' }}
            onMouseEnter={e => e.currentTarget.style.color = '#888'}
            onMouseLeave={e => e.currentTarget.style.color = '#404040'}
          >
            <X size={16} />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              color: '#252525',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginLeft: collapsed ? 'auto' : undefined,
              marginRight: collapsed ? 'auto' : undefined,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#1f1f1f' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#252525'; e.currentTarget.style.borderColor = 'transparent' }}
          >
            <ChevronRight size={13} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
          </button>
        )}
      </div>

      {/* Collapsed icon-only view */}
      {collapsed && !isMobile && (
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '4px' }}>
          {sections.map(section => {
            const isOpen = expandedSections.has(section.id)
            if (!isOpen) return null
            return section.items.map(item => {
              const Icon = getIcon(item)
              const feature = isFeatureItem(item)
              return (
                <button
                  key={item.label}
                  onClick={() => !isLoading && onItemClick(item)}
                  title={item.label}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    cursor: isLoading ? 'default' : 'pointer',
                    padding: '7px 0',
                    display: 'flex',
                    justifyContent: 'center',
                    color: feature ? accentText : '#333',
                    transition: 'color 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#999'}
                  onMouseLeave={e => e.currentTarget.style.color = feature ? accentText : '#333'}
                >
                  <Icon size={14} />
                </button>
              )
            })
          })}
        </div>
      )}

      {/* Expanded full list */}
      {(!collapsed || isMobile) && (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '24px' }}>
          {sections.map(section => {
            const isOpen = expandedSections.has(section.id)
            return (
              <div key={section.id}>
                {/* Section header */}
                <button
                  onClick={() => onToggleSection(section.id)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderTop: '1px solid #0d0d0d',
                    padding: '10px 14px 7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    color: isOpen ? accentText : '#2e2e2e',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    letterSpacing: '0.13em',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    textTransform: 'uppercase',
                    transition: 'color 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#606060'}
                  onMouseLeave={e => e.currentTarget.style.color = isOpen ? accentText : '#2e2e2e'}
                >
                  <span>{section.title}</span>
                  <ChevronDown
                    size={11}
                    style={{
                      opacity: 0.45,
                      transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.18s',
                      flexShrink: 0,
                    }}
                  />
                </button>

                {/* Items */}
                {isOpen && (
                  <div style={{ padding: '2px 8px 6px' }}>
                    {section.items.map(item => {
                      const Icon = getIcon(item)
                      const feature = isFeatureItem(item)
                      const isPerson = PERSON_LABELS.has(item.label)

                      return (
                        <button
                          key={item.label}
                          onClick={() => !isLoading && onItemClick(item)}
                          disabled={isLoading}
                          style={{
                            width: '100%',
                            background: feature ? `${accentColor}1a` : 'transparent',
                            border: `1px solid ${feature ? `${accentColor}30` : 'transparent'}`,
                            borderRadius: '7px',
                            padding: feature ? '8px 10px' : isPerson ? '4px 10px' : '5px 10px',
                            marginBottom: feature ? '3px' : '1px',
                            color: feature ? accentText : isPerson ? '#3a3a3a' : '#525252',
                            fontSize: isPerson ? '11.5px' : '12.5px',
                            fontWeight: feature ? 600 : 400,
                            cursor: isLoading ? 'default' : 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            lineHeight: 1.3,
                            transition: 'all 0.1s',
                          }}
                          onMouseEnter={e => {
                            if (!isLoading) {
                              e.currentTarget.style.color = '#d4d4d4'
                              e.currentTarget.style.background = feature ? accentColor : '#101010'
                              e.currentTarget.style.borderColor = feature ? accentColor : 'transparent'
                            }
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.color = feature ? accentText : isPerson ? '#3a3a3a' : '#525252'
                            e.currentTarget.style.background = feature ? `${accentColor}1a` : 'transparent'
                            e.currentTarget.style.borderColor = feature ? `${accentColor}30` : 'transparent'
                          }}
                        >
                          <Icon
                            size={feature ? 13 : isPerson ? 11 : 13}
                            style={{ flexShrink: 0, opacity: feature ? 0.85 : isPerson ? 0.4 : 0.5 }}
                          />
                          <span style={{ flex: 1 }}>{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({
  mode, onModeChange, sections, expandedSections, onToggleSection,
  onItemClick, isLoading, mobileOpen, onMobileClose,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const sharedProps = { mode, onModeChange, sections, expandedSections, onToggleSection, onItemClick, isLoading }

  return (
    <>
      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={{
          width: collapsed ? '44px' : '252px',
          minWidth: collapsed ? '44px' : '252px',
          borderRight: '1px solid #0f0f0f',
          transition: 'width 0.2s, min-width 0.2s',
          overflow: 'hidden',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <SidebarContent
            {...sharedProps}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            isMobile={false}
          />
        </div>
      )}

      {/* Mobile overlay + drawer */}
      {isMobile && mobileOpen && (
        <>
          <div
            onClick={onMobileClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 40 }}
          />
          <div style={{
            position: 'fixed',
            top: 0, left: 0, bottom: 0,
            width: '280px',
            zIndex: 50,
            borderRight: '1px solid #1a1a1a',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <SidebarContent
              {...sharedProps}
              collapsed={false}
              setCollapsed={setCollapsed}
              isMobile={true}
              onClose={onMobileClose}
            />
          </div>
        </>
      )}
    </>
  )
}

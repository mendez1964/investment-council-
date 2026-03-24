'use client'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/navigation'
import { useState } from 'react'

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
]

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const current = LANGUAGES.find(l => l.code === locale) ?? LANGUAGES[0]

  function switchLocale(code: string) {
    router.replace(pathname, { locale: code })
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '6px',
          padding: '5px 10px',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'inherit',
        }}
      >
        {current.flag} {current.label} ▾
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          background: '#1a1a2e',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          overflow: 'hidden',
          zIndex: 1000,
          minWidth: '140px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => switchLocale(lang.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px 14px',
                background: lang.code === locale ? 'rgba(201,163,78,0.15)' : 'transparent',
                border: 'none',
                color: lang.code === locale ? '#C9A34E' : 'rgba(255,255,255,0.75)',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (lang.code !== locale) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (lang.code !== locale) e.currentTarget.style.background = 'transparent' }}
            >
              {lang.flag} {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

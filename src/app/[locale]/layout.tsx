import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales, type Locale } from '@/i18n'
import CrispChat from '@/components/CrispChat'

export const metadata: Metadata = {
  title: {
    default: 'Investment Council — AI Stock Analysis Tool & Crypto Market Analysis',
    template: '%s | Investment Council',
  },
  description: 'The AI stock analysis tool built for retail traders. Daily AI stock picks, AI trading signals, crypto market analysis, and options picks. Free tier available.',
  metadataBase: new URL('https://www.investmentcouncil.io'),
  robots: { index: true, follow: true },
  verification: { google: 'EsmLBkWom9zztJ7IUO32VAScMQHCqkFjzaB8Kz5d5hE' },
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!locales.includes(locale as Locale)) notFound()

  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a', color: '#e5e5e5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace' }}>
        <NextIntlClientProvider messages={messages}>
          {children}
          <CrispChat />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

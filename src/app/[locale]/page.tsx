import type { Metadata } from 'next'
import LandingPage from '@/components/LandingPage'

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Investment Council',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description: 'AI stock analysis tool and crypto market analysis platform. Daily AI stock picks, AI trading signals, options picks with entry/stop/target, and pre-market briefings for retail traders.',
    url: 'https://www.investmentcouncil.io',
    offers: [
      { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free — 5 queries/day' },
      { '@type': 'Offer', price: '29.99', priceCurrency: 'USD', name: 'Trader — Full stock & crypto access' },
      { '@type': 'Offer', price: '49.99', priceCurrency: 'USD', name: 'Pro — Options picks + alerts' },
    ],
    featureList: [
      'AI stock analysis tool',
      'AI crypto analysis',
      'Best AI stock picks daily',
      'AI trading signals',
      'Options picks with entry stop and target',
      'Pre-market briefing',
      'Crypto market analysis tool',
      'On-chain crypto metrics',
      'Investment analysis platform',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Investment Council?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Investment Council is an AI stock analysis tool and investment analysis platform that provides daily AI stock picks, AI trading signals, crypto market analysis, and options picks with entry, stop, and target levels for retail traders.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does the AI stock analysis work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Investment Council uses the IC Formula — a 5-factor scoring system — to evaluate stocks using trend alignment, momentum quality, sector flow, catalyst clarity, and market regime fit. Only picks scoring 70+ are included.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a free AI stock analysis tool?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Investment Council offers a free tier with 5 queries per day including pre-market briefings, stock analysis, and crypto analysis. No credit card required.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I get AI crypto analysis on Investment Council?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Investment Council provides daily AI crypto analysis covering Bitcoin dominance, altcoin season indicators, funding rates, on-chain metrics, and AI-generated crypto picks using the IC Crypto Formula.',
        },
      },
    ],
  },
]

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const titles: Record<string, string> = {
    en: 'Investment Council — AI Stock Analysis Tool & Crypto Market Analysis Platform',
    es: 'Investment Council — Herramienta de Análisis de Acciones con IA',
    pt: 'Investment Council — Ferramenta de Análise de Ações com IA',
    fr: "Investment Council — Outil d'Analyse d'Actions par IA",
  }
  const descriptions: Record<string, string> = {
    en: 'The AI stock analysis tool built for retail traders. Daily AI stock picks, trading signals, crypto analysis, and options picks. Free tier available.',
    es: 'La herramienta de análisis de acciones con IA para traders minoristas. Picks diarios, señales de trading, análisis de criptomonedas y opciones.',
    pt: 'A ferramenta de análise de ações com IA para traders de varejo. Picks diários, sinais de trading, análise de criptomoedas e opções.',
    fr: "L'outil d'analyse d'actions par IA pour les traders particuliers. Picks quotidiens, signaux de trading, analyse crypto et options.",
  }
  return {
    title: titles[locale] ?? titles.en,
    description: descriptions[locale] ?? descriptions.en,
    alternates: {
      canonical: locale === 'en' ? 'https://www.investmentcouncil.io' : `https://www.investmentcouncil.io/${locale}`,
      languages: {
        'en': 'https://www.investmentcouncil.io',
        'es': 'https://www.investmentcouncil.io/es',
        'pt': 'https://www.investmentcouncil.io/pt',
        'fr': 'https://www.investmentcouncil.io/fr',
      },
    },
  }
}

export default function Page() {
  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <LandingPage />
    </>
  )
}

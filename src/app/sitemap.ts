import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.investmentcouncil.io'
  const now = new Date()

  return [
    // Core pages
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/sitemap-page`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },

    // Blog — SEO content
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/blog/ai-stock-analysis-how-it-works`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/ai-crypto-analysis-complete-guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/ai-trading-signals-explained`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/blog/investment-council-frameworks-guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/options-trading-beginners-guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/pre-market-briefing-guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ]
}

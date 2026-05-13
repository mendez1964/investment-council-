import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/owner/',
          '/profile/',
          '/app/',
        ],
      },
    ],
    sitemap: 'https://www.investmentcouncil.io/sitemap.xml',
  }
}

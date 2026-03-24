import { blogPosts } from '@/lib/blog-posts'
import { locales } from '@/i18n'
import { notFound } from 'next/navigation'

const NAVY = '#0F2A44'
const GOLD = '#C9A34E'

export async function generateMetadata({ params }: { params: { slug: string; locale: string } }) {
  const post = blogPosts.find(p => p.slug === params.slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    keywords: post.keyword,
    alternates: {
      canonical: `https://investmentcouncil.io${params.locale === 'en' ? '' : `/${params.locale}`}/blog/${post.slug}`,
    },
  }
}

export function generateStaticParams() {
  return locales.flatMap(locale =>
    blogPosts.map(post => ({ locale, slug: post.slug }))
  )
}

export default function BlogPostPage({ params }: { params: { slug: string; locale: string } }) {
  const post = blogPosts.find(p => p.slug === params.slug)
  if (!post) notFound()

  const blogHref = params.locale === 'en' ? '/blog' : `/${params.locale}/blog`
  const homeHref = params.locale === 'en' ? '/' : `/${params.locale}`

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1f2937', margin: 0, padding: 0 }}>

      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href={homeHref} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: '#fff', letterSpacing: '-0.5px', flexShrink: 0 }}>IC</div>
          <span style={{ fontWeight: 700, fontSize: '16px', color: NAVY }}>Investment Council</span>
        </a>
        <a
          href={blogHref}
          style={{ background: 'none', border: `1px solid ${NAVY}`, borderRadius: '8px', padding: '8px 16px', color: NAVY, fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}
        >← Blog</a>
      </nav>

      {/* Article */}
      <main style={{ padding: '60px 32px 80px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ background: GOLD, color: '#fff', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '3px 10px', letterSpacing: '0.04em' }}>{post!.category.toUpperCase()}</span>
            </div>
            <h1 style={{ fontSize: '38px', fontWeight: 800, color: NAVY, lineHeight: 1.2, marginBottom: '16px' }}>{post!.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>{post!.date}</span>
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>{post!.readTime}</span>
              <span style={{ background: '#f3f4f6', color: '#6b7280', fontSize: '11px', fontWeight: 600, borderRadius: '6px', padding: '3px 8px' }}>{post!.keyword}</span>
            </div>
          </div>

          {/* Body */}
          <style>{`
            .ic-article-body h2 { color: #0F2A44; font-size: 24px; font-weight: 700; margin: 36px 0 14px; line-height: 1.3; }
            .ic-article-body p { margin: 0 0 20px; font-size: 16px; line-height: 1.8; color: #374151; }
            .ic-article-body ul { padding-left: 24px; margin: 0 0 20px; }
            .ic-article-body li { margin-bottom: 8px; font-size: 16px; line-height: 1.8; color: #374151; }
            .ic-article-body strong { color: #0F2A44; font-weight: 700; }
          `}</style>
          <div className="ic-article-body" dangerouslySetInnerHTML={{ __html: post!.content }} />

        </div>
      </main>

      {/* Bottom CTA */}
      <section style={{ background: NAVY, padding: '56px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: '540px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Ready to put this into practice?</h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '28px', lineHeight: 1.65 }}>Start your free trial on Investment Council — 7 days of full access, no credit card required.</p>
          <a
            href={homeHref}
            style={{ background: GOLD, border: 'none', borderRadius: '10px', padding: '14px 36px', color: '#fff', fontSize: '16px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}
          >Start Free Trial on Investment Council →</a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#06060a', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
          © 2026 Investment Council · investmentcouncil.io · For educational and informational purposes only. Not financial advice.
        </div>
      </footer>

    </div>
  )
}

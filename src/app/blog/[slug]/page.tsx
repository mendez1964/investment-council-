'use client'

import { useRouter, useParams } from 'next/navigation'
import { blogPosts } from '@/lib/blog-posts'

const NAVY = '#0F2A44'
const GOLD = '#C9A34E'

export default function BlogPostPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string

  const post = blogPosts.find(p => p.slug === slug)

  if (!post) {
    return (
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <h1 style={{ color: NAVY, fontSize: '28px', fontWeight: 700 }}>Article Not Found</h1>
        <button onClick={() => router.push('/blog')} style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>← Back to Blog</button>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1f2937', margin: 0, padding: 0 }}>

      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          onClick={() => router.push('/')}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: '#fff', letterSpacing: '-0.5px', flexShrink: 0 }}>IC</div>
          <span style={{ fontWeight: 700, fontSize: '16px', color: NAVY }}>Investment Council</span>
        </div>
        <button
          onClick={() => router.push('/blog')}
          style={{ background: 'none', border: `1px solid ${NAVY}`, borderRadius: '8px', padding: '8px 16px', color: NAVY, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.background = NAVY; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = NAVY }}
        >← Blog</button>
      </nav>

      {/* Article */}
      <main style={{ padding: '60px 32px 80px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ background: GOLD, color: '#fff', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '3px 10px', letterSpacing: '0.04em' }}>{post.category.toUpperCase()}</span>
            </div>
            <h1 style={{ fontSize: '38px', fontWeight: 800, color: NAVY, lineHeight: 1.2, marginBottom: '16px' }}>{post.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>{post.date}</span>
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>{post.readTime}</span>
              <span style={{ background: '#f3f4f6', color: '#6b7280', fontSize: '11px', fontWeight: 600, borderRadius: '6px', padding: '3px 8px' }}>{post.keyword}</span>
            </div>
          </div>

          {/* Body */}
          <style>{`
            .ic-article-body h2 {
              color: #0F2A44;
              font-size: 24px;
              font-weight: 700;
              margin: 36px 0 14px;
              line-height: 1.3;
            }
            .ic-article-body p {
              margin: 0 0 20px;
              font-size: 16px;
              line-height: 1.8;
              color: #374151;
            }
            .ic-article-body ul {
              padding-left: 24px;
              margin: 0 0 20px;
            }
            .ic-article-body li {
              margin-bottom: 8px;
              font-size: 16px;
              line-height: 1.8;
              color: #374151;
            }
            .ic-article-body strong {
              color: #0F2A44;
              font-weight: 700;
            }
            .ic-article-body em {
              font-style: italic;
            }
          `}</style>
          <div
            className="ic-article-body"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

        </div>
      </main>

      {/* Bottom CTA */}
      <section style={{ background: NAVY, padding: '56px 32px', textAlign: 'center' }}>
        <div style={{ maxWidth: '540px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Ready to put this into practice?</h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '28px', lineHeight: 1.65 }}>Start your free trial on Investment Council — 7 days of full access, no credit card required.</p>
          <button
            onClick={() => router.push('/')}
            style={{ background: GOLD, border: 'none', borderRadius: '10px', padding: '14px 36px', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#b8913d' }}
            onMouseLeave={e => { e.currentTarget.style.background = GOLD }}
          >Start Free Trial on Investment Council →</button>
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

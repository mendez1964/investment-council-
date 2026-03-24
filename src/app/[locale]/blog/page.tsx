'use client'

import { useRouter } from 'next/navigation'
import { blogPosts } from '@/lib/blog-posts'

const NAVY = '#0F2A44'
const GOLD = '#C9A34E'
const GREY_BG = '#f8f9fa'

export default function BlogPage() {
  const router = useRouter()

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
          onClick={() => router.push('/')}
          style={{ background: 'none', border: `1px solid ${NAVY}`, borderRadius: '8px', padding: '8px 16px', color: NAVY, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.background = NAVY; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = NAVY }}
        >← Back to Home</button>
      </nav>

      {/* Header */}
      <section style={{ background: NAVY, padding: '72px 32px 64px', textAlign: 'center' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '44px', fontWeight: 800, color: '#fff', marginBottom: '16px', lineHeight: 1.15 }}>Investment Council Blog</h1>
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
            AI stock analysis, crypto market insights, and investment research for retail traders
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section style={{ background: GREY_BG, padding: '64px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '28px',
          }}
            className="blog-grid"
          >
            {blogPosts.map(post => (
              <div
                key={post.slug}
                onClick={() => router.push(`/blog/${post.slug}`)}
                style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '28px 24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(15,42,68,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {/* Category Badge */}
                <div>
                  <span style={{ background: GOLD, color: '#fff', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '3px 10px', letterSpacing: '0.04em' }}>{post.category.toUpperCase()}</span>
                </div>

                {/* Title */}
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: NAVY, lineHeight: 1.4, margin: 0 }}>{post.title}</h2>

                {/* Description */}
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.65, margin: 0, flexGrow: 1 }}>{post.description}</p>

                {/* Keyword tag */}
                <div>
                  <span style={{ background: '#f3f4f6', color: '#6b7280', fontSize: '11px', fontWeight: 600, borderRadius: '6px', padding: '3px 8px' }}>{post.keyword}</span>
                </div>

                {/* Meta + CTA */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>{post.date} · {post.readTime}</div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: GOLD }}>Read Article →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .blog-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 560px) {
          .blog-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Footer */}
      <footer style={{ background: '#06060a', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
          © 2026 Investment Council · investmentcouncil.io · For educational and informational purposes only. Not financial advice.
        </div>
      </footer>

    </div>
  )
}

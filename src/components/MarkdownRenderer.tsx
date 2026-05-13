'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function MarkdownRenderer({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#e5e5e5', margin: '20px 0 10px', borderBottom: '1px solid #1f1f1f', paddingBottom: '8px' }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#d4d4d4', margin: '18px 0 8px', letterSpacing: '0.01em' }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#c0c0c0', margin: '14px 0 6px' }}>{children}</h3>,
          p: ({ children }) => <p style={{ margin: '0 0 12px', lineHeight: 1.75, color: '#d4d4d4' }}>{children}</p>,
          strong: ({ children }) => <strong style={{ color: '#e8e8e8', fontWeight: 700 }}>{children}</strong>,
          em: ({ children }) => <em style={{ color: '#b0b0b0', fontStyle: 'italic' }}>{children}</em>,
          ul: ({ children }) => <ul style={{ margin: '0 0 12px', paddingLeft: '20px', color: '#d4d4d4' }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: '0 0 12px', paddingLeft: '20px', color: '#d4d4d4' }}>{children}</ol>,
          li: ({ children }) => <li style={{ margin: '4px 0', lineHeight: 1.65 }}>{children}</li>,
          hr: () => <hr style={{ border: 'none', borderTop: '1px solid #1f1f1f', margin: '16px 0' }} />,
          blockquote: ({ children }) => (
            <blockquote style={{ borderLeft: '3px solid #2d6a4f', margin: '12px 0', padding: '8px 16px', background: '#0d0d0d', borderRadius: '0 6px 6px 0', color: '#999' }}>
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = !!className
            if (isBlock) {
              return (
                <pre style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: '8px', padding: '14px 16px', overflowX: 'auto', margin: '10px 0' }}>
                  <code style={{ fontSize: '12px', fontFamily: 'monospace', color: '#7ec8a0', lineHeight: 1.6 }}>{children}</code>
                </pre>
              )
            }
            return <code style={{ background: '#111', border: '1px solid #222', borderRadius: '3px', padding: '1px 5px', fontSize: '12px', fontFamily: 'monospace', color: '#7ec8a0' }}>{children}</code>
          },
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '12px 0' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead style={{ background: '#0f0f0f' }}>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr style={{ borderBottom: '1px solid #1a1a1a' }}>{children}</tr>,
          th: ({ children }) => (
            <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#7ec8a0', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #222' }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{ padding: '8px 14px', color: '#c0c0c0', verticalAlign: 'top', lineHeight: 1.5 }}>
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#7ec8a0', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
            >{children}</a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span style={{ display: 'inline-block', width: '8px', height: '14px', background: '#2d6a4f', borderRadius: '2px', animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom', marginLeft: '2px' }} />
      )}
    </div>
  )
}

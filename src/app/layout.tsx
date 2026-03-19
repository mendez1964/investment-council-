import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Investment Council',
  description: 'Private market intelligence agent',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a', color: '#e5e5e5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace' }}>
        {children}
      </body>
    </html>
  )
}

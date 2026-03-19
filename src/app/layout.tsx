import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Investment Council',
  description: 'AI-powered investment research platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

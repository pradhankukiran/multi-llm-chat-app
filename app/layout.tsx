import type { Metadata } from 'next'

import { Analytics } from '@vercel/analytics/next'
import './globals.css'


export const metadata: Metadata = {
  title: 'Multi LLM Chat',
  description: 'A multi-language model chat application',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

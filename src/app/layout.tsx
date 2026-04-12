import type { Metadata } from 'next'
import { Fraunces, DM_Sans } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'BaraTrust — Local Business Intelligence. Guaranteed.',
  description: "BaraTrust puts an AI staff in your service business — handling leads, reviews, follow-ups, and back office work while you're on the job. Guaranteed in 90 days.",
  keywords: 'local business marketing, AI agents, New Albany Indiana, Louisville Kentucky, contractor marketing',
  openGraph: {
    title: 'BaraTrust — Local Business Intelligence. Guaranteed.',
    description: 'AI staff for your service business. 90-Day Prove It Guarantee.',
    url: 'https://baratrust.com',
    siteName: 'BaraTrust',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${dmSans.variable}`}>
        {children}
      </body>
    </html>
  )
}

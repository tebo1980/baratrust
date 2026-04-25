import type { Metadata } from 'next'
import Script from 'next/script'
import { Fraunces, DM_Sans } from 'next/font/google'
import './globals.css'

const GA_ID = 'G-YWB4NTYLR8'

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
  metadataBase: new URL('https://baratrust.com'),
  title: 'AI Operations Platform for Local Businesses | BaraTrust',
  description: 'The operating layer for local businesses. 12 AI agents handling operations. Live dashboard. Profitability intelligence. 90-day guarantee. Try free.',
  keywords: 'AI marketing for small business, local business operations platform, small business intelligence, AI agents for small business, marketing automation for contractors, salon management software, New Albany Indiana, Louisville Kentucky',
  alternates: {
    canonical: 'https://baratrust.com',
  },
  openGraph: {
    type: 'website',
    title: 'AI Operations Platform for Local Businesses | BaraTrust',
    description: 'The operating layer for local businesses. 12 AI agents handling operations. Live dashboard. Profitability intelligence. 90-day guarantee.',
    url: 'https://baratrust.com',
    siteName: 'BaraTrust',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BaraTrust — the operating layer for local businesses',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Operations Platform for Local Businesses | BaraTrust',
    description: 'The operating layer for local businesses. 12 AI agents handling operations. 90-day guarantee.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body className={`${fraunces.variable} ${dmSans.variable}`}>
        {children}
      </body>
    </html>
  )
}

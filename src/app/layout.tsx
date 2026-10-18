import type { Metadata } from 'next'
import Script from 'next/script'
import { Fraunces, DM_Sans } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes' // Import the dark theme
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
  title: 'BaraTrust — Small Business Growth & Operations Partner',
  description: 'Run your business. We\'ll help with the rest. BaraTrust helps small businesses get more customers, lose fewer opportunities, cut unnecessary costs, and automate the busywork.',
  keywords: 'small business growth partner, local business operations, digital presence audit, business reality check, local SEO, process automation, Louisville Kentucky, New Albany Indiana',
  alternates: {
    canonical: 'https://baratrust.com',
  },
  openGraph: {
    type: 'website',
    title: 'BaraTrust — Small Business Growth & Operations Partner',
    description: 'Run your business. We\'ll help with the rest. BaraTrust helps small businesses get more customers, lose fewer opportunities, cut unnecessary costs, and automate the busywork.',
    url: 'https://baratrust.com',
    siteName: 'BaraTrust',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BaraTrust — Run your business. We\'ll help with the rest.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BaraTrust — Small Business Growth & Operations Partner',
    description: 'Run your business. We\'ll help with the rest. BaraTrust helps small businesses get more customers, lose fewer opportunities, cut unnecessary costs, and automate the busywork.',
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
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: { 
          colorPrimary: '#ffffff',
          colorTextOnPrimaryBackground: '#000000',
          // --- ADD THESE TWO LINES ---
          fontFamily: 'var(--font-dm-sans)',
          fontFamilyButtons: 'var(--font-dm-sans)',
        },
        // --- ADD THIS BLOCK ---
        elements: {
          headerTitle: 'font-fraunces',
        }
      }}
    >
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
        <body className={`${fraunces.variable} ${dmSans.variable} bg-[#050810] text-slate-200 antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
import type { Metadata } from 'next'
import ServiceAnalytics from '@/components/ServiceAnalytics'
import { Fraunces, DM_Sans } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes' // Import the dark theme
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
  metadataBase: new URL('https://baratrust.com'),
  title: 'BaraTrust — We Fix the Digital Stuff You Never Have Time For',
  description: 'BaraTrust helps small businesses clean up their digital presence, fix missed opportunities, and keep the basics working without learning a pile of software.',
  keywords: 'digital cleanup for small business, small business tech support, local business marketing help, no software local operations, New Albany Indiana, Louisville Kentucky',
  alternates: {
    canonical: 'https://baratrust.com',
  },
  openGraph: {
    type: 'website',
    title: 'BaraTrust — We Fix the Digital Stuff You Never Have Time For',
    description: 'BaraTrust helps small businesses clean up their digital presence, fix missed opportunities, and keep the basics working without learning a pile of software.',
    url: 'https://baratrust.com',
    siteName: 'BaraTrust',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BaraTrust — We fix the digital stuff you never have time for.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BaraTrust — We Fix the Digital Stuff You Never Have Time For',
    description: 'BaraTrust helps small businesses clean up their digital presence, fix missed opportunities, and keep the basics working without learning a pile of software.',
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

        <body className={`${fraunces.variable} ${dmSans.variable} bg-[#050810] text-slate-200 antialiased`}>
          <ServiceAnalytics />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}

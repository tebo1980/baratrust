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
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
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
          <script
            id="clerk-js-retry-guard"
            dangerouslySetInnerHTML={{
              __html: `(function(){function attach(s){if(!s||s.__clerkRetryAttached)return;s.__clerkRetryAttached=true;var settled=null,loads=[],errors=[],origAdd=s.addEventListener.bind(s);s.addEventListener=function(t,fn,o){if(t==='load'){if(settled==='loaded'){setTimeout(fn,0);}else{loads.push(fn);}return;}if(t==='error'){if(settled==='failed'){setTimeout(fn,0);}else{errors.push(fn);}return;}return origAdd(t,fn,o);};origAdd('load',function(ev){settled='loaded';for(var i=0;i<loads.length;i++)loads[i](ev);});origAdd('error',function(){var src=s.getAttribute('src'),key=s.getAttribute('data-clerk-publishable-key'),attempt=0;function retry(){attempt++;var r=document.createElement('script');r.async=true;r.crossOrigin='anonymous';if(key)r.setAttribute('data-clerk-publishable-key',key);r.src=src;r.onload=function(ev){settled='loaded';for(var i=0;i<loads.length;i++)loads[i](ev);};r.onerror=function(ev){if(r.parentNode)r.parentNode.removeChild(r);if(attempt<5){setTimeout(retry,125*Math.pow(2,attempt-1));}else{settled='failed';for(var i=0;i<errors.length;i++)errors[i](ev);}};document.head.appendChild(r);}setTimeout(retry,125);});}var existing=document.querySelector('script[data-clerk-js-script]');if(existing){attach(existing);}else{new MutationObserver(function(m,obs){var el=document.querySelector('script[data-clerk-js-script]');if(el){attach(el);obs.disconnect();}}).observe(document.documentElement,{childList:true,subtree:true});}})();`,
            }}
          />
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

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Roofing Contractor Marketing Louisville KY — BaraTrust',
  description: 'BaraTrust puts an AI staff in your roofing business — capturing every storm lead, managing reviews, and running your back office. 90-Day Prove It Guarantee. Serving Louisville KY.',
  keywords: 'roofing marketing Louisville, roofing contractor marketing, roof repair advertising Louisville KY, roofer leads, storm damage roofing marketing',
  openGraph: {
    title: 'Roofing Contractor Marketing Louisville KY — BaraTrust',
    description: 'AI staff for your roofing business. 10 agents. 90-Day Guarantee.',
    url: 'https://baratrust.com/roofing-contractor-marketing-louisville',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

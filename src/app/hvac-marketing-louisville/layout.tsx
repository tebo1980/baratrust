import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HVAC Contractor Marketing Louisville KY — BaraTrust',
  description: 'BaraTrust puts an AI staff in your HVAC business — capturing every lead, managing reviews, and running your back office. 90-Day Prove It Guarantee. Serving Louisville KY.',
  keywords: 'HVAC marketing Louisville, HVAC contractor marketing, HVAC advertising Louisville KY, air conditioning marketing, heating contractor leads',
  openGraph: {
    title: 'HVAC Contractor Marketing Louisville KY — BaraTrust',
    description: 'AI staff for your HVAC business. 10 agents. 90-Day Guarantee.',
    url: 'https://baratrust.com/hvac-marketing-louisville',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

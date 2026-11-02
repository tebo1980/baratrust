import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HVAC Contractor Growth & Business Watch — Louisville KY | BaraTrust',
  description: 'BaraTrust watches your HVAC business so you don’t have to — across Protect, Improve, Grow, and Save. Serving Louisville KY and Southern Indiana.',
  keywords: 'HVAC marketing Louisville, HVAC contractor growth Louisville KY, local HVAC visibility, Business Pulse Louisville',
  openGraph: {
    title: 'HVAC Contractor Growth & Business Watch — Louisville KY | BaraTrust',
    description: 'Protect • Improve • Grow • Save. Ongoing business and local market watch plus practical execution for Louisville HVAC companies.',
    url: 'https://baratrust.com/hvac-marketing-louisville',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

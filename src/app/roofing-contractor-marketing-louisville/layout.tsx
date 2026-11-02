import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Roofing Contractor Growth & Business Watch — Louisville KY | BaraTrust',
  description: 'BaraTrust watches your roofing business so you don’t have to — across Protect, Improve, Grow, and Save. Serving Louisville KY and Southern Indiana.',
  keywords: 'roofing marketing Louisville, roofing contractor growth Louisville KY, local roofer visibility, Business Pulse Louisville',
  openGraph: {
    title: 'Roofing Contractor Growth & Business Watch — Louisville KY | BaraTrust',
    description: 'Protect • Improve • Grow • Save. Ongoing business and local market watch plus practical execution for Louisville roofing contractors.',
    url: 'https://baratrust.com/roofing-contractor-marketing-louisville',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

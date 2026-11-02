import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Electrician Growth & Business Watch — New Albany IN | BaraTrust',
  description: 'BaraTrust watches your electrical business so you don’t have to — across Protect, Improve, Grow, and Save. Serving New Albany and Southern Indiana.',
  keywords: 'electrician marketing New Albany, electrical contractor growth Southern Indiana, local electrician visibility, Business Pulse New Albany IN',
  openGraph: {
    title: 'Electrician Growth & Business Watch — New Albany IN | BaraTrust',
    description: 'Protect • Improve • Grow • Save. Ongoing business and local market watch plus practical execution for New Albany electrical contractors.',
    url: 'https://baratrust.com/electrician-marketing-new-albany',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

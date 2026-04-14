import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Electrician Marketing New Albany IN — BaraTrust',
  description: 'BaraTrust puts an AI staff in your electrical business — capturing every lead, managing reviews, and running your back office. 90-Day Prove It Guarantee. Serving New Albany IN.',
  keywords: 'electrician marketing New Albany, electrician advertising Indiana, electrical contractor leads, electrician marketing Southern Indiana',
  openGraph: {
    title: 'Electrician Marketing New Albany IN — BaraTrust',
    description: 'AI staff for your electrical business. 10 agents. 90-Day Guarantee.',
    url: 'https://baratrust.com/electrician-marketing-new-albany',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

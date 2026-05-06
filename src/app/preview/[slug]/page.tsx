import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getAllContractorSlugs,
  getContractorConfig,
  isExpired,
} from '@/lib/contractors'
import { contrastTextColor } from '@/lib/contrastColor'
import { fontClassName, STYLE_TOKENS } from '@/components/preview/styleVariants'
import Header from '@/components/preview/Header'
import Hero from '@/components/preview/Hero'
import Services from '@/components/preview/Services'
import About from '@/components/preview/About'
import Reviews from '@/components/preview/Reviews'
import ServiceArea from '@/components/preview/ServiceArea'
import CallToAction from '@/components/preview/CallToAction'
import Footer from '@/components/preview/Footer'
import Expired from '@/components/preview/Expired'

export const dynamicParams = false

export async function generateStaticParams() {
  const slugs = await getAllContractorSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const config = await getContractorConfig(params.slug)
  if (!config) return { title: 'Preview not found', robots: { index: false, follow: false } }

  const expired = isExpired(config)
  const indexable = !expired && config.indexable === true
  const primaryService = config.services[0]?.name ?? 'Service'

  return {
    title: `${config.business.name} | ${config.location.city}'s Trusted ${primaryService} Experts`,
    description: `${config.business.name} provides ${config.services
      .map((s) => s.name)
      .join(', ')} in ${config.location.city} and surrounding areas. ${config.about.yearsExperience}+ years of trusted service. Call ${config.business.phone}.`,
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
  }
}

function buildLocalBusinessJsonLd(
  config: NonNullable<Awaited<ReturnType<typeof getContractorConfig>>>,
) {
  const aggregate =
    config.reviews.length > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: (
              config.reviews.reduce((s, r) => s + r.rating, 0) / config.reviews.length
            ).toFixed(1),
            reviewCount: config.reviews.length,
          },
        }
      : {}

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: config.business.name,
    description: config.business.tagline,
    telephone: config.business.phone,
    email: config.business.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: config.location.city,
      addressRegion: config.location.state,
    },
    areaServed: config.location.serviceAreas.map((a) => ({
      '@type': 'City',
      name: a,
    })),
    foundingDate: String(config.business.yearEstablished),
    ...aggregate,
    review: config.reviews.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      datePublished: r.date,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: 5,
      },
      reviewBody: r.text,
    })),
  }
}

export default async function PreviewPage({ params }: { params: { slug: string } }) {
  const config = await getContractorConfig(params.slug)
  if (!config) notFound()

  if (isExpired(config)) return <Expired />

  const tokens = STYLE_TOKENS[config.branding.style]
  const onPrimary = contrastTextColor(config.branding.primaryColor)
  const jsonLd = buildLocalBusinessJsonLd(config)

  return (
    <div
      className={fontClassName}
      style={{
        fontFamily: tokens.bodyFontFamily,
        color: '#1a1a1a',
        background: '#fff',
        minHeight: '100vh',
      }}
    >
      <style>{`
        :root {
          --primary: ${config.branding.primaryColor};
          --accent: ${config.branding.accentColor};
          --on-primary: ${onPrimary};
          --radius: ${tokens.radius};
          --section-py: ${tokens.sectionPaddingY};
        }
        .preview-heading {
          font-family: ${tokens.headingFontVar};
          font-weight: ${tokens.headingWeight};
          letter-spacing: ${tokens.headingLetterSpacing};
          text-transform: ${tokens.headingTextTransform};
        }
        @media (max-width: 720px) {
          :root { --section-py: 56px; }
        }
      `}</style>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header config={config} />
      <Hero config={config} />
      <Services config={config} />
      <About config={config} />
      <Reviews config={config} />
      <ServiceArea config={config} />
      <CallToAction config={config} />
      <Footer config={config} />
    </div>
  )
}

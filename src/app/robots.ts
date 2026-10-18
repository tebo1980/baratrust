import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/internal/', 
          '/api/', 
          '/preview/', 
          '/report/', 
          '/reality-check/*/questionnaire',
          '/dashboard/'
        ],
      },
    ],
    sitemap: 'https://baratrust.com/sitemap.xml',
    host: 'https://baratrust.com',
  }
}

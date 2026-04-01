import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/(payload)/', '/auth/', '/profile/', '/seeding'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

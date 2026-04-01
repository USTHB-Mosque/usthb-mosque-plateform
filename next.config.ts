import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  sassOptions: {
    includePaths: [path.resolve('node_modules'), path.resolve('node_modules/.pnpm')],
    silenceDeprecations: ['import'],
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false }

    config.resolve.alias = {
      ...config.resolve.alias,
      vars: path.resolve('node_modules/@payloadcms/ui/dist/scss/_vars.scss'),
    }

    return config
  },

  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/media/file/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
        pathname: '/api/media/file/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  headers: async () => {
    const isDevelopment = process.env.NODE_ENV === 'development'
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

    return [
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          {
            key: 'Access-Control-Allow-Origin',
            value: isDevelopment ? 'http://localhost:3000' : serverUrl,
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,DELETE,POST,PUT,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
          ...(!isDevelopment
            ? [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'X-XSS-Protection', value: '1; mode=block' },
                {
                  key: 'Referrer-Policy',
                  value: 'strict-origin-when-cross-origin',
                },
                {
                  key: 'Permissions-Policy',
                  value: 'camera=(), microphone=(), geolocation=()',
                },
              ]
            : []),
        ],
      },
      ...(!isDevelopment
        ? [
            {
              source: '/(.*)',
              headers: [
                {
                  key: 'Content-Security-Policy',
                  value: [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                    "style-src 'self' 'unsafe-inline'",
                    "img-src 'self' data: blob: http://127.0.0.1:* https://*.supabase.co",
                    "font-src 'self' data:",
                    "connect-src 'self' http://127.0.0.1:* https://*.supabase.co",
                    "frame-ancestors 'none'",
                    "base-uri 'self'",
                    "form-action 'self'",
                    "object-src 'none'",
                  ].join('; '),
                },
              ],
            },
          ]
        : []),
    ]
  },

  serverExternalPackages: ['payload', '@payloadcms/db-postgres'],
}

export default withPayload(nextConfig)

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
        protocol: 'https',
        hostname: 'usthb-mosque-plateform.vercel.app',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
    ],
  },
  headers: async () => {
    const isProduction = process.env.NODE_ENV === 'production'

    return [
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          {
            key: 'Access-Control-Allow-Origin',
            value: isProduction
              ? 'https://usthb-mosque-plateform.vercel.app'
              : 'http://localhost:3000',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,DELETE,POST,PUT,OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-apollo-operation-name',
          },
          ...(isProduction
            ? [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'X-XSS-Protection', value: '1; mode=block' },
                {
                  key: 'Referrer-Policy',
                  value: 'strict-origin-when-cross-origin',
                },
              ]
            : []),
        ],
      },
    ]
  },

  serverExternalPackages: ['payload', '@payloadcms/db-vercel-postgres'],
}

export default withPayload(nextConfig)

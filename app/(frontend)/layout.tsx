import './globals.css'
import React from 'react'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import QueryClientProvider from '@/lib/providers/query-client.provider'
import { Toaster } from '@/components/ui/sonner'

const khalidArt = localFont({
  src: '../../public/static/fonts/Khalid-Art-bold-Regular.ttf',
  variable: '--font-khalid',
})

const alyamama = localFont({
  src: [
    {
      path: '../../public/static/fonts/alyamama/ttf/Alyamama-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/static/fonts/alyamama/ttf/Alyamama-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/static/fonts/alyamama/ttf/Alyamama-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/static/fonts/alyamama/ttf/Alyamama-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/static/fonts/alyamama/ttf/Alyamama-ExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../../public/static/fonts/alyamama/ttf/Alyamama-Black.ttf',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-alyamama',
})

const dubai = localFont({
  src: [
    {
      path: '../../public/static/fonts/dubai/Dubai-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/static/fonts/dubai/Dubai-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/static/fonts/dubai/Dubai-Medium.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/static/fonts/dubai/Dubai-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-dubai',
})

export const metadata: Metadata = {
  title: 'مسجد USTHB - المنصة الرقمية',
  description: 'المنصة الرقمية لمسجد جامعة العلوم والتكنولوجيا هواري بومدين - مكتبة، أنشطة، مقالات وإدارة الاستعارة',
  openGraph: {
    type: 'website',
    locale: 'ar_DZ',
    siteName: 'مسجد USTHB',
    title: 'مسجد USTHB - المنصة الرقمية',
    description: 'المنصة الرقمية لمسجد جامعة العلوم والتكنولوجيا هواري بومدين',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'مسجد USTHB - المنصة الرقمية',
    description: 'المنصة الرقمية لمسجد جامعة العلوم والتكنولوجيا هواري بومدين',
  },
  robots: {
    index: true,
    follow: true,
  },
}

const RootLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <html
      lang="ar"
      dir="ltr"
      className={`${khalidArt.variable} ${alyamama.variable} ${dubai.variable}`}
    >
      <body suppressHydrationWarning>
        <Toaster richColors position="top-center" />
        <QueryClientProvider>{children}</QueryClientProvider>
      </body>
    </html>
  )
}

export default RootLayout

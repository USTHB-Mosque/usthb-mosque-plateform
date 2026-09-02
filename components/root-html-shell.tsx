import '../app/(frontend)/globals.css'
import React from 'react'
import Script from 'next/script'
import localFont from 'next/font/local'
import QueryClientProvider from '@/lib/providers/query-client.provider'
import ThemeProvider from '@/components/theme-provider'
import ThemeScopeGuard from '@/components/theme-scope-guard'
import { Toaster } from '@/components/ui/sonner'

const khalidArt = localFont({
  src: '../public/static/fonts/Khalid-Art-bold-Regular.ttf',
  variable: '--font-khalid',
})

const alyamama = localFont({
  src: [
    {
      path: '../public/static/fonts/alyamama/ttf/Alyamama-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/static/fonts/alyamama/ttf/Alyamama-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/static/fonts/alyamama/ttf/Alyamama-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/static/fonts/alyamama/ttf/Alyamama-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/static/fonts/alyamama/ttf/Alyamama-ExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../public/static/fonts/alyamama/ttf/Alyamama-Black.ttf',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-alyamama',
})

const dubai = localFont({
  src: [
    {
      path: '../public/static/fonts/dubai/Dubai-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/static/fonts/dubai/Dubai-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/static/fonts/dubai/Dubai-Medium.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/static/fonts/dubai/Dubai-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-dubai',
})

const uthmanic = localFont({
  src: '../public/static/fonts/KFGQPC_Uthmanic_Script_HAFS.otf',
  variable: '--font-uthmanic',
})

const RootHtmlShell: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${khalidArt.variable} ${alyamama.variable} ${dubai.variable} ${uthmanic.variable}`}
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document -- runs pre-paint in the App Router html shell */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var c=document.documentElement.classList;c.remove('light','dark');var p=window.location.pathname;var portal=p==='/user'||p.indexOf('/user/')===0||p==='/member-portal'||p.indexOf('/member-portal/')===0;var admin=p==='/admin'||p.indexOf('/admin/')===0;var t=localStorage.getItem('theme');var dark=(portal||admin)?(t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches):false;c.add(dark?'dark':'light');document.documentElement.style.colorScheme=dark?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <ThemeScopeGuard />
          <Toaster richColors position="top-center" />
          <QueryClientProvider>{children}</QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

export default RootHtmlShell

import type { Metadata } from 'next'
import RootHtmlShell from '@/components/root-html-shell'

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

const FrontendLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return <RootHtmlShell>{children}</RootHtmlShell>
}

export default FrontendLayout

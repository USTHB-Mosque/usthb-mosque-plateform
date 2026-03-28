import React from 'react'
import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import Layout from '@/components/layouts'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'الصفحة غير موجودة',
  description: 'لم يتم العثور على الصفحة المطلوبة.',
}

const NotFoundPage: React.FC = () => {
  return (
    <Layout className="min-h-[60vh] flex flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 text-center">
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 mx-auto h-40 w-40 rounded-full bg-primary/15 blur-3xl"
          />
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-muted bg-muted/5 px-10 py-12 sm:px-14">
            <FileQuestion className="h-16 w-16 text-primary/80" strokeWidth={1.25} aria-hidden />
            <p className="font-khalid text-7xl leading-none text-secondary sm:text-8xl">404</p>
          </div>
        </div>

        <div className="max-w-lg space-y-3">
          <h1 className="font-khalid text-3xl text-secondary sm:text-4xl">الصفحة غير موجودة</h1>
          <p className="text-lg text-muted-foreground">
            يبدو أن الرابط غير صحيح أو أن الصفحة قد نُقلت. يمكنك العودة إلى الصفحة الرئيسية ومتابعة
            التصفح.
          </p>
        </div>

        <Button asChild size="lg" className="rounded-full px-8">
          <Link href="/">العودة إلى الرئيسية</Link>
        </Button>
      </div>
    </Layout>
  )
}

export default NotFoundPage

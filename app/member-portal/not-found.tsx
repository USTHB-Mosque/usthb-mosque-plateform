import React from 'react'
import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/shared/ui/button'

const MemberPortalNotFound: React.FC = () => {
  return (
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
          يبدو أن الرابط غير صحيح أو أن الصفحة قد نُقلت. يمكنك العودة إلى لوحة التحكم ومتابعة
          التصفح.
        </p>
      </div>

      <Link href="/user/dashboard">
        <Button size="lg" className="rounded-full px-8">
          العودة إلى لوحة التحكم
        </Button>
      </Link>
    </div>
  )
}

export default MemberPortalNotFound

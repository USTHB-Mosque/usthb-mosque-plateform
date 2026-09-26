import React from 'react'
import { Card, CardHeader } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { FileText } from 'lucide-react'
import { Activity } from '@/payload-types'

interface ActivityInformationsProps {
  longDescription: Activity['longDescription']
}

const ActivityInformations = ({ longDescription }: ActivityInformationsProps) => {
  if (!longDescription) {
    return (
      <Card className="p-4 ring-0 border border-border">
        <div className="flex flex-col gap-2.5">
          <CardHeader className="text-xl font-bold p-0 pb-2.5">عن الدورة</CardHeader>
          <Separator />
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileText className="size-8 mb-2 opacity-40" />
            <p className="text-sm">لا يوجد وصف متاح</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 ring-0 border border-border">
      <div className="flex flex-col gap-2.5">
        <CardHeader className="text-xl font-bold p-0 pb-2.5">عن الدورة</CardHeader>
        <Separator />
        <div
          dir="rtl"
          className="prose prose-sm max-w-none font-yamama text-right
                     prose-headings:font-khalid prose-headings:text-secondary prose-headings:mt-0
                     prose-strong:text-primary prose-p:leading-relaxed"
        >
          <RichText data={longDescription} />
        </div>
      </div>
    </Card>
  )
}

export default ActivityInformations

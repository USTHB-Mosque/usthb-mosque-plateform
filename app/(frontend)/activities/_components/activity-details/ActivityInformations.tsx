import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { generateLexicalRichText } from '@/scripts/db/seed/shared/rich-text'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { Timer } from 'lucide-react'
import { Activity } from '@/payload-types'

interface ActivityInformationsProps {
  longDescription: Activity['longDescription']
  benefits: Activity['benefits']
}
const data = generateLexicalRichText() as any

const ActivityInformations = ({ longDescription, benefits }: ActivityInformationsProps) => {
  return (
    <Card className="p-6 space-y-6">
      <CardHeader className="flex gap-2.5">
        <div className="w-1.25 h-full py-2 text-primary" />
        <CardTitle className="text-secondary text-3xl font-bold">عن الدورة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {longDescription ? <RichText data={longDescription} /> : null}
        <div className="grid grid-cols-2 gap-6">
          {benefits.map((benefit) => (
            <div key={benefit.id} className="bg-background-2 flex gap-4 p-4 rounded-xl">
              <Timer className="text-primary size-5" />
              <p>{benefit.name}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityInformations

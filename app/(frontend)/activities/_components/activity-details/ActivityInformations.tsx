import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { generateLexicalRichText } from '@/actions/seed/utils'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { Timer } from 'lucide-react'

type Props = {}
const data = generateLexicalRichText() as any

const ActivityInformations = (props: Props) => {
  return (
    <Card className="p-6 space-y-6">
      <CardHeader className="flex gap-2.5">
        <div className="w-1.25 h-full py-2 text-primary" />
        <CardTitle className="text-secondary text-3xl font-bold">عن الدورة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RichText data={data} />
        <div className="grid grid-cols-2 gap-6">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="bg-background-2 flex gap-4 p-4 rounded-xl">
                <Timer className="text-primary size-5" />
                <p>نشر الوعي بأحكام الصيام بأسلوب مبسّط ومنهجي.</p>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default ActivityInformations

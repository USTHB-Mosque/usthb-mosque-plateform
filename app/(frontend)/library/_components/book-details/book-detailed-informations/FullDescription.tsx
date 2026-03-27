import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

interface FullDescriptionProps {
  longDescription: SerializedEditorState | null | undefined
}

const FullDescription: React.FC<FullDescriptionProps> = ({ longDescription }) => {
  return (
    <Card className="p-4 border-none shadow-none bg-transparent">
      <CardContent>
        <div
          dir="rtl"
          className="prose prose-lg max-w-none font-yamama text-right 
                     prose-headings:font-khalid prose-headings:text-secondary 
                     prose-strong:text-primary prose-p:leading-relaxed"
        >
          {longDescription ? <RichText data={longDescription} /> : null}
        </div>
      </CardContent>
    </Card>
  )
}

export default FullDescription

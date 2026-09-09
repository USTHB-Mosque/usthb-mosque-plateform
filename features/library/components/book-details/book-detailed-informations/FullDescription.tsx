import React from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { Separator } from '@/shared/ui/separator'
import { BookA, BookIcon, Building, Languages, Tag, Timer, FileText } from 'lucide-react'
import { Book } from '@/payload-types'
import { format } from 'date-fns'
import { languagesConfig } from '@/utils/constants/data'

interface FullDescriptionProps {
  longDescription: SerializedEditorState | null | undefined
  publisher: Book['publisher']
  language: Book['language']
  pageCount: Book['pageCount']
  isbn: Book['isbn']
  publishDate: Book['publishDate']
  editionNumber: Book['editionNumber']
}

const FullDescription: React.FC<FullDescriptionProps> = ({
  longDescription,
  publishDate,
  publisher,
  language,
  pageCount,
  editionNumber,
  isbn,
}) => {
  const hasMetadata = publisher || publishDate || language || isbn || pageCount || editionNumber

  if (!longDescription && !hasMetadata) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="size-10 mb-3 opacity-40" />
        <p className="text-sm">لا يوجد وصف متاح لهذا الكتاب</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {longDescription ? (
        <div
          dir="rtl"
          className="prose prose-lg max-w-none font-yamama text-right 
                     prose-headings:font-khalid prose-headings:text-secondary 
                     prose-strong:text-primary prose-p:leading-relaxed"
        >
          <RichText data={longDescription} />
        </div>
      ) : null}
      {hasMetadata && (
        <>
          {longDescription && <Separator />}
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-4">
            {publisher ? (
              <div className="flex gap-2">
                <Building className="size-6 text-primary" />
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">دار النشر</p>
                  <p className="font-bold">{publisher}</p>
                </div>
              </div>
            ) : null}
            {publishDate ? (
              <div className="flex gap-2">
                <Timer className="size-6 text-primary" />
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">تاريخ النشر</p>
                  <p className="font-bold">{format(publishDate, 'yyyy')}</p>
                </div>
              </div>
            ) : null}
            {language ? (
              <div className="flex gap-2">
                <Languages className="size-6 text-primary" />
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">اللغة</p>
                  <p className="font-bold">
                    {languagesConfig[language] ? languagesConfig[language] : language}
                  </p>
                </div>
              </div>
            ) : null}
            {isbn ? (
              <div className="flex gap-2">
                <Tag className="size-6 text-primary" />
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">رقم ISBN</p>
                  <p className="font-bold">{isbn}</p>
                </div>
              </div>
            ) : null}
            {pageCount !== undefined && pageCount !== null ? (
              <div className="flex gap-2">
                <BookIcon className="size-6 text-primary" />
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">عدد الصفحات</p>
                  <p className="font-bold">{pageCount} صفحة</p>
                </div>
              </div>
            ) : null}
            {editionNumber ? (
              <div className="flex gap-2">
                <BookA className="size-6 text-primary" />
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">الطبعة</p>
                  <p className="font-bold">{editionNumber}</p>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

export default FullDescription

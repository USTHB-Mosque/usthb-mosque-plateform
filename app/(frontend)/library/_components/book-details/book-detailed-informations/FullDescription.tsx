import React, { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

const FullDescription = () => {
  const [expanded, setExpanded] = useState(false)

  const summary = `هذا الكتاب يقدّم دراسة موسعة لعالم التفسير وعلوم القرآن، معتمدًا على مصادر التراث الرصينة وعرضًا معاصرًا للعقول العربية. يتضمن تفسيرًا موجزًا واضحًا وسلسًا، وأساليب للتدبر والتطبيق في الحياة اليومية.`

  const details = `
يتناول الكتاب فصولًا متكاملة حول:
- مبادئ التفسير وقواعده
- أسرار ومفردات القرآن الكريم
- قصص الأنبياء وتحليل المعاني
- الأخلاق في القرآن والسلوك النبوي
- تطبيقات عملية في المجتمع الحديث

في كل فصل، يرتكز على التوثيق من خلال الأحاديث النبوية و أقوال السلف، مع مقارنة سريعة مع مؤلفات مهمة في نفس الحقل. القراءة مناسبة للباحثين والمبتدئين والمحاضرين.
`

  return (
    <Card className="p-4 space-y-4">
      <CardHeader className="text-base">الوصف الكامل</CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">وصف قصير</p>
        <p className="text-secondary dark:text-slate-100">{summary}</p>

        <div className="border border-border rounded-xl bg-muted/20 p-4">
          <p className="text-sm font-bold">محتويات الفصل</p>
          <ul className="mt-2 list-disc space-y-1 pr-4 text-sm">
            <li>التقديم والسياق العلمي</li>
            <li>تحليل الألفاظ والأحكام</li>
            <li>ربط الآيات بحياة المسلم</li>
            <li>خلاصة العملية وملاحظات تطبيقية</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Button className="w-full justify-between" onClick={() => setExpanded((prev) => !prev)}>
            {expanded ? 'إخفاء التفاصيل' : 'عرض المزيد'}
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          {expanded && (
            <div className="rounded-lg border border-border p-4 bg-background text-sm leading-relaxed">
              {details.split('\n').map((line, idx) =>
                line.trim() ? (
                  <p key={`${line}-${idx}`} className="mb-2">
                    {line}
                  </p>
                ) : null,
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default FullDescription

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader } from '@/components/ui/card'
import { User } from 'lucide-react'

interface BookDetailsBenefitsProps {}

const BookDetailsBenefits: React.FC<BookDetailsBenefitsProps> = () => {
  return (
    <Card className="p-6">
      <CardHeader className="flex justify-between p-0 space-y-4">
        <p className="text-foreground text-4xl">الفوائد</p>
        <div className="flex gap-4">
          <Badge className="bg-primary/15 text-primary text-base">قرآن</Badge>
          <Badge className="bg-primary/15 text-primary text-base">تفسير</Badge>
        </div>
      </CardHeader>
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <User className="text-primary size-4" />
          <p className="font-bold">ابن القيم الجوزية</p>
        </div>
        <p>
          كتاب الفوائد هو مجموعة من الحكم والفوائد التي جمعها الإمام ابن القيم الجوزية رحمه الله،
          يحتوي على درر من العلم والحكمة في مختلف أبواب الدين والدنيا. يتميز الكتاب بأسلوبه السهل
          الممتنع وعمق معانيه، حيث يجمع بين العلم والعمل، والفقه والتربية، والعقيدة والسلوك.
        </p>
      </div>
    </Card>
  )
}

export default BookDetailsBenefits

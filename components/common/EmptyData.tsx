import React from 'react'
import { SearchX, BookOpen } from 'lucide-react'

interface EmptyStateProps {
  title: string
}

const EmptyData: React.FC<EmptyStateProps> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-muted rounded-3xl bg-muted/5">
      <div className="relative mb-6">
        <BookOpen className="w-16 h-16 text-muted-foreground/20" />
        <SearchX className="w-8 h-8 text-primary absolute -bottom-2 -right-2" />
      </div>

      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-8">
        جرب تغيير كلمات البحث أو الفلاتر المختارة لاستكشاف عناوين أخرى.
      </p>
    </div>
  )
}

export default EmptyData

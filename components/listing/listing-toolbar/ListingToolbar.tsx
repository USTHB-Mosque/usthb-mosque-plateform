import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Funnel } from 'lucide-react'

const ListingToolbar: React.FC = () => {
  return (
    <div className="flex justify-between">
      <div className="flex gap-3">
        <Button>
          <Funnel />
        </Button>
        <div className="relative">
          <Input placeholder="اسم الكتاب / المؤلف ..." className="pr-10 bg-background" />
          <Search className="absolute top-1/2 right-3 -translate-y-1/2" />
        </div>
      </div>

      <div className="flex gap-3">
        <Button>تفسير</Button>
        <Button>تفسير</Button>
        <Button>تفسير</Button>
        <Button>تفسير</Button>
        <Button>تفسير</Button>
        <Button>تفسير</Button>
      </div>
    </div>
  )
}

export default ListingToolbar

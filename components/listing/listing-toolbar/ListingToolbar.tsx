import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Funnel } from 'lucide-react'
import { useDisclosure } from '@/hooks/use-disclosure'
import ListingFiltersDialog from './ListingFiltersDialog'

const ListingToolbar: React.FC = () => {
  const openFiltersDisclosure = useDisclosure()

  return (
    <>
      <div className="flex justify-between">
        <div className="flex gap-3">
          <Button onClick={openFiltersDisclosure.onOpen}>
            <Funnel />
          </Button>
          <div className="relative">
            <Input placeholder="اسم الكتاب / المؤلف ..." className="pr-10 bg-background" />
            <Search className="absolute top-1/2 right-3 -translate-y-1/2 w-6 h-6 text-primary" />
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
      <ListingFiltersDialog
        isOpen={openFiltersDisclosure.isOpen}
        setIsOpen={openFiltersDisclosure.setIsOpen}
      />
    </>
  )
}

export default ListingToolbar

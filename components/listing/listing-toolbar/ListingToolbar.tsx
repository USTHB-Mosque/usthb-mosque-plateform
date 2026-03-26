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
      <div className="flex gap-4 justify-between">
        <div className="flex gap-3">
          <Button onClick={openFiltersDisclosure.onOpen}>
            <Funnel />
          </Button>
          <div className="relative w-full lg:w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="اسم الكتاب / المؤلف ..."
              className="pr-10 bg-background w-full rounded-xl"
            />
          </div>
        </div>

        <div className="flex justify-end flex-wrap gap-3">
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

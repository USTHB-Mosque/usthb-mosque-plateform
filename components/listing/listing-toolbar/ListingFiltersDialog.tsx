import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BookOpenCheck, Languages, Tag, User } from 'lucide-react'
import ListingFiltersGroup from './ListingFiltersGroup'
import Separator from '@/components/ui/separator'

const categories = Array.from({ length: 10 }, (_, i) => ({
  value: `category-${i + 1}`,
  label: `تفسير ${i + 1}`,
}))
const authors = Array.from({ length: 10 }, (_, i) => ({
  value: `author-${i + 1}`,
  label: `ابن كثير ${i + 1}`,
}))
const availability = [
  {
    value: 'available',
    label: 'الكل',
    buttonClassName: 'flex-1',
  },
  {
    value: 'borrowed',
    label: 'متوفر',
    buttonClassName: 'flex-1',
  },
  {
    value: 'borrowed',
    label: 'غير متوفر',
    buttonClassName: 'flex-1',
  },
]
const languages = [
  {
    value: 'all',
    label: 'جميع اللغات',
    buttonClassName: 'flex-1',
  },
  {
    value: 'arabic',
    label: 'العربية',
    buttonClassName: 'flex-1',
  },
  {
    value: 'french',
    label: 'الفرنسية',
    buttonClassName: 'flex-1',
  },
  {
    value: 'english',
    label: 'الإنجليزية',
    buttonClassName: 'flex-1',
  },
]

interface ListingFiltersDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

const ListingFiltersDialog: React.FC<ListingFiltersDialogProps> = ({ isOpen, setIsOpen }) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent showCloseButton={false} className="max-w-3xl">
        <DialogHeader>
          <div className="flex justify-between">
            <p className="text-2xl font-bold">خيارات التصفية</p>
            <Button variant="outline" className="border border-primary text-primary">
              إعادة تعيين
            </Button>
          </div>
        </DialogHeader>
        <Separator />
        <div className="flex flex-col gap-10">
          <ListingFiltersGroup title="التصنيفات" icon={<Tag />} filters={categories} />
          <ListingFiltersGroup title="المؤلفون" icon={<User />} filters={authors} />
          <ListingFiltersGroup title="التوفر" icon={<BookOpenCheck />} filters={availability} />
          <ListingFiltersGroup title="اللغة" icon={<Languages />} filters={languages} />
        </div>
        <Separator />

        <DialogFooter>
          <Button variant="outline" className="border border-primary text-primary">
            إلغاء
          </Button>
          <Button className="text-foreground">تطبيق التصفية</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ListingFiltersDialog

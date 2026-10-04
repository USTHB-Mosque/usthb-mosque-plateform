'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import ConfirmDialog from '@/shared/ui/confirm-dialog'
import { updateAdminProfilePicture, removeAdminProfilePicture } from '../../server/profile-picture'
import { compressImage } from '@/utils/image-compress'

export default function ProfilePictureControl({ hasPicture }: { hasPicture: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [removing, setRemoving] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return (
    <div className="flex gap-1 rounded-lg bg-background p-1 shadow-sm">
      <input
        ref={input}
        type="file"
        className="sr-only"
        aria-label="ملف الصورة الشخصية"
        accept="image/png,image/jpeg,image/webp"
        disabled={pending}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          startTransition(async () => {
            try {
              if (file.size > 5 * 1024 * 1024) {
                toast.error('الصورة تتجاوز 5 ميغابايت')
                return
              }
              const data = new FormData()
              data.set('picture', await compressImage(file))
              const result = await updateAdminProfilePicture(data)
              if (!result.ok) {
                toast.error(result.error)
                return
              }
              toast.success('تم تحديث الصورة الشخصية')
              router.refresh()
            } catch {
              toast.error('تعذر تحديث الصورة الشخصية')
            }
          })
        }}
      />
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="تغيير الصورة الشخصية"
        onClick={() => input.current?.click()}
        disabled={pending}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </Button>
      {hasPicture && (
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label="حذف الصورة الشخصية"
          disabled={pending}
          onClick={() => setRemoving(true)}
        >
          <Trash2 className="size-4 text-destructive" aria-hidden="true" />
        </Button>
      )}
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title="حذف الصورة الشخصية؟"
        description="سيعود الحساب إلى الصورة الافتراضية."
        confirmLabel="حذف الصورة"
        busy={pending}
        onConfirm={() =>
          startTransition(async () => {
            const result = await removeAdminProfilePicture()
            if (!result.ok) {
              toast.error(result.error)
              return
            }
            setRemoving(false)
            toast.success('تم حذف الصورة الشخصية')
            router.refresh()
          })
        }
      />
    </div>
  )
}

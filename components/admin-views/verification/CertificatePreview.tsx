'use client'

import React, { useState } from 'react'
import { FileText, ShieldAlert } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import type { Media } from '@/payload-types'
import { getProtectedMediaUrl } from '@/shared/lib/image-utils'

interface CertificatePreviewProps {
  document: Media | undefined
  /** Rendered next to the button, e.g. the approve/reject buttons in the queue. */
  actions?: React.ReactNode
}

/**
 * The school certificate an applicant uploaded (#145).
 *
 * It is owner-scoped private media, so the preview never reads `media.url`
 * directly: `getProtectedMediaUrl` hands back a `/api/media/file/...` path or
 * nothing at all. A direct bucket URL would let anyone holding it read the
 * document without passing the collection's access check, so when the URL is not
 * a protected path the preview says it cannot show the file rather than
 * rendering something that looks like it worked.
 */
const CertificatePreview: React.FC<CertificatePreviewProps> = ({ document, actions }) => {
  const [open, setOpen] = useState(false)

  if (!document) {
    return <span className="text-xs text-muted-foreground">لا توجد وثيقة مرفقة</span>
  }

  const url = getProtectedMediaUrl(document.url)
  if (!url) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
        <ShieldAlert className="size-4" />
        تعذر عرض الوثيقة
      </span>
    )
  }

  const isPdf = document.mimeType === 'application/pdf'

  return (
    <div className="flex items-center gap-2">
      {isPdf ? null : (
        // Previewed inline so an admin can judge the document without leaving
        // the queue (Figma `users/requests`); the button opens it full size.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-testid="certificate-preview-image"
          src={url}
          alt={document.alt ?? 'وثيقة التحقق'}
          className="size-10 rounded-lg border border-border object-cover"
        />
      )}
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} aria-label="عرض الوثيقة">
        <FileText className="size-4" />
        وثيقة التحقق
      </Button>
      {actions}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl" showCloseButton>
          <DialogHeader>
            <DialogTitle className="font-alyamama text-lg">وثيقة التحقق</DialogTitle>
          </DialogHeader>

          {isPdf ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-muted-foreground">
                الوثيقة ملف PDF، افتحها لعرضها بالمتصفح.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-300 underline"
              >
                فتح الوثيقة
              </a>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                data-testid="certificate-dialog-image"
                src={url}
                alt={document.alt ?? 'وثيقة التحقق'}
                className="max-h-[60vh] w-full object-contain"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CertificatePreview

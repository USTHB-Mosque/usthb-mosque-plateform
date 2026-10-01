'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Loader2 } from 'lucide-react'

/**
 * The confirmation step SPEC requires before any destructive or mutating
 * action. Fully parameterised so the caller owns the wording — the danger is
 * in the sentence, not in the component.
 */
interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  /** Defaults to إلغاء — a plain close, which is what most callers want. */
  cancelLabel?: string
  busy?: boolean
  onConfirm: () => void
  /**
   * The second out, when the alternative to confirming is an action of its own
   * (#100's duplicate-loan warning offers refuse-with-reason, not a dismissal).
   * Defaults to closing the dialog.
   */
  onCancel?: () => void
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'إلغاء',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : onOpenChange(false))}>
      <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => (onCancel ? onCancel() : onOpenChange(false))}
          >
            {cancelLabel}
          </Button>
          <Button type="button" disabled={busy} className="gap-2" onClick={onConfirm}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDialog

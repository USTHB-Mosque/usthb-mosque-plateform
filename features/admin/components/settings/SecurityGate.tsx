'use client'

import { createContext, useCallback, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import ReauthenticationDialog from './ReauthenticationDialog'
import RecoveryCodesPanel from './RecoveryCodesPanel'

export const RecoveryCodesContext = createContext<((codes: string[]) => void) | null>(null)

export default function SecurityGate({
  expiresAt,
  children,
}: {
  expiresAt: string | null
  children: ReactNode
}) {
  const [confirmedUntil, setConfirmedUntil] = useState<string>()
  const [open, setOpen] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>()
  const until = Math.max(
    expiresAt ? Date.parse(expiresAt) : 0,
    confirmedUntil ? Date.parse(confirmedUntil) : 0,
  )
  const subscribe = useCallback(
    (changed: () => void) => {
      const timer = setTimeout(changed, Math.max(0, until - Date.now()) + 1)
      return () => clearTimeout(timer)
    },
    [until],
  )
  const snapshot = useCallback(() => until > Date.now(), [until])
  const serverSnapshot = useCallback(() => until > 0, [until])
  const recent = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  return (
    <RecoveryCodesContext.Provider value={setRecoveryCodes}>
      {recent ? (
        children
      ) : (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-stroke-grey bg-background-2 p-6">
          <ShieldCheck className="size-8 text-primary-300" aria-hidden="true" />
          <p className="text-base text-foreground">أكّد هويتك قبل إدارة إعدادات الحماية.</p>
          <Button type="button" onClick={() => setOpen(true)}>
            تأكيد الهوية للمتابعة
          </Button>
        </div>
      )}
      {open && (
        <ReauthenticationDialog open onOpenChange={setOpen} onVerified={setConfirmedUntil} />
      )}
      {recoveryCodes && (
        <RecoveryCodesPanel
          codes={recoveryCodes}
          onAcknowledged={() => setRecoveryCodes(undefined)}
        />
      )}
    </RecoveryCodesContext.Provider>
  )
}

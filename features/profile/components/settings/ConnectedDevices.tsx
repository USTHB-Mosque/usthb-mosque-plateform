'use client'

import React, { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { Monitor, Smartphone, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@/payload-types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

type Session = NonNullable<User['sessions']>[number]

type ConnectedDevicesProps = {
  sessions?: Session[] | null
  currentSessionId?: string | null
  onRevoke?: (
    sessionId: string,
    currentPassword: string,
  ) => Promise<{ ok: boolean; error?: string }>
}

function dateLabel(value?: string | null): string {
  if (!value) return 'غير محدد'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'غير محدد'
    : format(date, 'dd/MM/yyyy - HH:mm', { locale: arDZ })
}

const ConnectedDevices: React.FC<ConnectedDevicesProps> = ({
  sessions = [],
  currentSessionId,
  onRevoke,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [pending, startTransition] = useTransition()
  const activeSessions = (sessions ?? []).filter(
    (session) => new Date(session.expiresAt) > new Date(),
  )

  const revoke = (sessionId: string) => {
    if (!onRevoke) return
    startTransition(async () => {
      const result = await onRevoke(sessionId, password)
      if (!result.ok) {
        toast.error(result.error ?? 'تعذر تسجيل خروج الجهاز')
        return
      }
      toast.success('تم تسجيل خروج الجهاز')
      setSelectedId(null)
      setPassword('')
    })
  }

  return (
    <div className="flex flex-col self-stretch gap-4">
      {activeSessions.length === 0 ? (
        <p className="rounded-xl border border-stroke-grey bg-background-2 p-8 text-center text-sm text-grey-500">
          لا توجد أجهزة مرتبطة حالياً.
        </p>
      ) : (
        <div className="self-stretch rounded-xl border border-solid border-stroke-grey bg-background-2">
          {activeSessions.map((session, index) => {
            const isCurrent = session.id === currentSessionId
            const Icon = isCurrent ? Monitor : Smartphone
            return (
              <div
                key={session.id}
                className={`flex flex-col gap-4 p-5 ${index !== activeSessions.length - 1 ? 'border-b border-stroke-grey' : ''}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-main-15">
                      <Icon className="h-5 w-5 text-primary-300" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-alyamama text-[#243245]">
                        {isCurrent ? 'هذا الجهاز' : 'جلسة نشطة'}
                      </span>
                      <span className="text-sm text-grey-500">
                        تاريخ تسجيل الدخول: {dateLabel(session.createdAt)}
                      </span>
                      <span className="text-sm text-grey-500">
                        تنتهي الجلسة: {dateLabel(session.expiresAt)}
                      </span>
                    </div>
                  </div>
                  {onRevoke && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        setSelectedId(selectedId === session.id ? null : session.id)
                        setPassword('')
                      }}
                    >
                      <LogOut className="me-1 size-4" />
                      تسجيل الخروج
                    </Button>
                  )}
                </div>
                {selectedId === session.id && (
                  <form
                    className="flex flex-wrap items-end gap-3"
                    onSubmit={(event) => {
                      event.preventDefault()
                      revoke(session.id)
                    }}
                  >
                    <label className="flex min-w-56 flex-col gap-1 text-sm">
                      كلمة المرور الحالية للتأكيد
                      <Input
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={pending}
                        required
                      />
                    </label>
                    <Button type="submit" variant="destructive" disabled={pending || !password}>
                      تأكيد تسجيل الخروج
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedId(null)}
                      disabled={pending}
                    >
                      إلغاء
                    </Button>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ConnectedDevices

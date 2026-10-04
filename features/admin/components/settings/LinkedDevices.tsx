'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Monitor, Smartphone, MoreVertical } from 'lucide-react'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import type { User } from '@/payload-types'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import ConfirmDialog from '@/shared/ui/confirm-dialog'
import { revokeAdminSession } from '../../server/account'

export default function LinkedDevices({
  sessions,
  currentSessionId,
}: {
  sessions: User['sessions']
  currentSessionId: string | null
}) {
  const [selected, setSelected] = useState<string>()
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const active = (sessions ?? []).filter((session) => new Date(session.expiresAt) > new Date())
  return (
    <div className="max-w-[632px] space-y-6">
      <p className="text-sm text-muted-foreground">قائمة لكل الأجهزة المرتبطة بحسابك</p>
      {!active.length ? (
        <p className="rounded-xl border border-stroke-grey bg-background-2 p-6 text-muted-foreground">
          لا توجد جلسات نشطة.
        </p>
      ) : (
        <div className="divide-y divide-stroke-grey rounded-xl border border-stroke-grey bg-background-2">
          {active.map((session) => {
            const current = session.id === currentSessionId
            const Icon = current ? Monitor : Smartphone
            return (
              <div key={session.id} className="flex items-start justify-between gap-4 p-5">
                <div className="flex min-w-0 gap-4">
                  <Icon className="size-9 shrink-0 text-primary-300" aria-hidden="true" />
                  <div className="min-w-0 space-y-3">
                    <h3 className="font-semibold">{current ? 'هذا الجهاز' : 'جلسة نشطة'}</h3>
                    <p className="text-sm text-muted-foreground" data-testid="device-time">
                      تاريخ تسجيل الدخول:{' '}
                      {session.createdAt
                        ? format(new Date(session.createdAt), 'dd/MM/yyyy HH:mm', { locale: arDZ })
                        : 'غير محدد'}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid="device-time">
                      تنتهي الجلسة:{' '}
                      {format(new Date(session.expiresAt), 'dd/MM/yyyy HH:mm', { locale: arDZ })}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={current ? 'إدارة هذا الجهاز' : 'إدارة الجلسة'}
                        disabled={pending}
                      />
                    }
                  >
                    <MoreVertical aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem variant="destructive" onClick={() => setSelected(session.id)}>
                      تسجيل خروج الجهاز
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(undefined)
        }}
        title="تسجيل خروج الجهاز؟"
        description="ستُلغى الجلسة فوراً ولن يعمل رمز الدخول الخاص بها."
        confirmLabel="تسجيل خروج الجهاز"
        busy={pending}
        onConfirm={() =>
          startTransition(async () => {
            if (!selected) return
            const result = await revokeAdminSession(selected, '')
            if (!result.ok) {
              setError(result.error)
              setSelected(undefined)
              return
            }
            if (selected === currentSessionId) router.push('/auth/login')
            setSelected(undefined)
            router.refresh()
          })
        }
      />
    </div>
  )
}

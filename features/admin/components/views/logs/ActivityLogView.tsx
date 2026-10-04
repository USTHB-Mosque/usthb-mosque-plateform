'use client'

import React, { useState, useTransition } from 'react'
import { Card, CardContent } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Clock } from 'lucide-react'
import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import { toast } from 'sonner'
import type { Log, User } from '@/payload-types'
import { getAdminLogs } from '@/features/admin/server/logs'
import {
  logActionLabels,
  type LogActionValue,
  type LogsQuery,
} from '@/features/admin/server/logs-core'

type LogPage = Awaited<ReturnType<typeof getAdminLogs>>

function actorName(actor: User | number | null | undefined): string {
  if (!actor) return 'نظام'
  if (typeof actor === 'number') return `#${actor}`
  return (
    actor.fullName || [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.email
  )
}

interface ActivityLogViewProps {
  initial: LogPage
}

export default function ActivityLogView({ initial }: ActivityLogViewProps) {
  const [pending, startTransition] = useTransition()
  const [page, setPage] = useState<LogPage>(initial)
  const [action, setAction] = useState<string>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [actorId, setActorId] = useState('')

  const runQuery = (query: LogsQuery) => {
    startTransition(async () => {
      const result = await getAdminLogs(query)
      setPage(result)
    })
  }

  const applyFilters = () => {
    const query: LogsQuery = {
      page: 1,
      limit: 50,
      action: action ? (action as LogActionValue) : undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to + 'T23:59:59').toISOString() : undefined,
      actor: actorId ? Number(actorId) : undefined,
    }
    runQuery(query)
  }

  const resetFilters = () => {
    setAction('')
    setFrom('')
    setTo('')
    setActorId('')
    runQuery({ page: 1, limit: 50 })
  }

  const loadMore = () => {
    const query: LogsQuery = {
      page: (page.page ?? 1) + 1,
      limit: 50,
      action: action ? (action as LogActionValue) : undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to + 'T23:59:59').toISOString() : undefined,
      actor: actorId ? Number(actorId) : undefined,
    }
    startTransition(async () => {
      const result = await getAdminLogs(query)
      setPage({
        ...result,
        groups: result.groups,
        logs: [...page.logs, ...result.logs],
      })
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            نوع العملية
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
            >
              <option value="">الكل</option>
              {Object.entries(logActionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            من تاريخ
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-40"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            إلى تاريخ
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 w-40"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            معرف الفاعل
            <Input
              type="number"
              inputMode="numeric"
              placeholder="مثال: 12"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              className="h-8 w-32"
            />
          </label>
          <Button size="sm" disabled={pending} onClick={applyFilters}>
            تطبيق
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={resetFilters}>
            إعادة تعيين
          </Button>
        </CardContent>
      </Card>

      {page.groups.length === 0 && !pending && (
        <p className="py-8 text-center text-sm text-muted-foreground">لا توجد أحداث مسجلة</p>
      )}

      <div className="flex flex-col gap-6">
        {page.groups.map((group) => (
          <section key={group.dateKey} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
            {group.items.map((entry) => {
              const actor = entry.actor as User | number | undefined
              return (
                <Card key={entry.id} className="rounded-2xl">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{actorName(actor)}</span>
                        <span className="text-muted-foreground"> — {entry.message}</span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {logActionLabels[entry.action] ?? entry.action}
                        {entry.targetType ? ` · ${entry.targetType}` : ''}
                        {entry.targetId ? ` · #${entry.targetId}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      {format(new Date(entry.timestamp), 'HH:mm', { locale: arDZ })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </section>
        ))}
        {page.hasNextPage && (
          <Button variant="outline" disabled={pending} onClick={loadMore}>
            تحميل المزيد
          </Button>
        )}
      </div>
    </div>
  )
}

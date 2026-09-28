'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { submitBookRequest, type getMyBookRequests } from '../server/book-requests'

type Requests = Awaited<ReturnType<typeof getMyBookRequests>>
const statusLabels: Record<NonNullable<Requests[number]['status']>, string> = {
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
}

export default function BookRequestsPanel({ requests }: { requests: Requests }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    startTransition(async () => {
      const result = await submitBookRequest({
        title: String(data.get('title') ?? ''),
        author: String(data.get('author') ?? ''),
        description: String(data.get('description') ?? ''),
      })
      setMessage(result.ok ? 'تم إرسال الطلب بنجاح' : result.error)
      if (result.ok) {
        form.reset()
        router.refresh()
      }
    })
  }

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-10 px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold">اقتراح كتاب للمكتبة</h1>
        <p className="mt-2 text-muted-foreground">
          أخبرنا عن كتاب غير متوفر في المكتبة وتابع حالة طلبك.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-background p-6">
        <label className="block font-medium" htmlFor="request-title">
          عنوان الكتاب *
        </label>
        <input
          id="request-title"
          name="title"
          required
          maxLength={200}
          className="w-full rounded-lg border p-3"
        />
        <label className="block font-medium" htmlFor="request-author">
          المؤلف
        </label>
        <input
          id="request-author"
          name="author"
          maxLength={200}
          className="w-full rounded-lg border p-3"
        />
        <label className="block font-medium" htmlFor="request-description">
          وصف إضافي
        </label>
        <textarea
          id="request-description"
          name="description"
          rows={3}
          className="w-full rounded-lg border p-3"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-6 py-2 text-white disabled:opacity-50"
        >
          {pending ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
      <section aria-label="طلباتي" className="space-y-4">
        <h2 className="text-2xl font-bold">طلباتي</h2>
        {requests.length === 0 ? (
          <p>لم تطلب أي كتاب بعد.</p>
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => (
              <li key={request.id} className="rounded-xl border bg-background p-4">
                <div className="flex justify-between gap-4">
                  <strong>{request.title}</strong>
                  <span>{statusLabels[request.status ?? 'pending']}</span>
                </div>
                {request.author && (
                  <p className="text-sm text-muted-foreground">{request.author}</p>
                )}
                {request.adminNote && <p className="mt-2">ملاحظة الإدارة: {request.adminNote}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

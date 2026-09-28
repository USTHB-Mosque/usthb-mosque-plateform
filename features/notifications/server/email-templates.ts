import { formatArabicDate } from '@/shared/lib/dates'
import { escapeHtml } from '@/shared/lib/email'

type Pickup = {
  bookTitle: string
  pickupCode: string
  pickupDate: string
  pickupHour: string
}
type Due = { bookTitle: string; dueDate: string }

/** Each variant names the real lifecycle data that must reach the email. */
export type LoanEmail =
  | ({ kind: 'reservation-available' | 'pickup-reminder' } & Pickup)
  | ({ kind: 'loan-due-soon' | 'loan-overdue' } & Due)
  | { kind: 'extension-approved'; bookTitle: string; newDueDate: string; response?: string | null }
  | { kind: 'extension-rejected'; bookTitle: string; reason?: string | null }
  | { kind: 'no-show-warning'; bookTitle: string; pickupDate: string; reason?: string | null }

export function renderLoanEmail(template: LoanEmail): { subject: string; html: string } {
  const book = escapeHtml(template.bookTitle)
  let subject: string
  let body: string
  switch (template.kind) {
    case 'reservation-available':
      subject = 'كتابك جاهز للاستلام'
      body = `<p>أصبح «${book}» متاحاً لاستلامك من مكتبة المسجد.</p><p>رمز الاستلام: <strong>${escapeHtml(template.pickupCode)}</strong></p><p>موعد الاستلام: ${formatArabicDate(template.pickupDate)} الساعة ${escapeHtml(template.pickupHour)}.</p>`
      break
    case 'loan-due-soon':
      subject = 'تذكير بموعد إرجاع الكتاب'
      body = `<p>يرجى إرجاع «${book}» قبل الموعد المحدد: ${formatArabicDate(template.dueDate)}.</p>`
      break
    case 'loan-overdue':
      subject = 'إعارة متأخرة'
      body = `<p>تأخر إرجاع «${book}» عن موعد ${formatArabicDate(template.dueDate)}. يرجى إرجاعه في أقرب وقت.</p><p>تتوقف إمكانية طلب إعارات جديدة حتى تتم تسوية الإعارة المتأخرة.</p>`
      break
    case 'extension-approved':
      subject = 'تمت الموافقة على التمديد'
      body = `<p>تم تمديد إعارة «${book}». الموعد الجديد: ${formatArabicDate(template.newDueDate)}.</p>${template.response ? `<p>ملاحظة الإدارة: ${escapeHtml(template.response)}</p>` : ''}`
      break
    case 'extension-rejected':
      subject = 'تم رفض طلب التمديد'
      body = `<p>تعذر تمديد إعارة «${book}».</p>${template.reason ? `<p>السبب: ${escapeHtml(template.reason)}</p>` : ''}`
      break
    case 'pickup-reminder':
      subject = 'تذكير باستلام الكتاب'
      body = `<p>يرجى استلام «${book}» قبل انتهاء فترة الاستلام.</p><p>رمز الاستلام: <strong>${escapeHtml(template.pickupCode)}</strong></p><p>الموعد: ${formatArabicDate(template.pickupDate)} الساعة ${escapeHtml(template.pickupHour)}.</p>`
      break
    case 'no-show-warning':
      subject = 'انتهت مهلة استلام الكتاب'
      body = `<p>انتهت مهلة استلام «${book}» بتاريخ ${formatArabicDate(template.pickupDate)}. قد تُلغى الإعارة.</p>${template.reason ? `<p>السبب: ${escapeHtml(template.reason)}</p>` : ''}`
      break
  }
  return {
    subject,
    html: `<div dir="rtl" style="font-family:sans-serif;text-align:right"><h2>${subject}</h2>${body}<p><a href="/user/my-loans">عرض إعاراتي</a></p><p>مسجد الجامعة USTHB</p></div>`,
  }
}

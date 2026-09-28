import { describe, expect, it } from 'vitest'
import { renderLoanEmail } from './email-templates'

describe('the seven loan-lifecycle email templates (#152)', () => {
  const pickup = {
    bookTitle: 'كتاب & <الفقه>',
    pickupCode: 'م-1/22/26',
    pickupDate: '2026-10-02T12:00:00.000Z',
    pickupHour: '14:30',
  }
  const dueDate = '2026-10-14T12:00:00.000Z'

  it('reservation-available includes the book, code and pickup slot safely', () => {
    const { html } = renderLoanEmail({ kind: 'reservation-available', ...pickup })
    expect(html).toContain('م-1/22/26')
    expect(html).toContain('14:30')
    expect(html).toContain('02/10/2026')
    expect(html).toContain('كتاب &amp; &lt;الفقه&gt;')
    expect(html).not.toContain('<الفقه>')
  })

  it('loan-due-soon gives the actual due date', () => {
    const { html } = renderLoanEmail({ kind: 'loan-due-soon', bookTitle: 'الفوائد', dueDate })
    expect(html).toContain('14/10/2026')
    expect(html).toContain('الفوائد')
    expect(html).toContain('قبل الموعد')
  })

  it('loan-overdue includes the due date and suspension warning', () => {
    const { html } = renderLoanEmail({ kind: 'loan-overdue', bookTitle: 'الفوائد', dueDate })
    expect(html).toContain('14/10/2026')
    expect(html).toContain('تتوقف إمكانية طلب إعارات جديدة')
  })

  it('extension-approved includes the new due date and the admin note when present', () => {
    const withNote = renderLoanEmail({
      kind: 'extension-approved',
      bookTitle: 'الفوائد',
      newDueDate: dueDate,
      response: 'موافقة الإدارة',
    })
    expect(withNote.html).toContain('14/10/2026')
    expect(withNote.html).toContain('موافقة الإدارة')
    const without = renderLoanEmail({
      kind: 'extension-approved',
      bookTitle: 'الفوائد',
      newDueDate: dueDate,
    })
    expect(without.html).not.toContain('ملاحظة الإدارة')
  })

  it('extension-rejected includes the refusal reason, if provided', () => {
    const withReason = renderLoanEmail({
      kind: 'extension-rejected',
      bookTitle: 'الفوائد',
      reason: 'الكتاب مطلوب',
    })
    expect(withReason.html).toContain('الكتاب مطلوب')
    const without = renderLoanEmail({ kind: 'extension-rejected', bookTitle: 'الفوائد' })
    expect(without.html).not.toContain('السبب:')
  })

  it('pickup-reminder includes the real code and pickup slot', () => {
    const { html } = renderLoanEmail({ kind: 'pickup-reminder', ...pickup })
    expect(html).toContain('م-1/22/26')
    expect(html).toContain('14:30')
    expect(html).toContain('02/10/2026')
  })

  it('no-show-warning identifies the expired slot and refusal reason', () => {
    const withReason = renderLoanEmail({
      kind: 'no-show-warning',
      bookTitle: 'الفوائد',
      pickupDate: pickup.pickupDate,
      reason: 'انتهت المهلة',
    })
    expect(withReason.html).toContain('02/10/2026')
    expect(withReason.html).toContain('انتهت المهلة')
    const without = renderLoanEmail({
      kind: 'no-show-warning',
      bookTitle: 'الفوائد',
      pickupDate: pickup.pickupDate,
    })
    expect(without.html).not.toContain('السبب:')
  })
})

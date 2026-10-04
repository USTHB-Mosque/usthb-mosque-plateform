import { describe, expect, it } from 'vitest'

import { authErrorMessage } from '@/features/auth/lib/auth-errors'

describe('authErrorMessage', () => {
  it('maps every code to its Arabic message', () => {
    expect(authErrorMessage('EMAIL_TAKEN')).toBe('البريد الإلكتروني مستخدم بالفعل')
    expect(authErrorMessage('FILE_INVALID')).toContain('صيغة الملف غير مدعومة')
    expect(authErrorMessage('FILE_TOO_LARGE')).toContain('حجم الملف كبير جداً')
    expect(authErrorMessage('UPLOAD_FAILED')).toContain('تعذر تحميل المستند')
    expect(authErrorMessage('CONSENT_REQUIRED')).toBe('يجب الموافقة على شروط الخصوصية')
    expect(authErrorMessage('SERVER_ERROR')).toContain('حدث خطأ أثناء إنشاء الحساب')
  })

  it('falls back to the generic message for unknown codes', () => {
    expect(authErrorMessage('UNKNOWN' as 'SERVER_ERROR')).toContain('حدث خطأ')
  })
})

export type AuthErrorCode =
  | 'EMAIL_TAKEN'
  | 'FILE_INVALID'
  | 'FILE_TOO_LARGE'
  | 'UPLOAD_FAILED'
  | 'CONSENT_REQUIRED'
  | 'SERVER_ERROR'

export interface AuthError {
  code: AuthErrorCode
  field?: string
}

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  EMAIL_TAKEN: 'البريد الإلكتروني مستخدم بالفعل',
  FILE_INVALID: 'صيغة الملف غير مدعومة. يرجى اختيار ملف بصيغة PDF أو JPG أو PNG',
  FILE_TOO_LARGE: 'حجم الملف كبير جداً. يرجى اختيار ملف أصغر من 5 ميغابايت',
  UPLOAD_FAILED: 'تعذر تحميل المستند. تأكد من صيغة الملف وحاول مرة أخرى',
  CONSENT_REQUIRED: 'يجب الموافقة على شروط الخصوصية',
  SERVER_ERROR: 'حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى',
}

export function authErrorMessage(code: AuthErrorCode): string {
  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.SERVER_ERROR
}

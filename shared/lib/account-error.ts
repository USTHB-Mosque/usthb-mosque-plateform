const messages = new Set([
  'أعد تأكيد هويتك قبل تغيير إعدادات الحماية',
  'أعد تأكيد هويتك',
  'انتظر قليلاً قبل طلب رمز جديد',
  'تعذر إرسال الرمز، حاول مرة أخرى',
  'البريد الإلكتروني غير متاح',
  'يمكن إضافة خمسة عناوين كحد أقصى',
  'البريد موثّق بالفعل',
  'وثّق البريد أولاً',
  'هذا هو البريد الرئيسي بالفعل',
  'عيّن بريداً موثّقاً آخر رئيسياً قبل حذف هذا العنوان',
  'المصادقة الثنائية غير مفعلة',
  'المصادقة الثنائية مفعلة بالفعل',
  'لا توجد جلسة نشطة',
  'انتهت الجلسة',
])

/** Do not serialize database/transport details, credentials or unknown errors. */
export function publicAccountError(error: unknown, fallback: string) {
  return error instanceof Error && messages.has(error.message) ? error.message : fallback
}

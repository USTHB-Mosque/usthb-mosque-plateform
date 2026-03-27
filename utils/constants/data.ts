export const languagesConfig: Record<string, string> = {
  fr: 'الفرنسية',
  ar: 'العربية',
  en: 'الإنجلزية',
}

export const languagesConfigArray = Object.entries(languagesConfig).map(([value, label]) => {
  return {
    value,
    label,
  }
})

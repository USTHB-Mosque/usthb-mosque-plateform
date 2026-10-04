// ArticleType is shared by this config (collections/Article.ts field options)
// and the frontend articles feature (features/articles/types.ts).
export enum ArticleType {
  Aqidah = 'aqidah',
  Fiqh = 'fiqh',
  Hadith = 'hadith',
  Other = 'other',
}

const articleTypesConfig: Record<string, string> = {
  [ArticleType.Aqidah]: 'عقيدة',
  [ArticleType.Fiqh]: 'فقه',
  [ArticleType.Hadith]: 'حديث',
  [ArticleType.Other]: 'أخرى',
}

export const articleTypesConfigArray = Object.entries(articleTypesConfig).map(([value, label]) => {
  return {
    value,
    label,
  }
})

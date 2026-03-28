import { ArticleType } from '@/interfaces/articles.interfaces'

const articleTypesConfig: Record<string, string> = {
  [ArticleType.Aqidah]: 'عقيدة',
  [ArticleType.Fiqh]: 'فقه',
  [ArticleType.Hadith]: 'عقيدة',
  [ArticleType.Other]: 'أخرى',
}

export const articleTypesConfigArray = Object.entries(articleTypesConfig).map(([value, label]) => {
  return {
    value,
    label,
  }
})

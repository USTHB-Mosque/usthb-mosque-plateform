import { BaseSearchParams } from '@/shared/lib/search.types'
import { ArticleType } from '@/utils/constants/articles'

export { ArticleType }

export interface ArticleSearchParams extends BaseSearchParams {
  types?: ArticleType[]
}

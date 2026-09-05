import { BaseSearchParams } from '@/shared/lib/search.types'
import { ActivityType } from '@/utils/constants/activities'

export { ActivityType }

export interface ActivitySearchParams extends BaseSearchParams {
  types?: ActivityType[]
  openForRegistration?: boolean
}

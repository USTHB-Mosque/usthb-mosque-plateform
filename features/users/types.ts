import { BaseSearchParams } from '@/shared/lib/search.types'

export interface UserSearchParams extends BaseSearchParams {
  role?: 'admin' | 'librarian' | 'user'
  verificationStatus?: string[]
  faculties?: string[]
  studyYears?: string[]
}

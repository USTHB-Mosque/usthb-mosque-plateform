import { User } from '@/payload-types'

// Matches exactly what GET /api/users/me returns (app/(frontend)/api/users/me/route.ts).
// It is not Payload's own /api/users/me response shape, which also carries the
// session list and JWT — none of that is exposed here, on purpose.
export interface ProfileResponse {
  user: User
}

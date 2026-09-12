import { withAccountCollection } from 'payload-auth-plugin/collection'

export const Account = withAccountCollection(
  {
    slug: 'accounts',
  },
  'users',
)

export const isAdmin = (user: { collection?: string } | null | undefined) =>
  user?.collection === 'admins'

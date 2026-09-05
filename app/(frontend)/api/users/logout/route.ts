import { logout as logoutAction } from '@/features/auth/server/logout'
import { getAuthenticatedUser } from '@/shared/lib/auth'
import { NextResponse } from 'next/server'

export async function POST() {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await logoutAction()
  
  return NextResponse.json({ message: 'Logged out successfully' })
}
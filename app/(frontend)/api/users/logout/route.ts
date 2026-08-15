import { logout as logoutAction } from '@/actions/auth/logout'
import { getAuthenticatedUser } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST() {
  const user = await getAuthenticatedUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await logoutAction()
  
  return NextResponse.json({ message: 'Logged out successfully' })
}
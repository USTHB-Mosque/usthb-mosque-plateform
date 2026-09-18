'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const AdminLoginRedirect: React.FC = () => {
  const router = useRouter()

  useEffect(() => {
    router.replace('/auth/login')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">جاري التوجيه...</div>
    </div>
  )
}

export default AdminLoginRedirect
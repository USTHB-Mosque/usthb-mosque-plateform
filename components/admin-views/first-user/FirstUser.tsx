'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createFirstAdminUser, hasAnyUser } from '@/actions/admin/create-first-user'
import { getAdminUser } from '@/actions/admin/account'

const AdminFirstUser: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [blocked, setBlocked] = useState(true) // default blocked until proven otherwise
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const [user, usersExist] = await Promise.all([
        getAdminUser(),
        hasAnyUser(),
      ])

      if (usersExist) {
        router.replace('/admin/login')
        return
      }

      if (user) {
        router.replace('/admin')
        return
      }

      setBlocked(false)
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة')
      return
    }

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }

    setLoading(true)

    const result = await createFirstAdminUser(email, password)

    if (!result.ok) {
      setError(result.error || 'حدث خطأ')
      setLoading(false)
      return
    }

    router.push('/admin')
  }

  if (blocked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{loading ? 'جاري الإنشاء...' : 'جاري التحقق...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">إنشاء المسؤول الأول</h1>
        <p className="text-gray-600 text-center mb-6">أنشئ حساب المسؤول الأول للوصول إلى لوحة الإدارة</p>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
              minLength={8}
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              تأكيد كلمة المرور
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء حساب المسؤول'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminFirstUser
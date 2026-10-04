'use client'

import React, { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'

import { Input } from '@/shared/ui/input'
import { PasswordInput } from '@/shared/ui/password-input'
import LandingCtaButton from '@/shared/ui/LandingCtaButton'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form'
import { resetPassword } from '@/features/auth/server/reset-password'

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'كلمات المرور غير متطابقة',
    path: ['confirmPassword'],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordForm({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = (values: ResetPasswordFormValues) => {
    setError('')
    startTransition(async () => {
      const result = await resetPassword(token, values.password)
      if (!result.ok) {
        setError(result.error || 'حدث خطأ، حاول مرة أخرى')
        return
      }
      toast.success('تم تغيير كلمة المرور بنجاح')
      router.push('/auth/login?reset=success')
    })
  }

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen">
      {/* Image Section - Right */}
      <div className="w-full lg:w-1/2 p-3 sm:p-4 order-1">
        <div className="w-full h-[30vh] sm:h-[40vh] lg:h-full rounded-2xl sm:rounded-3xl overflow-hidden relative">
          <Image
            src="/static/images/login.jpg"
            alt="إعادة تعيين كلمة المرور"
            fill
            className="object-cover scale-x-[-1]"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </div>

      {/* Form Section - Left */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-5 sm:px-8 md:px-12 lg:px-[140px] py-6 sm:py-8 lg:py-[48px] order-2">
        {/* Logo */}
        <div className="flex justify-center mb-4 sm:mb-5 lg:mb-6">
          <Image
            src="/static/images/logo-vertical.svg"
            alt="Logo"
            width={40}
            height={40}
            className="sm:w-[50px] sm:h-[50px] lg:w-[60px] lg:h-[60px]"
          />
        </div>

        {/* Title & Description */}
        <div className="text-center mb-5 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[32px] font-bold text-gray-900 mb-1 sm:mb-2">
            كلمة مرور جديدة
          </h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-base text-gray-500">
            اختر كلمة مرور جديدة لحسابك
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-3 sm:space-y-4 lg:space-y-5"
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 text-xs sm:text-sm md:text-base">
                    كلمة المرور الجديدة
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="********"
                      {...field}
                      disabled={isPending}
                      className="h-10 sm:h-11 lg:h-12 text-xs sm:text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 text-xs sm:text-sm md:text-base">
                    تأكيد كلمة المرور
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="********"
                      {...field}
                      disabled={isPending}
                      className="h-10 sm:h-11 lg:h-12 text-xs sm:text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <LandingCtaButton
              type="submit"
              label="تغيير كلمة المرور"
              loading={isPending}
              disabled={isPending}
              className="h-10 sm:h-11 lg:h-12"
            />
          </form>
        </Form>
      </div>
    </div>
  )
}

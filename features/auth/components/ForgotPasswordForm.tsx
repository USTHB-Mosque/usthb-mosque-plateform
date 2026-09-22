'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Input } from '@/shared/ui/input'
import LandingCtaButton from '@/shared/ui/LandingCtaButton'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form'
import { requestPasswordReset } from '@/features/auth/server/forgot-password'

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'البريد الإلكتروني غير صحيح' }),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = (values: ForgotPasswordFormValues) => {
    startTransition(async () => {
      await requestPasswordReset(values.email)
      // The response is identical whether or not the email exists.
      setSent(true)
    })
  }

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen">
      {/* Image Section - Right */}
      <div className="w-full lg:w-1/2 p-3 sm:p-4 order-1">
        <div className="w-full h-[30vh] sm:h-[40vh] lg:h-full rounded-2xl sm:rounded-3xl overflow-hidden relative">
          <Image
            src="/static/images/login.jpg"
            alt="استعادة كلمة المرور"
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
            نسيت كلمة المرور؟
          </h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-base text-gray-500">
            أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm">
              إذا كان البريد الإلكتروني مسجلاً لدينا، فستصلك رسالة تحتوي على رابط إعادة تعيين كلمة
              المرور.
            </div>
            <Link
              href="/auth/login"
              className="text-primary font-semibold hover:underline text-xs sm:text-sm"
            >
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3 sm:space-y-4 lg:space-y-5"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 text-xs sm:text-sm md:text-base">
                      البريد الإلكتروني
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="example@mail.com"
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
                label="إرسال رابط إعادة التعيين"
                loading={isPending}
                disabled={isPending}
                className="h-10 sm:h-11 lg:h-12"
              />
            </form>
          </Form>
        )}

        {/* Link to Login */}
        <p className="text-center text-gray-600 text-xs sm:text-sm md:text-base mt-4 sm:mt-5 lg:mt-8">
          تذكرت كلمة المرور؟
          <Link href="/auth/login" className="text-primary font-semibold hover:underline ms-1">
            سجل دخولك
          </Link>
        </p>
      </div>
    </div>
  )
}

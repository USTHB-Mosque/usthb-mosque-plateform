'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { login } from '@/actions/auth/login'
import { useRouter } from 'next/navigation'

const loginSchema = z.object({
  email: z.string().email({ message: 'البريد الإلكتروني غير صحيح' }),
  password: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = (values: LoginFormValues) => {
    startTransition(async () => {
      const result = await login(values.email, values.password)
      if (!result?.user) {
        toast.error('فشل تسجيل الدخول')
      } else {
        if (result.token) {
          localStorage.setItem('access_token', result.token)
        }
        toast.success('تم تسجيل الدخول بنجاح')
        router.push(result.user.role === 'admin' ? '/admin' : '/')
      }
    })
  }

  const handleGoogleLogin = () => {
    const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    window.location.href = `${serverURL}/api/oauth/google`
  }

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen">
      {/* Image Section - Right */}
      <div className="w-full lg:w-1/2 p-3 sm:p-4 order-1">
        <div className="w-full h-[30vh] sm:h-[40vh] lg:h-full rounded-2xl sm:rounded-3xl overflow-hidden relative">
          <Image
            src="/static/images/login.jpg"
            alt="تسجيل الدخول"
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
            أهلاً بعودتك
          </h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-base text-gray-500">
            سجل دخولك إلى حسابك
          </p>
        </div>

        {/* Google OAuth Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-10 sm:h-11 lg:h-14 text-xs sm:text-sm md:text-lg font-medium mb-3 sm:mb-4 lg:mb-6"
          onClick={handleGoogleLogin}
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="hidden xs:inline text-xs sm:text-sm">Google</span>
          <span className="xs:hidden">Google</span>
        </Button>

        {/* Separator */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 lg:mb-6">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="text-xs sm:text-sm text-gray-500">أو</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* Login Form */}
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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 text-xs sm:text-sm md:text-base">
                    كلمة المرور
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
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

            <Button
              type="submit"
              className="w-full h-10 sm:h-11 lg:h-12 text-sm sm:text-base md:text-lg font-bold"
              disabled={isPending}
            >
              {isPending ? 'جاري...' : 'تسجيل الدخول'}
            </Button>
          </form>
        </Form>

        {/* Link to Register */}
        <p className="text-center text-gray-600 text-xs sm:text-sm md:text-base mt-4 sm:mt-5 lg:mt-8">
          ليس لديك حساب؟
          <Link href="/auth/register" className="text-primary font-semibold hover:underline mr-1">
            أنشئ حسابك الآن
          </Link>
        </p>
      </div>
    </div>
  )
}

<<<<<<< HEAD
export default LoginPage

=======
>>>>>>> origin/dev

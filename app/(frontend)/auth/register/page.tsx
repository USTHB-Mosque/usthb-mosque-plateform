'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRef, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useAuthFormStore } from '@/store/auth-form'
import { register } from '@/actions/auth/register'
import LandingCtaButton from '@/components/ui/landing/LandingCtaButton'
import { AlertCircle, Upload } from 'lucide-react'

const stepImages = {
  1: '/static/images/register1.jpg',
  2: '/static/images/register2.jpg',
  3: '/static/images/register3.jpg',
}

const step1Schema = z.object({
  firstName: z.string().min(2, { message: 'الاسم الأول يجب أن يكون حرفين على الأقل' }),
  lastName: z.string().min(2, { message: 'اسم العائلة يجب أن يكون حرفين على الأقل' }),
  phoneNumber: z.string().min(10, { message: 'رقم الهاتف غير صحيح' }),
})

const step2Schema = z.object({
  state: z.string().min(1, { message: 'الولاية مطلوبة' }),
  speciality: z.string().min(1, { message: 'التخصص مطلوب' }),
  schoolCertificate: z.any().optional(),
})

const step3Schema = z
  .object({
    email: z.string().email({ message: 'البريد الإلكتروني غير صحيح' }),
    password: z.string().min(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }),
    confirmPassword: z.string(),
    consentGiven: z.boolean().refine((val) => val === true, {
      message: 'يجب الموافقة على شروط الخصوصية',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'كلمات المرور غير متطابقة',
    path: ['confirmPassword'],
  })

type Step1Values = z.infer<typeof step1Schema>
type Step2Values = z.infer<typeof step2Schema>
type Step3Values = z.infer<typeof step3Schema>

export default function RegisterPage() {
  const [isPending, startTransition] = useTransition()
  const [errorSteps, setErrorSteps] = useState<number[]>([])
  const [selectedCertificate, setSelectedCertificate] = useState<string | null>(
    useAuthFormStore.getState().schoolCertificate?.name ?? null,
  )
  const spaceRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const redirect = searchParams.get('redirect') || '/profile'
  const { step, setStep, ...formData } = useAuthFormStore()

  useEffect(() => {
    useAuthFormStore.getState().reset()
  }, [])

  const formStep1 = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: formData.phoneNumber,
    },
  })

  const formStep2 = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      state: formData.state,
      speciality: formData.speciality,
    },
  })

  const formStep3 = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      consentGiven: false,
    },
  })

  const handleNextStep1 = (values: Step1Values) => {
    useAuthFormStore.getState().setField('firstName', values.firstName)
    useAuthFormStore.getState().setField('lastName', values.lastName)
    useAuthFormStore.getState().setField('phoneNumber', values.phoneNumber)
    setErrorSteps((prev) => prev.filter((s) => s !== 1))
    setStep(2)
  }

  const handleNextStep2 = (values: Step2Values) => {
    useAuthFormStore.getState().setField('state', values.state)
    useAuthFormStore.getState().setField('speciality', values.speciality)
    setErrorSteps((prev) => prev.filter((s) => s !== 2))
    setStep(3)
  }

  const handleSubmit = (values: Step3Values) => {
    useAuthFormStore.getState().setField('email', values.email)
    useAuthFormStore.getState().setField('password', values.password)
    useAuthFormStore.getState().setField('confirmPassword', values.confirmPassword)

    startTransition(async () => {
      const store = useAuthFormStore.getState()

      if (!store.schoolCertificate) {
        toast.error('يجب تحميل وثيقة التحقق')
        return
      }

      const result = await register({
        email: store.email,
        password: store.password,
        fullName: `${store.firstName} ${store.lastName}`,
        phone: store.phoneNumber || undefined,
        faculty: store.state || undefined,
        verificationDocument: store.schoolCertificate,
        consentGiven: values.consentGiven,
      })

      if (!result?.user) {
        toast.error(result?.error || 'فشل إنشاء الحساب')
      } else {
        if (result.token) {
          localStorage.setItem('access_token', result.token)
        }
        await queryClient.invalidateQueries({ queryKey: ['profile'] })
        toast.success('تم إنشاء الحساب بنجاح')
        router.push(redirect)
      }
    })
  }

  const handleStepClick = async (target: number) => {
    setStep(target)

    const failed: number[] = []
    if (target > 1) {
      const step1Ok = await formStep1.trigger()
      if (!step1Ok) failed.push(1)
    }
    if (target > 2) {
      const step2Ok = await formStep2.trigger()
      if (!step2Ok) failed.push(2)
    }
    setErrorSteps(failed)
  }

  const titles = {
    1: { title: 'ابدأ رحلتك', desc: 'إنشاء حساب جديد - الخطوة 1 من 3' },
    2: { title: 'ابدأ رحلتك', desc: 'إنشاء حساب جديد - الخطوة 2 من 3' },
    3: { title: 'ابدأ رحلتك', desc: 'إنشاء حساب جديد - الخطوة 3 من 3' },
  }

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen">
      {/* Image Section - Left */}
      <div className="w-full lg:w-1/2 p-3 sm:p-4 order-2">
        <div className="w-full h-[30vh] sm:h-[40vh] lg:h-full rounded-2xl sm:rounded-3xl overflow-hidden relative">
          <Image
            src={stepImages[step as keyof typeof stepImages]}
            alt="تسجيل"
            fill
            className="object-cover scale-x-[-1]"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </div>

      {/* Form Section - Right */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-5 sm:px-8 md:px-12 lg:px-[140px] py-6 sm:py-8 lg:py-[48px] order-1">
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
        <div className="text-center mb-4 sm:mb-5 lg:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[32px] font-bold text-gray-900 mb-1 sm:mb-2">
            {titles[step as keyof typeof titles].title}
          </h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-base text-gray-500">
            {titles[step as keyof typeof titles].desc}
          </p>
        </div>

        {/* Stepper - Left to Right */}
        <div className="flex items-center justify-center mb-4 sm:mb-5 lg:mb-8">
          {[1, 2, 3].map((s, idx) => (
            <React.Fragment key={s}>
              <button
                type="button"
                onClick={() => handleStepClick(s)}
                aria-current={step === s ? 'step' : undefined}
                aria-label={`الخطوة ${s}`}
                className="relative flex flex-col items-center gap-1"
              >
                <div
                  className={`relative flex h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 items-center justify-center rounded-full font-bold text-xs sm:text-sm transition-all ${
                    errorSteps.includes(s)
                      ? 'bg-red-100 text-red-600 ring-2 ring-red-400'
                      : step >= s
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                  }`}
                >
                  {s}
                  {errorSteps.includes(s) && (
                    <AlertCircle className="absolute -top-1.5 -end-1.5 h-4 w-4 text-red-500" />
                  )}
                </div>
                {step >= s && !errorSteps.includes(s) && (
                  <span className="h-1 w-1 rounded-full bg-primary" />
                )}
              </button>
              {idx < 2 && (
                <div
                  className={`w-8 sm:w-10 md:w-12 lg:w-16 h-0.5 sm:h-1 mx-1 sm:mx-2 ${step > s ? 'bg-primary' : 'bg-gray-200'}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <Form {...formStep1}>
            <form
              onSubmit={formStep1.handleSubmit(handleNextStep1)}
              className="space-y-3 sm:space-y-4"
            >
              <FormField
                control={formStep1.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 text-xs sm:text-sm">الاسم الأول</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="الاسم الأول"
                        {...field}
                        className="h-10 sm:h-11 text-xs sm:text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formStep1.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 text-xs sm:text-sm">اسم العائلة</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="اسم العائلة"
                        {...field}
                        className="h-10 sm:h-11 text-xs sm:text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formStep1.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 text-xs sm:text-sm">رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="05xxxxxxxx"
                        {...field}
                        className="h-10 sm:h-11 text-xs sm:text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <LandingCtaButton
                type="submit"
                label="التالي"
                className="h-10 sm:h-11 mt-2"
              />
              <p className="text-center text-gray-600 text-xs sm:text-sm mt-3">
                لديك حساب؟
                <Link
                  href="/auth/login"
                  className="text-primary font-semibold hover:underline ms-1"
                >
                  تسجيل الدخول الآن
                </Link>
              </p>
            </form>
          </Form>
        )}

        {step === 2 && (
          <Form {...formStep2}>
            <form
              onSubmit={formStep2.handleSubmit(handleNextStep2)}
              className="space-y-3 sm:space-y-4"
            >
              <FormField
                control={formStep2.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 text-xs sm:text-sm">الولاية</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="أدخل الولاية"
                        {...field}
                        className="h-10 sm:h-11 text-xs sm:text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formStep2.control}
                name="speciality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 text-xs sm:text-sm">التخصص</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="أدخل التخصص"
                        {...field}
                        className="h-10 sm:h-11 text-xs sm:text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formStep2.control}
                name="schoolCertificate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 text-xs sm:text-sm">
                      شهادة المدرسة
                    </FormLabel>
                    <FormControl>
                      <div className="w-full">
                        <input
                          ref={spaceRef}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            setSelectedCertificate(file?.name ?? null)
                            useAuthFormStore.getState().setField('schoolCertificate', file)
                            field.onChange(file)
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => spaceRef.current?.click()}
                          className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-6 text-right transition-colors hover:border-primary hover:bg-primary/5"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Upload className="h-5 w-5 text-primary" />
                          </span>
                          <span className="min-w-0 flex-1">
                            {selectedCertificate ? (
                              <>
                                <span className="block truncate text-sm font-medium text-gray-900">
                                  {selectedCertificate}
                                </span>
                                <span className="block text-xs text-primary">
                                  تغيير الملف المحدد
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="block text-sm font-medium text-gray-700">
                                  استيراد شهادة المدرسة
                                </span>
                                <span className="block text-xs text-gray-500">
                                  PDF, JPG, PNG - اضغط للاختيار
                                </span>
                              </>
                            )}
                          </span>
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 sm:gap-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-10 sm:h-11 text-sm font-bold"
                  onClick={() => setStep(1)}
                >
                  السابق
                </Button>
                <LandingCtaButton
                  type="submit"
                  label="التالي"
                  className="flex-1 h-10 sm:h-11"
                />
              </div>
              <p className="text-center text-gray-600 text-xs sm:text-sm mt-3">
                لديك حساب؟
                <Link
                  href="/auth/login"
                  className="text-primary font-semibold hover:underline ms-1"
                >
                  تسجيل الدخول الآن
                </Link>
              </p>
            </form>
          </Form>
        )}

        {step === 3 && (
          <Form {...formStep3}>
            <form
              onSubmit={formStep3.handleSubmit(handleSubmit)}
              className="space-y-3 sm:space-y-4"
            >
              <FormField
                control={formStep3.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 text-xs sm:text-sm">
                      البريد الإلكتروني
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="example@mail.com"
                        {...field}
                        className="h-10 sm:h-11 text-xs sm:text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formStep3.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 text-xs sm:text-sm">كلمة المرور</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="********"
                        {...field}
                        className="h-10 sm:h-11 text-xs sm:text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formStep3.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 text-xs sm:text-sm">
                      تأكيد كلمة المرور
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="********"
                        {...field}
                        className="h-10 sm:h-11 text-xs sm:text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={formStep3.control}
                name="consentGiven"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-xs sm:text-sm text-gray-700">
                        أوافق على{' '}
                        <span className="text-primary">سياسة الخصوصية</span>{' '}
                        و{' '}
                        <span className="text-primary">شروط الاستخدام</span>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <div className="flex gap-2 sm:gap-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-10 sm:h-11 text-sm font-bold"
                  onClick={() => setStep(2)}
                >
                  السابق
                </Button>
                <LandingCtaButton
                  type="submit"
                  label="إنشاء حساب"
                  loading={isPending}
                  disabled={isPending}
                  className="flex-1 h-10 sm:h-11"
                />
              </div>
              <p className="text-center text-gray-600 text-xs sm:text-sm mt-3">
                لديك حساب؟
                <Link
                  href="/auth/login"
                  className="text-primary font-semibold hover:underline ms-1"
                >
                  تسجيل الدخول الآن
                </Link>
              </p>
            </form>
          </Form>
        )}
      </div>
    </div>
  )
}


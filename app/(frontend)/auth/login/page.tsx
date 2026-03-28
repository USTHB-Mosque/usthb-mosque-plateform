'use client'

import React, { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
  email: z.email({ message: 'البريد الإلكتروني غير صحيح' }),
  password: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
})

type LoginFormValues = z.infer<typeof loginSchema>

const LoginPage: React.FC = () => {
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
      const user = await login(values.email, values.password)
      if (!user) {
        toast.error('فشل تسجيل الدخول')
      } else {
        toast.success('تم تسجيل الدخول بنجاح')
        router.push('/library')
      }
    })
  }

  return (
    <div>
      <p className="">تسجيل الدخول</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>البريد الإلكتروني</FormLabel>
                <FormControl>
                  <Input placeholder="example@mail.com" {...field} disabled={isPending} />
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
                <FormLabel>كلمة المرور</FormLabel>
                <FormControl>
                  <Input type="text" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'جاري التحميل...' : 'دخول'}
          </Button>
        </form>
      </Form>
    </div>
  )
}

export default LoginPage

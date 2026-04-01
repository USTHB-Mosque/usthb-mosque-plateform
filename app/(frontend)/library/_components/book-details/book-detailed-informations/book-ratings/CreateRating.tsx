'use client'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { reviewBook } from '@/actions/books'

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(4, { message: 'المراجعة يجب أن تكون 4 أحرف على الأقل' }),
})

type ReviewFormValues = z.infer<typeof reviewSchema>

const CreateRating = ({ bookId }: { bookId: number }) => {
  const [isPending, startTransition] = useTransition()
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 5,
      comment: '',
    },
  })

  const onSubmit = (values: ReviewFormValues) => {
    startTransition(async () => {
      try {
        await reviewBook(bookId, values.rating, values.comment)

        toast.success('تم إضافة مراجعتك بنجاح')
      } catch {
        toast.error('حدث خطأ أثناء تقييم الكتاب')
      }
    })
  }
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3 rounded-lg border border-border p-4 bg-background"
      >
        <h4 className="text-sm font-semibold">أضف تقييمًا ومراجعة</h4>

        <div className="grid gap-2">
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <Select
                  disabled={isPending}
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر التقييم" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((starValue) => (
                      <SelectItem key={starValue} value={starValue.toString()}>
                        {starValue} {starValue === 1 ? 'نجمة' : 'نجوم'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  className="h-24 resize-none overflow-y-auto"
                  placeholder="اكتب مراجعتك هنا..."
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'جاري الإرسال...' : 'إرسال التقييم'}
        </button>
      </form>
    </Form>
  )
}

export default CreateRating

import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorDataProps {
  onRetry?: () => void
}

const ErrorData: React.FC<ErrorDataProps> = ({ onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-destructive/20 rounded-3xl bg-destructive/5">
      <div className="p-4 bg-destructive/10 rounded-full mb-6">
        <AlertCircle className="w-12 h-12 text-destructive" />
      </div>

      <h3 className="text-2xl font-bold mb-2">حدث خطأ ما</h3>
      <p className="text-muted-foreground max-w-sm mb-8">
        تعذر تحميل الكتب في الوقت الحالي. يرجى المحاولة مرة أخرى
      </p>

      <Button
        variant="default"
        onClick={() => (onRetry ? onRetry() : window.location.reload())}
        className="rounded-full px-8 gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        إعادة المحاولة
      </Button>
    </div>
  )
}

export default ErrorData

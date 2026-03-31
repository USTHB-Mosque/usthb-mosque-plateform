import React from 'react'
import Layout from '@/components/layouts'

const LandingPage: React.FC = () => {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <h1 className="text-4xl font-bold font-khalid text-primary">مسجد科技大学</h1>
        <p className="text-xl text-muted-foreground text-center max-w-md">
          منصة المسجد الجامعي - مكتبة وأنشطة و مقالات
        </p>
      </div>
    </Layout>
  )
}

export default LandingPage
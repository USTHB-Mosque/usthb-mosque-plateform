import React from 'react'
import { Button } from '../common/components/ui/button'
import Layout from '../common/layouts'

const LibraryPage: React.FC = () => {
  return (
    <Layout>
      <div className="flex flex-col space-y-14">
        <div className="flex flex-col items-center justify-center gap-12">
          <div className="space-y-4">
            <p className="text-secondary text-5xl text-center font-khalid">مكتبة المسجد</p>
            <p className="text-foreground text-xl text-center">
              استكشف الكنوز المعرفية والكتب النادرة في مكتبة المسجد, متاحة للمطالعة والإستعارة.
            </p>
          </div>

          <div className="flex gap-2.5 bg-white p-2 rounded-xl">
            <Button>الكتب العلمية</Button>
            <Button>الكتب الدينية</Button>
          </div>
        </div>
        <div className="flex flex-col space-y-12">
          <div>Toolbar</div>
          <div>Content</div>
          <div>Pagination</div>
        </div>
      </div>
    </Layout>
  )
}

export default LibraryPage

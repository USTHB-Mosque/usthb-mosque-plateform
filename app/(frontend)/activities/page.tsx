'use client'
import React, { useState } from 'react'
import Layout from '@/components/layouts'
import { Pagination } from '@/components/common/Pagination'
import { ButtonGroup } from '@/components/ui/button-group'
import ListingContent from '@/components/listing/ListingContent'
import ListingToolbar from '@/components/listing/listing-toolbar/ListingToolbar'
import ListingRenderer from '@/components/listing/ListingRenderer'
import ActivityCard from './_components/ActivityCard'

const ActivitiesPage: React.FC = () => {
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState('religious-books')
  return (
    <Layout>
      <div className="flex flex-col space-y-14">
        <div className="flex flex-col items-center justify-center gap-12">
          <div className="space-y-4">
            <p className="text-secondary text-5xl text-center font-khalid">أنشطة المسجد</p>
            <p className="text-foreground text-xl text-center">
              مجموعة من النشاطات الدعوية والتعليمية والاجتماعية التي تهدف إلى بناء مجتمع واعٍ،
              متآلف، يسير على هدي الإسلام.
            </p>
          </div>

          <ButtonGroup
            value={tab}
            onSelect={(value) => setTab(value)}
            buttons={[
              {
                label: 'الكتب العلمية',
                value: 'scientific-books',
              },
              {
                label: 'الكتب الدينية',
                value: 'religious-books',
              },
            ]}
          />
        </div>
        <ListingContent>
          <ListingToolbar />

          <ListingRenderer
            isEmpty={false}
            isError={false}
            isLoading={false}
            emptyFallback={<div>ok</div>}
          >
            <div className="flex flex-col space-y-12">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <ActivityCard key={i} />
                ))}
            </div>
            <Pagination
              totalPages={100}
              onPageChange={(value) => setPage(value)}
              page={page}
              dir="rtl"
              nextButtonLabel="التالي"
              previousButtonLabel="السابق"
            />
          </ListingRenderer>
        </ListingContent>
      </div>
    </Layout>
  )
}

export default ActivitiesPage

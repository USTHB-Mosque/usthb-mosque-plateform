'use client'

import React from 'react'
import Navbar from '@/components/layouts/navbar/Navbar'
import Footer from '@/components/layouts/Footer'
import BookCard from './library/_components/BookCard'
import ArticleCard from './articles/_components/ArticleCard'
import SectionBlock from '@/components/ui/sectionBlock'
import ActivityCard from '@/components/ui/activityCard'
import CTASection from '@/components/ui/CTASection'
import Image from 'next/image'
import { motion } from 'motion/react'
import { useGetBooksQuery } from '@/lib/apis/books/queries'
import { useGetArticlesQuery } from '@/lib/apis/articles/queries'
import { useGetActivitiesQuery } from '@/lib/apis/activities/queries'
import { BookCategory } from '@/interfaces/books.interfaces'
import { Media } from '@/payload-types'
import { getImageUrl } from '@/utils/image-utils'
import { activitiesTypesConfig } from '@/utils/constants/activities'
import Link from 'next/link'
import ListingRenderer from '@/components/listing/ListingRenderer'
import EmptyData from '@/components/common/EmptyData'
import ErrorData from '@/components/common/ErrorData'
import BookCardSkeleton from './library/_components/BookCardSkeleton'
import ArticleSkeleton from './articles/_components/ArticleSkeleton'
import ActivityCardSkeleton from '@/components/ui/activityCardSkeleton'
import { staticBooks } from '@/static-content/books'
import { staticActivities } from '@/static-content/activities'
import { staticArticles } from '@/static-content/articles'

const LandingPage: React.FC = () => {
  const { data: booksData, isLoading: booksLoading, isError: booksError } = useGetBooksQuery({
    category: BookCategory.Religious,
    page: 1,
    limit: 4,
  })

  const { data: articlesData, isLoading: articlesLoading, isError: articlesError } = useGetArticlesQuery({
    page: 1,
    limit: 3,
  })

  const { data: activitiesData, isLoading: activitiesLoading, isError: activitiesError } = useGetActivitiesQuery({
    page: 1,
    limit: 4,
  })

  const books = booksData?.docs || []
  const articles = articlesData?.docs || []
  const activities = activitiesData?.docs || []

  return (
    <>
      <Navbar />
      <div className="w-full min-h-screen">

        {/* ── Hero Video Section ── */}
        <section className="relative w-full overflow-hidden h-screen">
          <video
            src="/static/images/hero-section-animation.mp4"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '200%',
              height: '100%',
              transform: 'scale(1.2) translateX(-6%) translateY(-4%)',
              objectFit: 'cover',
              filter: 'grayscale(0.5) brightness(1.1) contrast(0.9) saturate(0) blur(0px)',
            }}
            className="absolute top-0 left-0 w-full h-full object-cover scale-125"
            autoPlay
            muted
            loop
          />

          <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'rgba(220, 235, 255, 0.15)' }} />

          <div
            className="absolute top-0 left-0 z-[3] w-full h-[65%] md:h-[60%] flex flex-col items-center justify-center gap-4 md:gap-6 px-6 md:px-16 pt-8"
            style={{
              background:
                'linear-gradient(to bottom, var(--background-2) 0%, var(--background-2) 60%, color-mix(in srgb, var(--background-2) 85%, transparent) 72%, color-mix(in srgb, var(--background-2) 60%, transparent) 82%, color-mix(in srgb, var(--background-2) 30%, transparent) 91%, transparent 100%)',
            }}
          >
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Image
                src="/static/images/bismilah.svg"
                alt="بسم الله"
                width={180}
                height={40}
                priority
                className="w-28 sm:w-36 md:w-auto"
              />
            </motion.div>
            <motion.p
              dir="rtl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{ fontFamily: 'var(--font-uthmanic)' }}
              className="text-center leading-loose w-[95%] sm:w-[80%] md:w-[70%] lg:w-[90%] text-[clamp(18px,2vw,28px)]"
            >
              ﴿في بُيوتٍ أَذِنَ <span style={{ color: 'var(--primary-300)' }}>اللَّهُ</span> أَن تُرفَعَ وَيُذكَرَ فيهَا اسمُ
              <span style={{ color: 'var(--primary-300)' }}>هُ</span> يُسَبِّحُ لَهُ فيها بِالغُدُوِّ وَالآصالِ۝ رِجَالٌ لَا تُلْهِيهِمْ تِجَارَةٌ وَلَا بَيْعٌ عَنْ ذِكْرِ{' '}
              <span style={{ color: 'var(--primary-300)' }}>اللَّهِ</span> وَإِقَامِ الصَّلَاةِ وَإِيتَاءِ الزَّكَاةِ ۙ يَخَافُونَ يَوْمًا تَتَقَلَّبُ فِيهِ الْقُلُوبُ وَالْأَبْصَارُ﴾ [النور: ٣٦]
            </motion.p>
          </div>
        </section>

        {/* ── Section 1: لبنة المجتمع ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <SectionBlock
            heading="لبنة المجتمع"
            body="إن من الملفت للنظر أن أول عمل قام به الرسول ﷺ في قباء وفي المدينة كان بناء مسجد في كل منهما، وهذا الأمر لم يكن على سبيل المصادفة، ولم يكن مجرد إشارة عابرة، بل هذا منهج أصيل، فلا قيام لأمة إسلامية بغير المسجد."
            imageSrc="/static/images/mosque-1.jpg"
            cardTitle="«نور الهداية»"
            cardBody="فِي بُيُوتٍ أَذِنَ اللهُ أَنْ تُرْفَعَ وَيُذْكَرَ فِيهَا اسْمُهُ يُسَبِّحُ لَهُ فِيهَا بِالْغُدُوِّ وَالْآصَالِ."
            imagePosition="right"
          />
        </motion.div>

        {/* ── Section 2: رسالة علمية وإيمانية ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <SectionBlock
            heading="رسالة علمية وإيمانية"
            body="يعتبر مسجد جامعة باب الزوار جسراً معرفياً يربط بين العلوم التجريبية والقيم الروحية. نهدف إلى توفير بيئة هادئة ومحفزة للطلاب والباحثين، تساهم في بناء جيل متوازن علمياً وفكرياً."
            imageSrc="/static/images/mosala.png"
            cardTitle="«منارة الإيمان»"
            cardBody="المسجد منارة تُنير القلوب بالإيمان وتجمع المسلمين على الخير والمحبة."
            imagePosition="left"
            backgroundColor="#E8F2F8"
            stats={[
              { value: '5000+', label: 'كتاب ومرجع' },
              { value: '8+', label: 'نشاط سنوي' },
            ]}
          />
        </motion.div>

        {/* ── Books Section ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full flex justify-center items-center px-6 py-16 md:px-16 md:py-20 lg:px-24"
          dir="rtl"
        >
          <div className="flex w-full flex-col items-center">
            <motion.h3
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="m-0 text-base font-bold text-primary-300 md:text-xl"
            >
              مجموعة مختارة
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-10 mt-3 text-center font-khalid text-2xl font-bold md:text-[32px]"
            >
              أحدث إصدارات المكتبة
            </motion.p>

            <ListingRenderer
              isLoading={booksLoading}
              isError={!!booksError}
              isEmpty={books.length === 0}
              loader={
                <div className="grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <BookCardSkeleton key={index} />
                  ))}
                </div>
              }
              errorFallback={<ErrorData />}
              emptyFallback={<EmptyData title="لا توجد كتب بعد" />}
              staticFallback={
                <div className="grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {staticBooks.map((book, idx) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                    >
                      <BookCard book={book} />
                    </motion.div>
                  ))}
                </div>
              }
            >
              <div className="grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {books.map((book, idx) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                  >
                    <BookCard book={book} />
                  </motion.div>
                ))}
              </div>
            </ListingRenderer>

            <Link
              href="/library"
              className="mt-10 flex items-center gap-1 rounded-lg border border-white bg-primary-main-10 px-6 py-1 text-base font-bold leading-loose text-primary-300 no-underline"
            >
              عرض الفهرس الكامل
            </Link>
          </div>
        </motion.section>

        {/* ── Activities Section ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          dir="rtl"
          className="w-full bg-fill-contrast flex justify-center items-center px-6 py-16 md:px-16 lg:px-24"
        >
          <div className="flex w-full flex-col items-center">
            <motion.h3
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="m-0 text-base font-bold text-primary-300 md:text-xl"
            >
              نشاطاتنا
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-10 mt-3 text-center font-khalid text-2xl font-bold md:text-[32px]"
            >
              نشاطات دعوية وتعليمية واجتماعية
            </motion.p>

            <ListingRenderer
              isLoading={activitiesLoading}
              isError={!!activitiesError}
              isEmpty={activities.length === 0}
              loader={
                <div className="grid w-full max-w-[1200px] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <ActivityCardSkeleton large className="md:col-span-2 lg:col-span-2" />
                  <ActivityCardSkeleton />
                  <ActivityCardSkeleton />
                  <ActivityCardSkeleton />
                </div>
              }
              errorFallback={<ErrorData />}
              emptyFallback={<EmptyData title="لا توجد أنشطة حالياً" />}
              staticFallback={
                <div className="grid w-full max-w-[1200px] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {staticActivities.map((activity, idx) => {
                    const media = activity.image as Media
                    const imageUrl = getImageUrl(media?.url)
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                        className={idx === 0 ? 'md:col-span-2 lg:col-span-2' : ''}
                      >
                        <ActivityCard
                          title={activity.title}
                          imageSrc={imageUrl}
                          imageAlt={activity.title}
                          description={activity.shortDescription}
                          badge={activitiesTypesConfig[activity.type]}
                          className="h-full min-h-[200px]"
                        />
                      </motion.div>
                    )
                  })}
                </div>
              }
            >
              <div className="grid w-full max-w-[1200px] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {activities.map((activity, idx) => {
                  const media = activity.image as Media
                  const imageUrl = getImageUrl(media?.url)
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                      className={idx === 0 ? 'md:col-span-2 lg:col-span-2' : ''}
                    >
                      <ActivityCard
                        title={activity.title}
                        imageSrc={imageUrl}
                        imageAlt={activity.title}
                        description={activity.shortDescription}
                        badge={activitiesTypesConfig[activity.type]}
                        className="h-full min-h-[200px]"
                      />
                    </motion.div>
                  )
                })}
              </div>
            </ListingRenderer>

            <Link
              href="/activities"
              className="mt-10 flex items-center gap-1 rounded-lg border border-white bg-primary-main-10 px-6 py-1 text-base font-bold leading-loose text-primary-300 no-underline"
            >
              عرض الفهرس الكامل
            </Link>
          </div>
        </motion.section>

        {/* ── Articles Section ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full flex justify-center items-center px-6 py-16 md:px-16 md:py-20 lg:px-24"
          dir="rtl"
        >
          <div className="flex w-full flex-col items-center">
            <motion.h3
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="m-0 text-base font-bold text-primary-300 md:text-xl"
            >
              فكر ومعرفة
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6 mt-2 text-center font-khalid text-2xl font-bold md:text-[32px]"
            >
              أحدث المقالات
            </motion.p>

            <ListingRenderer
              isLoading={articlesLoading}
              isError={!!articlesError}
              isEmpty={articles.length === 0}
              loader={
                <div className="grid w-full max-w-[1200px] grid-cols-1 gap-6 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <ArticleSkeleton key={index} />
                  ))}
                </div>
              }
              errorFallback={<ErrorData />}
              emptyFallback={<EmptyData title="لا توجد مقالات بعد" />}
              staticFallback={
                <div className="grid w-full max-w-[1200px] grid-cols-1 gap-6 md:grid-cols-3">
                  {staticArticles.map((article, idx) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                    >
                      <ArticleCard article={article} />
                    </motion.div>
                  ))}
                </div>
              }
            >
              <div className="grid w-full max-w-[1200px] grid-cols-1 gap-6 md:grid-cols-3">
                {articles.map((article, idx) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                  >
                    <ArticleCard article={article} />
                  </motion.div>
                ))}
              </div>
            </ListingRenderer>

            <Link
              href="/articles"
              className="mt-6 flex items-center gap-1 rounded-lg border border-white bg-primary-main-10 px-6 py-1 text-base font-bold leading-loose text-primary-300 no-underline"
            >
              عرض الفهرس الكامل
            </Link>
          </div>
        </motion.section>

        <CTASection />
      </div>
      <Footer />
    </>
  )
}

export default LandingPage
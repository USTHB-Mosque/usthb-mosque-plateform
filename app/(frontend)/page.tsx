"use client"

import * as React from 'react';
import Navbar from '@/components/layouts/Navbar';
import BookCard from './library/_components/BookCard';
import SectionBlock from '@/components/ui/sectionBlock';
import ActivityCard from '@/components/ui/activityCard';
import Footer from '@/components/layouts/Footer';
import Image from 'next/image'
import CTASection from '@/components/ui/CTASection.';
import ArticleCard from './articles/_components/ArticleCard';
import { motion } from 'motion/react';

const LandingPage: React.FC = React.memo(() => {
  return (
    <>
      <Navbar />
      <div id="scroll-root" style={{ width: "100%" }} className="no-scrollbar">

        {/* ── Hero Video Section ── */}
        <section className="relative w-full overflow-hidden h-screen">

          {/* Background video */}
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

          {/* Blue-white tint overlay */}
          <div
            className="absolute inset-0 z-[2] pointer-events-none"
            style={{ background: 'rgba(220, 235, 255, 0.15)' }}
          />

          {/* Gradient overlay + content */}
          <div
            className="absolute top-0 left-0 z-[3] w-full h-[65%] md:h-[60%] flex flex-col items-center justify-center gap-4 md:gap-6 px-6 md:px-16 pt-8"
            style={{
              background: 'linear-gradient(to bottom, var(--background-2) 0%, var(--background-2) 60%, color-mix(in srgb, var(--background-2) 85%, transparent) 72%, color-mix(in srgb, var(--background-2) 60%, transparent) 82%, color-mix(in srgb, var(--background-2) 30%, transparent) 91%, transparent 100%)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Image
                src="/static/images/bismilah.svg"
                alt="Bismillah"
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
              ﴿في بُيوتٍ أَذِنَ{' '}
              <span className="text-[clamp(18px,2vw,28px)]" style={{ color: 'var(--primary-1000)' }}>اللَّهُ</span>{' '}
              أَن تُرفَعَ وَيُذكَرَ فيهَا اسمُ
              <span className="text-[clamp(18px,2vw,28px)]" style={{ color: 'var(--primary-1000)' }}>هُ</span>{' '}
              يُسَبِّحُ لَهُ فيها بِالغُدُوِّ وَالآصالِ۝ رِجَالٌ لَا تُلْهِيهِمْ تِجَارَةٌ وَلَا بَيْعٌ عَنْ ذِكْرِ{' '}
              <span className="text-[clamp(18px,2vw,28px)]" style={{ color: 'var(--primary-1000)' }}>اللَّهِ</span>{' '}
              وَإِقَامِ الصَّلَاةِ وَإِيتَاءِ الزَّكَاةِ ۙ يَخَافُونَ يَوْمًا تَتَقَلَّبُ فِيهِ الْقُلُوبُ
              وَالْأَبْصَارُ﴾ [النور: ٣٦]
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
            cardTitle='"نور الهداية"'
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
            cardTitle='"منارة الإيمان"'
            cardBody="المسجد منارة تُنير القلوب بالإيمان وتجمع المسلمين على الخير والمحبة."
            imagePosition="left"
            backgroundColor="#E8F2F8"
            stats={[
              { value: '5000+', label: 'كتاب ومرجع' },
              { value: '8+', label: 'نشاط سنويا' },
            ]}
          />
        </motion.div>

        {/* ── Books Section ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full flex justify-center items-center px-6 py-16 sm:grid-cols-2 md:px-16 md:py-20 lg:px-24 lg:h-screen lg:py-0"
          dir="rtl"
        >
          <div className="flex w-full flex-col items-center">
            <motion.h3
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="m-0 text-base font-bold text-[var(--primary-1000)] md:text-xl"
            >
              مجموعة مختارة
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-10 mt-3 text-center font-[var(--font-khalid)] text-2xl font-bold md:text-[32px]"
            >
              أحدث إصدارات المكتبة
            </motion.p>

            <div className="grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <BookCard />
                </motion.div>
              ))}
            </div>

            <motion.a
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              href="#"
              className="mt-10 flex items-center gap-1 rounded-lg border border-white bg-[#0DE9C31A] px-6 py-1 text-base font-bold leading-loose text-[var(--primary-1000)] no-underline"
            >
              عرض الفهرس الكامل
            </motion.a>
          </div>
        </motion.section>

        {/* ── Activities Section ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          dir="rtl"
          className="w-full bg-[#E8F2F8] flex justify-center items-center px-6 py-16 md:px-16 lg:px-24"
        >
          <div className="flex w-full flex-col items-center">
            <motion.h3
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="m-0 text-base font-bold text-[var(--primary-1000)] md:text-xl"
            >
              نشاطاتنا
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-10 text-center mt-3 font-[var(--font-khalid)] text-2xl font-bold md:text-[32px]"
            >
              نشاطات دعوية وتعليمية واجتماعية
            </motion.p>

            {/* Bento grid */}
            {/* Bento grid */}
<div className="w-full max-w-[1200px] grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

  {/* Large featured card — 2×2 */}
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: 0 }}
    className="md:col-span-2 md:row-span-2"
  >
    <ActivityCard
      title="حلقات القرآن"
      imageSrc="/static/images/quaran.jpg"
      imageAlt="quaran"
      className="h-full min-h-[320px]"
      badge="الأكثر إقبالا"
      description="حلقات أسبوعية لحفظ وتدبر القرآن الكريم."
      hadith={
        <>
          قال رسول{' '}
          <span style={{ fontSize: 14, color: 'var(--primary-1000)' }}>الله</span> صلى{' '}
          <span style={{ fontSize: 14, color: 'var(--primary-1000)' }}>الله</span> عليه وسلم :{' '}
          " خيركم من تعلم القرآن وعلمه"
        </>
      }
      actions={[
        { label: 'سجل الآن', variant: 'primary' },
        { label: 'التفاصيل', variant: 'secondary' },
      ]}
    />
  </motion.div>

  {/* Wide card — spans 2 cols */}
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: 0.1 }}
    className="md:col-span-2"
  >
    <ActivityCard
      title="مكتبة"
      imageSrc="/static/images/quaran2.jpg"
      imageAlt="library"
      className="h-full min-h-[200px]"
      showArrow
      description="حلقات أسبوعية لحفظ وتدبر القرآن الكريم."
      hadith={
        <>
          قال رسول{' '}
          <span style={{ fontSize: 14, color: 'var(--primary-1000)' }}>الله</span> صلى{' '}
          <span style={{ fontSize: 14, color: 'var(--primary-1000)' }}>الله</span> عليه وسلم :{' '}
          " خيركم من تعلم القرآن وعلمه"
        </>
      }
    />
  </motion.div>

  {/* Small card */}
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: 0.2 }}
  >
    <ActivityCard
      title="المسابقة الرمضانية"
      imageSrc="/static/images/competition.jpg"
      imageAlt="competition"
      className="h-full min-h-[200px]"
      showArrow
    />
  </motion.div>

  {/* Small card */}
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: 0.3 }}
  >
    <ActivityCard
      title="نشاط مسعى"
      imageSrc="/static/images/volunteer.jpg"
      imageAlt="volunteer"
      className="h-full min-h-[200px]"
      showArrow
    />
  </motion.div>

</div>

            <motion.a
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              href="#"
              className="mt-10 flex items-center gap-1 rounded-lg border border-white bg-[#0DE9C31A] px-6 py-1 text-base font-bold leading-loose text-[var(--primary-1000)] no-underline"
            >
              عرض الفهرس الكامل
            </motion.a>
          </div>
        </motion.section>

        {/* ── Articles Section ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full flex justify-center items-center px-6 py-16 sm:grid-cols-2 md:px-16 md:py-20 lg:px-24 lg:h-screen lg:py-0"
          dir="rtl"
        >
          <div className="flex w-full flex-col items-center">
            <motion.h3
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="m-0 text-base font-bold text-[var(--primary-1000)] md:text-xl"
            >
              فكر ومعرفة
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6 mt-2 text-center font-[var(--font-khalid)] text-2xl font-bold md:text-[32px]"
            >
              أحدث المقالات
            </motion.p>

            <div className="grid w-full max-w-[1200px] gap-6 grid-cols-1 md:grid-cols-3">
              {[0, 1, 2].map((idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <ArticleCard />
                </motion.div>
              ))}
            </div>

            <motion.a
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              href="#"
              className="mt-6 flex items-center gap-1 rounded-lg border border-white bg-[#0DE9C31A] px-6 py-1 text-base font-bold leading-loose text-[var(--primary-1000)] no-underline"
            >
              عرض الفهرس الكامل
            </motion.a>
          </div>
        </motion.section>

        <CTASection />
        <Footer />
      </div>
    </>
  );
});

LandingPage.displayName = 'LandingPage';

export default LandingPage;
import * as React from 'react';
import Navbar from '@/components/layouts/Navbar';
import BookCard from './library/_components/BookCard';
import SectionBlock from '@/components/ui/sectionBlock';
import ActivityCard from '@/components/ui/activityCard';
import Footer from '@/components/layouts/Footer';
import Image from 'next/image'
import Link from 'next/link'
import CTASection from '@/components/ui/CTASection.';
import ArticleCard from './articles/_components/ArticleCard';


const styles = {
  main: { width: '100%' } as React.CSSProperties,

  heroSection: {
    height: '100vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 50,
    padding: '64px 100px',
  } as React.CSSProperties,

  cta: {
    display: 'flex',
    justifyContent: 'center',
    gap: 5,
    alignItems: 'center',
    backgroundColor: '#0DE9C31A',
    fontWeight: 700,
    fontSize: 16,
    lineHeight: '200%',
    color: 'var(--primary-1000)',
    padding: '3px 24px',
    borderRadius: 8,
    border: '1px solid #fff',
    willChange: 'transform',
    textDecoration: 'none',
  } as React.CSSProperties,
} as const;

const LandingPage: React.FC = React.memo(() => {
  return (
    <>
      <Navbar />
      <div id="scroll-root" style={styles.main} className="no-scrollbar">


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
            className="hidden md:block absolute top-0 left-0 w-full h-full object-cover scale-125"
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
            <Image
              src="/static/images/bismilah.svg"
              alt="Bismillah"
              width={180}
              height={40}
              priority
              className="w-28 sm:w-36 md:w-auto"
            />
            <p
              dir="rtl"
              style={{ fontFamily: 'var(--font-uthmanic)' }}
              className="text-center leading-loose w-[95%] sm:w-[80%] md:w-[70%] lg:w-[60%] [font-size:clamp(24px,2.5vw,24px)]"
            >
              ﴿في بُيوتٍ أَذِنَ{' '}
              <span style={{ color: 'var(--primary-1000)' }}>اللَّهُ</span>{' '}
              أَن تُرفَعَ وَيُذكَرَ فيهَا اسمُ
              <span style={{ color: 'var(--primary-1000)' }}>هُ</span>{' '}
              يُسَبِّحُ لَهُ فيها بِالغُدُوِّ وَالآصالِ۝ رِجَالٌ لَا تُلْهِيهِمْ تِجَارَةٌ وَلَا بَيْعٌ عَنْ ذِكْرِ{' '}
              <span style={{ color: 'var(--primary-1000)' }}>اللَّهِ</span>{' '}
              وَإِقَامِ الصَّلَاةِ وَإِيتَاءِ الزَّكَاةِ ۙ يَخَافُونَ يَوْمًا تَتَقَلَّبُ فِيهِ الْقُلُوبُ
              وَالْأَبْصَارُ﴾ [النور: ٣٦]
            </p>
          </div>

        </section>

        {/* ── Section 1: لبنة المجتمع ── */}
        <SectionBlock
          heading="لبنة المجتمع"
          body="إن من الملفت للنظر أن أول عمل قام به الرسول ﷺ في قباء وفي المدينة كان بناء مسجد في كل منهما، وهذا الأمر لم يكن على سبيل المصادفة، ولم يكن مجرد إشارة عابرة، بل هذا منهج أصيل، فلا قيام لأمة إسلامية بغير المسجد."
          imageSrc="/static/images/mosque-1.jpg"
          cardTitle='"نور الهداية"'
          cardBody="فِي بُيُوتٍ أَذِنَ اللهُ أَنْ تُرْفَعَ وَيُذْكَرَ فِيهَا اسْمُهُ يُسَبِّحُ لَهُ فِيهَا بِالْغُدُوِّ وَالْآصَالِ."
          imagePosition="right"
        />

        {/* ── Section 2: رسالة علمية وإيمانية ── */}
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

        <section
          className="w-full flex justify-center items-center px-6 py-16 sm:grid-cols-2 md:px-16 md:py-20 lg:px-24 lg:h-screen lg:py-0"
          dir="rtl"
        >
          <div className="flex w-full flex-col items-center">

            <h3 className="m-0 text-base font-bold text-[var(--primary-1000)] md:text-xl">
              مجموعة مختارة
            </h3>
            <p className="mb-10 mt-3 text-center font-[var(--font-khalid)] text-2xl font-bold md:text-[32px]">
              أحدث إصدارات المكتبة
            </p>

            <div className="grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <BookCard />
              <BookCard />
              <BookCard />
              <BookCard />
            </div>

            <a
              href="#"
              className="mt-10 flex items-center gap-1 rounded-lg border border-white bg-[#0DE9C31A] px-6 py-1 text-base font-bold leading-loose text-[var(--primary-1000)] no-underline"
            >
              عرض الفهرس الكامل
            </a>
          </div>
        </section>


        {/* ── Activities Section ── */}
        <section
          dir="rtl"
          className="w-full bg-[#E8F2F8] flex justify-center items-center px-6 py-16 md:px-16 lg:px-24"
        >
          <div className="flex w-full flex-col items-center">

            <h3 className="m-0 text-base font-bold text-[var(--primary-1000)] md:text-xl">
              نشاطاتنا
            </h3>
            <p className="mb-10 text-center mt-3 font-[var(--font-khalid)] text-2xl font-bold md:text-[32px]">
              نشاطات دعوية وتعليمية واجتماعية
            </p>

            {/* Bento grid */}
            <div className="
      w-full max-w-[1200px]
      grid gap-4
      grid-cols-1
      md:grid-cols-2
      lg:grid-cols-4
    ">
              {/* Large featured card — full width on mobile, 2×2 on desktop */}
              <ActivityCard
                title="حلقات القرآن"
                imageSrc="/static/images/quaran.jpg"
                imageAlt="quaran"
                className="min-h-[320px] md:col-span-2 md:row-span-2 md:min-h-0"
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

              {/* Wide card — full width on mobile, spans 2 cols on desktop */}
              <ActivityCard
                title="مكتبة"
                imageSrc="/static/images/quaran2.jpg"
                imageAlt="library"
                className="min-h-[200px] md:col-span-2"
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

              {/* Small cards */}
              <ActivityCard
                title="المسابقة الرمضانية"
                imageSrc="/static/images/competition.jpg"
                imageAlt="competition"
                className="min-h-[200px]"
                showArrow
              />
              <ActivityCard
                title="نشاط مسعى"
                imageSrc="/static/images/volunteer.jpg"
                imageAlt="volunteer"
                className="min-h-[200px]"
                showArrow
              />
            </div>

            <a
              href="#"
              className="mt-10 flex items-center gap-1 rounded-lg border border-white bg-[#0DE9C31A] px-6 py-1 text-base font-bold leading-loose text-[var(--primary-1000)] no-underline"
            >
              عرض الفهرس الكامل
            </a>

          </div>
        </section>

        <section
          className="w-full flex justify-center items-center px-6 py-16 sm:grid-cols-2 md:px-16 md:py-20 lg:px-24 lg:h-screen lg:py-0"
          dir="rtl"
        >
          <div className="flex w-full flex-col items-center">

            <h3 className="m-0 text-base font-bold text-[var(--primary-1000)] md:text-xl">
              فكر ومعرفة
            </h3>
            <p className="mb-6 mt-2 text-center font-[var(--font-khalid)] text-2xl font-bold md:text-[32px]">
              أحدث المقالات
            </p>

            <div className="grid w-full max-w-[1200px] gap-6 grid-cols-1 md:grid-cols-3">
              <ArticleCard />
              <ArticleCard />
              <ArticleCard />
            </div>

            <a
              href="#"
              className="mt-6 flex items-center gap-1 rounded-lg border border-white bg-[#0DE9C31A] px-6 py-1 text-base font-bold leading-loose text-[var(--primary-1000)] no-underline"
            >
              عرض الفهرس الكامل
            </a>
          </div>
        </section>

        <CTASection />
        <Footer />
      </div>
    </>
  );
});

LandingPage.displayName = 'LandingPage';

export default LandingPage;
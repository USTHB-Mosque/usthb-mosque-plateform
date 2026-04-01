import * as React from 'react';
import Navbar from '@/components/layouts/Navbar';
import BookCard from './library/_components/BookCard';
import SectionBlock from '@/components/ui/sectionBlock';
import ActivityCard from '@/components/ui/activityCard';

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
    <main style={styles.main} className="no-scrollbar">
      <Navbar />

      {/* ── Hero Video Section ── */}
      <section
        style={{
          ...styles.heroSection,
          padding: 0,
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
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
          autoPlay
          muted
          loop
        />

        {/* Blue-white tint overlay */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: 'rgba(220, 235, 255, 0.15)',
            top: 0,
            left: 0,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />

        {/* Ayah overlay */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '60%',
            background:
              'linear-gradient(to bottom, var(--background-2) 0%, var(--background-2) 60%, color-mix(in srgb, var(--background-2) 85%, transparent) 72%, color-mix(in srgb, var(--background-2) 60%, transparent) 82%, color-mix(in srgb, var(--background-2) 30%, transparent) 91%, transparent 100%)',
            paddingTop: 32,
            zIndex: 3,
            top: 0,
            left: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <img src="/static/images/bismilah.svg" alt="Bismillah" />
          <p
            style={{
              fontFamily: 'var(--font-uthmanic)',
              fontSize: 24,
              textAlign: 'center',
              width: '60%',
            }}
          >
            ﴿في بُيوتٍ أَذِنَ{' '}
            <span style={{ fontFamily: 'var(--font-uthmanic)', fontSize: 24, color: 'var(--primary-1000)' }}>
              اللَّهُ
            </span>{' '}
            أَن تُرفَعَ وَيُذكَرَ فيهَا اسمُ
            <span style={{ fontFamily: 'var(--font-uthmanic)', fontSize: 24, color: 'var(--primary-1000)' }}>
              هُ
            </span>{' '}
            يُسَبِّحُ لَهُ فيها بِالغُدُوِّ وَالآصالِ۝ رِجَالٌ لَا تُلْهِيهِمْ تِجَارَةٌ وَلَا بَيْعٌ عَنْ ذِكْرِ{' '}
            <span style={{ fontFamily: 'var(--font-uthmanic)', fontSize: 24, color: 'var(--primary-1000)' }}>
              اللَّهِ
            </span>{' '}
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
        imageSrc="/static/images/mosque-1.jpg"
        cardTitle='"منارة الإيمان"'
        cardBody="المسجد منارة تُنير القلوب بالإيمان وتجمع المسلمين على الخير والمحبة."
        imagePosition="left"
        backgroundColor="#E8F2F8"
        stats={[
          { value: '5000+', label: 'كتاب ومرجع' },
          { value: '8+', label: 'نشاط سنويا' },
        ]}
      />

      <section style={styles.heroSection} />

      {/* ── Activities Section ── */}
      <section
        style={{
          ...styles.heroSection,
          backgroundColor: '#E8F2F8',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px 100px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          <h3 style={{ fontWeight: 700, fontSize: 20, color: 'var(--primary-1000)', margin: 0 }}>
            نشاطاتنا
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-khalid)',
              fontWeight: 700,
              fontSize: 32,
              marginTop: 12,
              marginBottom: 40,
            }}
          >
            نشاطات دعوية وتعليمية واجتماعية
          </p>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 16,
              width: '100%',
              maxWidth: 1200,
            }}
          >
            {/* Large featured card */}
            <ActivityCard
              title="حلقات القرآن"
              imageSrc="/static/images/quaran.jpg"
              imageAlt="quaran"
              gridColumn="span 2"
              gridRow="span 2"
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

            {/* Wide card */}
            <ActivityCard
              title="مكتبة"
              imageSrc="/static/images/quaran2.jpg"
              imageAlt="library"
              gridColumn="span 2"
              gridRow="span 1"
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
              gridRow="span 1"
              showArrow
            />
            <ActivityCard
              title="نشاط مسعى"
              imageSrc="/static/images/volunteer.jpg"
              imageAlt="volunteer"
              gridRow="span 1"
              showArrow
            />
          </div>

          <a href="#" style={styles.cta}>
            عرض الفهرس الكامل
          </a>
        </div>
      </section>

      <section style={styles.heroSection} />
      <section style={styles.heroSection} />
    </main>
  );
});

LandingPage.displayName = 'LandingPage';

export default LandingPage;
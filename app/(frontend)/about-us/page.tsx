"use client"

import * as React from 'react';
import AboutUsClient from './_components/AboutUsClient';
import SectionBlock from '@/components/ui/sectionBlock';
import Image from 'next/image';
import { Target, Eye, BookOpen, ShieldCheck, Users, Star } from 'lucide-react';
import Gallery from './_components/Gallery';
import { motion } from 'motion/react';

const AboutUsPage: React.FC = () => {
  return (
    <AboutUsClient>
      {/* ── Hero Section ── */}
      <section className="flex flex-col items-center justify-center pt-24 pb-8 px-6 md:pt-32 md:pb-12 lg:px-24">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--secondary-500)] mb-4 md:mb-6 text-center"
          style={{ fontFamily: 'var(--font-khalid)' }}
        >
          مسجد جامعة باب الزوار
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-center max-w-2xl text-[var(--muted-foreground)]"
        >
          استكشف الكنوز المعرفية والكتب النادرة في مكتبة المسجد. متاحة للمطالعة والإستعارة.
        </motion.p>
      </section>

      {/* ── History Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="w-full flex flex-col lg:flex-row items-center gap-10 px-6 py-12 md:px-16 lg:px-24 max-w-[1400px] mx-auto"
      >


        <div dir="rtl" className="w-full lg:w-1/2 flex flex-col items-start gap-6 text-right">
          <h2 className="text-3xl font-bold text-[var(--secondary-500)] md:text-4xl" style={{ fontFamily: 'var(--font-khalid)' }}>
            تاريخنا ورسالتنا
          </h2>
          <p className="text-lg leading-loose text-justify text-[var(--foreground)]">
            تأسس مسجد جامعة باب الزوار ليكون منارة للعلم والإيمان، يخدم آلاف الطلاب  والباحثين. نحن نؤمن أن التكامل بين العلم التجريبي والقيم الأخلاقية هو  السبيل لبناء جيل قادر على مواجهة تحديات العصر.
            توفر المكتبة اليوم آلاف المراجع في مختلف التخصصات العلمية والشرعية، بالإضافة إلى بيئة دراسية هادئة تساهم في التحصيل العلمي للمهندسين والعلماء  المستقبليين.          </p>

          <dl className="flex w-full justify-between mt-4">
            <div className="flex w-full flex-col">
              <dd className="text-3xl font-bold text-[var(--primary-1000)]">+5000</dd>
              <dt className="text-base font-bold text-[var(--secondary-500)]">كتاب ومرجع</dt>
            </div>
            <div className="flex w-full flex-col">
              <dd className="text-3xl font-bold text-[var(--primary-1000)]">+8</dd>
              <dt className="text-base font-bold text-[var(--secondary-500)]">نشاط سنوي</dt>
            </div>
          </dl>
        </div>
        <div className="w-full lg:w-1/2">
          <div className="relative h-[300px] md:h-[400px] lg:h-[450px] w-full rounded-2xl overflow-hidden shadow-lg">
            <Image
              src="/static/images/about-us-hero.jpg"
              alt="Mosque Archway"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </motion.section>

      {/* ── Mission & Vision Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="w-full bg-[#E8F2F8] py-16 px-6 md:px-16 lg:px-24"
      >
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div
            style={{
              backgroundImage: 'url(/static/images/book-pattern.png)',
              backgroundPosition: 'start',
              backgroundRepeat: 'no-repeat',
            }} className="bg-white rounded-xl p-8 shadow-sm border border-white flex flex-col items-start gap-4 transition-transform hover:scale-[1.02]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#0DE9C31A] flex items-center justify-center text-[var(--primary-1000)]">
                <Target size={24} />
              </div>
              <h3 className="text-2xl font-bold text-[var(--secondary-500)]" style={{ fontFamily: 'var(--font-khalid)' }}>مهمتنا</h3>
            </div>
            <p className="text-lg leading-loose text-justify text-[var(--foreground)]">
              تمكين طلاب جامعة باب الزوار من الوصول الميسر للمعلومات والكتب، مع ترسيخ  الهوية الإسلامية والقيم الحضارية من خلال القراءة والتحصيل المتنوع.
            </p>
          </div>

          <div style={{
            backgroundImage: 'url(/static/images/book-pattern.png)',
            backgroundPosition: 'start',
            backgroundRepeat: 'no-repeat',
          }} className="bg-white rounded-xl p-8 shadow-sm border border-white flex flex-col items-start gap-4 transition-transform hover:scale-[1.02]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#0DE9C31A] flex items-center justify-center text-[var(--primary-1000)]">
                <Eye size={24} />
              </div>
              <h3 className="text-2xl font-bold text-[var(--secondary-500)]" style={{ fontFamily: 'var(--font-khalid)' }}>رؤيتنا</h3>
            </div>
            <p className="text-lg leading-loose text-justify text-[var(--foreground)]">
              أن تصبح مكتبة المسجد المركز الثقافي والعلمي الأول داخل الحرم الجامعي،  ونموذجاً يحتذى به في المزاوجة بين التقنية والرسالة السامية.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── Core Values Section ── */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="w-full py-20 px-6 md:px-16 lg:px-24 flex flex-col items-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-[var(--secondary-500)] mb-2" style={{ fontFamily: 'var(--font-khalid)' }}>قيمنا الجوهرية</h2>
        <p className="text-lg text-[var(--muted-foreground)] mb-12">المبادئ التي توجهنا في تقديم خدماتنا.</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 w-full max-w-[1200px]">
          {[
            { icon: <BookOpen size={32} />, label: "العلم", description: "نهتم بالمعرفة والتعلم المستمر." },
            { icon: <ShieldCheck size={32} />, label: "الأمانة", description: "نحافظ على كنوزنا وخصوصية روادنا." },
            { icon: <Users size={32} />, label: "الأخوة", description: "نرحب بالجميع في بيئة يسودها الاحترام." },
            { icon: <Star size={32} />, label: "الإتقان", description: "نسعى لتقديم أفضل الخدمات الممكنة." }
          ].map((value, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="flex flex-col items-center text-center gap-4"
            >
              <div className="w-20 h-20 rounded-full hover:border hover:scale-110 transition-all duration-300 border-[var(--primary-1000)] flex items-center justify-center text-[var(--primary-1000)] bg-white shadow-sm">
                {value.icon}
              </div>
              <h4 className="text-xl font-bold text-[var(--secondary-500)]">{value.label}</h4>
              <p className="text-sm text-[var(--muted-foreground)] max-w-[150px]">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Gallery Section ── */}
      <Gallery />
    </AboutUsClient>
  );
};

export default AboutUsPage;

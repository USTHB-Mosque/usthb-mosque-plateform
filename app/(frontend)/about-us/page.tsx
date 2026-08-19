'use client'

import React from 'react'
import Navbar from '@/components/layouts/navbar/Navbar'
import Footer from '@/components/layouts/Footer'
import SectionBlock from '@/components/ui/sectionBlock'
import CTASection from '@/components/ui/CTASection'
import Image from 'next/image'
import { Target, Eye, BookOpen, ShieldCheck, Users, Star } from 'lucide-react'
import Gallery from './_components/Gallery'
import { motion } from 'motion/react'

const AboutUsPage: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex-1">
        {/* ── Hero Section ── */}
        <section className="flex flex-col items-center justify-center pt-8 pb-6 px-6 md:pt-8 md:pb-8 lg:px-24">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-500 mb-4 md:mb-6 text-center font-khalid">
            مسجد جامعة باب الزوار
          </h1>
          <p className="text-lg md:text-xl text-center max-w-2xl text-muted-foreground">
            منارة للعلم والإيمان داخل الحرم الجامعي، تجمع بين رسالة المسجد وخدمة الطلاب والباحثين.
          </p>
        </section>

        {/* ── History & Mission Section ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full flex flex-col lg:flex-row items-center gap-10 px-6 py-12 md:px-16 lg:px-24 max-w-7xl mx-auto"
        >
          <div dir="rtl" className="w-full lg:w-1/2 flex flex-col items-start gap-6 text-right">
            <h2 className="text-3xl font-bold text-secondary-500 md:text-4xl font-khalid">تاريخنا ورسالتنا</h2>
            <p className="text-lg leading-loose text-justify text-foreground">
              تأسس مسجد جامعة باب الزوار ليكون منارة للعلم والإيمان، يخدم آلاف الطلاب والباحثين. نؤمن أن التكامل بين
              العلم التجريبي والقيم الأخلاقية هو السبيل لبناء جيل قادر على مواجهة تحديات العصر، ويسعى المسجد إلى توفير
              بيئة روحية وعلمية متكاملة داخل الحرم الجامعي.
            </p>

            <dl className="flex w-full justify-between mt-4">
              <div className="flex w-full flex-col">
                <dd className="text-3xl font-bold text-primary-300">+5000</dd>
                <dt className="text-base font-bold text-secondary-500">كتاب ومرجع</dt>
              </div>
              <div className="flex w-full flex-col">
                <dd className="text-3xl font-bold text-primary-300">+8</dd>
                <dt className="text-base font-bold text-secondary-500">نشاط سنوي</dt>
              </div>
            </dl>
          </div>
          <div className="w-full lg:w-1/2">
            <div className="relative h-[300px] md:h-[400px] lg:h-[450px] w-full rounded-2xl overflow-hidden shadow-lg">
              <Image src="/static/images/about-us-hero.jpg" alt="مدخل المسجد" fill className="object-cover" />
            </div>
          </div>
        </motion.section>

        {/* ── Core Values Section ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full py-20 bg-fill-contrast px-6 md:px-16 lg:px-24 flex flex-col items-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-secondary-500 mb-2 font-khalid">قيمنا الجوهرية</h2>
          <p className="text-lg text-muted-foreground mb-12">المبادئ التي توجهنا في تقديم خدماتنا.</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 w-full max-w-2xl">
            {[
              { icon: <BookOpen size={32} />, label: 'العلم', description: 'نهتم بالمعرفة والتعلم المستمر.' },
              { icon: <ShieldCheck size={32} />, label: 'الأمانة', description: 'نحافظ على كنوزنا وخصوصية روادنا.' },
              { icon: <Users size={32} />, label: 'الأخوة', description: 'نرحب بالجميع في بيئة يسودها الاحترام.' },
              { icon: <Star size={32} />, label: 'الإتقان', description: 'نسعى لتقديم أفضل الخدمات الممكنة.' },
            ].map((value, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="flex flex-col items-center text-center gap-4"
              >
                <div className="w-20 h-20 rounded-full hover:border hover:scale-110 transition-all duration-300 border-primary-300 flex items-center justify-center text-primary-300 bg-white shadow-sm">
                  {value.icon}
                </div>
                <h4 className="text-xl font-bold text-secondary-500">{value.label}</h4>
                <p className="text-sm text-muted-foreground max-w-[150px]">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Mission & Vision Section ── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full py-16 px-6 md:px-16 lg:px-24"
        >
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div
              style={{
                backgroundImage: 'url(/static/images/book-pattern.png)',
                backgroundPosition: 'start',
                backgroundRepeat: 'no-repeat',
              }}
              className="bg-white rounded-xl p-8 shadow-sm border border-white flex flex-col items-start gap-4 transition-transform hover:scale-[1.02]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary-main-10 flex items-center justify-center text-primary-300">
                  <Target size={24} />
                </div>
                <h3 className="text-2xl font-bold text-secondary-500 font-khalid">مهمتنا</h3>
              </div>
              <p className="text-lg leading-loose text-justify text-foreground">
                تمكين طلاب جامعة باب الزوار من الوصول الميسر للمعلومات والكتب، مع ترسيخ الهوية الإسلامية والقيم
                الحضارية من خلال القراءة والتحصيل المتنوع.
              </p>
            </div>

            <div
              style={{
                backgroundImage: 'url(/static/images/book-pattern.png)',
                backgroundPosition: 'start',
                backgroundRepeat: 'no-repeat',
              }}
              className="bg-white rounded-xl p-8 shadow-sm border border-white flex flex-col items-start gap-4 transition-transform hover:scale-[1.02]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary-main-10 flex items-center justify-center text-primary-300">
                  <Eye size={24} />
                </div>
                <h3 className="text-2xl font-bold text-secondary-500 font-khalid">رؤيتنا</h3>
              </div>
              <p className="text-lg leading-loose text-justify text-foreground">
                أن يصبح المسجد المركز الثقافي والعلمي الأول داخل الحرم الجامعي، ونموذجاً يحتذى به في المزاوجة بين
                التقنية والرسالة السامية.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── Gallery Section ── */}
        <Gallery />
        <CTASection />
      </div>
      <Footer />
    </div>
  )
}

export default AboutUsPage

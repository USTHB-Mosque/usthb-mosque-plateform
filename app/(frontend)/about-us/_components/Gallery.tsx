'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { motion } from 'motion/react'

const images = [
  { src: '/static/images/ramadan.jpg', alt: 'فعالية رمضانية', className: 'lg:col-span-2 lg:row-span-2 h-[516px] hidden lg:block' },
  { src: '/static/images/quaran.jpg', alt: 'حلقة قرآن', className: 'h-[250px]' },
  { src: '/static/images/quaran2.jpg', alt: 'حفظ القرآن', className: 'h-[250px]' },
  { src: '/static/images/volunteer.jpg', alt: 'العمل التطوعي', className: 'md:col-span-2 h-[250px]' },
  { src: '/static/images/mosque-1.jpg', alt: 'مسجد الجامعة', className: 'h-[200px]' },
  { src: '/static/images/mosala.png', alt: 'المصلى', className: 'h-[200px]' },
  { src: '/static/images/competition.jpg', alt: 'المسابقة الرمضانية', className: 'h-[200px]' },
  { src: '/static/images/about-us-hero.jpg', alt: 'مدخل المسجد', className: 'h-[200px]' },
]

const Gallery: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="w-full bg-fill-contrast py-20 px-6 md:px-16 lg:px-24 flex flex-col items-center"
    >
      <h2 className="text-3xl md:text-4xl font-bold text-secondary-500 mb-2 font-khalid">معرض الصور</h2>
      <p className="text-lg text-muted-foreground mb-12">لحظات توثق أنشطة المسجد وفعالياته المختلفة.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-[1200px]">
        {images.map((img, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedImage(img.src)}
            className={`relative rounded-xl overflow-hidden shadow-sm cursor-pointer group transition-all duration-300 hover:shadow-xl ${img.className}`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent showCloseButton={false} className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none ring-0">
          <DialogTitle className="sr-only">معاينة الصورة</DialogTitle>

          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 end-4 z-50 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full border border-white/30 text-white transition-all duration-300 shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {selectedImage && (
            <div className="relative w-full aspect-[4/3] md:aspect-[16/9]">
              <Image src={selectedImage} alt="الصورة المحددة" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.section>
  )
}

export default Gallery
import React, { useState } from 'react'
import Link from 'next/link'
import { useReveal } from '@/shared/hooks/use-reveal'

const videoHero = '/static/images/hero_vid_light.mp4'
const posterHero = '/static/images/cta-book-bg.png'
const btnNormal = '/static/images/cta-btn-normal.png'
const btnHover = '/static/images/cta-btn-hover.png'

const CTASection: React.FC = () => {
  const revealRef = useReveal<HTMLDivElement>()
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)

  return (
    <section
      id="cta"
      dir="rtl"
      className="bg-[#e8f2f8] content-stretch flex flex-col items-center px-[20px] sm:px-[40px] md:px-[80px] xl:px-[140px] py-[50px] relative shrink-0 w-full"
    >
      <div
        ref={revealRef}
        className="reveal bg-white content-stretch flex flex-col h-[346px] sm:h-[370px] xl:h-[380px] items-center justify-start pt-[44px] sm:pt-[52px] max-w-[1024px] xl:max-w-[1100px] overflow-hidden relative rounded-[20px] sm:rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-[#e2e8f0]/80 shrink-0 w-full"
      >
        {/* Hero video background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          poster={posterHero}
          className="absolute top-0 bottom-0 left-[-23%] w-[130%] max-w-none h-full object-cover object-[center_70%] grayscale brightness-[1.12] contrast-[0.96] opacity-65 pointer-events-none select-none"
          src={videoHero}
        />

        {/* White-to-transparent gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/95 via-[26%] to-transparent pointer-events-none" />

        {/* Content */}
        <div className="content-stretch flex flex-col items-center justify-start relative shrink-0 max-w-[900px] px-[20px] sm:px-[24px] text-center z-10 w-full">
          <div className="content-stretch flex flex-col gap-[14px] items-center leading-normal relative shrink-0 w-full">
            <h2
              className="font-khalid not-italic relative shrink-0 text-[#243245] text-[28px] sm:text-[34px] xl:text-[38px] leading-tight text-center"
              dir="auto"
            >
              هل أنت مستعد لبدء رحلتك المعرفية؟
            </h2>
            <p
              className="font-normal relative shrink-0 text-[16px] sm:text-[18px] xl:text-[19px] text-[rgba(36,50,69,0.85)] text-center leading-relaxed"
              dir="auto"
            >
              انضم إلى آلاف الطلاب والباحثين واستفد من خدمات الاستعارة والأنشطة العلمية.
            </p>
          </div>

          {/* PNG-based CTA button */}
          <div className="relative shrink-0 mt-[28px] sm:mt-[32px]">
            <Link
              href="/auth/register"
              aria-label="سجل الآن"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => {
                setHovered(false)
                setActive(false)
              }}
              onMouseDown={() => setActive(true)}
              onMouseUp={() => setActive(false)}
              className="relative block cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#0ebb9d]/60"
              style={{
                transform: active
                  ? 'scale(0.95)'
                  : hovered
                    ? 'scale(1.05) translateY(-2px)'
                    : 'scale(1)',
                transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                filter: hovered
                  ? 'drop-shadow(0 8px 24px rgba(13,233,195,0.55)) drop-shadow(0 2px 8px rgba(13,233,195,0.35))'
                  : 'drop-shadow(0 4px 12px rgba(13,233,195,0.25))',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={btnNormal}
                alt="سجل الآن"
                draggable={false}
                className="block w-[220px] sm:w-[260px] xl:w-[290px] h-auto"
                style={{
                  opacity: hovered ? 0 : 1,
                  transition: 'opacity 0.2s ease',
                  position: hovered ? 'absolute' : 'relative',
                  inset: 0,
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={btnHover}
                alt=""
                aria-hidden
                draggable={false}
                className="block w-[220px] sm:w-[260px] xl:w-[290px] h-auto"
                style={{
                  opacity: hovered ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                  position: hovered ? 'relative' : 'absolute',
                  inset: 0,
                }}
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CTASection

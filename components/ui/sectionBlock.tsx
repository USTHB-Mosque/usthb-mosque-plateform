import React from 'react'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import GlassCard from './glassCard'

interface Stat {
  value: string
  label: string
}

interface SectionBlockProps {
  heading: string
  body: string
  imageSrc: string
  imageAlt?: string
  cardTitle: string
  cardBody: string
  ctaLabel?: string
  ctaHref?: string
  imagePosition?: 'left' | 'right'
  backgroundColor?: string
  stats?: Stat[]
}

const SectionBlock: React.FC<SectionBlockProps> = ({
  heading,
  body,
  imageSrc,
  imageAlt = 'mosque',
  cardTitle,
  cardBody,
  ctaLabel = 'عرض الفهرس الكامل',
  ctaHref = '#',
  imagePosition = 'right',
  backgroundColor,
  stats,
}) => {
  const imageColumn = (
    <div className="relative w-full flex-1 pb-10 md:pb-12 lg:w-[30%]">
      <div className="h-[280px] rounded-lg bg-white p-3 md:h-[360px] lg:h-[420px]">
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={600}
          height={392}
          priority
          className="h-full w-full rounded-[5px] object-cover"
        />
      </div>
      <GlassCard title={cardTitle} body={cardBody} side={imagePosition === 'right' ? 'left' : 'right'} />
    </div>
  )

  const textColumn = (
    <div dir="rtl" className="flex flex-1 flex-col items-start gap-6 text-right lg:w-[30%]">
      <h2 className="text-2xl font-semibold md:text-3xl lg:text-[36px] font-khalid">{heading}</h2>
      <p className="text-base leading-loose text-justify md:text-lg lg:text-xl">{body}</p>

      {stats && stats.length > 0 && (
        <dl className="flex gap-8 md:gap-10">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col">
              <dd className="text-xl font-bold text-primary-300 md:text-2xl">{stat.value}</dd>
              <dt className="text-sm font-bold md:text-base">{stat.label}</dt>
            </div>
          ))}
        </dl>
      )}

      <a
        href={ctaHref}
        className="flex items-center gap-1 rounded-lg border border-white bg-primary-main-10 px-6 py-1 text-sm font-bold leading-loose text-primary-300 no-underline md:text-base"
      >
        {ctaLabel}
        <ArrowLeft size={16} />
      </a>
    </div>
  )

  return (
    <section
      style={{ backgroundColor }}
      className="w-full flex justify-center items-center px-6 py-16 md:px-16 md:py-20 lg:px-24"
    >
      <div className="flex w-full max-w-[1200px] flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-12">
        {imagePosition === 'left' ? (
          <>
            {imageColumn}
            {textColumn}
          </>
        ) : (
          <>
            {textColumn}
            {imageColumn}
          </>
        )}
      </div>
    </section>
  )
}

export default SectionBlock
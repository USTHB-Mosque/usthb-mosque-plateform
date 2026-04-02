import Image from 'next/image'
import Link from 'next/link'

const CTASection = () => {
  return (
    <section
      dir="rtl"
      className="w-full bg-[#E8F2F8] flex justify-center items-center px-6 py-16 md:px-16 lg:px-24"
    >
      <div className="relative w-full rounded-3xl overflow-hidden min-h-[320px] md:min-h-[392px]">

        {/* Background image */}
        <Image
          src="/static/images/footer.png"
          alt=""
          fill
          className="object-cover"
          priority
        />

        {/* Gradient overlay + content */}
        <div className="
          absolute inset-0
          bg-gradient-to-b from-white/95 via-white/80 to-transparent
          flex flex-col items-center justify-center gap-8 md:gap-10
          px-6 py-10 md:px-16
        ">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-[44px] font-bold font-[var(--font-khalid)] leading-snug">
              هل أنت مستعد لبدء رحلتك المعرفية؟
            </h2>
            <p className="text-lg md:text-2xl text-gray-700 max-w-2xl mx-auto">
              انضم إلى آلاف الطلاب والباحثين واستفد من خدمات الاستعارة والأنشطة العلمية.
            </p>
          </div>

          <Link
            href="/register"
            className="
              relative overflow-hidden
              px-8 py-4 md:px-10 md:py-[18px]
              text-lg md:text-2xl font-bold text-white
              bg-[var(--primary-1000)]
              border-2 border-white rounded-xl
              cursor-pointer
              shadow-[inset_0_0px_15px_#ffffff,0_0_10px_#0aaf91ac]
              transition-transform duration-200 hover:scale-[1.02]
            "
          >
            سجل الآن
            {/* Glow blob */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-11 left-1/2 -translate-x-1/2 w-4/5 h-24 blur-xl"
              style={{
                background: "radial-gradient(ellipse at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.5) 40%, transparent 80%)"
              }}
            />
          </Link>
        </div>

      </div>
    </section>
  )
}

export default CTASection;
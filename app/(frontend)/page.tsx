'use client'

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ArrowLeft } from 'lucide-react'
import Navbar from '@/shared/layouts/navbar/Navbar'
import Footer from '@/shared/layouts/Footer'
import SectionBlock from '@/features/landing/components/SectionBlock'
import OnboardingSplash, {
  type OnboardingPhase,
} from '@/features/landing/components/OnboardingSplash'
import { playSoundEffect } from '@/features/landing/sound'
import { useQuranSync } from '@/features/landing/use-quran-sync'
import HeroVerse from '@/features/landing/components/HeroVerse'
import RevealCard from '@/features/landing/components/RevealCard'
import { useReveal } from '@/shared/hooks/use-reveal'
import ActivityCard from '@/features/activities/components/ActivityHighlightCard'
import CTASection from '@/features/landing/components/CTASection'
import Image from 'next/image'
import { animate, motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useGetBooksQuery } from '@/features/library/api/books.queries'
import { useGetArticlesQuery } from '@/features/articles/api/articles.queries'
import { BookCategory } from '@/features/library/types'
import { Media } from '@/payload-types'
import { getImageUrl } from '@/shared/lib/image-utils'
import Link from 'next/link'
import ListingRenderer from '@/shared/listing/ListingRenderer'
import EmptyData from '@/shared/common/EmptyData'
import ErrorData from '@/shared/common/ErrorData'
import BookCard from '@/features/library/components/BookCard'
import BlogArticleCard from '@/features/articles/components/BlogArticleCard'
import BookCardSkeleton from '@/features/library/components/BookCardSkeleton'
import ArticleCardSkeleton from '@/features/articles/components/ArticleCardSkeleton'
import { staticBooks } from '@/features/library/fixtures'
import { staticArticles } from '@/features/articles/fixtures'
import { landingActivities, type LandingActivity } from '@/features/landing/fixtures'

const ONBOARDING_SEEN_KEY = 'landing:onboarding-seen'

// Visual only: fraction of the pinned scroll distance before the hero content
// starts lifting and fading once the auto-scroll is running.
const HERO_FADE_START = 0.1

// Auto-scroll animation between the hero and the next section.
const SNAP_DURATION = 1.1
const SNAP_EASE: [number, number, number, number] = [0.65, 0, 0.35, 1]

// "Intent" needed before the auto-scroll fires: summed wheel pixels or touch swipe
// distance in the same direction. Below it, the page does not move at all.
const WHEEL_INTENT_PX = 120
const TOUCH_INTENT_PX = 70
// Intent that sits idle for this long is forgotten.
const INTENT_RESET_MS = 250
// Trackpad inertia is swallowed for this long after an animation / after
// arriving at the boundary, so one flick can't trigger two transitions.
const SNAP_COOLDOWN_MS = 300
const WALL_COOLDOWN_MS = 300
// Scrollbar drags / fast flicks that land this close under the boundary are
// pushed back to it; farther than that returns to the hero.
const OVERSHOOT_PX = 80
const EDGE_EPS = 2

// A refresh (F5 / Ctrl+R / Ctrl+Shift+R — browsers report them all as
// navigation type 'reload') replays the splash exactly once per document:
// dismissing it consumes the signal so later SPA remounts inside the same
// document stay hidden. Module state resets on the next document load.
let reloadReplayConsumed = false

// sessionStorage: the splash plays once per browser session (so reopening the
// site shows it again) but never again on in-site page navigation.
const markOnboardingSeen = () => {
  reloadReplayConsumed = true
  try {
    window.sessionStorage.setItem(ONBOARDING_SEEN_KEY, '1')
  } catch {
    // storage unavailable (private mode) — onboarding will simply replay
  }
}

// sessionStorage cannot be read during SSR, so the flag travels through
// useSyncExternalStore: the server snapshot stays false (hydration matches),
// then React updates it right after hydration. `hydrated` additionally keeps
// the splash out of the server HTML, so returning visitors never see it flash
// before React takes over.
const subscribeOnboarding = () => () => {}
const serverNotSeen = () => false
const clientHydrated = () => true

// Browsers report F5, Ctrl+R and Ctrl+Shift+R alike as navigation type
// 'reload' — any refresh within a session replays the splash, while plain
// in-site navigation (type 'navigate') keeps it hidden.
const isReloadNavigation = () => {
  try {
    const [navigation] = performance.getEntriesByType('navigation')
    return (navigation as PerformanceNavigationTiming | undefined)?.type === 'reload'
  } catch {
    return false
  }
}

const shouldSkipOnboarding = () => {
  if (isReloadNavigation() && !reloadReplayConsumed) return false
  try {
    return window.sessionStorage.getItem(ONBOARDING_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

const LandingPage: React.FC = () => {
  const hydrated = useSyncExternalStore(subscribeOnboarding, clientHydrated, serverNotSeen)
  const skipOnboarding = useSyncExternalStore(
    subscribeOnboarding,
    shouldSkipOnboarding,
    serverNotSeen,
  )
  const [onboardingPhaseState, setOnboardingPhase] = useState<OnboardingPhase>('ready')
  const onboardingPhase: OnboardingPhase =
    onboardingPhaseState === 'ready' && skipOnboarding ? 'done' : onboardingPhaseState
  const [bgReady, setBgReady] = useState(false)
  const [textReady, setTextReady] = useState(false)
  const [textSettled, setTextSettled] = useState(false)
  const [navReady, setNavReady] = useState(false)
  const [navSettled, setNavSettled] = useState(false)
  const sfxContext = useRef<AudioContext | null>(null)
  const appearanceSoundPlayed = useRef(false)

  // ── Hero scroll-release ──
  const heroTrackRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  // 0 when the track's top reaches the viewport top, 1 when its bottom reaches
  // the viewport bottom. That span is exactly the pinned phase. Driven by normal
  // document scroll: no listeners, no React re-renders.
  const { scrollYProgress } = useScroll({
    target: heroTrackRef,
    offset: ['start start', 'end end'],
  })

  // Hero content: holds still, then lifts away and fades. The fade's last
  // keyframe sits on 1 (holding 0 from 0.92 onward) so the scroll timeline
  // always terminates on a real stop; a final stop short of 1 leaves the
  // opacity stranded at its initial value once the pin completes. Under
  // reduced motion both ranges collapse to constants — identical output at
  // progress 0, so the SSR markup and hydration stay in sync.
  const contentY = useTransform(
    scrollYProgress,
    reduceMotion ? [0, 1] : [0, HERO_FADE_START, 1],
    reduceMotion ? ['0vh', '0vh'] : ['0vh', '0vh', '-26vh'],
  )
  const contentOpacity = useTransform(
    scrollYProgress,
    reduceMotion ? [0, 1] : [0, HERO_FADE_START, 0.92, 1],
    reduceMotion ? [1, 1] : [1, 1, 0, 0],
  )

  // Background video: slower drift than the content, only a slight dim.
  const bgY = useTransform(
    scrollYProgress,
    reduceMotion ? [0, 1] : [0, HERO_FADE_START, 1],
    reduceMotion ? ['0%', '0%'] : ['0%', '0%', '-5%'],
  )
  const bgOpacity = useTransform(
    scrollYProgress,
    reduceMotion ? [0, 1] : [0, HERO_FADE_START, 1],
    reduceMotion ? [1, 1] : [1, 1, 0.4],
  )

  // Section-to-section scrolling with a locked hero.
  //
  // Hero (scrollY = 0): the page cannot move at all. Wheel / swipe / key input only
  // builds up "intent"; once it passes the threshold the document scroll is
  // animated to the next section.
  // Top of the next section: scrolling up does not move the page either, until the
  // same intent threshold is reached, then it animates back to the hero.
  // Everywhere else the page scrolls normally.
  //
  // While the animation runs, all user scroll input is blocked, so nothing fights
  // the scrollTo calls (that fight was the vibration). Dragging the scrollbar
  // can't be intercepted, so it is allowed at the next-section boundary and the
  // position is settled on release; in the hero the scrollbar is inert because
  // the root is set to overflow: hidden.
  useEffect(() => {
    if (reduceMotion || onboardingPhase !== 'done') return
    const track = heroTrackRef.current
    if (!track) return

    const root = document.documentElement
    const prevOverflow = root.style.overflow
    const prevGutter = root.style.scrollbarGutter
    // Keeps layout identical when the scrollbar is hidden by the hero lock.
    root.style.scrollbarGutter = 'stable'
    const setPageLock = (on: boolean) => {
      root.style.overflow = on ? 'hidden' : prevOverflow
    }

    let lastY = window.scrollY
    let lastDirection = 0
    let controls: ReturnType<typeof animate> | null = null
    let locked = false
    let touching = false
    let mouseDown = false
    let unlockTimer: number | undefined

    // Wheel / swipe intent accumulation.
    let intent = 0
    let lastIntentAt = 0
    let wallUntil = 0
    let touchStartY = 0
    let touchFired = false

    // Document Y where the next section starts (bottom of the hero track).
    const getNextTop = () => track.getBoundingClientRect().bottom + window.scrollY

    const resetIntent = () => {
      intent = 0
    }

    const addIntent = (amount: number, limit: number, fire: () => void) => {
      const now = performance.now()
      if (now - lastIntentAt > INTENT_RESET_MS) intent = 0
      lastIntentAt = now
      intent += amount
      if (intent >= limit) {
        intent = 0
        fire()
      }
    }

    const unlock = () => {
      locked = false
      lastY = window.scrollY
      if (window.scrollY <= EDGE_EPS) setPageLock(true)
    }

    const cancelAnimation = () => {
      if (!locked) return
      controls?.stop()
      controls = null
      window.clearTimeout(unlockTimer)
      unlock()
    }

    const goTo = (target: number) => {
      controls?.stop()
      window.clearTimeout(unlockTimer)
      locked = true
      resetIntent()
      setPageLock(false)
      controls = animate(window.scrollY, target, {
        duration: SNAP_DURATION,
        ease: SNAP_EASE,
        onUpdate: (value) => window.scrollTo({ top: value, behavior: 'instant' }),
        onComplete: () => {
          controls = null
          unlockTimer = window.setTimeout(unlock, SNAP_COOLDOWN_MS)
        },
      })
    }

    // Resolves any position that is neither the hero nor at/after the boundary
    // (scrollbar drag release, fast flick, restored scroll position).
    const settle = () => {
      if (locked || touching || mouseDown) return
      const y = window.scrollY
      const nextTop = getNextTop()
      if (y <= EDGE_EPS) {
        setPageLock(true)
        return
      }
      // The page-level lock exists only for the hero. Releasing it here also
      // covers a scroll position restored by the browser on back navigation:
      // the lock is applied while y is still 0 (before restoration) and the
      // scroll event that lands below the hero must free the page again.
      setPageLock(false)
      if (y >= nextTop - EDGE_EPS) return
      if (lastDirection < 0 && y >= nextTop - OVERSHOOT_PX) {
        window.scrollTo({ top: nextTop, behavior: 'instant' })
        return
      }
      goTo(lastDirection > 0 ? nextTop : 0)
    }

    const onScroll = () => {
      const y = window.scrollY
      const direction = y - lastY
      lastY = y
      if (direction !== 0) lastDirection = direction
      settle()
    }

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return // pinch-zoom
      if (locked) {
        event.preventDefault()
        return
      }
      const y = window.scrollY
      const nextTop = getNextTop()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      const delta = event.deltaY * unit
      if (delta === 0) return

      // Hero: nothing moves, scrolling down only builds intent.
      if (y <= EDGE_EPS) {
        event.preventDefault()
        if (delta > 0) addIntent(delta, WHEEL_INTENT_PX, () => goTo(nextTop))
        else resetIntent()
        return
      }

      // Boundary: scrolling up builds intent, scrolling down moves on normally.
      if (Math.abs(y - nextTop) <= EDGE_EPS) {
        if (delta < 0) {
          event.preventDefault()
          if (performance.now() < wallUntil) return
          addIntent(-delta, WHEEL_INTENT_PX, () => goTo(0))
        } else {
          resetIntent()
        }
        return
      }

      // Arriving at the boundary from below: stop exactly on it.
      if (delta < 0 && y > nextTop && y + delta <= nextTop) {
        event.preventDefault()
        window.scrollTo({ top: nextTop, behavior: 'instant' })
        wallUntil = performance.now() + WALL_COOLDOWN_MS
        resetIntent()
      }
    }

    const isEditableTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return
      const isDown =
        event.key === 'ArrowDown' ||
        event.key === 'PageDown' ||
        (event.key === ' ' && !event.shiftKey)
      const isUp =
        event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)
      if (!isDown && !isUp) return

      if (locked) {
        event.preventDefault()
        return
      }
      const y = window.scrollY
      const nextTop = getNextTop()
      if (y <= EDGE_EPS) {
        event.preventDefault()
        if (isDown) goTo(nextTop)
      } else if (isUp && Math.abs(y - nextTop) <= EDGE_EPS) {
        event.preventDefault()
        goTo(0)
      }
    }

    const onTouchStart = (event: TouchEvent) => {
      // Grabbing the page mid-animation hands control back to the user.
      cancelAnimation()
      touching = true
      touchFired = false
      touchStartY = event.touches[0]?.clientY ?? 0
    }

    const onTouchMove = (event: TouchEvent) => {
      if (locked || touchFired) {
        if (event.cancelable) event.preventDefault()
        return
      }
      const touch = event.touches[0]
      if (!touch) return
      const swipe = touchStartY - touch.clientY // > 0 means scrolling down
      const y = window.scrollY
      const nextTop = getNextTop()

      if (y <= EDGE_EPS) {
        if (event.cancelable) event.preventDefault()
        if (swipe >= TOUCH_INTENT_PX) {
          touchFired = true
          goTo(nextTop)
        }
      } else if (Math.abs(y - nextTop) <= EDGE_EPS && swipe < 0) {
        if (event.cancelable) event.preventDefault()
        if (-swipe >= TOUCH_INTENT_PX) {
          touchFired = true
          goTo(0)
        }
      }
    }

    const onTouchEnd = () => {
      touching = false
      settle()
    }

    // Any held mouse button counts, which covers dragging the scrollbar thumb
    // (including overlay scrollbars whose width can't be measured).
    const onMouseDown = () => {
      cancelAnimation()
      mouseDown = true
    }

    const onMouseUp = () => {
      if (!mouseDown) return
      mouseDown = false
      settle()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('blur', onMouseUp)

    settle()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('blur', onMouseUp)
      window.clearTimeout(unlockTimer)
      controls?.stop()
      root.style.overflow = prevOverflow
      root.style.scrollbarGutter = prevGutter
    }
  }, [reduceMotion, onboardingPhase])

  const {
    isRecitationPlaying,
    recitationReady,
    wordIdx,
    prepareAudio,
    beginRecitation,
    toggleRecitation,
  } = useQuranSync()

  useEffect(() => {
    const context = new AudioContext()
    sfxContext.current = context

    if (context.state === 'running' && !shouldSkipOnboarding()) {
      playSoundEffect(context, 'appear')
      appearanceSoundPlayed.current = true
    }

    return () => {
      context.close().catch(() => {})
    }
  }, [])

  const continueToLanding = () => {
    if (onboardingPhase !== 'ready') return

    const context = sfxContext.current
    if (context && context.state !== 'closed') {
      const play = () => {
        let clickDelay = 0
        if (!appearanceSoundPlayed.current) {
          playSoundEffect(context, 'appear')
          appearanceSoundPlayed.current = true
          clickDelay = 0.16
        }
        playSoundEffect(context, 'click', clickDelay)
      }
      if (context.state === 'suspended') {
        context
          .resume()
          .then(play)
          .catch(() => {})
      } else {
        play()
      }
    }

    prepareAudio()
    markOnboardingSeen()
    setOnboardingPhase('hiding')
    window.setTimeout(() => setOnboardingPhase('zooming'), 500)
    window.setTimeout(() => setOnboardingPhase('leaving'), 2400)
    window.setTimeout(() => setOnboardingPhase('done'), 3100)
  }

  const beginRecitationRef = useRef(beginRecitation)
  const prepareAudioRef = useRef(prepareAudio)
  const refCommunity = useReveal<HTMLDivElement>()
  const refMessage = useReveal<HTMLDivElement>()
  const refBooks = useReveal<HTMLElement>()
  const refActivities = useReveal<HTMLElement>()
  const refArticles = useReveal<HTMLElement>()

  useEffect(() => {
    beginRecitationRef.current = beginRecitation
    prepareAudioRef.current = prepareAudio
  })

  useEffect(() => {
    if (onboardingPhase !== 'done') return
    // Visitors who skip the splash never run continueToLanding, which is the
    // only other caller of prepareAudio() — without priming the audio here,
    // beginRecitation() early-returns and the play button stays disabled
    // forever. Idempotent: a no-op when the splash already prepared it.
    prepareAudioRef.current()
    const t1 = window.setTimeout(() => setBgReady(true), 100)
    const t2 = window.setTimeout(() => setTextReady(true), 450)
    const t3 = window.setTimeout(() => setNavReady(true), 1200)
    const t4 = window.setTimeout(() => beginRecitationRef.current(), 2100)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearTimeout(t4)
    }
  }, [onboardingPhase])

  const {
    data: booksData,
    isLoading: booksLoading,
    isError: booksError,
  } = useGetBooksQuery({
    category: BookCategory.Religious,
    page: 1,
    limit: 4,
  })

  const {
    data: articlesData,
    isLoading: articlesLoading,
    isError: articlesError,
  } = useGetArticlesQuery({
    page: 1,
    limit: 3,
  })

  const books = booksData?.docs || []
  const articles = articlesData?.docs || []

  const activityHadith = (
    <>
      قال رسول <span className="text-[#0de9c3] font-medium">الله</span> صلى{' '}
      <span className="text-[#0de9c3] font-medium">الله</span> عليه وسلم : &quot; خيركم من تعلم
      القرآن وعلمه&quot;
    </>
  )

  // Same images as uM_landing's ACTIVITIES_DATA, mapped to card positions.
  const ACTIVITY_IMAGES = {
    featured: '/static/images/activity-quran.jpg',
    top: '/static/images/activity-library.jpg',
    bottomRight: '/static/images/activity-ramadan.jpg',
    bottomLeft: '/static/images/activity-masa.jpg',
  }

  // Source layout (uM_landing): featured card on the visual right (RTL), left
  // column holds two rows — a full-width card, then a row of two cards.
  const renderActivityBento = (items: LandingActivity[]) => (
    <div className="flex w-full max-w-[1200px] flex-col items-stretch gap-4 lg:flex-row">
      {items[0] && (
        <div key={items[0].id} className="flex w-full min-h-[460px] lg:flex-1">
          <ActivityCard
            title={items[0].title}
            imageSrc={ACTIVITY_IMAGES.featured}
            imageAlt={items[0].title}
            featured
            badge="الأكثر إقبالا"
            description={items[0].description}
            hadith={activityHadith}
            actions={[
              { label: 'سجل الآن', variant: 'primary' },
              { label: 'التفاصيل', variant: 'secondary' },
            ]}
          />
        </div>
      )}
      {(items[1] || items[2] || items[3]) && (
        <div className="flex w-full flex-1 flex-col items-stretch gap-4">
          {items[1] && (
            <RevealCard key={items[1].id} index={0} className="w-full">
              <ActivityCard
                title={items[1].title}
                imageSrc={ACTIVITY_IMAGES.top}
                imageAlt={items[1].title}
                className="h-full"
                showArrow
                description={items[1].description}
                hadith={activityHadith}
              />
            </RevealCard>
          )}
          {(items[2] || items[3]) && (
            <div className="flex w-full flex-col gap-4 sm:flex-row">
              {items[3] && (
                <RevealCard key={items[3].id} index={2} className="flex-1">
                  <ActivityCard
                    title={items[3].title}
                    imageSrc={ACTIVITY_IMAGES.bottomRight}
                    imageAlt={items[3].title}
                    className="h-full"
                    showArrow
                    description={items[3].description}
                  />
                </RevealCard>
              )}
              {items[2] && (
                <RevealCard key={items[2].id} index={1} className="flex-1">
                  <ActivityCard
                    title={items[2].title}
                    imageSrc={ACTIVITY_IMAGES.bottomLeft}
                    imageAlt={items[2].title}
                    className="h-full"
                    showArrow
                    description={items[2].description}
                  />
                </RevealCard>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      <div
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setNavSettled(true)
        }}
        className={`fixed top-0 left-0 w-full z-100 ${
          navReady ? (navSettled ? '' : 'nav-visible') : 'opacity-0 pointer-events-none'
        }`}
      >
        <Navbar />
      </div>
      <div className="w-full min-h-screen">
        {/* ── Hero Video Section (sticky track) ──
            The track is taller than the viewport; its extra height is the
            pinned scroll distance. Reduced motion collapses it to one screen. */}
        <div ref={heroTrackRef} className="relative h-[150svh] motion-reduce:h-svh">
          <section className="sticky top-0 h-svh w-full overflow-hidden">
            {/* Hero video: scroll-linked wrapper, existing CSS animation untouched inside */}
            <motion.div className="absolute inset-0" style={{ y: bgY, opacity: bgOpacity }}>
              <div
                className={`absolute inset-0 ${bgReady ? 'hero-bg-playing' : 'opacity-0'}`}
                style={{ transformOrigin: 'center center' }}
              >
                <video
                  src="/static/images/hero_vid_light.mp4"
                  style={{
                    filter: 'grayscale(0.5) brightness(1.1) contrast(0.9) saturate(0) blur(0px)',
                  }}
                  className="absolute bottom-0 w-full object-cover sm:scale-115 scale-150  translate-x-[-6vw] lg:translate-y-[7vh] translate-y-[-7vh] sm:translate-y-0 "
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              </div>
            </motion.div>

            {/* Full-screen gradient overlay */}
            <div
              className="
                absolute inset-0 z-2 pointer-events-none

                /* Mobile */
                [--solid:55%]
                [--fade-1:65%]
                [--fade-2:75%]
                [--fade-3:85%]
                [--transparent:95%]



                /* md */
                md:[--solid:50%]
                md:[--fade-1:60%]
                md:[--fade-2:70%]
                md:[--fade-3:80%]
                md:[--transparent:90%]

                /* lg and larger = your original gradient */
                lg:[--solid:40%]
                lg:[--fade-1:50%]
                lg:[--fade-2:60%]
                lg:[--fade-3:70%]
                lg:[--transparent:80%]
              "
              style={{
                background: `
                  linear-gradient(
                    to bottom,
                    var(--background-2) 0%,
                    var(--background-2) var(--solid),
                    color-mix(in srgb, var(--background-2) 90%, transparent) var(--fade-1),
                    color-mix(in srgb, var(--background-2) 60%, transparent) var(--fade-2),
                    color-mix(in srgb, var(--background-2) 30%, transparent) var(--fade-3),
                    transparent var(--transparent)
                  )
                `,
              }}
            />

            {/* Light color overlay */}
            <div
              className="absolute inset-0 z-[2] pointer-events-none"
              style={{
                background: 'rgba(220, 235, 255, 0.15)',
              }}
            />

            {/* Hero content: scroll-linked wrapper, existing CSS animation untouched inside */}
            <motion.div
              className="absolute inset-0 z-[3]"
              style={{ y: contentY, opacity: contentOpacity }}
            >
              {/* Phones: no base pull-up — the old -translate-y-[137px]
                  pushed this block behind the sticky navbar on ≤360×640
                  viewports (fully hidden at 320×568). ≥sm keeps the
                  designer's vertical offsets where there's headroom. */}
              <div
                onAnimationEnd={(event) => {
                  if (event.target === event.currentTarget) setTextSettled(true)
                }}
                className={`absolute inset-0 w-full flex flex-col items-center justify-center gap-4 md:gap-6 px-6 md:px-16 py-8 sm:-translate-y-[105px] 2xl:-translate-y-[148px] ${
                  textReady ? (textSettled ? '' : 'hero-text-visible') : 'opacity-0'
                }`}
              >
                {/* Bismillah */}
                {/* Quran verse */}
                <motion.div
                  initial={{ y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  {' '}
                  <Image
                    src="/static/images/bismilah.svg"
                    alt="بسم الله"
                    width={180}
                    height={40}
                    priority
                    className="w-40 sm:w-48 md:w-auto"
                  />{' '}
                </motion.div>
                <HeroVerse
                  wordIdx={wordIdx}
                  isRecitationPlaying={isRecitationPlaying}
                  recitationReady={recitationReady}
                  onToggleRecitation={toggleRecitation}
                />
              </div>
            </motion.div>
          </section>
        </div>

        {/* ── Next sections (the scroll animation lands on the top of this block) ── */}
        <div>
          {/* ── Section 1: لبنة المجتمع ── */}
          <div ref={refCommunity} className="reveal">
            <SectionBlock
              heading="لبنة المجتمع"
              body="إن من الملفت للنظر أن أول عمل قام به الرسول ﷺ في قباء وفي المدينة كان بناء مسجد في كل منهما، وهذا الأمر لم يكن على سبيل المصادفة، ولم يكن مجرد إشارة عابرة، بل هذا منهج أصيل، فلا قيام لأمة إسلامية بغير المسجد."
              imageSrc="/static/images/mosque-1.jpg"
              cardTitle="«نور الهداية»"
              cardBody="فِي بُيُوتٍ أَذِنَ اللهُ أَنْ تُرْفَعَ وَيُذْكَرَ فِيهَا اسْمُهُ يُسَبِّحُ لَهُ فِيهَا بِالْغُدُوِّ وَالْآصَالِ."
              imagePosition="right"
              ctaHref="/about-us"
            />
          </div>

          {/* ── Section 2: رسالة علمية وإيمانية ── */}
          <div ref={refMessage} className="reveal">
            <SectionBlock
              heading="رسالة علمية وإيمانية"
              body="يعتبر مسجد جامعة باب الزوار جسراً معرفياً يربط بين العلوم التجريبية والقيم الروحية. نهدف إلى توفير بيئة هادئة ومحفزة للطلاب والباحثين، تساهم في بناء جيل متوازن علمياً وفكرياً."
              imageSrc="/static/images/mosala.png"
              cardTitle="«منارة الإيمان»"
              cardBody="المسجد منارة تُنير القلوب بالإيمان وتجمع المسلمين على الخير والمحبة."
              imagePosition="left"
              backgroundColor="#E8F2F8"
              ctaHref="/library"
              stats={[
                { value: '5000+', label: 'كتاب ومرجع' },
                { value: '8+', label: 'نشاط سنوي' },
              ]}
            />
          </div>
        </div>

        {/* ── Books Section ── */}
        <section
          ref={refBooks}
          className="reveal w-full flex justify-center items-center px-6 py-16 md:px-16 md:py-20 lg:px-24"
          dir="rtl"
        >
          <div className="flex w-full flex-col items-center">
            <h3 className="m-0 text-base font-bold text-primary-400 md:text-xl">مجموعة مختارة</h3>
            <p className="mb-10 mt-3 text-center font-khalid text-2xl font-bold md:text-[32px]">
              أحدث إصدارات المكتبة
            </p>

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
                    <RevealCard key={book.id} index={idx} className="h-full">
                      <BookCard book={book} />
                    </RevealCard>
                  ))}
                </div>
              }
            >
              <div className="grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {books.map((book, idx) => (
                  <RevealCard key={book.id} index={idx} className="h-full">
                    <BookCard book={book} />
                  </RevealCard>
                ))}
              </div>
            </ListingRenderer>

            <Link
              href="/library"
              className="group mt-10 flex items-center gap-2 rounded-lg border border-white bg-primary-main-10 px-6 py-1 text-base font-bold leading-loose text-primary-300 no-underline transition-all duration-200 hover:border-primary-main-60 hover:bg-primary-main-20 hover:text-primary-200"
            >
              عرض الفهرس الكامل
              <ArrowLeft
                size={16}
                className="shrink-0 transition-transform duration-200 group-hover:-translate-x-1"
              />
            </Link>
          </div>
        </section>

        {/* ── Activities Section ── */}
        <section
          ref={refActivities}
          className="reveal w-full bg-fill-contrast flex justify-center items-center px-6 py-16 md:px-16 lg:px-24"
          dir="rtl"
        >
          <div className="flex w-full flex-col items-center">
            <h3 className="m-0 font-yamama font-bold leading-none text-[#0aaf92] text-[20px] whitespace-nowrap text-center">
              نشاطاتنا
            </h3>
            <p className="mb-10 mt-3 font-khalid not-italic leading-none text-[#243245] text-[40px] xl:text-[44px] text-center">
              نشاطات دعوية وتعليمية واجتماعية
            </p>

            {renderActivityBento(landingActivities)}

            <Link
              href="/activities"
              className="group mt-10 flex items-center gap-2 rounded-lg border border-white bg-primary-main-10 px-6 py-1 text-base font-bold leading-loose text-primary-300 no-underline transition-all duration-200 hover:border-primary-main-60 hover:bg-primary-main-20 hover:text-primary-200"
            >
              عرض الفهرس الكامل
              <ArrowLeft
                size={16}
                className="shrink-0 transition-transform duration-200 group-hover:-translate-x-1"
              />
            </Link>
          </div>
        </section>

        {/* ── Articles Section ── */}
        <section
          ref={refArticles}
          className="reveal w-full flex justify-center items-center px-6 py-16 md:px-16 md:py-20 lg:px-24"
          dir="rtl"
        >
          <div className="flex w-full flex-col items-center">
            <h3 className="m-0 text-base font-bold text-primary-400 md:text-xl">فكر ومعرفة</h3>
            <p className="mb-6 mt-2 text-center font-khalid text-2xl font-bold md:text-[32px]">
              أحدث المقالات
            </p>

            <ListingRenderer
              isLoading={articlesLoading}
              isError={!!articlesError}
              isEmpty={articles.length === 0}
              loader={
                <div className="grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <ArticleCardSkeleton key={index} />
                  ))}
                </div>
              }
              errorFallback={<ErrorData />}
              emptyFallback={<EmptyData title="لا توجد مقالات بعد" />}
              staticFallback={
                <div className="grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {staticArticles.map((article, idx) => (
                    <RevealCard key={article.id} index={idx} className="h-full">
                      <BlogArticleCard article={article} />
                    </RevealCard>
                  ))}
                </div>
              }
            >
              <div className="grid w-full max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article, idx) => (
                  <RevealCard key={article.id} index={idx} className="h-full">
                    <BlogArticleCard article={article} />
                  </RevealCard>
                ))}
              </div>
            </ListingRenderer>

            <Link
              href="/articles"
              className="group mt-6 flex items-center gap-2 rounded-lg border border-white bg-primary-main-10 px-6 py-1 text-base font-bold leading-loose text-primary-300 no-underline transition-all duration-200 hover:border-primary-main-60 hover:bg-primary-main-20 hover:text-primary-200"
            >
              عرض الفهرس الكامل
              <ArrowLeft
                size={16}
                className="shrink-0 transition-transform duration-200 group-hover:-translate-x-1"
              />
            </Link>
          </div>
        </section>

        <CTASection />
      </div>
      <Footer />
      {hydrated && onboardingPhase !== 'done' && (
        <OnboardingSplash phase={onboardingPhase} onContinue={continueToLanding} />
      )}
    </>
  )
}

export default LandingPage

import fs from 'node:fs'

import { expect, test, type Page } from '@playwright/test'

import { E2E_DEV } from './lib/env'
import { userStorageState } from './lib/auth-state'

// Direct URLs resolve through the seed's title -> id manifest (see the seed
// contract in AGENTS.md): never hard-code an id, the seed restarts them at 1.
type FixtureManifest = { books: Record<string, number>; articles: Record<string, number> }
const FIXTURES: FixtureManifest = JSON.parse(fs.readFileSync('e2e/.fixtures.json', 'utf-8'))
const BOOK_ID = FIXTURES.books['تفسير السعدي']
const ARTICLE_ID = FIXTURES.articles['فضائل المسجد وأثره في حياة الطالب']

type Route = {
  name: string
  path: string
  /** Selector that must be visible before the shot (client-fetched content). */
  settle?: string
}

// Guest routes, exactly as a visitor sees them.
const guestRoutes: Route[] = [
  { name: 'landing', path: '/' },
  { name: 'library', path: '/library', settle: 'a[href*="/library/book/"]' },
  { name: 'book details', path: `/library/book/${BOOK_ID}` },
  { name: 'activities', path: '/activities', settle: 'article' },
  { name: 'article details', path: `/articles/${ARTICLE_ID}` },
  { name: 'login', path: '/auth/login' },
]

// Member routes, scanned through the stored member session.
// Member routes, scanned through the stored member session. The dashboard's
// tables are desktop-only and its header hides on mobile, so settle on the
// calendar widget, which exists at every width.
const memberRoutes: Route[] = [
  { name: 'dashboard', path: '/user/dashboard', settle: 'section.rounded-xl' },
]

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]

// Absolute dates and times come from seed-relative values, so they differ
// between the baseline run and any later run; the footer copyright carries a
// year too. Masking the text keeps the layout visible while ignoring it.
const DATE_TEXT = /\d{1,2}\s[أ-ي،]+\s\d{4}|\d{2}\/\d{2}\/\d{4}|\d{1,2}:\d{2}|©\s*\d{4}|\d{4}\s*[-–]/

async function pauseVideos(page: Page): Promise<void> {
  await page.$$eval('video', (videos) => {
    for (const video of videos) {
      video.pause()
      video.currentTime = 0
    }
  })
}

async function visualMasks(page: Page): Promise<ReturnType<typeof page.locator>[]> {
  const masks = [
    // The dashboard calendar renders the current day/month and a live clock.
    page.locator('section.rounded-xl').filter({ hasText: 'اليوم:' }),
    // Date/time labels on cards, tables and dialogs.
    page.getByText(DATE_TEXT),
  ]
  const result: ReturnType<typeof page.locator>[] = []
  for (const locator of masks) {
    const count = await locator.count()
    for (let index = 0; index < count; index += 1) {
      result.push(locator.nth(index))
    }
  }
  return result
}

async function captureVisual(page: Page, route: Route, name: string): Promise<void> {
  await page.goto(route.path)
  if (route.settle) {
    await expect(page.locator(route.settle).first()).toBeVisible({ timeout: 30_000 })
  }
  // Let client-side fetches, fonts and framer-motion entrances finish before
  // the pixels are sampled. networkidle is unreliable under parallel load
  // (one slow S3 fetch resets the idle window), so a fixed settle is used
  // together with toHaveScreenshot's own double-capture stabilization.
  await pauseVideos(page)
  await page.waitForTimeout(1_200)
  const mask = await visualMasks(page)
  await expect(page).toHaveScreenshot(`${name}.png`, { mask })
}

test.describe('visual regression of key routes', () => {
  // Baselines are generated only under the canonical run (production build,
  // AGENTS.md): the dev-mode server renders dev-only chrome, so dev runs must
  // not rewrite them.
  test.skip(E2E_DEV, 'visual baselines are generated under the canonical run only')

  for (const viewport of VIEWPORTS) {
    test.describe(`desktop ${viewport.width}x${viewport.height}`, () => {
      test.use({ viewport })

      for (const route of guestRoutes) {
        test(`${route.name} (${route.path})`, async ({ page }) => {
          await captureVisual(page, route, `${route.name}-${viewport.width}`)
        })
      }

      test.describe('member pages', () => {
        test.use({ storageState: userStorageState })

        for (const route of memberRoutes) {
          test(`${route.name} (${route.path})`, async ({ page }) => {
            await captureVisual(page, route, `${route.name}-${viewport.width}`)
          })
        }
      })
    })
  }
})

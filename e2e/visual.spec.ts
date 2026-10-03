import fs from 'node:fs'

import { expect, test, type Page } from '@playwright/test'

import { E2E_DEV } from './lib/env'
import { adminStorageState, userStorageState } from './lib/auth-state'
import { pinDarkTheme } from './lib/theme'

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
//
// Light only, deliberately. ThemeScopeGuard forces `light` on every path that
// is not portal/admin, so a "dark" capture here would be pixel-identical to the
// light one — the dark pass lives below, over the surface that can actually
// change colour. Lifting that restriction is out of scope for #172.
const guestRoutes: Route[] = [
  { name: 'landing', path: '/' },
  { name: 'library', path: '/library', settle: 'a[href*="/library/book/"]' },
  { name: 'book details', path: `/library/book/${BOOK_ID}` },
  { name: 'activities', path: '/activities', settle: 'article' },
  { name: 'article details', path: `/articles/${ARTICLE_ID}` },
  { name: 'login', path: '/auth/login' },
]

// Member routes, scanned through the stored member session.
// The dashboard's tables are desktop-only and its header hides on mobile, so
// settle on the calendar widget, which exists at every width.
// Known gap (#140): the Bell lives in the member portal only while #157 moves
// it into the public navbar. Until that lands no route here shows it, so the
// set has to grow a navbar route — otherwise the move lands unreviewed.
const memberRoutes: Route[] = [
  { name: 'dashboard', path: '/user/dashboard', settle: 'section.rounded-xl' },
  // Notifications, loans and settings carry the heaviest concentration of the
  // raw literals the audit flagged (LoanStatusBadge, AccountInfoSection,
  // SecuritySection), so they are the pages a dark regression shows up on.
  { name: 'notifications', path: '/user/notifications' },
  { name: 'my-loans', path: '/user/my-loans' },
  { name: 'settings', path: '/user/settings' },
]

// The admin panel was never under visual regression at all, despite being half
// of #172's scope and owning three of its named call-outs: the sidebar, the
// analytics charts and the status badges in the loan tables.
const adminRoutes: Route[] = [
  { name: 'admin-dashboard', path: '/admin-panel/dashboard', settle: 'h1' },
  { name: 'admin-library', path: '/admin-panel/library', settle: 'h1' },
  { name: 'admin-cards', path: '/admin-panel/cards', settle: 'h1' },
  { name: 'admin-users', path: '/admin-panel/users', settle: 'h1' },
  { name: 'admin-loans', path: '/admin-panel/loans', settle: 'h1' },
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

async function captureVisual(
  page: Page,
  route: Route,
  name: string,
  theme: 'light' | 'dark' = 'light',
): Promise<void> {
  // Must run before the first navigation: the no-flash script reads
  // localStorage.theme synchronously in <head>.
  if (theme === 'dark') await pinDarkTheme(page)
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
  // The dark variant appends to the light name, so every baseline that exists
  // today keeps its exact path and stays valid.
  await expect(page).toHaveScreenshot(`${name}${theme === 'dark' ? '-dark' : ''}.png`, { mask })
}

test.describe('visual regression of key routes', () => {
  // Baselines are generated only under the canonical run (production build,
  // AGENTS.md): the dev-mode server renders dev-only chrome, so dev runs must
  // not rewrite them.
  test.skip(E2E_DEV, 'visual baselines are generated under the canonical run only')

  for (const viewport of VIEWPORTS) {
    test.describe(`desktop ${viewport.width}x${viewport.height}`, () => {
      test.use({ viewport })

      const at = (route: Route) => `${route.name}-${viewport.width}`

      for (const route of guestRoutes) {
        test(`${route.name} (${route.path})`, async ({ page }) => {
          await captureVisual(page, route, at(route))
        })
      }

      // Everything below sits inside ThemeScopeGuard's scope, so it is
      // captured in both themes. The light shot guards the invariant that a
      // dark pass must not disturb light; the dark shot is the pass #172's
      // acceptance gate asks for.
      const captureBoth = (route: Route): void => {
        test(`light — ${route.name} (${route.path})`, async ({ page }) => {
          await captureVisual(page, route, at(route))
        })
        test(`dark — ${route.name} (${route.path})`, async ({ page }) => {
          await captureVisual(page, route, at(route), 'dark')
        })
      }

      test.describe('member pages', () => {
        test.use({ storageState: userStorageState })

        for (const route of memberRoutes) captureBoth(route)
      })

      test.describe('admin pages', () => {
        test.use({ storageState: adminStorageState })

        for (const route of adminRoutes) captureBoth(route)
      })
    })
  }
})

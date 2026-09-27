import fs from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { userStorageState } from './lib/auth-state'

// Direct URLs resolve through the seed's title -> id manifest (see the seed
// contract in AGENTS.md): never hard-code an id, the seed restarts them at 1.
type FixtureManifest = { books: Record<string, number>; articles: Record<string, number> }
const FIXTURES: FixtureManifest = JSON.parse(fs.readFileSync('e2e/.fixtures.json', 'utf-8'))
const BOOK_ID = FIXTURES.books['تفسير السعدي']
const ARTICLE_ID = FIXTURES.articles['فضائل المسجد وأثره في حياة الطالب']

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// Guest routes: scanned without a session, exactly as a visitor sees them.
const guestRoutes: { name: string; path: string }[] = [
  { name: 'landing', path: '/' },
  { name: 'library', path: '/library' },
  { name: 'book details', path: `/library/book/${BOOK_ID}` },
  { name: 'activities', path: '/activities' },
  { name: 'article details', path: `/articles/${ARTICLE_ID}` },
  { name: 'login', path: '/auth/login' },
]

// Member routes: scanned through the stored member session.
const memberRoutes: { name: string; path: string }[] = [
  { name: 'dashboard', path: '/user/dashboard' },
  { name: 'notifications', path: '/user/notifications' },
]

/**
 * Only serious and critical impacts fail the test; the rest are logged so
 * they stay visible without blocking the suite (#140).
 */
async function expectNoBlockingViolations(page: Page, routeName: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const blocking = results.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact ?? ''),
  )
  for (const violation of results.violations) {
    if (!['serious', 'critical'].includes(violation.impact ?? '')) {
      console.log(`[a11y] ${routeName}: ${violation.impact} — ${violation.id}`)
    }
  }
  if (blocking.length > 0) {
    console.error(
      `[a11y] ${routeName}: blocking violations:`,
      blocking
        .map((violation) =>
          violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`).join(' | '),
        )
        .join('; '),
    )
  }
  expect(blocking, `${routeName}: serious/critical a11y violations`).toEqual([])
}

test.describe('accessibility of key pages', () => {
  for (const route of guestRoutes) {
    test(`${route.name} (${route.path}) has no serious or critical violations`, async ({
      page,
    }) => {
      await page.goto(route.path)
      await expect(async () => {
        await expectNoBlockingViolations(page, route.name)
      }).toPass({ timeout: 60_000 })
    })
  }

  test.describe('member pages', () => {
    test.use({ storageState: userStorageState })

    for (const route of memberRoutes) {
      test(`${route.name} (${route.path}) has no serious or critical violations`, async ({
        page,
      }) => {
        await page.goto(route.path)
        await expect(async () => {
          await expectNoBlockingViolations(page, route.name)
        }).toPass({ timeout: 60_000 })
      })
    }
  })
})

import { expect, test, type Page } from '@playwright/test'

import { userStorageState } from './lib/auth-state'
import { E2E_MEMBER_EMAIL } from './lib/test-users'

test.use({ storageState: userStorageState })

async function gotoOk(page: Page, path: string): Promise<void> {
  const res = await page.goto(path)
  expect(res?.status(), `${path} should respond 200`).toBe(200)
}

// The whole point of this spec: nothing may push the document wider than the
// phone viewport (the regression the 390/320 pass exists to catch).
async function expectNoDocumentOverflow(page: Page, width: number): Promise<void> {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(
    scrollWidth,
    `document overflows ${width}px (scrollWidth ${scrollWidth})`,
  ).toBeLessThanOrEqual(width)
}

// Picks any activity the member has not registered to, so the detail page
// shows the register button (the sticky CTA) instead of the "already
// registered" banner. Returns '' when the member holds every registration.
// page.request resolves against the baseURL and carries the storage-state
// cookies, so this works before the first navigation of a test.
async function unregisteredActivityId(page: Page): Promise<string> {
  const headers = { 'Sec-Fetch-Site': 'same-origin' }
  const [activities, me] = await Promise.all([
    page.request
      .get('/api/activities?limit=50&depth=0', { headers })
      .then((r) => r.json() as Promise<{ docs?: Array<{ id: number }> }>),
    page.request
      .get('/api/users/me', { headers })
      .then((r) => r.json() as Promise<{ user?: { id: number | string } }>),
  ])
  const uid = me.user?.id
  const regs = uid
    ? await page.request
        .get(`/api/activity-registrations?limit=100&depth=0&where[user][equals]=${uid}`, {
          headers,
        })
        .then((r) => r.json() as Promise<{ docs?: Array<{ activity: unknown }> }>)
    : { docs: [] }
  const taken = new Set((regs.docs || []).map((d) => String(d.activity)))
  const open = (activities.docs || []).find((d) => !taken.has(String(d.id)))
  return open ? String(open.id) : ''
}

const CTA_NAME = /سجل الآن|التسجيل مغلق/

test.describe('member portal at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('portal pages render with no horizontal overflow', async ({ page }) => {
    const pages = [
      { path: '/user/dashboard', marker: 'مواعيد إرجاع الكتب' },
      // state-dependent content (other specs register/return mid-run), so only
      // the shell and the layout are asserted here
      { path: '/user/my-registrations' },
      { path: '/user/my-loans' },
      { path: '/user/settings', marker: 'الحماية' },
      { path: '/user/activities', marker: 'نشاط e2e ممتلئ' },
    ]
    for (const { path, marker } of pages) {
      await gotoOk(page, path)
      if (marker) await expect(page.getByText(marker).first()).toBeVisible()
      await expectNoDocumentOverflow(page, 390)
    }
  })

  test('the mobile menu ends with logout and shows no account card', async ({ page }) => {
    await gotoOk(page, '/user/dashboard')
    await page.getByRole('button', { name: 'فتح القائمة' }).click()

    const nav = page.locator('nav[aria-label="قائمة المستخدم"]')
    await expect(nav.getByRole('button', { name: 'تسجيل الخروج' })).toBeVisible()
    const lastControl = await nav.evaluate((n) => {
      const visible = [...n.querySelectorAll<HTMLElement>('button, a')].filter(
        (el) => el.offsetParent !== null,
      )
      return visible[visible.length - 1]?.textContent?.trim() ?? ''
    })
    expect(lastControl).toContain('تسجيل الخروج')
    // the drawer no longer carries the account-info card
    await expect(nav.getByText(E2E_MEMBER_EMAIL)).toHaveCount(0)
  })

  test('the activity detail keeps one fixed registration bar that clears the schedule', async ({
    page,
  }) => {
    const activityId = await unregisteredActivityId(page)
    test.skip(!activityId, 'the member is registered to every seeded activity')

    await gotoOk(page, `/user/activities/${activityId}`)
    await expect(page.getByText('التفاصيل').first()).toBeVisible()

    // exactly one CTA, rendered as a fixed full-width bar at the viewport bottom
    await expect(page.getByRole('button', { name: CTA_NAME })).toHaveCount(1)
    const bar = page.locator('div[class*="max-lg:fixed"]')
    await expect(bar).toHaveCSS('position', 'fixed')
    const box = await bar.boundingBox()
    expect(box?.x).toBe(0)
    expect(box?.width).toBe(390)
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBe(844)

    // the page reserves bottom space so the bar never covers the last block
    await expect(page.locator('div[class*="max-lg:pb-24"]')).toHaveCSS('padding-bottom', '96px')

    // the schedule card can be brought fully above the bar
    const head = page.getByText('البرنامج الزمني').first()
    await expect(head).toBeVisible()
    const card = await head.evaluateHandle(
      (el) => el.closest('[class*="rounded"]') || el.parentElement,
    )
    const lift = await page.evaluate((el) => {
      const barEl = document.querySelector('div[class*="max-lg:fixed"]')
      if (!el || !barEl) return null
      const barTop = barEl.getBoundingClientRect().top
      const dy = el.getBoundingClientRect().bottom - barTop + 10
      if (dy > 0) {
        let node = el.parentElement
        let moved = false
        while (node) {
          const style = getComputedStyle(node)
          if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 4) {
            node.scrollBy(0, dy)
            moved = true
            break
          }
          node = node.parentElement
        }
        if (!moved) window.scrollBy(0, dy)
      }
      return {
        bottom: Math.round(el.getBoundingClientRect().bottom),
        barTop: Math.round(barEl.getBoundingClientRect().top),
      }
    }, card)
    expect(lift, 'bar or schedule card not found').not.toBeNull()
    expect(lift!.bottom, 'schedule stays under the bar').toBeLessThanOrEqual(lift!.barTop)
  })
})

test.describe('member portal at 320px', () => {
  test.use({ viewport: { width: 320, height: 700 } })

  test('key pages render with no horizontal overflow', async ({ page }) => {
    await gotoOk(page, '/user/dashboard')
    await expect(page.getByText('مواعيد إرجاع الكتب').first()).toBeVisible()
    await expectNoDocumentOverflow(page, 320)

    await gotoOk(page, '/user/my-registrations')
    await expectNoDocumentOverflow(page, 320)

    const activityId = await unregisteredActivityId(page)
    test.skip(!activityId, 'the member is registered to every seeded activity')
    await gotoOk(page, `/user/activities/${activityId}`)
    await expect(page.getByText('التفاصيل').first()).toBeVisible()
    await expectNoDocumentOverflow(page, 320)

    const bar = page.locator('div[class*="max-lg:fixed"]')
    await expect(bar).toHaveCSS('position', 'fixed')
    const box = await bar.boundingBox()
    expect(box?.width).toBe(320)
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBe(700)
  })
})

test.describe('member portal at 768px', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('the tablet layout stays overflow-free with the CTA bar', async ({ page }) => {
    await gotoOk(page, '/user/dashboard')
    await expect(page.getByText('مواعيد إرجاع الكتب').first()).toBeVisible()
    await expectNoDocumentOverflow(page, 768)

    const activityId = await unregisteredActivityId(page)
    test.skip(!activityId, 'the member is registered to every seeded activity')
    await gotoOk(page, `/user/activities/${activityId}`)
    await expect(page.getByText('التفاصيل').first()).toBeVisible()
    await expectNoDocumentOverflow(page, 768)
    // below lg the registration CTA is still the fixed bottom bar
    await expect(page.locator('div[class*="max-lg:fixed"]')).toHaveCSS('position', 'fixed')
  })
})

test.describe('member portal at 1280px', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('the desktop layout is unchanged and overflow-free', async ({ page }) => {
    await gotoOk(page, '/user/dashboard')
    await expect(page.getByText('مواعيد إرجاع الكتب').first()).toBeVisible()
    await expectNoDocumentOverflow(page, 1280)

    const activityId = await unregisteredActivityId(page)
    test.skip(!activityId, 'the member is registered to every seeded activity')
    await gotoOk(page, `/user/activities/${activityId}`)
    await expect(page.getByText('التفاصيل').first()).toBeVisible()
    // desktop keeps the in-card button: the phone-only rules must be inert
    await expect(page.locator('div[class*="max-lg:fixed"]')).toHaveCSS('position', 'static')
    await expect(page.locator('div[class*="max-lg:pb-24"]')).toHaveCSS('padding-bottom', '0px')
    await expectNoDocumentOverflow(page, 1280)
  })
})

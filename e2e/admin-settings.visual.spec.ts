import { expect, test } from '@playwright/test'
import { E2E_DEV } from './lib/env'
import { settingsAdminStorageState } from './lib/auth-state'
import { E2E_SECURITY_PASSWORD } from './lib/test-users'
import { pinDarkTheme } from './lib/theme'

const routes = [
  ['info', '/admin-panel/settings'],
  ['security', '/admin-panel/settings/security'],
  ['notifications', '/admin-panel/settings/notifications'],
  ['email', '/admin-panel/settings/security/email'],
  ['password', '/admin-panel/settings/security/password'],
  ['2fa', '/admin-panel/settings/security/2fa'],
  ['devices', '/admin-panel/settings/security/linked-devices'],
  ['logs', '/admin-panel/settings/security/logs'],
]

test.describe('admin settings populated Figma frames #146', () => {
  test.skip(E2E_DEV, 'Canonical production captures only')
  test.use({ storageState: settingsAdminStorageState })
  for (const width of [1440, 390])
    for (const theme of ['light', 'dark'])
      for (const [name, path] of routes) {
        test(`${name} ${width} ${theme}`, async ({ page }) => {
          test.setTimeout(120_000)
          await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 })
          if (theme === 'dark') await pinDarkTheme(page)
          await page.goto(path)
          const confirm = page.getByRole('button', { name: 'تأكيد الهوية للمتابعة' })
          if (await confirm.isVisible()) {
            await confirm.click()
            const dialog = page.getByRole('dialog', { name: 'تأكيد الهوية' })
            await dialog.getByLabel('كلمة المرور الحالية').fill(E2E_SECURITY_PASSWORD)
            await dialog.getByRole('button', { name: 'تأكيد الهوية', exact: true }).click()
            await expect(dialog).not.toBeVisible({ timeout: 30_000 })
          }
          await expect(
            page.getByRole('button', { name: 'الإشعارات', exact: true }).first(),
          ).toBeVisible()
          if (name === 'email') {
            await expect(page.getByText('visual.one@e2e.mosque', { exact: true })).toBeVisible()
            await expect(page.getByText('visual.two@e2e.mosque', { exact: true })).toBeVisible()
          }
          if (name === 'logs') {
            await expect(page.getByRole('link', { name: /تفسير السعدي/ })).toHaveCount(4)
            await expect(page.getByTestId('account-log-marker')).toHaveCount(3)
            await expect(page.getByText('حدث خاص بمشرف آخر')).not.toBeVisible()
          }
          await page.evaluate(() => document.fonts.ready)
          await expect(page).toHaveScreenshot(
            `admin-settings-populated-${name}-${width}-${theme}.png`,
            {
              mask: [
                page.getByText(/تاريخ إنشاء الحساب:/),
                page.getByTestId('device-time'),
                page.getByTestId('account-log-time'),
              ],
            },
          )
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          ).toBe(true)
        })
      }
})

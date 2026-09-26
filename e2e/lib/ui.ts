import { expect, type Page } from '@playwright/test'

// The login form is shared by the setup project and the auth-flow specs;
// keep the selectors in one place so a UI change updates a single file.
export async function loginThroughUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/login')
  await page.getByPlaceholder('example@mail.com').fill(email)
  await page.getByPlaceholder('********').fill(password)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
}

/**
 * Clicks until the navigation actually lands. Under parallel load a click can
 * race a re-render and be swallowed silently, so retry the whole
 * click-then-assert block instead of trusting a single dispatch.
 */
export async function clickUntilNavigated(
  page: Page,
  click: () => Promise<void>,
  urlPattern: RegExp,
  totalTimeout = 45_000,
): Promise<void> {
  await expect(async () => {
    await click()
    await expect(page).toHaveURL(urlPattern, { timeout: 15_000 })
  }).toPass({ timeout: totalTimeout })
}

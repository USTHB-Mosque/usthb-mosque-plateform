import type { Page } from '@playwright/test'

// The login form is shared by the setup project and the auth-flow specs;
// keep the selectors in one place so a UI change updates a single file.
export async function loginThroughUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/login')
  await page.getByPlaceholder('example@mail.com').fill(email)
  await page.getByPlaceholder('********').fill(password)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
}

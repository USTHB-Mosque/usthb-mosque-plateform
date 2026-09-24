import { expect, test } from '@playwright/test'

import { E2E_MEMBER_EMAIL, E2E_MEMBER_PASSWORD } from './lib/test-users'
import { loginThroughUi } from './lib/ui'

test('login rejects wrong credentials with an Arabic error toast', async ({ page }) => {
  await page.goto('/auth/login')
  await page.getByPlaceholder('example@mail.com').fill(E2E_MEMBER_EMAIL)
  await page.getByPlaceholder('********').fill('WrongPassword!')
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await expect(page.getByText('فشل تسجيل الدخول')).toBeVisible({ timeout: 15_000 })
})

test('register wizard creates an account and lands in the member portal', async ({ page }) => {
  const email = `register-${Date.now()}@e2e.mosque`
  const password = 'E2ePassword@123'

  await page.goto('/auth/register')

  // Step 1: identity
  await page.getByPlaceholder('الاسم الأول').fill('اختبار')
  await page.getByPlaceholder('اسم العائلة').fill('الإلكتروني')
  await page.getByPlaceholder('05xxxxxxxx').fill('0551234567')
  await page.getByRole('button', { name: 'التالي' }).click()

  // Step 2: studies + verification document upload
  await page.getByPlaceholder('أدخل الولاية').fill('الجزائر')
  await page.getByPlaceholder('أدخل التخصص').fill('علوم الحاسوب')
  await page.locator('input[type=file]').setInputFiles('e2e/fixtures/verification-document.png')
  await page.getByRole('button', { name: 'التالي' }).click()

  // Step 3: credentials + consent
  await page.getByPlaceholder('example@mail.com').fill(email)
  await page.getByPlaceholder('********').first().fill(password)
  await page.getByPlaceholder('********').nth(1).fill(password)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'إنشاء حساب' }).click()

  // Registration auto-logs the new member in.
  await expect(page).toHaveURL(/\/user\/dashboard/, { timeout: 30_000 })
})

test('member login works through the real UI', async ({ page }) => {
  await loginThroughUi(page, E2E_MEMBER_EMAIL, E2E_MEMBER_PASSWORD)
  await expect(page).toHaveURL(/\/user\/dashboard/, { timeout: 20_000 })
})

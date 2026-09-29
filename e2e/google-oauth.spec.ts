import { expect, test } from '@playwright/test'

import { E2E_GOOGLE_IDP_URL } from './lib/env'
import { E2E_GOOGLE_EMAIL } from './lib/test-users'

test('seeded Google member signs in through the login button and receives a session', async ({
  page,
}) => {
  await page.goto('/auth/login')
  await page.getByRole('link', { name: 'Google' }).click()

  await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible({ timeout: 20_000 })
  await expect(page).toHaveURL(/\/user\/dashboard/)
  const response = await page.request.get('/api/users/me', {
    headers: { 'Sec-Fetch-Site': 'same-origin' },
  })
  expect(response.ok()).toBe(true)
  expect((await response.json()).user.email).toBe(E2E_GOOGLE_EMAIL)
})

test('unregistered Google identity is rejected without creating a session', async ({ page }) => {
  const idpCookie = { name: 'e2e-google-identity', value: 'unregistered', url: E2E_GOOGLE_IDP_URL }
  await page.context().addCookies([idpCookie])
  await page.goto('/auth/login')
  await page.getByRole('link', { name: 'Google' }).click()

  await expect(page.getByRole('heading', { name: 'أهلاً بعودتك' })).toBeVisible()
  await expect(page).toHaveURL(/\/auth\/login/)
  const cookies = await page.context().cookies()
  expect(cookies.some(({ name }) => name === 'payload-token')).toBe(false)
  const response = await page.request.get('/api/users/me', {
    headers: { 'Sec-Fetch-Site': 'same-origin' },
  })
  expect(response.status()).toBe(401)
})

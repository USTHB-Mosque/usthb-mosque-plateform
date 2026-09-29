import { expect, test } from '@playwright/test'

import { E2E_BASE_URL, E2E_MAILPIT_API_URL } from './lib/env'
import { E2E_RESET_EMAIL } from './lib/test-users'
import { loginThroughUi } from './lib/ui'

interface MailpitMessage {
  ID: string
  To: { Address: string }[]
}

test('member resets their password using the delivered email and signs in again', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000)
  const messages = async (): Promise<MailpitMessage[]> => {
    const response = await request.get(`${E2E_MAILPIT_API_URL}/api/v1/messages?limit=200`)
    expect(response.ok()).toBe(true)
    return ((await response.json()) as { messages: MailpitMessage[] }).messages
  }
  const existing = new Set((await messages()).map(({ ID }) => ID))

  await page.goto('/auth/forgot')
  await page.getByPlaceholder('example@mail.com').fill(E2E_RESET_EMAIL)
  await page.getByRole('button', { name: 'إرسال رابط إعادة التعيين' }).click()
  await expect(
    page.getByText('إذا كان البريد الإلكتروني مسجلاً لدينا', { exact: false }),
  ).toBeVisible({ timeout: 30_000 })

  let messageId: string | undefined
  await expect
    .poll(
      async () => {
        messageId = (await messages()).find(
          (message) =>
            !existing.has(message.ID) &&
            message.To.some(({ Address }) => Address === E2E_RESET_EMAIL),
        )?.ID
        return messageId
      },
      { timeout: 30_000 },
    )
    .toBeTruthy()

  const mail = await request.get(`${E2E_MAILPIT_API_URL}/api/v1/message/${messageId}`)
  expect(mail.ok()).toBe(true)
  const html = ((await mail.json()) as { HTML: string }).HTML
  const resetLink = html.match(/href="([^"]*\/auth\/reset\/[^"\s]+)"/)?.[1]
  expect(resetLink).toBeTruthy()
  const resetUrl = new URL(resetLink!)
  expect(resetUrl.origin).toBe(E2E_BASE_URL)

  await page.goto(resetUrl.href)
  await expect(page.getByRole('heading', { name: 'كلمة مرور جديدة' })).toBeVisible()
  const newPassword = 'Reset@123456'
  await page.getByPlaceholder('********').first().fill(newPassword)
  await page.getByPlaceholder('********').nth(1).fill(newPassword)
  await page.getByRole('button', { name: 'تغيير كلمة المرور' }).click()
  await expect(page).toHaveURL(/\/auth\/login\?reset=success/, { timeout: 20_000 })

  await loginThroughUi(page, E2E_RESET_EMAIL, newPassword)
  await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible({ timeout: 20_000 })
})

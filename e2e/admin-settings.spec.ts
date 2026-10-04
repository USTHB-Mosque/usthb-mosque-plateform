import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { E2E_BASE_URL, E2E_MAILPIT_API_URL } from './lib/env'
import { settingsAdminStorageState, mfaAdminStorageState } from './lib/auth-state'
import { E2E_MFA_ADMIN_EMAIL, E2E_SECURITY_PASSWORD } from './lib/test-users'
import { loginThroughUi } from './lib/ui'

async function mailboxIds(request: APIRequestContext) {
  const response = await request.get(`${E2E_MAILPIT_API_URL}/api/v1/messages?limit=200`)
  expect(response.ok()).toBe(true)
  const body = (await response.json()) as { messages: { ID: string }[] }
  return new Set(body.messages.map((message) => message.ID))
}

async function deliveredCode(request: APIRequestContext, email: string, before: Set<string>) {
  let code: string | undefined
  await expect
    .poll(
      async () => {
        const response = await request.get(`${E2E_MAILPIT_API_URL}/api/v1/messages?limit=200`)
        const body = (await response.json()) as {
          messages: { ID: string; To: { Address: string }[] }[]
        }
        for (const message of body.messages) {
          if (before.has(message.ID) || !message.To.some((to) => to.Address === email)) continue
          const detail = await request.get(`${E2E_MAILPIT_API_URL}/api/v1/message/${message.ID}`)
          code = ((await detail.json()) as { HTML: string }).HTML.match(
            /data-security-code(?:="")?>(\d{6})</,
          )?.[1]
          if (code) break
        }
        return code
      },
      { timeout: 30_000 },
    )
    .toBeTruthy()
  return code!
}

async function confirmIdentity(page: Page, password = E2E_SECURITY_PASSWORD) {
  const manage = page.getByRole('button', { name: 'تأكيد الهوية للمتابعة' })
  if (await manage.isVisible()) {
    await manage.click()
    const dialog = page.getByRole('dialog', { name: 'تأكيد الهوية' })
    await dialog.getByLabel('كلمة المرور الحالية').fill(password)
    await dialog.getByRole('button', { name: 'تأكيد الهوية', exact: true }).click()
    await expect(dialog).not.toBeVisible({ timeout: 30_000 })
  }
}

test.describe('admin settings #146 — verified contacts and profile photo', () => {
  test.use({ storageState: settingsAdminStorageState })
  test('edits the profile, verifies a mailbox and promotes it without keeping the old session', async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000)
    await page.goto('/admin-panel/settings')
    await page.getByLabel('الإسم', { exact: true }).fill('محمد')
    await page.getByLabel('اللقب', { exact: true }).fill('الإعدادات')
    await page.getByLabel('رقم الهاتف', { exact: true }).fill('0551234567')
    await page.getByRole('button', { name: 'حفظ المعلومات' }).click()
    await expect(page.getByText('تم حفظ معلومات الحساب')).toBeVisible()
    await page.getByLabel('ملف الصورة الشخصية').setInputFiles('public/static/images/login.jpg')
    await expect(page.getByText('تم تحديث الصورة الشخصية')).toBeVisible({ timeout: 30_000 })
    await page.reload()
    await expect(page.locator('img[alt="محمد الإعدادات"]')).toBeVisible()
    const old = (await page.context().cookies()).find(
      (cookie) => cookie.name === 'payload-token',
    )!.value

    await page.goto('/admin-panel/settings/security/email')
    await confirmIdentity(page)
    const address = 'verified.settings@e2e.mosque'
    const before = await mailboxIds(request)
    await page.getByLabel('إضافة بريد', { exact: true }).fill(address)
    await page.getByRole('button', { name: 'أضف', exact: true }).click()
    await page.getByLabel('رمز توثيق البريد').fill(await deliveredCode(request, address, before))
    await page.getByRole('button', { name: 'توثيق البريد', exact: true }).click()
    await expect(page.getByText('تم توثيق البريد الإلكتروني')).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: `إدارة ${address}`, exact: true }).click()
    await page.getByRole('menuitem', { name: 'تعيين رئيسي' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'تعيين رئيسي' }).click()
    await expect(page).toHaveURL(/\/settings\/security$/, { timeout: 30_000 })
    const rejected = await request.get('/api/users/me', {
      headers: { Cookie: `payload-token=${old}`, 'Sec-Fetch-Site': 'same-origin' },
    })
    expect(rejected.status()).toBe(401)
    await page.goto('/admin-panel/settings')
    await expect(page.getByLabel('البريد الإلكتروني', { exact: true })).toHaveValue(address)
    await page.getByRole('button', { name: 'حذف الصورة الشخصية', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'حذف الصورة', exact: true }).click()
    await expect(page.getByText('تم حذف الصورة الشخصية')).toBeVisible()
  })
})

test.describe('admin settings #146 — email OTP and native API bypasses', () => {
  // Enrollment rotates this fixture's setup token. A failed one-way journey
  // needs a fresh seed, rather than a retry with a now-invalid storage state.
  test.describe.configure({ retries: 0 })
  test.use({ storageState: mfaAdminStorageState })
  test('enrolls, challenges login, uses recovery, and refuses native password-only authentication', async ({
    page,
    browser,
    request,
  }) => {
    test.setTimeout(240_000)
    await page.goto('/admin-panel/settings/security/2fa')
    await confirmIdentity(page)
    const before = await mailboxIds(request)
    await page.getByRole('switch', { name: 'المصادقة عبر البريد الإلكتروني', exact: true }).click()
    await page
      .getByLabel('رمز تفعيل المصادقة الثنائية')
      .fill(await deliveredCode(request, E2E_MFA_ADMIN_EMAIL, before))
    await page.getByRole('button', { name: 'تفعيل المصادقة الثنائية' }).click()
    const recovery = page.getByRole('region', { name: 'رموز الاسترداد' })
    await expect(recovery).toBeVisible({ timeout: 30_000 })
    const recoveryCode = await recovery.locator('li').first().innerText()
    await recovery.getByRole('button', { name: 'لقد حفظت الرموز' }).click()

    const native = await request.post('/api/users/login', {
      data: { email: E2E_MFA_ADMIN_EMAIL, password: E2E_SECURITY_PASSWORD },
    })
    expect(native.ok()).toBe(false)
    expect(native.headers()['set-cookie'] ?? '').not.toContain('payload-token=')
    const graphQL = await request.post('/api/graphql', {
      data: {
        query: `mutation { loginUser(email: "${E2E_MFA_ADMIN_EMAIL}", password: "${E2E_SECURITY_PASSWORD}") { token } }`,
      },
    })
    const graphBody = await graphQL.json()
    expect(graphBody.data?.loginUser?.token).toBeFalsy()
    expect(graphBody.errors).toBeTruthy()

    const loginContext = await browser.newContext({
      baseURL: E2E_BASE_URL,
      storageState: { cookies: [], origins: [] },
    })
    const loginPage = await loginContext.newPage()
    const mailBefore = await mailboxIds(request)
    await loginThroughUi(loginPage, E2E_MFA_ADMIN_EMAIL, E2E_SECURITY_PASSWORD)
    await expect(loginPage.getByLabel('رمز التحقق أو الاسترداد')).toBeVisible({ timeout: 30_000 })
    expect((await loginContext.cookies()).some((cookie) => cookie.name === 'payload-token')).toBe(
      false,
    )
    await loginPage
      .getByLabel('رمز التحقق أو الاسترداد')
      .fill(await deliveredCode(request, E2E_MFA_ADMIN_EMAIL, mailBefore))
    await loginPage.getByRole('button', { name: 'تأكيد تسجيل الدخول' }).click()
    await expect(loginPage).toHaveURL(/\/admin-panel\/dashboard/, { timeout: 30_000 })
    await loginContext.close()

    // A new login attempt after the resend cooldown can use a recovery code.
    await page.waitForTimeout(61_000)
    const recoveryContext = await browser.newContext({
      baseURL: E2E_BASE_URL,
      storageState: { cookies: [], origins: [] },
    })
    const recoveryPage = await recoveryContext.newPage()
    await loginThroughUi(recoveryPage, E2E_MFA_ADMIN_EMAIL, E2E_SECURITY_PASSWORD)
    await recoveryPage.getByLabel('رمز التحقق أو الاسترداد').fill(recoveryCode)
    await recoveryPage.getByRole('button', { name: 'تأكيد تسجيل الدخول' }).click()
    await expect(recoveryPage).toHaveURL(/\/admin-panel\/dashboard/, { timeout: 30_000 })
    await recoveryContext.close()
  })
})

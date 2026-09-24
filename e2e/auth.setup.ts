import fs from 'fs'
import path from 'path'

import { expect, test as setup, type Page } from '@playwright/test'

import { adminStorageState, userStorageState } from './lib/auth-state'
import {
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_MEMBER_EMAIL,
  E2E_MEMBER_PASSWORD,
} from './lib/test-users'
import { loginThroughUi } from './lib/ui'

fs.mkdirSync(path.dirname(userStorageState), { recursive: true })

// Logins run through the real UI once per role; every other project depends on
// this setup project and reuses the saved storage states.
setup('authenticate as member', async ({ page }) => {
  await loginThroughUi(page, E2E_MEMBER_EMAIL, E2E_MEMBER_PASSWORD)
  await expect(page).toHaveURL(/\/user\/dashboard/)
  await page.context().storageState({ path: userStorageState })
})

setup('authenticate as admin', async ({ page }) => {
  await loginThroughUi(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD)
  await expect(page).toHaveURL(/\/admin/)
  await page.context().storageState({ path: adminStorageState })
})

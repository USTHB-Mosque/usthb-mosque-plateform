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
  await expect(page).toHaveURL(/\/user\/dashboard/, { timeout: 20_000 })
  await page.context().storageState({ path: userStorageState })
})

setup('authenticate as admin', async ({ page }) => {
  await loginThroughUi(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD)
  // The admin panel is the heaviest first compile in dev mode; give it room.
  await expect(page).toHaveURL(/\/admin/, { timeout: 30_000 })
  await page.context().storageState({ path: adminStorageState })
})

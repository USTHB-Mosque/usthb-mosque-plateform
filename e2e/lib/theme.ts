import type { Page } from '@playwright/test'

/**
 * Pins next-themes' persisted value before the page runs a single script.
 *
 * The no-flash script in `shared/theme-init-script.tsx` reads
 * `localStorage.theme` synchronously in `<head>`, so this has to be an init
 * script rather than something set after `goto` — otherwise the first paint is
 * still the default (`system`) and `ThemeScopeGuard` has already committed to a
 * theme class.
 *
 * Only `dark` needs pinning for the light captures: Playwright emulates
 * `prefers-color-scheme: light` by default, so `system` already resolves to
 * light and the existing baselines keep rendering exactly as they did.
 */
export async function pinDarkTheme(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('theme', 'dark')
    } catch {
      /* storage disabled: the guard falls back to the emulated preference */
    }
  })
}

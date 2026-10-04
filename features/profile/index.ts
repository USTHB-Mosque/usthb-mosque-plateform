// Public surface of the member profile feature (dashboard, settings).
// Other features must import through here, never reach into components/ or server/ directly.

export { default as ArticlesPreview } from './components/dashboard/ArticlesPreview'
export { default as LoansPreview } from './components/dashboard/LoansPreview'
export { default as RegistrationsPreview } from './components/dashboard/RegistrationsPreview'
export { default as StatCard } from './components/dashboard/StatCard'
export { default as CalendarWidget } from './components/dashboard/CalendarWidget'
export { default as ActivityLogTimeline } from './components/activity-log/ActivityLogTimeline'
export { default as ProfileAccountForm } from './components/settings/ProfileAccountForm'
export { default as ProfileFavoritesGrid } from './components/settings/ProfileFavoritesGrid'
export { default as ProfilePasswordForm } from './components/settings/ProfilePasswordForm'
// #65: the admin settings screens reuse the member's own account sections
// rather than keeping a second copy of them, so they came through this barrel.
export { default as SettingsProfileCard } from './components/settings/SettingsProfileCard'
export type { SettingsTab } from './components/settings/SettingsProfileCard'
export { default as AccountInfoSection } from './components/settings/AccountInfoSection'

export * from './server/activity-log'
export * from './server/dashboard'
export * from './server/latest-updates'
export * from './server/settings'

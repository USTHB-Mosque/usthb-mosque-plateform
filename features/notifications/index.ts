// Public surface of the notifications feature (#17).
// Other features must import through here, never reach into components/, server/ or types.ts directly.

export { default as NotificationBell } from './components/NotificationBell'
export * from './server/create-notification'
export * from './server/get-notifications'
export * from './server/mark-notifications-read'
export * from './types'

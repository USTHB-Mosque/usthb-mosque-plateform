// Public surface of the auth feature (login, register, sessions, Google OAuth).
// Other features must import through here, never reach into components/, server/ or api/ directly.

export { default as LoginForm } from './components/LoginForm'
export { default as RegisterWizard } from './components/RegisterWizard'

export * from './api/profile.queries'
export * from './server/login'
export * from './server/logout'
export * from './server/register'
export * from './server/oauth-google'
export * from './lib/auth-errors'
export * from './types'
export { useAuthFormStore } from './store'

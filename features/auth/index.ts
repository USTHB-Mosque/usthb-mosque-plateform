// Public surface of the auth feature (login, register, password reset, sessions, Google OAuth).
// Other features must import through here, never reach into components/, server/ or api/ directly.

export { default as LoginForm } from './components/LoginForm'
export { default as RegisterWizard } from './components/RegisterWizard'
export { default as ForgotPasswordForm } from './components/ForgotPasswordForm'
export { default as ResetPasswordForm } from './components/ResetPasswordForm'

export * from './api/profile.queries'
export * from './server/login'
export * from './server/logout'
export * from './server/register'
export * from './server/forgot-password'
export * from './server/reset-password'
export * from './server/oauth-google'
export * from './lib/auth-errors'
export * from './types'
export { useAuthFormStore } from './store'

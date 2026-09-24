// Public surface of the admin feature (custom Payload admin views + their server actions).
// Other features must import through here, never reach into components/ or server/ directly.

export { default as AdminLoginView } from './components/login/Login'
export { default as AdminFirstUserView } from './components/first-user/FirstUser'
export { default as AdminAccountView } from './components/account/Account'

export * from './server/account'
export * from './server/create-first-user'

export { bulkSoftDeleteBooks, deleteBook, softDeleteBook } from './server/books'

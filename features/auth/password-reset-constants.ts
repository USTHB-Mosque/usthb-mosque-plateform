/**
 * Throttling for the forgot-password endpoint, which is unauthenticated and
 * sends mail. Lives outside the server action because a `'use server'` module
 * may only export async functions, and the tests need the numbers.
 *
 * Five requests per quarter hour is generous for a real member and still stops
 * the endpoint being used as a mail cannon, or used to flood one inbox.
 */
export const FORGOT_PASSWORD_LIMIT = 5
export const FORGOT_PASSWORD_WINDOW_MS = 15 * 60 * 1000

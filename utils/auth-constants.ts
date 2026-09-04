// Single source of truth for how long a member session lasts. Shared by
// `collections/User.ts#auth.tokenExpiration` and `lib/auth.ts#setPayloadTokenCookie`
// so the session cookie never outlives the JWT it carries.
export const TOKEN_EXPIRATION_SECONDS = 60 * 60 * 24 * 7

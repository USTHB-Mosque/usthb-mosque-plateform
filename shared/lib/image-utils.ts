const MEDIA_FILE_PREFIX = '/api/media/file/'

export function getImageUrl(
  mediaUrl: string | undefined | null,
  fallback: string = '/static/images/ramadan.png',
): string {
  if (!mediaUrl) return fallback

  // Direct local storage URLs are not browser-accessible. Payload's media
  // handler is: it serves the file on the same origin with access checks.
  const directLocalStorage =
    (mediaUrl.includes('localhost') || mediaUrl.includes('127.0.0.1')) &&
    !mediaUrl.includes(MEDIA_FILE_PREFIX)
  if (directLocalStorage || mediaUrl.includes('undefined') || mediaUrl.includes('null')) {
    return fallback
  }

  return mediaUrl
}

/**
 * The only URL a *private* document may be read through.
 *
 * A school certificate is owner-scoped media (`media.isPrivate`), so its preview
 * has to travel through Payload's own handler or the access check never runs.
 * Anything that is not a `/api/media/file/...` path — most importantly a storage
 * bucket URL that would hand the browser a direct, unauthorised read — is
 * refused outright rather than silently substituted, because a wrong-looking
 * placeholder image would hide a broken preview (#145).
 */
export function getProtectedMediaUrl(mediaUrl: string | undefined | null): string | null {
  if (!mediaUrl) return null
  if (mediaUrl.includes('undefined') || mediaUrl.includes('null')) return null

  const path = mediaUrl.startsWith('http')
    ? (() => {
        try {
          return new URL(mediaUrl).pathname
        } catch {
          return null
        }
      })()
    : mediaUrl.split('?')[0]

  if (!path || !path.startsWith(MEDIA_FILE_PREFIX)) return null

  return path
}

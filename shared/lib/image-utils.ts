export function getImageUrl(
  mediaUrl: string | undefined | null,
  fallback: string = '/static/images/ramadan.png',
): string {
  if (!mediaUrl) return fallback

  // Direct local storage URLs are not browser-accessible. Payload's media
  // handler is: it serves the file on the same origin with access checks.
  const directLocalStorage =
    (mediaUrl.includes('localhost') || mediaUrl.includes('127.0.0.1')) &&
    !mediaUrl.includes('/api/media/file/')
  if (directLocalStorage || mediaUrl.includes('undefined') || mediaUrl.includes('null')) {
    return fallback
  }

  return mediaUrl
}

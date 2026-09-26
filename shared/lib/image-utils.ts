export function getImageUrl(
  mediaUrl: string | undefined | null,
  fallback: string = '/static/images/ramadan.png',
): string {
  if (!mediaUrl) return fallback

  // If the URL contains a local address or an invalid origin, use fallback
  if (
    mediaUrl.includes('localhost') ||
    mediaUrl.includes('127.0.0.1') ||
    mediaUrl.includes('undefined') ||
    mediaUrl.includes('null')
  ) {
    return fallback
  }

  return mediaUrl
}

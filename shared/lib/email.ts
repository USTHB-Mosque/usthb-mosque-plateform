/**
 * Escapes a value for interpolation into an HTML email body. Both the generic
 * notification body and the named loan templates put user-supplied text (book
 * titles, admin notes, refusal reasons) into markup, so they share this rather
 * than each carrying their own copy.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

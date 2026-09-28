import type { NotificationListItem, NotificationType } from '@/features/notifications'

// Shared notification fixtures for tests. A fixed "now" keeps every branch
// deterministic: 2026-09-27 15:00 local.
export const FIXTURE_NOW = new Date('2026-09-27T15:00:00')

export function makeNotificationItem(
  overrides: Partial<NotificationListItem> = {},
): NotificationListItem {
  return {
    id: 1,
    type: 'system' as NotificationType,
    title: 'إشعار',
    message: 'رسالة',
    link: null,
    seen: false,
    createdAt: FIXTURE_NOW.toISOString(),
    ...overrides,
  }
}

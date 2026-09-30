import type { GlobalConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'
import {
  DEFAULT_BORROW_LIMIT,
  DEFAULT_LOAN_DURATION_DAYS,
  DEFAULT_PICKUP_WINDOW_HOURS,
} from '@/utils/constants/loans'

/**
 * Platform settings global (#19): the first registered global. Holds the loan
 * duration that books fall back to and the borrow limit enforced on requests.
 * The migration seeds the single row so reads always return real values.
 * `pickupWindowHours` is D1 (#153): how long an accepted Loan waits for
 * collection before the sweep refuses it.
 */
export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'الإعدادات',
  access: {
    read: () => true,
    update: ({ req: { user } }) => isAdmin(user),
  },
  fields: [
    {
      name: 'defaultLoanDurationDays',
      type: 'number',
      label: 'مدة الإعارة الافتراضية (بالأيام)',
      min: 1,
      defaultValue: DEFAULT_LOAN_DURATION_DAYS,
    },
    {
      name: 'borrowLimit',
      type: 'number',
      label: 'الحد الأقصى للكتب المستعارة',
      min: 1,
      defaultValue: DEFAULT_BORROW_LIMIT,
    },
    {
      name: 'pickupWindowHours',
      type: 'number',
      label: 'مدة نافذة الاستلام (بالساعات)',
      min: 1,
      defaultValue: DEFAULT_PICKUP_WINDOW_HOURS,
    },
  ],
}

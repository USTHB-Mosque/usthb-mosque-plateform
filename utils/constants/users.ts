export const USER_SITUATIONS = ['student', 'doctoral', 'teacher', 'staff'] as const

export type UserSituation = (typeof USER_SITUATIONS)[number]

export const userSituationsConfigArray: { value: UserSituation; label: string }[] = [
  { value: 'student', label: 'طالب' },
  { value: 'doctoral', label: 'طالب دكتوراه' },
  { value: 'teacher', label: 'أستاذ' },
  { value: 'staff', label: 'موظف' },
]

export const USER_SITUATION_LABELS: Record<UserSituation, string> = Object.fromEntries(
  userSituationsConfigArray.map((option) => [option.value, option.label]),
) as Record<UserSituation, string>

/** What to show for a member whose `situation` was never filled in. */
export const UNKNOWN_SITUATION_LABEL = '—'

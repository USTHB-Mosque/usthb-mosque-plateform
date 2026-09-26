export const USER_SITUATIONS = ['student', 'doctoral', 'teacher', 'staff'] as const

export type UserSituation = (typeof USER_SITUATIONS)[number]

export const userSituationsConfigArray: { value: UserSituation; label: string }[] = [
  { value: 'student', label: 'طالب' },
  { value: 'doctoral', label: 'طالب دكتوراه' },
  { value: 'teacher', label: 'أستاذ' },
  { value: 'staff', label: 'موظف' },
]

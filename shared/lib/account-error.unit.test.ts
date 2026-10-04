import { expect, it } from 'vitest'
import { publicAccountError } from './account-error'

it('preserves known account guidance and hides internal error details', () => {
  expect(publicAccountError(new Error('وثّق البريد أولاً'), 'تعذر الحفظ')).toBe('وثّق البريد أولاً')
  expect(publicAccountError(new Error('SQL query with credential material'), 'تعذر الحفظ')).toBe(
    'تعذر الحفظ',
  )
  expect(publicAccountError('unknown transport rejection', 'تعذر الحفظ')).toBe('تعذر الحفظ')
})

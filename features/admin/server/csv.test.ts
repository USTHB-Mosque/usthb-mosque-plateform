import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAdminCtx = vi.fn()
const getStaffCtx = vi.fn()
const revalidatePath = vi.fn()
const writeLog = vi.fn()
const parseBooksCsv = vi.fn()
const parseUsersCsv = vi.fn()
const fetchImageBuffer = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }))
vi.mock('./ctx', () => ({
  getAdminCtx: (...args: unknown[]) => getAdminCtx(...args),
  getStaffCtx: (...args: unknown[]) => getStaffCtx(...args),
}))
vi.mock('./logs', () => ({ writeLog: (...args: unknown[]) => writeLog(...args) }))
vi.mock('./csv-core', () => ({
  parseBooksCsv: (...args: unknown[]) => parseBooksCsv(...args),
  parseUsersCsv: (...args: unknown[]) => parseUsersCsv(...args),
  fetchImageBuffer: (...args: unknown[]) => fetchImageBuffer(...args),
}))

const { previewBooksImport, previewUsersImport, commitBooksImport, commitUsersImport } =
  await import('./csv')
const user = { id: 2, role: 'admin' }
const req = { headers: new Headers() }
const bookSeed = { title: 'كتاب', imageUrl: '' }
const userSeed = { email: 'member@example.com', password: 'secret', fullName: 'Member' }
const parsed = (data: unknown, validCount = 1, invalidCount = 0) => ({
  total: validCount + invalidCount,
  validCount,
  invalidCount,
  errors: invalidCount ? [{ row: 2, message: 'invalid' }] : [],
  rows: Array.from({ length: validCount }, (_, index) => ({ row: index + 2, data })),
  preview: [],
})
const file = (content = 'csv') => new File([content], 'import.csv', { type: 'text/csv' })

function setup(payload: Record<string, any> = {}) {
  const fullPayload = {
    create: vi.fn().mockResolvedValue({ id: 5 }),
    db: {
      beginTransaction: vi.fn().mockResolvedValue('tx'),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
    },
    ...payload,
  }
  getStaffCtx.mockResolvedValue({ payload: fullPayload, user, req })
  getAdminCtx.mockResolvedValue({ payload: fullPayload, user, req })
  return fullPayload
}

describe('admin CSV actions', () => {
  beforeEach(() => {
    getAdminCtx.mockReset()
    getStaffCtx.mockReset()
    revalidatePath.mockReset()
    writeLog.mockReset()
    parseBooksCsv.mockReset()
    parseUsersCsv.mockReset()
    fetchImageBuffer.mockReset()
    parseBooksCsv.mockReturnValue(parsed(bookSeed))
    parseUsersCsv.mockReturnValue(parsed(userSeed))
  })

  it('previews book and user CSVs and rejects oversized files', async () => {
    setup()
    await previewBooksImport(file())
    await previewUsersImport(file())
    expect(parseBooksCsv).toHaveBeenCalledWith('csv')
    expect(parseUsersCsv).toHaveBeenCalledWith('csv')
    await expect(previewBooksImport(file('x'.repeat(2 * 1024 * 1024 + 1)))).rejects.toThrow(
      'الملف كبير جداً',
    )
  })

  it('does not commit invalid or empty book imports', async () => {
    const payload = setup()
    parseBooksCsv
      .mockReturnValueOnce(parsed(bookSeed, 0, 1))
      .mockReturnValueOnce(parsed(bookSeed, 0, 0))
    await expect(commitBooksImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ row: 2 }],
    })
    await expect(commitBooksImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ row: 0 }],
    })
    expect(payload.db.beginTransaction).not.toHaveBeenCalled()
  })

  it('does not commit invalid or empty user imports', async () => {
    const payload = setup()
    parseUsersCsv
      .mockReturnValueOnce(parsed(userSeed, 0, 1))
      .mockReturnValueOnce(parsed(userSeed, 0, 0))
    await expect(commitUsersImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ row: 2 }],
    })
    await expect(commitUsersImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ row: 0 }],
    })
    expect(payload.db.beginTransaction).not.toHaveBeenCalled()
  })

  it('rejects imports above the row limit', async () => {
    setup()
    parseBooksCsv.mockReturnValueOnce(parsed(bookSeed, 2001, 0))
    parseUsersCsv.mockReturnValueOnce(parsed(userSeed, 2001, 0))
    await expect(commitBooksImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ row: 0, message: expect.stringContaining('2000') }],
    })
    await expect(commitUsersImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ row: 0, message: expect.stringContaining('2000') }],
    })
  })

  it('rejects a book cover fetch failure before opening a transaction', async () => {
    setup()
    parseBooksCsv.mockReturnValue(
      parsed({ ...bookSeed, imageUrl: 'https://example.test/image.png' }),
    )
    fetchImageBuffer.mockResolvedValue({ ok: false, error: 'not an image' })
    await expect(commitBooksImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ row: 2, message: expect.stringContaining('not an image') }],
    })
  })

  it('imports a book with a downloaded cover and commits a transaction', async () => {
    const payload = setup()
    const buffer = Buffer.from([1, 2])
    parseBooksCsv.mockReturnValue(
      parsed({ ...bookSeed, imageUrl: 'https://example.test/image.png' }),
    )
    fetchImageBuffer.mockResolvedValue({ ok: true, buffer, mimetype: 'image/jpeg' })
    await expect(commitBooksImport(file())).resolves.toEqual({ ok: true, created: 1 })
    expect(payload.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'media',
        file: expect.objectContaining({ mimetype: 'image/jpeg', size: 2 }),
        req: { ...req, transactionID: 'tx' },
      }),
    )
    expect(payload.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ collection: 'books', data: expect.objectContaining({ image: 5 }) }),
    )
    expect(payload.db.commitTransaction).toHaveBeenCalledWith('tx')
    expect(writeLog).toHaveBeenCalled()
  })

  it('uses a default image MIME type when the fetch result omits one', async () => {
    const payload = setup()
    parseBooksCsv.mockReturnValue(
      parsed({ ...bookSeed, imageUrl: 'https://example.test/image.png' }),
    )
    fetchImageBuffer.mockResolvedValue({ ok: true, buffer: Buffer.from([4]) })
    await commitBooksImport(file())
    expect(payload.create.mock.calls[0][0].file.mimetype).toBe('image/png')
  })

  it('continues without media when a successful image response has no buffer', async () => {
    const payload = setup()
    parseBooksCsv.mockReturnValue(
      parsed({ ...bookSeed, imageUrl: 'https://example.test/image.png' }),
    )
    fetchImageBuffer.mockResolvedValue({ ok: true })
    await expect(commitBooksImport(file())).resolves.toEqual({ ok: true, created: 1 })
    expect(payload.create).toHaveBeenCalledTimes(1)
    expect(payload.create.mock.calls[0][0].collection).toBe('books')
  })

  it('imports successfully without a transaction id and rolls back failed creates', async () => {
    const payload = setup({
      db: {
        beginTransaction: vi.fn().mockResolvedValue(null),
        rollbackTransaction: vi.fn(),
        commitTransaction: vi.fn(),
      },
    })
    await expect(commitBooksImport(file())).resolves.toEqual({ ok: true, created: 1 })
    expect(payload.create.mock.calls[0][0].req).toBe(req)
    expect(payload.db.commitTransaction).not.toHaveBeenCalled()

    const failing = setup({ create: vi.fn().mockRejectedValue(new Error('duplicate ISBN')) })
    await expect(commitBooksImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ message: 'رقم ISBN مستخدم بالفعل' }],
    })
    expect(failing.db.rollbackTransaction).toHaveBeenCalledWith('tx')
  })

  it('rolls back when a transaction commit fails and formats other book errors', async () => {
    const payload = setup({
      db: {
        beginTransaction: vi.fn().mockResolvedValue('tx'),
        rollbackTransaction: vi.fn(),
        commitTransaction: vi.fn().mockRejectedValue(new Error('commit failed')),
      },
    })
    await expect(commitBooksImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ row: 0, message: 'تعذر استيراد الملف' }],
    })
    expect(payload.db.rollbackTransaction).toHaveBeenCalledWith('tx')

    const failing = setup({
      create: vi.fn().mockRejectedValueOnce(new Error('تصنيف غير معروف: x')),
    })
    await expect(commitBooksImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ message: 'تصنيف غير معروف: x' }],
    })
    const denied = setup({ create: vi.fn().mockRejectedValue(new Error('forbidden')) })
    await expect(commitBooksImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ message: 'ليست لديك صلاحية تنفيذ هذه العملية' }],
    })
    const generic = setup({ create: vi.fn().mockRejectedValue('unexpected') })
    await expect(commitBooksImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ message: 'تعذر حفظ هذا السطر' }],
    })
    expect(failing.db.rollbackTransaction).toHaveBeenCalled()
    expect(denied.db.rollbackTransaction).toHaveBeenCalled()
    expect(generic.db.rollbackTransaction).toHaveBeenCalled()
  })

  it('does not attempt rollback after a failed book row when no transaction was created', async () => {
    const payload = setup({
      create: vi.fn().mockRejectedValue(new Error('bad isbn')),
      db: {
        beginTransaction: vi.fn().mockResolvedValue(null),
        rollbackTransaction: vi.fn(),
        commitTransaction: vi.fn(),
      },
    })
    await expect(commitBooksImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ row: 2 }],
    })
    expect(payload.db.rollbackTransaction).not.toHaveBeenCalled()
  })

  it('preserves a row error when the first rollback itself fails', async () => {
    const rollbackTransaction = vi
      .fn()
      .mockRejectedValueOnce(new Error('rollback interrupted'))
      .mockResolvedValueOnce(undefined)
    const payload = setup({
      create: vi.fn().mockRejectedValue(new Error('duplicate isbn')),
      db: {
        beginTransaction: vi.fn().mockResolvedValue('tx'),
        rollbackTransaction,
        commitTransaction: vi.fn(),
      },
    })
    await expect(commitBooksImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ row: 2, message: 'رقم ISBN مستخدم بالفعل' }],
    })
    expect(rollbackTransaction).toHaveBeenCalledTimes(2)
  })

  it('imports users with and without a transaction and rolls back create failures', async () => {
    const payload = setup()
    await expect(commitUsersImport(file())).resolves.toEqual({ ok: true, created: 1 })
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        data: expect.objectContaining({ email: userSeed.email, role: 'user', consentGiven: true }),
        req: { ...req, transactionID: 'tx' },
      }),
    )
    expect(payload.db.commitTransaction).toHaveBeenCalledWith('tx')

    const failed = setup({ create: vi.fn().mockRejectedValue(new Error('unique email')) })
    await expect(commitUsersImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ message: 'البريد الإلكتروني مستخدم بالفعل' }],
    })
    expect(failed.db.rollbackTransaction).toHaveBeenCalledWith('tx')

    const noTransaction = setup({
      db: {
        beginTransaction: vi.fn().mockResolvedValue(null),
        rollbackTransaction: vi.fn(),
        commitTransaction: vi.fn(),
      },
    })
    await expect(commitUsersImport(file())).resolves.toEqual({ ok: true, created: 1 })
    expect(noTransaction.create.mock.calls[0][0].req).toBe(req)
    expect(noTransaction.db.commitTransaction).not.toHaveBeenCalled()

    const explicitRole = setup()
    parseUsersCsv.mockReturnValue(parsed({ ...userSeed, role: 'admin' }))
    await commitUsersImport(file())
    expect(explicitRole.create.mock.calls[0][0].data.role).toBe('admin')
  })

  it('rolls back a failed user row when no transaction id was issued', async () => {
    const payload = setup({
      create: vi.fn().mockRejectedValue(new Error('duplicate email')),
      db: {
        beginTransaction: vi.fn().mockResolvedValue(null),
        rollbackTransaction: vi.fn(),
        commitTransaction: vi.fn(),
      },
    })
    await expect(commitUsersImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ message: 'البريد الإلكتروني مستخدم بالفعل' }],
    })
    expect(payload.db.rollbackTransaction).not.toHaveBeenCalled()
  })

  it('rolls back a failed users commit and formats permission and generic errors', async () => {
    const payload = setup({
      db: {
        beginTransaction: vi.fn().mockResolvedValue('tx'),
        rollbackTransaction: vi.fn(),
        commitTransaction: vi.fn().mockRejectedValue(new Error('commit failed')),
      },
    })
    await expect(commitUsersImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ row: 0, message: 'تعذر استيراد الملف' }],
    })
    expect(payload.db.rollbackTransaction).toHaveBeenCalledWith('tx')

    const denied = setup({ create: vi.fn().mockRejectedValue(new Error('permission denied')) })
    await expect(commitUsersImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ message: 'ليست لديك صلاحية تنفيذ هذه العملية' }],
    })
    const generic = setup({ create: vi.fn().mockRejectedValue('unexpected') })
    await expect(commitUsersImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ message: 'تعذر حفظ هذا السطر' }],
    })
    expect(denied.db.rollbackTransaction).toHaveBeenCalled()
    expect(generic.db.rollbackTransaction).toHaveBeenCalled()
  })

  it('preserves a user row error when the first rollback fails', async () => {
    const rollbackTransaction = vi
      .fn()
      .mockRejectedValueOnce(new Error('rollback interrupted'))
      .mockResolvedValueOnce(undefined)
    const payload = setup({
      create: vi.fn().mockRejectedValue(new Error('duplicate email')),
      db: {
        beginTransaction: vi.fn().mockResolvedValue('tx'),
        rollbackTransaction,
        commitTransaction: vi.fn(),
      },
    })
    await expect(commitUsersImport(file())).resolves.toMatchObject({
      ok: false,
      errors: [{ row: 2, message: 'البريد الإلكتروني مستخدم بالفعل' }],
    })
    expect(payload.db.rollbackTransaction).toHaveBeenCalledTimes(2)
  })
})

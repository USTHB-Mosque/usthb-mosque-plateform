import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  resetLoginAttempts,
} from 'payload'
import type { CollectionBeforeOperationHook, Payload, PayloadRequest } from 'payload'
import { AuthenticationError, Forbidden } from 'payload'
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import type { AccountSecurity, AuthChallenge, User } from '@/payload-types'
import { isPrimaryEmailChangeAllowed } from './account-emails'

export const REAUTHENTICATION_MS = 5 * 60 * 1000

// Capabilities live only in this process; a caller cannot forge them in JSON,
// GraphQL input, HTTP headers or Payload's client-supplied context.
const passwordProbes = new WeakSet<PayloadRequest>()
const sessionIssuance = new WeakSet<PayloadRequest>()
const resetOperations = new WeakSet<PayloadRequest>()
const passwordChanges = new WeakSet<object>()
const passwordProofs = new WeakMap<User, number>()
const loginRevisions = new WeakMap<PayloadRequest, number>()

class PasswordConfirmed extends Error {
  constructor(
    readonly user: User,
    readonly revision: number,
  ) {
    super('Password confirmed; do not issue a session')
  }
}

export async function securityBeforeLogin({ user, req }: { user: User; req: PayloadRequest }) {
  const security = await readAccountSecurity(req.payload, user.id, req)
  if (loginRevisions.has(req) && loginRevisions.get(req) !== (security?.revision ?? 0))
    throw new AuthenticationError(req.t)
  if (passwordProbes.has(req)) throw new PasswordConfirmed(user, security?.revision ?? 0)
  if (security?.emailTwoFactorEnabled && !resetOperations.has(req))
    throw new AuthenticationError(req.t)
  return user
}

export const securityBeforeOperation: CollectionBeforeOperationHook = async ({
  args,
  operation,
  req,
}) => {
  if (operation === 'resetPassword') {
    resetOperations.add(req)
    loginRevisions.delete(req)
  } else if (['login', 'create', 'update', 'refresh'].includes(operation))
    resetOperations.delete(req)

  // Payload merges the stored auth row into every update, not only credential
  // edits. Lock before that initial read so a profile write cannot restore an
  // old hash, SID list, or reset token from its document snapshot.
  if (operation === 'update' && 'id' in args && args.id) {
    await withAccountLock(req.payload, Number(args.id), async () => {}, req)
  } else if (operation === 'update' && 'where' in args && args.where) {
    const access = args.overrideAccess
      ? true
      : await req.payload.collections.users.config.access.update({ req })
    if (!access) throw new Forbidden(req.t)
    const authorizedWhere = access === true ? args.where : { and: [args.where, access] }
    const targets = await req.payload.find({
      collection: 'users',
      where: authorizedWhere,
      select: { email: true },
      pagination: false,
      limit: 0,
      depth: 0,
      req,
    })
    for (const target of targets.docs.sort((a, b) => a.id - b.id))
      await withAccountLock(req.payload, target.id, async () => {}, req)
    // Pin the selected IDs: a row that starts matching during the lock wait
    // must not enter the later bulk snapshot without a lock of its own.
    args = {
      ...args,
      where: { and: [authorizedWhere, { id: { in: targets.docs.map((doc) => doc.id) } }] },
    }
  }

  if (
    operation === 'login' ||
    operation === 'resetPassword' ||
    operation === 'refresh' ||
    operation === 'forgotPassword'
  ) {
    let userId = operation === 'refresh' ? req.user?.id : undefined
    const data = ('data' in args ? args.data : {}) as { email?: string; token?: string }
    if (!userId && (data.email || data.token)) {
      const result = await req.payload.find({
        collection: 'users',
        depth: 0,
        limit: 1,
        req,
        where:
          operation === 'resetPassword'
            ? { resetPasswordToken: { equals: data.token } }
            : { email: { equals: data.email?.trim().toLowerCase() } },
      })
      userId = result.docs[0]?.id
    }
    if (userId)
      await withAccountLock(
        req.payload,
        Number(userId),
        async (lockedReq) => {
          if (operation === 'login') {
            const security = await readAccountSecurity(req.payload, Number(userId), lockedReq)
            loginRevisions.set(req, security?.revision ?? 0)
          }
          if (operation === 'refresh') {
            const user = await req.payload.findByID({
              collection: 'users',
              id: userId!,
              depth: 0,
              req: lockedReq,
            })
            const sid = (req.user as User & { _sid?: string })._sid
            if (
              user.deletedAt ||
              !user.sessions?.some(
                (session) =>
                  session.id === sid && new Date(session.expiresAt).getTime() > Date.now(),
              )
            ) {
              throw new AuthenticationError(req.t)
            }
          }
        },
        req,
      )
  }
  return args
}

export async function securityAfterLogin({ user, req }: { user: User; req: PayloadRequest }) {
  if (resetOperations.has(req)) {
    resetOperations.delete(req)
    // Native reset signs its token before afterLogin. Revoke its SID in the
    // same transaction before commit: that token can never authenticate.
    const { revokeAllSessions } = await import('./auth')
    await revokeAllSessions(req.payload, user, req)
    const security = await ensureAccountSecurity(req.payload, user.id, req)
    await invalidateSecurityProofs(req.payload, security, {}, req)
  }
  return user
}

/** Reuses Payload's password/lock checks but aborts before signing a token. */
export async function probePassword(payload: Payload, email: string, password: string) {
  const req = await createLocalReq({}, payload)
  passwordProbes.add(req)
  try {
    const unexpected = await payload.login({ collection: 'users', data: { email, password }, req })
    const { revokeAllSessions } = await import('./auth')
    await revokeAllSessions(payload, unexpected.user as User, req)
    throw new Error('Password probe did not abort session issuance')
  } catch (error) {
    if (error instanceof PasswordConfirmed) {
      // beforeLogin receives the raw auth row, including its hash/salt. Re-read
      // through Payload's normal field sanitization before returning any user.
      const user = await payload.findByID({
        collection: 'users',
        id: error.user.id,
        depth: 0,
        showHiddenFields: false,
      })
      if (user.deletedAt) throw new AuthenticationError(req.t)
      passwordProofs.set(user, error.revision)
      return user
    }
    throw error
  } finally {
    passwordProbes.delete(req)
  }
}

/** Password probing rolls back Payload's reset; apply it only at final login. */
export async function resetAccountLoginAttempts(
  payload: Payload,
  userId: number,
  req: PayloadRequest,
) {
  const serverDoc = await payload.findByID({
    collection: 'users',
    id: userId,
    depth: 0,
    showHiddenFields: true,
    req,
  })
  await resetLoginAttempts({
    collection: payload.collections.users.config,
    doc: { ...serverDoc },
    payload,
    req,
  })
}

/** Serializes security changes and their nested Payload writes on one user row. */
export async function withAccountLock<T>(
  payload: Payload,
  userId: number,
  operation: (req: PayloadRequest) => Promise<T>,
  existingReq?: PayloadRequest,
): Promise<T> {
  const req = await createLocalReq({ req: existingReq }, payload)
  const ownsTransaction = await initTransaction(req)
  try {
    const transactionId = await req.transactionID
    if (!transactionId) throw new Error('Account security requires a database transaction')
    // Both application/test configs use PostgreSQL. Payload's generic adapter
    // erases the transaction database type at this boundary.
    const adapter = payload.db as unknown as PostgresAdapter
    await adapter.execute({
      db: adapter.sessions[transactionId].db,
      sql: sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`,
    })
    const result = await operation(req)
    if (ownsTransaction) await commitTransaction(req)
    return result
  } catch (error) {
    if (ownsTransaction) await killTransaction(req)
    throw error
  }
}

export async function readAccountSecurity(payload: Payload, userId: number, req?: PayloadRequest) {
  const result = await payload.find({
    collection: 'account-security',
    where: { user: { equals: userId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return result.docs[0]
}

export async function ensureAccountSecurity(payload: Payload, userId: number, req: PayloadRequest) {
  return (
    (await readAccountSecurity(payload, userId, req)) ??
    payload.create({
      collection: 'account-security',
      data: {
        user: userId,
        reauthenticatedSessions: {},
        emailTwoFactorEnabled: false,
        revision: 0,
        recoveryCodeHashes: [],
        assuredSessions: {},
      },
      req,
    })
  )
}

export async function invalidateSecurityProofs(
  payload: Payload,
  security: AccountSecurity,
  changes: Partial<Pick<AccountSecurity, 'emailTwoFactorEnabled' | 'recoveryCodeHashes'>>,
  req: PayloadRequest,
) {
  return payload.update({
    collection: 'account-security',
    id: security.id,
    data: {
      ...changes,
      revision: security.revision + 1,
      reauthenticatedSessions: {},
      assuredSessions: {},
    },
    req,
  })
}

export function allowSessionIssuance(req: PayloadRequest) {
  sessionIssuance.add(req)
}

export async function assertSessionIssuance(
  payload: Payload,
  user: User,
  req: PayloadRequest,
  passwordProof?: User,
) {
  if (user.deletedAt) throw new AuthenticationError(req.t)
  const security = await readAccountSecurity(payload, user.id, req)
  if (
    passwordProof &&
    passwordProofs.has(passwordProof) &&
    passwordProofs.get(passwordProof) !== (security?.revision ?? 0)
  )
    throw new AuthenticationError(req.t)
  if (security?.emailTwoFactorEnabled && !sessionIssuance.has(req))
    throw new AuthenticationError(req.t)
}

export async function recordSessionAssurance(
  payload: Payload,
  userId: number,
  sid: string,
  req: PayloadRequest,
) {
  const security = await readAccountSecurity(payload, userId, req)
  if (security?.emailTwoFactorEnabled) {
    await payload.update({
      collection: 'account-security',
      id: security.id,
      data: {
        assuredSessions: {
          ...(security.assuredSessions as Record<string, number>),
          [sid]: security.revision,
        },
      },
      req,
    })
  }
}

// Payload's JWT strategy reads the user before checking SID membership. Filter
// that list for enrolled accounts so native REST, GraphQL and CMS authentication
// all reject sessions lacking completed second-factor proof.
export async function filterAssuredSessions({ doc, req }: { doc: User; req: PayloadRequest }) {
  const security = await readAccountSecurity(req.payload, doc.id, req)
  if (security?.emailTwoFactorEnabled) {
    const assured = security.assuredSessions as Record<string, number>
    return {
      ...doc,
      sessions: (doc.sessions ?? []).filter((session) => assured[session.id] === security.revision),
    }
  }
  return doc
}

export function securityHash(payload: Payload, purpose: string, value: string) {
  return createHmac('sha256', payload.secret).update(`${purpose}:${value}`).digest('hex')
}

function matchesHash(payload: Payload, purpose: string, value: string, expected: string) {
  return timingSafeEqual(
    Buffer.from(securityHash(payload, purpose, value), 'hex'),
    Buffer.from(expected, 'hex'),
  )
}

export async function createSecurityChallenge(
  payload: Payload,
  user: User,
  purpose: AuthChallenge['purpose'],
  email: string,
) {
  const nonce = randomBytes(32).toString('hex')
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const challenge = await withAccountLock(payload, user.id, async (req) => {
    const security = await ensureAccountSecurity(payload, user.id, req)
    if (passwordProofs.has(user) && passwordProofs.get(user) !== security.revision)
      throw new AuthenticationError(req.t)
    if (purpose === 'enroll' && security.emailTwoFactorEnabled)
      throw new Error('المصادقة الثنائية مفعلة بالفعل')
    const recent = await payload.find({
      collection: 'auth-challenges',
      where: {
        and: [
          { user: { equals: user.id } },
          { purpose: { equals: purpose } },
          { createdAt: { greater_than: new Date(Date.now() - 60 * 60 * 1000).toISOString() } },
        ],
      },
      sort: '-createdAt',
      limit: 1,
      req,
    })
    if (
      recent.totalDocs >= 5 ||
      (recent.docs[0] && new Date(recent.docs[0].createdAt).getTime() > Date.now() - 60_000)
    ) {
      throw new Error('انتظر قليلاً قبل طلب رمز جديد')
    }
    // A resend replaces the old attempt, never leaves two valid codes.
    await payload.update({
      collection: 'auth-challenges',
      where: {
        and: [
          { user: { equals: user.id } },
          { purpose: { equals: purpose } },
          { consumedAt: { exists: false } },
        ],
      },
      data: { consumedAt: new Date().toISOString() },
      req,
    })
    return payload.create({
      collection: 'auth-challenges',
      data: {
        user: user.id,
        purpose,
        email,
        revision: security.revision,
        attempts: 0,
        sessionId: purpose === 'login' ? null : sessionId(user),
        nonceHash: securityHash(payload, 'nonce', nonce),
        codeHash: securityHash(payload, nonce, code),
        expiresAt: new Date(Date.now() + REAUTHENTICATION_MS).toISOString(),
      },
      req,
    })
  })
  let deliveryFailed = false
  try {
    await payload.sendEmail({
      to: email,
      subject: 'رمز تأكيد الهوية — مسجد الجامعة',
      html: `<div dir="rtl"><h2>تأكيد الهوية</h2><p>رمز التحقق صالح لخمس دقائق:</p><strong data-security-code>${code}</strong><p>لا تشارك هذا الرمز مع أي شخص.</p></div>`,
    })
  } catch {
    if (purpose === 'login' || purpose === 'reauth') deliveryFailed = true
    else {
      await payload.update({
        collection: 'auth-challenges',
        id: challenge.id,
        data: { consumedAt: new Date().toISOString() },
      })
      throw new Error('تعذر إرسال الرمز، حاول مرة أخرى')
    }
  }
  return {
    challenge: nonce,
    expiresAt: challenge.expiresAt,
    destination: email.replace(/^(.).+(@.+)$/, '$1***$2'),
    deliveryFailed,
  }
}

export async function consumeSecurityChallenge<T>(
  payload: Payload,
  nonce: string,
  code: string,
  purpose: AuthChallenge['purpose'],
  actor: User | undefined,
  verified: (
    user: User,
    security: AccountSecurity,
    req: PayloadRequest,
    challenge: AuthChallenge,
  ) => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  const invalid = { ok: false as const, error: 'الرمز غير صالح أو انتهت صلاحيته' }
  if (
    typeof nonce !== 'string' ||
    typeof code !== 'string' ||
    code.length > 64 ||
    !/^[a-f0-9]{64}$/.test(nonce)
  )
    return invalid
  const result = await payload.find({
    collection: 'auth-challenges',
    where: { nonceHash: { equals: securityHash(payload, 'nonce', nonce) } },
    limit: 1,
    depth: 0,
  })
  const candidate = result.docs[0]
  if (!candidate) return invalid
  const userId = Number(candidate.user)
  return withAccountLock(payload, userId, async (req) => {
    const challenge = await payload.findByID({
      collection: 'auth-challenges',
      id: candidate.id,
      depth: 0,
      req,
    })
    const user = await payload.findByID({ collection: 'users', id: userId, depth: 0, req })
    const security = await ensureAccountSecurity(payload, userId, req)
    if (
      challenge.purpose !== purpose ||
      challenge.consumedAt ||
      challenge.attempts >= 5 ||
      new Date(challenge.expiresAt).getTime() <= Date.now() ||
      challenge.revision !== security.revision ||
      user.deletedAt ||
      (purpose === 'enroll' && security.emailTwoFactorEnabled) ||
      (purpose !== 'login' &&
        (!actor ||
          actor.id !== userId ||
          challenge.sessionId !== sessionId(actor) ||
          !user.sessions?.some((session) => session.id === challenge.sessionId)))
    )
      return invalid
    const normalized = code.trim().replaceAll('-', '').toUpperCase()
    const recoveryHashes = security.recoveryCodeHashes as string[]
    const recoveryIndex =
      purpose === 'login' || purpose === 'reauth'
        ? recoveryHashes.findIndex((hash) =>
            matchesHash(payload, `recovery:${userId}`, normalized, hash),
          )
        : -1
    if (!matchesHash(payload, nonce, code.trim(), challenge.codeHash) && recoveryIndex < 0) {
      await payload.update({
        collection: 'auth-challenges',
        id: challenge.id,
        data: { attempts: challenge.attempts + 1 },
        req,
      })
      return invalid
    }
    await payload.update({
      collection: 'auth-challenges',
      id: challenge.id,
      data: { consumedAt: new Date().toISOString() },
      req,
    })
    if (recoveryIndex >= 0) {
      await payload.update({
        collection: 'account-security',
        id: security.id,
        data: {
          recoveryCodeHashes: recoveryHashes.filter((_, index) => index !== recoveryIndex),
        },
        req,
      })
    }
    await createLocalReq({ req, user: actor ?? user }, payload)
    return { ok: true as const, value: await verified(user, security, req, challenge) }
  })
}

export function generateRecoveryCodes(payload: Payload, userId: number) {
  const codes = Array.from({ length: 10 }, () =>
    randomBytes(8).toString('hex').toUpperCase().match(/.{4}/g)!.join('-'),
  )
  return {
    codes,
    hashes: codes.map((code) =>
      securityHash(payload, `recovery:${userId}`, code.replaceAll('-', '')),
    ),
  }
}

export function sessionId(user: User): string | undefined {
  return (user as User & { _sid?: string })._sid
}

export async function recentAuthenticationExpiry(
  payload: Payload,
  user: User,
  req?: PayloadRequest,
) {
  const sid = sessionId(user)
  if (!sid) return undefined
  const current = await payload.findByID({ collection: 'users', id: user.id, depth: 0, req })
  if (
    current.deletedAt ||
    !current.sessions?.some(
      (session) => session.id === sid && new Date(session.expiresAt).getTime() > Date.now(),
    )
  )
    return undefined
  const security = await readAccountSecurity(payload, user.id, req)
  const proofs = security?.reauthenticatedSessions as Record<string, string> | undefined
  const expiresAt = proofs?.[sid]
  return expiresAt && new Date(expiresAt).getTime() > Date.now() ? expiresAt : undefined
}

export async function hasRecentAuthentication(payload: Payload, user: User, req?: PayloadRequest) {
  return Boolean(await recentAuthenticationExpiry(payload, user, req))
}

export async function requireRecentAuthentication(
  payload: Payload,
  user: User,
  req?: PayloadRequest,
) {
  if (!(await hasRecentAuthentication(payload, user, req))) {
    throw new Error('أعد تأكيد هويتك قبل تغيير إعدادات الحماية')
  }
}

export async function securityBeforeValidate({
  data,
  originalDoc,
  operation,
  req,
}: {
  data?: Partial<User> & { password?: string }
  originalDoc?: User
  operation: 'create' | 'update'
  req: PayloadRequest
}) {
  if (
    operation === 'update' &&
    req.user &&
    !resetOperations.has(req) &&
    data?.email &&
    data.email !== originalDoc?.email &&
    !isPrimaryEmailChangeAllowed(req)
  ) {
    throw new Error('وثّق البريد ثم عيّنه رئيسياً من إعدادات الحماية')
  }
  if (
    operation === 'update' &&
    req.user?.role === 'admin' &&
    !resetOperations.has(req) &&
    (data?.password || (data?.email && data.email !== originalDoc?.email))
  ) {
    await requireRecentAuthentication(req.payload, req.user as User, req)
  }
  if (operation === 'update' && originalDoc && data?.password) passwordChanges.add(data)
  return data
}

export async function securityAfterUserChange({
  data,
  doc,
  previousDoc,
  operation,
  req,
}: {
  data: Partial<User>
  doc: User
  previousDoc?: User
  operation: 'create' | 'update'
  req: PayloadRequest
}) {
  const passwordChanged = passwordChanges.delete(data)
  if (
    operation === 'update' &&
    previousDoc &&
    (passwordChanged ||
      doc.email !== previousDoc.email ||
      doc.role !== previousDoc.role ||
      doc.deletedAt !== previousDoc.deletedAt)
  ) {
    const { revokeAllSessions } = await import('./auth')
    await revokeAllSessions(req.payload, doc, req)
    await req.payload.db.updateOne({
      collection: 'users',
      id: doc.id,
      data: { resetPasswordToken: null, resetPasswordExpiration: null },
      req,
      returning: false,
    })
    const security = await ensureAccountSecurity(req.payload, doc.id, req)
    await invalidateSecurityProofs(req.payload, security, {}, req)
    return { ...doc, sessions: [] }
  }
  return doc
}

export async function recordReauthentication(
  payload: Payload,
  user: User,
  existingReq?: PayloadRequest,
  preservedExpiry?: string,
) {
  const sid = sessionId(user)
  if (!sid) throw new Error('لا توجد جلسة نشطة')
  return withAccountLock(
    payload,
    user.id,
    async (req) => {
      const fresh = await payload.findByID({ collection: 'users', id: user.id, depth: 0, req })
      if (!fresh.sessions?.some((session) => session.id === sid)) throw new Error('انتهت الجلسة')
      const security = await ensureAccountSecurity(payload, user.id, req)
      const expiresAt = preservedExpiry ?? new Date(Date.now() + REAUTHENTICATION_MS).toISOString()
      if (new Date(expiresAt).getTime() <= Date.now()) throw new Error('أعد تأكيد هويتك')
      const data = {
        reauthenticatedSessions: {
          ...(security.reauthenticatedSessions as Record<string, string>),
          [sid]: expiresAt,
        },
      }
      await payload.update({ collection: 'account-security', id: security.id, data, req })
      return expiresAt
    },
    existingReq,
  )
}

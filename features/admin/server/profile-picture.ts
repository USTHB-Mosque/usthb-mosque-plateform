'use server'

import sharp from 'sharp'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { getPayloadWithUser } from '@/shared/lib/auth'
import { withAccountLock } from '@/shared/lib/account-security'
import { deleteUnusedOwnedPicture } from '@/shared/lib/profile-picture'
import { resolveRelationId } from '@/shared/lib/relations'
import { securityAudit } from './security-audit'

export async function updateAdminProfilePicture(data: FormData) {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  const file = data.get('picture')
  if (
    !file ||
    typeof file === 'string' ||
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
    file.size === 0 ||
    file.size > 5 * 1024 * 1024
  ) {
    return { ok: false as const, error: 'اختر صورة PNG أو JPEG أو WebP لا تتجاوز 5 ميغابايت' }
  }
  let bytes: Buffer
  try {
    bytes = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 20_000_000 })
      .rotate()
      .resize(512, 512, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()
  } catch {
    return { ok: false as const, error: 'ملف الصورة غير صالح' }
  }
  const upload = await ctx.payload.create({
    collection: 'media',
    req: ctx.req,
    overrideAccess: false,
    data: { alt: 'الصورة الشخصية', owner: ctx.user.id, isPrivate: false },
    file: {
      data: bytes,
      name: `profile-${randomUUID()}.webp`,
      mimetype: 'image/webp',
      size: bytes.length,
    },
  })
  let previous: number | null
  try {
    previous = await withAccountLock(
      ctx.payload,
      ctx.user.id,
      async (req) => {
        const user = await ctx.payload.findByID({
          collection: 'users',
          id: ctx.user.id,
          depth: 0,
          req,
        })
        await ctx.payload.update({
          collection: 'users',
          id: user.id,
          data: { profilePicture: upload.id },
          req,
          overrideAccess: false,
        })
        await securityAudit(
          ctx.payload,
          ctx.user,
          'profile_picture_updated',
          'حدّث الصورة الشخصية لحسابه',
          req,
        )
        return user.profilePicture ? Number(resolveRelationId(user.profilePicture)) : null
      },
      ctx.req,
    )
  } catch {
    await ctx.payload.delete({ collection: 'media', id: upload.id })
    return { ok: false as const, error: 'تعذر حفظ الصورة الشخصية' }
  }
  await deleteUnusedOwnedPicture(ctx.payload, ctx.user.id, previous)
  revalidatePath('/admin-panel', 'layout')
  return { ok: true as const }
}

export async function removeAdminProfilePicture() {
  const ctx = await getPayloadWithUser({ acceptRoles: ['admin'] })
  if (!ctx) return { ok: false as const, error: 'غير مصرح' }
  const previous = await withAccountLock(
    ctx.payload,
    ctx.user.id,
    async (req) => {
      const user = await ctx.payload.findByID({
        collection: 'users',
        id: ctx.user.id,
        depth: 0,
        req,
      })
      await ctx.payload.update({
        collection: 'users',
        id: user.id,
        data: { profilePicture: null },
        req,
        overrideAccess: false,
      })
      await securityAudit(
        ctx.payload,
        ctx.user,
        'profile_picture_removed',
        'أزال الصورة الشخصية لحسابه',
        req,
      )
      return user.profilePicture ? Number(resolveRelationId(user.profilePicture)) : null
    },
    ctx.req,
  )
  await deleteUnusedOwnedPicture(ctx.payload, ctx.user.id, previous)
  revalidatePath('/admin-panel', 'layout')
  return { ok: true as const }
}

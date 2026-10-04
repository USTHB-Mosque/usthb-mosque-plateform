import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/payload-types'
import { resolveRelationId } from './relations'

export async function validateProfilePicture({
  data,
  originalDoc,
  operation,
  req,
}: {
  data?: Partial<User>
  originalDoc?: User
  operation: 'create' | 'update'
  req: PayloadRequest
}) {
  if (!data?.profilePicture || (!req.user && req.payloadAPI === 'local')) return data
  if (operation === 'create') throw new Error('احفظ الحساب قبل إضافة الصورة الشخصية')
  // Native password reset invokes validation without originalDoc; it does not
  // change the upload relationship. Ordinary updates always supply originalDoc.
  if (!originalDoc || data.profilePicture === originalDoc.profilePicture) return data
  const media = await req.payload.findByID({
    collection: 'media',
    id: Number(resolveRelationId(data.profilePicture)),
    depth: 0,
    req,
  })
  if (
    media.isPrivate ||
    Number(resolveRelationId(media.owner)) !== originalDoc.id ||
    !['image/png', 'image/jpeg', 'image/webp'].includes(media.mimeType ?? '')
  ) {
    throw new Error('استخدم صورة شخصية يملكها هذا الحساب')
  }
  return data
}

/** Never erase another account's upload or a picture still used elsewhere. */
export async function deleteUnusedOwnedPicture(
  payload: Payload,
  userId: number,
  id?: number | null,
  req?: PayloadRequest,
) {
  if (!id) return
  const media = await payload.findByID({ collection: 'media', id, depth: 0, req })
  if (Number(resolveRelationId(media.owner)) !== userId || media.isPrivate) return
  const references = await Promise.all([
    payload.count({
      collection: 'users',
      where: { or: [{ profilePicture: { equals: id } }, { verificationDocument: { equals: id } }] },
      req,
    }),
    payload.count({
      collection: 'books',
      where: { or: [{ image: { equals: id } }, { 'gallery.image': { equals: id } }] },
      req,
    }),
    payload.count({ collection: 'articles', where: { image: { equals: id } }, req }),
    payload.count({ collection: 'activities', where: { image: { equals: id } }, req }),
  ])
  if (references.every((result) => result.totalDocs === 0))
    await payload.delete({ collection: 'media', id, req })
}

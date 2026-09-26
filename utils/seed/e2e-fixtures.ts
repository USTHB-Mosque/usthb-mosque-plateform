import type { Payload } from 'payload'

import { addDays } from '@/shared/lib/dates'
import { E2E_GOOGLE_EMAIL, E2E_MEMBER_EMAIL } from '@/e2e/lib/test-users'

// Deterministic fixtures for the flows milestone (#138). The lean e2e seed
// truncates and rebuilds, so ids restart at 1 every run; lookups here go by
// email/title, never by hard-coded id. Local API calls without `user` are an
// intentional bypass (AGENTS.md).

const ISO_DATE = (date: Date) => date.toISOString().split('T')[0]

/** Lookups go by email/title — ids restart at 1 every truncate+seed run. */
async function findUser(payload: Payload, email: string): Promise<number> {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })
  if (!docs[0]) throw new Error(`E2e seed: user not found: ${email}`)
  return docs[0].id
}

async function findBook(payload: Payload, title: string): Promise<number> {
  const { docs } = await payload.find({
    collection: 'books',
    where: { title: { equals: title } },
    limit: 1,
  })
  if (!docs[0]) throw new Error(`E2e seed: book not found: ${title}`)
  return docs[0].id
}

/** The five loan lifecycle states, in the order the my-loans page shows them. */
async function seedE2eLoans(payload: Payload): Promise<void> {
  const member1 = await findUser(payload, E2E_MEMBER_EMAIL)
  const member2 = await findUser(payload, E2E_GOOGLE_EMAIL)

  const sahihBukhari = await findBook(payload, 'صحيح البخاري')
  const sahihMuslim = await findBook(payload, 'صحيح مسلم')
  const riyad = await findBook(payload, 'رياض الصالحين')
  const wasitiyya = await findBook(payload, 'العقيدة الواسطية')
  const zadAlMaad = await findBook(payload, 'زاد المعاد في هدي خير العباد')

  const now = new Date()
  const loans: {
    book: number
    user: number
    status: 'pending' | 'accepted' | 'picked_up' | 'returned' | 'refused'
    loanDate: Date
    pickupCode?: string
    pickupDate?: Date
    pickupHour?: string
    dueDate?: Date
    returnDate?: Date
    refusalReason?: string
  }[] = [
    {
      // Active hold with a stamped due date → "تم الأخذ" badge.
      book: sahihBukhari,
      user: member1,
      status: 'picked_up',
      loanDate: addDays(now, -10),
      pickupCode: 'مك-01/9001/26',
      pickupDate: addDays(now, -10),
      pickupHour: '11:00',
      dueDate: addDays(now, 4),
    },
    {
      // Accepted request waiting for pickup → "مقبول" badge.
      book: sahihMuslim,
      user: member1,
      status: 'accepted',
      loanDate: addDays(now, -1),
      pickupCode: 'مك-02/9002/26',
      pickupDate: addDays(now, 2),
      pickupHour: '13:00',
    },
    {
      // Fresh request → "قيد الانتظار" badge.
      book: riyad,
      user: member1,
      status: 'pending',
      loanDate: now,
    },
    {
      // Finished history → "تم الإرجاع" badge, on the past tab.
      book: wasitiyya,
      user: member1,
      status: 'returned',
      loanDate: addDays(now, -30),
      pickupCode: 'مك-04/9004/26',
      pickupDate: addDays(now, -28),
      pickupHour: '11:00',
      dueDate: addDays(now, -14),
      returnDate: addDays(now, -5),
    },
    {
      // Refusal variety for the admin loans table.
      book: zadAlMaad,
      user: member2,
      status: 'refused',
      loanDate: addDays(now, -5),
      refusalReason: 'لا تتوفر نسخ إضافية لهذا الكتاب حالياً',
    },
  ]

  for (const loan of loans) {
    await payload.create({
      collection: 'loans',
      data: {
        book: loan.book,
        user: loan.user,
        status: loan.status,
        loanDate: ISO_DATE(loan.loanDate),
        ...(loan.pickupCode ? { pickupCode: loan.pickupCode } : {}),
        ...(loan.pickupDate ? { pickupDate: ISO_DATE(loan.pickupDate) } : {}),
        ...(loan.pickupHour ? { pickupHour: loan.pickupHour } : {}),
        ...(loan.dueDate ? { dueDate: ISO_DATE(loan.dueDate) } : {}),
        ...(loan.returnDate ? { returnDate: ISO_DATE(loan.returnDate) } : {}),
        ...(loan.refusalReason ? { refusalReason: loan.refusalReason } : {}),
      },
    })
  }

  console.log(`Created ${loans.length} deterministic e2e loans`)
}

/**
 * A full-but-open activity: registration stays open so the "سجل الآن" button
 * is clickable, while the server rejects it at the capacity gate. The shared
 * seed's full activity is registration-closed instead, which exercises the
 * disabled path only.
 */
async function seedFullE2eActivity(payload: Payload): Promise<void> {
  const { docs: medias } = await payload.find({ collection: 'media', limit: 1 })

  await payload.create({
    collection: 'activities',
    data: {
      title: 'نشاط e2e ممتلئ',
      type: 'other',
      image: medias[0]?.id,
      shortDescription: 'نشاط اختبار ممتلئ مصمم لرفض التسجيل عند بلوغ الحد الأقصى.',
      longDescription: {
        root: {
          type: 'root',
          format: 'right',
          indent: 0,
          version: 1,
          direction: 'rtl',
          children: [
            {
              type: 'paragraph',
              format: 'right',
              indent: 0,
              version: 1,
              children: [
                {
                  text: 'نشاط إلكتروني لاختبار مسار الامتلاء في تسجيل الأنشطة.',
                  type: 'text',
                  version: 1,
                },
              ],
            },
          ],
        },
      },
      benefits: [{ name: 'التحقق من رفض التسجيل عند الامتلاء' }],
      targetAudience: [{ name: 'طلاب الاختبارات' }],
      location: 'قاعة الاختبارات',
      supervisor: 'فريق الاختبار',
      schedules: [{ dateAndTime: addDays(new Date(), 3).toISOString() }],
      openForRegistration: true,
      registrationDeadline: addDays(new Date(), 2).toISOString(),
      startDate: addDays(new Date(), 3).toISOString(),
      maxParticipants: 3,
      currentParticipants: 3,
    },
  })

  console.log('Created the full-but-open e2e activity')
}

/** The bookmarks page shows article favorites; the detail page has no toggle
 * wired yet, so the member journey exercises the seeded favorite + removal. */
async function seedE2eArticleFavorite(payload: Payload): Promise<void> {
  const memberId = await findUser(payload, E2E_MEMBER_EMAIL)
  const { docs: articles } = await payload.find({
    collection: 'articles',
    where: { title: { equals: 'فضائل المسجد وأثره في حياة الطالب' } },
    limit: 1,
  })
  if (!articles[0]) {
    throw new Error('E2e seed: article for the article favorite not found')
  }

  // Created *as the member*: the collection's dup-check hook runs its guard
  // find with overrideAccess: false, so the operation needs a signed-in req —
  // and the hook then stamps data.user from that req itself.
  const member = { id: memberId } as Parameters<typeof payload.create>[0]['user']
  await payload.create({
    collection: 'article-favorites',
    data: { user: memberId, article: articles[0].id },
    draft: false,
    user: member,
    overrideAccess: false,
  })

  console.log('Created the seeded article favorite')
}

export async function seedE2eFixtures(payload: Payload): Promise<void> {
  await seedE2eLoans(payload)
  await seedFullE2eActivity(payload)
  await seedE2eArticleFavorite(payload)
}

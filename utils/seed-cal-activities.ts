import { getPayload } from 'payload'
import config from '@payload-config'

function hijriToGregorian(hYear: number, hMonth: number, hDay: number): Date {
  const m = hMonth + 1
  const jd =
    Math.floor((11 * hYear + 3) / 30) +
    354 * hYear +
    30 * m -
    Math.floor((m - 1) / 2) +
    hDay +
    1948440 -
    385
  const l = jd + 68569
  const n = Math.floor((4 * l) / 146097)
  const l2 = l - Math.floor((146097 * n + 3) / 4)
  const i = Math.floor((4000 * (l2 + 1)) / 1461001)
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31
  const j = Math.floor((80 * l3) / 2447)
  const day = l3 - Math.floor((2447 * j) / 80)
  const l4 = Math.floor(j / 11)
  const month = j + 2 - 12 * l4
  const year = 100 * (n - 49) + i + l4
  return new Date(year, month - 1, day)
}

const activityData = [
  { title: 'حلقة تفسير سورة البقرة', type: 'tafsir' as const, location: 'المسجد الأكبر', day: 3 },
  { title: 'دورة في الفقه الشرعي', type: 'fiqh' as const, location: 'قاعة المؤتمرات', day: 6 },
  {
    title: 'ملتقى العقيدة الإسلامية',
    type: 'aqidah' as const,
    location: 'المكتبة المركزية',
    day: 9,
  },
  { title: 'ورشة لغة عربية للمبتدئين', type: 'language' as const, location: 'غرفة 201', day: 11 },
  {
    title: 'حلقة قراءة الحديث الشريف',
    type: 'hadith' as const,
    location: 'المسجد الأكبر',
    day: 13,
  },
  {
    title: 'محاضرة في السيرة النبوية',
    type: 'sirah' as const,
    location: 'قاعة المحاضرات',
    day: 16,
  },
  { title: 'دورة تجويد القرآن الكريم', type: 'other' as const, location: 'غرفة التلاوة', day: 19 },
  { title: 'ورشة الخط العربي', type: 'other' as const, location: 'غرفة 105', day: 22 },
  { title: 'حلقة علم الأصول', type: 'fiqh' as const, location: 'المكتبة المركزية', day: 25 },
  { title: 'مؤتمر الدعوة الإسلامية', type: 'aqidah' as const, location: 'قاعة المؤتمرات', day: 28 },
]

async function seed() {
  const payload = await getPayload({ config })

  // Delete old seeded registrations first, then activities
  const oldRegistrations = await payload.find({ collection: 'activity-registrations', limit: 100 })
  for (const reg of oldRegistrations.docs) {
    await payload.delete({ collection: 'activity-registrations', id: reg.id })
  }
  console.log(`Deleted ${oldRegistrations.docs.length} old registrations`)

  const oldActivities = await payload.find({ collection: 'activities', limit: 100 })
  for (const act of oldActivities.docs) {
    await payload.delete({ collection: 'activities', id: act.id })
  }
  console.log(`Deleted ${oldActivities.docs.length} old activities`)

  const medias = await payload.find({ collection: 'media', limit: 5 })
  const mediaIds = medias.docs.map((m) => m.id)

  for (const act of activityData) {
    const gregDate = hijriToGregorian(1448, 3, act.day)
    const dateStr = gregDate.toISOString()
    const deadline = new Date(gregDate)
    deadline.setDate(deadline.getDate() - 3)

    await payload.create({
      collection: 'activities',
      data: {
        title: act.title,
        type: act.type,
        image: mediaIds[Math.floor(Math.random() * mediaIds.length)] || mediaIds[0],
        shortDescription: `${act.title} - ${act.location}`,
        longDescription: {
          root: {
            type: 'root',
            children: [
              { type: 'text', version: 1, text: act.title, format: 0, style: '', indent: 0 },
            ],
            direction: 'rtl',
            format: '',
            indent: 0,
            version: 1,
          },
        } as any,
        benefits: [{ name: 'enefit 1' }],
        targetAudience: [{ name: 'All' }],
        location: act.location,
        supervisor: 'الشيخ محمد',
        schedules: [{ dateAndTime: dateStr }],
        openForRegistration: true,
        registrationDeadline: deadline.toISOString(),
        startDate: dateStr,
        maxParticipants: 50,
        currentParticipants: Math.floor(Math.random() * 30),
      },
    })
    console.log(`Created: ${act.title} on hijri day ${act.day} (${dateStr.split('T')[0]})`)
  }

  process.exit(0)
}

seed()

import { getPayload } from 'payload'
import config from '@payload-config'

function hijriToGregorian(hYear: number, hMonth: number, hDay: number): Date {
  const m = hMonth + 1
  const jd = Math.floor((11 * hYear + 3) / 30) + 354 * hYear + 30 * m - Math.floor((m - 1) / 2) + hDay + 1948440 - 385
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

function p(text: string) {
  return {
    type: 'paragraph' as const,
    children: [{ type: 'text' as const, version: 1, text, format: 0, style: '', indent: 0 }],
    version: 1,
    direction: 'rtl' as const,
    format: '',
    indent: 0,
  }
}

function h(text: string) {
  return {
    type: 'heading' as const,
    children: [{ type: 'text' as const, version: 1, text, format: 0, style: '', indent: 0 }],
    version: 1,
    tag: 'h2' as const,
    direction: 'rtl' as const,
    format: '',
    indent: 0,
  }
}

function richText(blocks: ReturnType<typeof p | typeof h>[]) {
  return {
    root: {
      type: 'root',
      children: blocks,
      direction: 'rtl',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

const activityData = [
  {
    title: 'حلقة تفسير سورة البقرة',
    type: 'tafsir' as const,
    location: 'المسجد الأكبر',
    day: 3,
    longDescription: richText([
      h('نظرة عامة'),
      p('تعتبر سورة البقرة من أعظم سور القرآن الكريم، وهي أطول سور القرآن. تتضمن هذه الحلقة تفسيراً مفصلاً لأياتها الكريمة، مع تسليط الضوء على الدروس والحكم المستفادة منها في حياة المسلم.'),
      h('أهداف الدورة'),
      p('فهم معاني الآيات الكريمة وتفسيرها الصحيح. الإلمام بالدروس المستفادة من السورة. ربط التفسير بحياة المسلم اليومية. تعلم أصول التفسير بالمأثور.'),
      h('محتويات الحلقة'),
      p('تمتد الحلقة على مدار ثلاثة أشهر، وتتناول تفسير السورة كاملاً آية آية. تتضمن الحلقة جلسة أسئلة وأجوبة في نهاية كل لقاء، بالإضافة إلى مراجعة دورية للمحتوى السابق.'),
    ]),
  },
  {
    title: 'دورة في الفقه الشرعي',
    type: 'fiqh' as const,
    location: 'قاعة المؤتمرات',
    day: 6,
    longDescription: richText([
      h('نظرة عامة'),
      p('دورة شاملة في الفقه الشرعي تغطي أهم المسائل الفقهية التي يحتاجها المسلم في حياته اليومية. تبدأ الدورة بأصول الفقه ثم تنتقل إلى تطبيقات عملية في العبادات والمعاملات.'),
      h('محاور الدورة'),
      p('الأبواب الفقهية من العبادات. المعاملات المالية. الأحوال الشخصية. القضاء والشهادات.'),
    ]),
  },
  {
    title: 'ملتقى العقيدة الإسلامية',
    type: 'aqidah' as const,
    location: 'المكتبة المركزية',
    day: 9,
    longDescription: richText([
      h('نظرة عامة'),
      p('ملتقى ثقافي ديني يهدف إلى تعزيز المعتقدات الإسلامية الصحيحة ودحض المفاهيم المغلوطة. يتناول الملتقى أصول العقيدة الإسلامية وأركان الإيمان بالاستدلال من النصوص الشرعية.'),
    ]),
  },
  {
    title: 'ورشة لغة عربية للمبتدئين',
    type: 'language' as const,
    location: 'غرفة 201',
    day: 11,
    longDescription: richText([
      h('نظرة عامة'),
      p('ورشة عملية لتعلم اللغة العربية من الصفر. تشمل الورشة تعلم الحروف العربية والنطق الصحيح والقواعد الأساسية اللغوية. مناسبة للمبتدئين الذين يرغبون في تعلم قراءة القرآن الكريم والحديث النبوي.'),
    ]),
  },
  {
    title: 'حلقة قراءة الحديث الشريف',
    type: 'hadith' as const,
    location: 'المسجد الأكبر',
    day: 13,
    longDescription: richText([
      h('نظرة عامة'),
      p('حلقة يومية لقراءة ودراسة أحاديث الرسول صلى الله عليه وسلم. تتناول الحلقة أحاديث نبوية شريفة من صحيح البخاري ومسلم مع شرح مبسط لكل حديث وبيان فوائده ودروسه المستفادة.'),
    ]),
  },
  {
    title: 'محاضرة في السيرة النبوية',
    type: 'sirah' as const,
    location: 'قاعة المحاضرات',
    day: 16,
    longDescription: richText([
      h('نظرة عامة'),
      p('محاضرة تفاعلية تستعرض أهم المحطات في حياة النبي صلى الله عليه وسلم. تتناول المحاضرة طفولة الرسول ونبوئته والهجرة وحياة المسلمين الأولى في المدينة المنورة.'),
    ]),
  },
  {
    title: 'دورة تجويد القرآن الكريم',
    type: 'other' as const,
    location: 'غرفة التلاوة',
    day: 19,
    longDescription: richText([
      h('نظرة عامة'),
      p('دورة متخصصة في أحكام التجويد من базيات إلى متقدم. تشمل الدورة تعليم التجويد العملي مع التدريب على التلاوة الصحيحة وتطبيق قواعد التجويد على أجزاء من القرآن الكريم.'),
    ]),
  },
  {
    title: 'ورشة الخط العربي',
    type: 'other' as const,
    location: 'غرفة 105',
    day: 22,
    longDescription: richText([
      h('نظرة عامة'),
      p('ورشة عملية لتعلم فن الخط العربي. تشمل الورشة تعلم خط النسخ وخط الثلث مع التدريب على كتابة الحروف والكلمات بشكل صحيح. يحصل المشاركون على شهادة مشاركة في نهاية الدورة.'),
    ]),
  },
  {
    title: 'حلقة علم الأصول',
    type: 'fiqh' as const,
    location: 'المكتبة المركزية',
    day: 25,
    longDescription: richText([
      h('نظرة عامة'),
      p('حلقة متقدمة في علم أصول الفقه تتناول مناهج الاستنباط وأصول الاستدلال. تشمل الحلقة دراسة مختصرة في قواعد التأويل وأصول الاستدلال الفقهي.'),
    ]),
  },
  {
    title: 'مؤتمر الدعوة الإسلامية',
    type: 'aqidah' as const,
    location: 'قاعة المؤتمرات',
    day: 28,
    longDescription: richText([
      h('نظرة عامة'),
      p('مؤتمر سنوي يجمع العلماء والدعاة لمناقشة أبرز القضايا المعاصرة التي تواجه الأمة الإسلامية. يتناول المؤتمر أساليب الدعوة الحديثة والتحديات والحلول العملية.'),
    ]),
  },
]

async function seed() {
  const payload = await getPayload({ config })

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
  const mediaIds = medias.docs.map(m => m.id)

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
        shortDescription: act.title,
        longDescription: act.longDescription as any,
        benefits: [],
        targetAudience: [],
        location: act.location,
        supervisor: 'الشيخ محمد بن صالح العثيمين',
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

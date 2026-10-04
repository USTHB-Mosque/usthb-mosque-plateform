import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Activity } from '@/payload-types'

const p = (text: string) => ({
  type: 'paragraph' as const,
  format: 'right' as const,
  indent: 0,
  version: 1,
  children: [{ text, type: 'text' as const, version: 1 }],
})

const h = (text: string, tag: 'h2' | 'h3') => ({
  type: 'heading' as const,
  tag,
  format: 'right' as const,
  indent: 0,
  version: 1,
  children: [{ text, type: 'text' as const, version: 1 }],
})

const ul = (items: string[]) => ({
  type: 'list' as const,
  listType: 'bullet' as const,
  tag: 'ul' as const,
  format: 'right' as const,
  indent: 0,
  version: 1,
  children: items.map((item, i) => ({
    type: 'listitem' as const,
    value: i + 1,
    version: 1,
    children: [{ text: item, type: 'text' as const, version: 1 }],
  })),
})

const quote = (text: string) => ({
  type: 'quote' as const,
  format: 'right' as const,
  indent: 0,
  version: 1,
  children: [{ text, type: 'text' as const, version: 1 }],
})

function richText(nodes: ReturnType<typeof p | typeof h | typeof ul | typeof quote>[]) {
  return {
    root: {
      type: 'root' as const,
      format: 'right' as const,
      indent: 0,
      version: 1,
      direction: 'rtl' as const,
      children: nodes,
    },
  }
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function dateTimeFromNow(days: number, hours: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hours, 0, 0, 0)
  return d.toISOString()
}

const activitiesData = [
  {
    title: 'حلقات تحفيظ القرآن الكريم',
    type: 'tafsir' as Activity['type'],
    shortDescription:
      'حلقات أسبوعية لتحفيظ القرآن الكريم بمسجد الجامعة، مفتوحة لجميع المستويات مع مراجعة مستمرة.',
    longDescription: richText([
      h('عن الحلقة', 'h2'),
      p(
        'تُقام حلقات تحفيظ القرآن الكريم أسبوعياً في مسجد الجامعة، وتهدف إلى مساعدة الطلاب على حفظ القرآن الكريم وتثبيته في الذاكرة. تُفتح الحلقات لجميع الطلاب بغض النظر عن مستواهم.',
      ),
      p(
        'تبدأ الحلقة بمراجعة ما حُفظ من قبل، ثم التلامس على الآيات الجديدة مع شرح المعاني والتجويد.',
      ),
      h('الفوائد', 'h2'),
      ul([
        'حفظ القرآن الكريم بشكل منتظم',
        'تثبيت المحفوظات من خلال المراجعة المستمرة',
        'فهم معاني الآيات والتفسير',
        'تنمية الروابط الإيمانية بين الطلاب',
      ]),
      quote('خيركم من تعلّم القرآن وعلّمه — البخاري'),
    ]),
    benefits: [
      { name: 'حفظ القرآن الكريم' },
      { name: 'تنمية التلاوة الصحيحة' },
      { name: 'فهم المعاني والتفسير' },
      { name: 'تكثيف الروابط الإيمانية' },
    ],
    targetAudience: [{ name: 'جميع طلاب الجامعة' }, { name: 'من يريد تعلم القرآن' }],
    location: 'مسجد الجامعة — القاعة الكبرى',
    supervisor: 'الشيخ عبد الرحمن السعدي',
    schedules: [
      { dateAndTime: dateTimeFromNow(7, 14) },
      { dateAndTime: dateTimeFromNow(14, 14) },
      { dateAndTime: dateTimeFromNow(21, 14) },
      { dateAndTime: dateTimeFromNow(28, 14) },
    ],
    openForRegistration: true,
    registrationDeadline: daysFromNow(5),
    startDate: daysFromNow(7),
    maxParticipants: 30,
    currentParticipants: 18,
  },
  {
    title: 'دورة في أصول الفقه الإسلامي',
    type: 'fiqh' as Activity['type'],
    shortDescription:
      'دورة مكثفة في أصول الفقه الإسلامي تشمل القواعد الأصولية والاستنباط والمنهج العلمي.',
    longDescription: richText([
      h('محتوى الدورة', 'h2'),
      p(
        'تتناول هذه الدورة أهم أصول الفقه الإسلامي من مصادر التشريع، وقواعد الاستنباط، والمقاصد. الهدف هو تمكين الطلاب من فهم أصول الحكم الشرعي.',
      ),
      h('المحاضرات', 'h2'),
      ul([
        'مقدمة في أصول الفقه ومصادر التشريع',
        'الكتاب والسنة كمصدرين أساسيين',
        'الإجماع والقياس',
        'قواعد الاستحسان والمصالح المرسلة',
        'الترجيح بين الأدلة المتعارضة',
      ]),
      p('تنتهي الدورة بامتحان تطبيقي على دراسات حالة.'),
    ]),
    benefits: [
      { name: 'فهم أصول الاستنباط الفقهي' },
      { name: 'تمييز الأدلة الشرعية' },
      { name: 'تطبيق القواعد الأصولية على الواقع' },
      { name: 'تطوير مهارات التفكير النقدي' },
    ],
    targetAudience: [
      { name: 'طلاب كلية الشريعة' },
      { name: 'طلاب العلوم الإسلامية' },
      { name: 'من يريد تعميق معرفته بالفقه' },
    ],
    location: 'قاعة المحاضرات — المبنى الرئيسي',
    supervisor: 'الشيخ محمد بن صالح العثيمين',
    schedules: [
      { dateAndTime: dateTimeFromNow(3, 10) },
      { dateAndTime: dateTimeFromNow(10, 10) },
      { dateAndTime: dateTimeFromNow(17, 10) },
      { dateAndTime: dateTimeFromNow(24, 10) },
      { dateAndTime: dateTimeFromNow(31, 10) },
    ],
    openForRegistration: true,
    registrationDeadline: daysFromNow(2),
    startDate: daysFromNow(3),
    maxParticipants: 40,
    currentParticipants: 25,
  },
  {
    title: 'حلقة دراسة السيرة النبوية',
    type: 'sirah' as Activity['type'],
    shortDescription:
      'حلقة شهرية لدراسة السيرة النبوية الشريفة مع التركيز على الدروس والعبر المستفادة.',
    longDescription: richText([
      h('أهداف الحلقة', 'h2'),
      p(
        'تهدف هذه الحلقة إلى تعريف الطلاب بالسيرة النبوية الشريفة من مولده عليه السلام إلى وفاته، مع استخراج الدروس والعبر العملية.',
      ),
      p('يتمركز النقاش حول أحداث محددة في السيرة النبوية وتطبيقاتها على الحياة المعاصرة.'),
      ul([
        'الطفولة والنشأة في مكة',
        'البعثة والوحي الأول',
        'الهجرة إلى المدينة المنورة',
        'الأحداث الكبرى في العهد المدني',
        'صفاته عليه السلام وأخلاقه',
      ]),
    ]),
    benefits: [
      { name: 'معرفة السيرة النبوية بشكل شامل' },
      { name: 'استخلاص الدروس العملية' },
      { name: 'التأمل في العصر النبوي' },
      { name: 'تعزيز الهوية الإسلامية' },
    ],
    targetAudience: [{ name: 'جميع طلاب الجامعة' }, { name: 'من يريد تعلم السيرة' }],
    location: 'مسجد الجامعة — صالة الاجتماعات',
    supervisor: 'الشيخ عبد العزيز بن باز',
    schedules: [{ dateAndTime: dateTimeFromNow(10, 16) }, { dateAndTime: dateTimeFromNow(40, 16) }],
    openForRegistration: true,
    registrationDeadline: daysFromNow(8),
    startDate: daysFromNow(10),
    maxParticipants: 50,
    currentParticipants: 32,
  },
  {
    title: 'ورشة عمل في تجويد القرآن الكريم',
    type: 'other' as Activity['type'],
    shortDescription: 'ورشة عملية لتعلم أحكام التجويد الأساسية مع التطبيق العملي على التلاوة.',
    longDescription: richText([
      h('محتوى الورشة', 'h2'),
      p(
        'ورشة عملية تقدم لطلاب تعلم أحكام التجويد الأساسية من مخارج الحروف وصفاتها، والغنّ، والمدود.',
      ),
      p('تتمحور الورشة حول التطبيق العملي مع تصحيح الأخطاء الشائعة.'),
      ul([
        'مخارج الحروف العربية وصفاتها',
        'أحكام النون الساكنة والتنوين',
        'المدود وأنواعها',
        'الغنّ وأحكامه',
        'التطبيق العملي على السور القصيرة',
      ]),
    ]),
    benefits: [
      { name: 'تعلم أحكام التجويد الأساسية' },
      { name: 'تحسين جودة التلاوة' },
      { name: 'الثقة في القراءة أمام الآخرين' },
      { name: 'تصحيح الأخطاء الشائعة' },
    ],
    targetAudience: [{ name: 'من يريد تعلم التجويد' }, { name: 'الطلاب المبتدئون' }],
    location: 'مسجد الجامعة — قاعة التلاوة',
    supervisor: 'الشيخ محمد ناصر الدين الألباني',
    schedules: [
      { dateAndTime: dateTimeFromNow(5, 15) },
      { dateAndTime: dateTimeFromNow(12, 15) },
      { dateAndTime: dateTimeFromNow(19, 15) },
    ],
    openForRegistration: true,
    registrationDeadline: daysFromNow(3),
    startDate: daysFromNow(5),
    maxParticipants: 20,
    currentParticipants: 15,
  },
  {
    title: 'محاضرة: العقيدة في الحياة المعاصرة',
    type: 'aqidah' as Activity['type'],
    shortDescription: 'محاضرة شهرية تستعرض أهمية العقيدة الإسلامية وتطبيقاتها في الحياة اليومية.',
    longDescription: richText([
      h('المحاضرة', 'h2'),
      p(
        'تتناول هذه المحاضرة أهمية العقيدة الصحيحة في بناء الشخصية المسلمة، وكيفية مواجهة التحديات المعاصرة بالاستناد إلى المبادئ الإسلامية.',
      ),
      p('يتمركز النقاش حول كيفية الحفاظ على العقيدة في ظل التحديات الفكرية والثقافية المعاصرة.'),
      h('محاور المحاضرة', 'h2'),
      ul([
        'أهمية العقيدة في حياة المسلم',
        'التحديات الفكرية المعاصرة',
        'كيفية حماية العقيدة في البيئة الجامعية',
        'التثبيت في المبادئ الإسلامية',
        'بناء شخصية متوازنة',
      ]),
    ]),
    benefits: [
      { name: 'تعزيز المبادئ العقدية' },
      { name: 'فهم التحديات المعاصرة' },
      { name: 'بناء شخصية متوازنة' },
      { name: 'التمسك بالمبادئ الإسلامية' },
    ],
    targetAudience: [{ name: 'جميع طلاب الجامعة' }, { name: 'من يهتم بالعقيدة' }],
    location: 'قاعة المحاضرات — المبنى الرئيسي',
    supervisor: 'الشيخ محمد بن إبراهيم آل الشيخ',
    schedules: [{ dateAndTime: dateTimeFromNow(14, 19) }],
    openForRegistration: true,
    registrationDeadline: daysFromNow(12),
    startDate: daysFromNow(14),
    maxParticipants: 100,
    currentParticipants: 45,
  },
  {
    title: 'دورة اللغة العربية للمبتدئين',
    type: 'language' as Activity['type'],
    shortDescription: 'دورة مكثفة لتعلم اللغة العربية للمبتدئين من غير الناطقين بها.',
    longDescription: richText([
      h('نظرة عامة', 'h2'),
      p(
        'دورة شاملة لتعلم اللغة العربية للمبتدئين، تبدأ من الحروف وتصل إلى القراءة والكتابة والمحادثة الأساسية.',
      ),
      ul([
        'تعلم الحروف العربية وأصواتها',
        'قواعد النحو والصرف الأساسية',
        'المحادثة اليومية',
        'القراءة والفهم',
        'أساسيات الكتابة',
      ]),
      p('تُقدَّم الدورة على 8 أسابيع بواقع 3 حصص أسبوعياً.'),
    ]),
    benefits: [
      { name: 'إتقان أساسيات اللغة العربية' },
      { name: 'قراءة القرآن بفهم' },
      { name: 'التواصل اليومي بالعربية' },
      { name: 'فهم النصوص الشرعية' },
    ],
    targetAudience: [
      { name: 'غير الناطقين بالعربية' },
      { name: 'الطلاب الجدد' },
      { name: 'من يريد تعلم أساسيات اللغة' },
    ],
    location: 'المبنى التعليمي — قاعة 201',
    supervisor: 'الشيخ محمد بن صالح المنجد',
    schedules: [
      { dateAndTime: dateTimeFromNow(3, 9) },
      { dateAndTime: dateTimeFromNow(5, 9) },
      { dateAndTime: dateTimeFromNow(10, 9) },
      { dateAndTime: dateTimeFromNow(12, 9) },
      { dateAndTime: dateTimeFromNow(17, 9) },
      { dateAndTime: dateTimeFromNow(19, 9) },
    ],
    openForRegistration: true,
    registrationDeadline: daysFromNow(1),
    startDate: daysFromNow(3),
    maxParticipants: 25,
    currentParticipants: 20,
  },
  {
    title: 'مسابقة حفظ القرآن الكريم السنوية',
    type: 'tafsir' as Activity['type'],
    shortDescription: 'مسابقة سنوية لطلاب الجامعة لاختبار مستوياتهم في حفظ القرآن الكريم مع جوائز.',
    longDescription: richText([
      h('قواعد المسابقة', 'h2'),
      p(
        'تُعقد المسابقة السنوية لاختبار الطلاب في حفظ القرآن الكريم، وتشمل عدة مراحل من المراجعة والاختبار.',
      ),
      ul([
        'المرحلة الأولى: اختبار المراجعة العامة',
        'المرحلة الثانية: التلاوة أمام لجنة',
        'المرحلة الثالثة: اختبار المعاني والتفسير',
        'النهائي: حفل تكريم الفائزين',
      ]),
      p('تُقدَّم جوائز قيمة لأول ثلاثة مراكز.'),
    ]),
    benefits: [
      { name: 'تحفيز الطلاب على الحفظ' },
      { name: 'اكتشاف المواهب القرآنية' },
      { name: 'جوائز قيمة' },
      { name: 'تعزيز الثقافة القرآنية' },
    ],
    targetAudience: [{ name: 'طلاب الجامعة الحافظون للقرآن' }, { name: 'من لديه قدرة على الحفظ' }],
    location: 'مسجد الجامعة — القاعة الكبرى',
    supervisor: 'الشيخ عبد الرحمن السعدي',
    schedules: [{ dateAndTime: dateTimeFromNow(21, 10) }],
    openForRegistration: true,
    registrationDeadline: daysFromNow(18),
    startDate: daysFromNow(21),
    maxParticipants: 60,
    currentParticipants: 42,
  },
  {
    title: 'ورشة الخط العربي',
    type: 'other' as Activity['type'],
    shortDescription:
      'ورشة عملية لتعلم فن الخط العربي التقليدي مع التدريب على أنواع الخطوط المختلفة.',
    longDescription: richText([
      h('الخط العربي كفن إسلامي', 'h2'),
      p(
        'يُعد الخط العربي من أبرز الفنون الإسلامية، وقد تطور عبر العصور ليصبح فناً متكاملاً. تقدم هذه الورشة فرصة لتعلم أساسيات الخط العربي.',
      ),
      ul([
        'الخط النسخ وأساسياته',
        'خط الثلث وأبرز عناصره',
        'الزخرفة والتنسيق',
        'التدريب العملي على الأقلام',
      ]),
    ]),
    benefits: [
      { name: 'تعلم فن الخط العربي' },
      { name: 'تنمية الذوق الفني' },
      { name: 'التأمل والتركيز' },
      { name: 'إنتاج أعمال فنية إسلامية' },
    ],
    targetAudience: [{ name: 'من يهتم بالفنون الإسلامية' }, { name: 'جميع طلاب الجامعة' }],
    location: 'قاعة الفنون — المبنى التعليمي',
    supervisor: 'الشيخ محمد بن صالح المنجد',
    schedules: [
      { dateAndTime: dateTimeFromNow(7, 11) },
      { dateAndTime: dateTimeFromNow(14, 11) },
      { dateAndTime: dateTimeFromNow(21, 11) },
    ],
    openForRegistration: true,
    registrationDeadline: daysFromNow(5),
    startDate: daysFromNow(7),
    maxParticipants: 15,
    currentParticipants: 12,
  },
  {
    title: 'دورة في علم العقيدة الإسلامية',
    type: 'aqidah' as Activity['type'],
    shortDescription:
      'دورة شاملة في علم العقيدة الإسلامية تبدأ من الأصول ثم تتعمق في المذاهب والمسائل الخلافية.',
    longDescription: richText([
      h('نظرة عامة على الدورة', 'h2'),
      p(
        'دورة شاملة تغطي أهم مسائل العقيدة الإسلامية من التوحيد وأقسامه، والإيمان بالملائكة والكتب والرسل واليوم الآخر وال والقدر.',
      ),
      h('محاور الدورة', 'h2'),
      ul([
        'أقسام التوحيد وأهميتها',
        'ال والقدر وأثره في حياة المسلم',
        'اليوم الآخر',
        'الأسماء والصفات',
        'الرد على المخالفين بالحسنى',
      ]),
    ]),
    benefits: [
      { name: 'تعميق المعرفة العقدية' },
      { name: 'تمييز الصحيح من المخالف' },
      { name: ' Confidence في التعامل مع الشبهات' },
      { name: 'بناء عقيدة راسخة' },
    ],
    targetAudience: [{ name: 'طلاب العلوم الإسلامية' }, { name: 'من يريد تعميق معرفته بالعقيدة' }],
    location: 'قاعة المحاضرات — المبنى الرئيسي',
    supervisor: 'الشيخ عبد العزيز بن باز',
    schedules: [
      { dateAndTime: dateTimeFromNow(4, 17) },
      { dateAndTime: dateTimeFromNow(11, 17) },
      { dateAndTime: dateTimeFromNow(18, 17) },
    ],
    openForRegistration: true,
    registrationDeadline: daysFromNow(2),
    startDate: daysFromNow(4),
    maxParticipants: 50,
    currentParticipants: 28,
  },
  {
    title: 'حلقة الترجمة والاستشراق',
    type: 'language' as Activity['type'],
    shortDescription:
      'حلقة أكاديمية لدراسة الترجمة من العربية إلى الإنجليزية والعكس مع التركيز على النصوص الشرعية.',
    longDescription: richText([
      h('أهداف الحلقة', 'h2'),
      p(
        'حلقة أكاديمية متقدمة لتطوير مهارات الترجمة من وإلى الإنجليزية مع التركيز على النصوص الشرعية والأدبية.',
      ),
      ul([
        'أساسيات الترجمة من وإلى الإنجليزية',
        'ترجمة النصوص الشرعية والفقهية',
        'قواعد الترجمة الأدبية',
        'معالجة المصطلحات الشرعية',
        'مراجعة ونقاش مترجمات معاصرة',
      ]),
    ]),
    benefits: [
      { name: 'تطوير مهارات الترجمة' },
      { name: 'اكتشاف المصطلحات الشرعية بالإنجليزية' },
      { name: 'التواصل العلمي الدولي' },
      { name: 'فهم النصوص المترجمة' },
    ],
    targetAudience: [
      { name: 'طلاب اللغة الإنجليزية' },
      { name: 'من يجيد اللغة الإنجليزية' },
      { name: 'طلاب العلوم الإسلامية' },
    ],
    location: 'المبنى التعليمي — قاعة 305',
    supervisor: 'الشيخ محمد بن صالح المنجد',
    schedules: [{ dateAndTime: dateTimeFromNow(8, 13) }, { dateAndTime: dateTimeFromNow(15, 13) }],
    openForRegistration: false,
    registrationDeadline: daysFromNow(5),
    startDate: daysFromNow(8),
    maxParticipants: 20,
    currentParticipants: 20,
  },
  {
    title: 'مؤتمر: منهج دراسة الحديث الشريف',
    type: 'hadith' as Activity['type'],
    shortDescription:
      'مؤتمر أكاديمي يستعرض مناهج دراسة الحديث الشريف من صحيح وحسن وضعيف مع التطبيق العملي.',
    longDescription: richText([
      h('محاور المؤتمر', 'h2'),
      p(
        'مؤتمر أكاديمي يجمع طلاب العلم الشرعي لاستعراض مناهج دراسة الحديث الشريف وتطبيقاتها المعاصرة.',
      ),
      ul([
        ' تعريف الحديث وأقسامه',
        'الأسانيد وعلومها',
        'الحكم على الحديث — صحيح وحسن وضعيف',
        'المصطلحات الحديثية',
        'تطبيقات معاصرة في دراسة الحديث',
      ]),
    ]),
    benefits: [
      { name: 'فهم مناهج دراسة الحديث' },
      { name: 'تمييز الأحاديث الصحيحة' },
      { name: 'تطوير مهارات البحث الحديثي' },
      { name: 'الاطلاع على أحدث الم-contributions في العلم الحديث' },
    ],
    targetAudience: [
      { name: 'طلاب العلوم الإسلامية' },
      { name: 'من يهتم بعلم الحديث' },
      { name: 'الباحثون في مجال الشريعة' },
    ],
    location: 'قاعة المؤتمرات — المبنى الرئيسي',
    supervisor: 'الشيخ محمد ناصر الدين الألباني',
    schedules: [{ dateAndTime: dateTimeFromNow(30, 9) }, { dateAndTime: dateTimeFromNow(31, 9) }],
    openForRegistration: true,
    registrationDeadline: daysFromNow(25),
    startDate: daysFromNow(30),
    maxParticipants: 80,
    currentParticipants: 55,
  },
  {
    title: 'حلقة قراءة كتاب ("بداية المجتهد")',
    type: 'fiqh' as Activity['type'],
    shortDescription:
      'حلقة أسبوعية لقراءة ودراسة كتاب "بداية المجтهد" لابن رشد مع مناقشة المسائل الفقهية.',
    longDescription: richText([
      h('عن الكتاب', 'h2'),
      p(
        'كتاب "بداية المجتهد" من أهم الكتب الفقهية المختصرة، يعرض المسائل الخلافية بين المذاهب الأربعة بشكل مconcise وواضح.',
      ),
      h('منهج الحلقة', 'h2'),
      ul([
        'قراءة فصل أسبوعي من الكتاب',
        'شرح المصطلحات الفقهية',
        'مناقشة المسائل الخلافية',
        'ربط المسائل بالمواقف المعاصرة',
      ]),
    ]),
    benefits: [
      { name: 'فهم الفقه المقارن' },
      { name: 'اطلاع على المذاهب الأربعة' },
      { name: 'تنمية مهارات المناقشة العلمية' },
      { name: 'توسيع الأفق الفقهي' },
    ],
    targetAudience: [{ name: 'طلاب كلية الشريعة' }, { name: 'من يدرس الفقه المقارن' }],
    location: 'مسجد الجامعة — مكتب الإفتاء',
    supervisor: 'الشيخ محمد بن صالح العثيمين',
    schedules: [
      { dateAndTime: dateTimeFromNow(6, 16) },
      { dateAndTime: dateTimeFromNow(13, 16) },
      { dateAndTime: dateTimeFromNow(20, 16) },
      { dateAndTime: dateTimeFromNow(27, 16) },
    ],
    openForRegistration: true,
    registrationDeadline: daysFromNow(4),
    startDate: daysFromNow(6),
    maxParticipants: 25,
    currentParticipants: 18,
  },
  {
    title: 'نشاط خيري: توزيع الوجبات على المحتاجين',
    type: 'other' as Activity['type'],
    shortDescription:
      'نشاط خيري أسبوعي لتحضير و distribute الوجبات للعائلات المحتاجة بالمنطقة المحيطة بالجامعة.',
    longDescription: richText([
      h('الهدف من النشاط', 'h2'),
      p(
        'نشاط خيري تطوعي يهدف إلى تحضير و distributing الوجبات الغذائية للعائلات المحتاجة بالمنطقة المحيطة بالجامعة.',
      ),
      h('كيفية المشاركة', 'h2'),
      ul([
        'التحضير في مطبخ المسجد صباح يوم السبت',
        'تجميع الوجبات وتوزيعها على العائلات',
        'متابعة احتياجات العائلات المستمرة',
        ' التنسيق مع الجهات الخيرية المحلية',
      ]),
      p('جميع الطلاب م invited للمشاركة سراً وجهراً.'),
    ]),
    benefits: [
      { name: ' عمل خيري يقرب إلى الله' },
      { name: ' تassuerta المجتمع المحلي' },
      { name: ' تعلم العمل الجماعي' },
      { name: ' تنمية روح التكافل' },
    ],
    targetAudience: [{ name: 'جميع طلاب الجامعة' }, { name: 'من يريد العمل التطوعي' }],
    location: 'مسجد الجامعة — المطبخ',
    supervisor: 'admin',
    schedules: [
      { dateAndTime: dateTimeFromNow(6, 8) },
      { dateAndTime: dateTimeFromNow(13, 8) },
      { dateAndTime: dateTimeFromNow(20, 8) },
    ],
    openForRegistration: true,
    registrationDeadline: daysFromNow(4),
    startDate: daysFromNow(6),
    maxParticipants: 40,
    currentParticipants: 22,
  },
  {
    title: 'دورة في إقامة الصلاة والخطابة',
    type: 'other' as Activity['type'],
    shortDescription: 'دورة عملية لإتقان أحكام إقامة الصلاة والخطابة أمام العامة.',
    longDescription: richText([
      h('محتوى الدورة', 'h2'),
      p('دورة عملية لإعداد الخطيب وال improving أحكام إقامة الصلاة من أذان وiqama وقراءة.'),
      ul([
        'أحكام الأذان والiqama',
        'آداب الخطبة والمواضيع',
        'القراءة أمام الناس',
        'الرد على الشبهات في الخطبة',
        'تطبيقات عملية مع التغذية الراجعة',
      ]),
    ]),
    benefits: [
      { name: ' اقتراح أحكام الصلاة' },
      { name: ' تحسن الخطابة أمام الناس' },
      { name: ' إعداد für المهمة الدعوية' },
      { name: ' بناء الثقة بالنفس' },
    ],
    targetAudience: [{ name: 'طلاب العلم الشرعي' }, { name: 'من يريد الإعداد لل خطابة' }],
    location: 'مسجد الجامعة — القاعة الكبرى',
    supervisor: 'الشيخ محمد بن صالح العثيمين',
    schedules: [
      { dateAndTime: dateTimeFromNow(9, 14) },
      { dateAndTime: dateTimeFromNow(16, 14) },
      { dateAndTime: dateTimeFromNow(23, 14) },
    ],
    openForRegistration: true,
    registrationDeadline: daysFromNow(7),
    startDate: daysFromNow(9),
    maxParticipants: 15,
    currentParticipants: 10,
  },
]

export const seedActivities = async () => {
  console.log(`\n🚀 Start Seeding: ${activitiesData.length} activities...`)
  const startTime = Date.now()

  const payload = await getPayload({ config })

  const medias = await payload.find({ collection: 'media' })
  const mediaIds = medias.docs.map((media) => media.id)

  for (let i = 0; i < activitiesData.length; i++) {
    const data = activitiesData[i]
    const mediaId = mediaIds[i % mediaIds.length]

    try {
      const activity = await payload.create({
        collection: 'activities',
        data: {
          ...data,
          image: mediaId,
        },
      })

      console.log(
        `📖 [${i + 1}/${activitiesData.length}] Created: "${activity.title.substring(0, 30)}${activity.title.length > 30 ? '...' : ''}"`,
      )
    } catch (error) {
      console.error(
        `❌ [${i + 1}/${activitiesData.length}] Error creating activity:`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`\n✨ Finished seeding ${activitiesData.length} activities in ${duration}s\n`)
}

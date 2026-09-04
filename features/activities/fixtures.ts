import { Activity, Media } from '@/payload-types'
import { ActivityType } from '@/features/activities/types'

const media = (url: string, alt: string): Media => ({
  id: 0,
  alt,
  url,
  updatedAt: '',
  createdAt: '',
})

type StaticActivitySeed = {
  id: number
  title: string
  type: ActivityType
  imageUrl: string
  imageAlt: string
  shortDescription: string
  startDate: string
  badge?: string
}

const createActivity = ({
  id,
  title,
  type,
  imageUrl,
  imageAlt,
  shortDescription,
  startDate,
}: StaticActivitySeed): Activity => ({
  id,
  title,
  type,
  image: media(imageUrl, imageAlt),
  shortDescription,
  startDate,
  longDescription: {
    root: {
      type: 'root',
      direction: 'rtl',
      format: '',
      indent: 0,
      version: 1,
      children: [],
    },
  },
  benefits: [],
  targetAudience: [],
  location: 'مسجد الجامعة',
  supervisor: 'إدارة المسجد',
  schedules: [],
  openForRegistration: false,
  updatedAt: '',
  createdAt: '',
})

export const staticActivities: Activity[] = [
  createActivity({
    id: 1,
    title: 'حلقات القرآن الكريم',
    type: ActivityType.Tafsir,
    imageUrl: '/static/images/quaran.jpg',
    imageAlt: 'حلقات القرآن',
    shortDescription: 'حلقات أسبوعية لحفظ وتدبر كتاب الله بإشراف أساتذة متخصصين.',
    startDate: '2025-03-15T00:00:00.000Z',
  }),
  createActivity({
    id: 2,
    title: 'مكتبة المسجد',
    type: ActivityType.Language,
    imageUrl: '/static/images/quaran2.jpg',
    imageAlt: 'مكتبة المسجد',
    shortDescription: 'فضاء للمطالعة والاستعارة يضم آلاف الكتب والمراجع.',
    startDate: '2025-01-05T00:00:00.000Z',
  }),
  createActivity({
    id: 3,
    title: 'المسابقة الرمضانية',
    type: ActivityType.Aqidah,
    imageUrl: '/static/images/competition.jpg',
    imageAlt: 'المسابقة الرمضانية',
    shortDescription: 'مسابقة ثقافية شهر رمضان بمزايا قيمة لجميع الطلاب.',
    startDate: '2025-03-01T00:00:00.000Z',
  }),
  createActivity({
    id: 4,
    title: 'نشاط مسعى للتطوع',
    type: ActivityType.Fiqh,
    imageUrl: '/static/images/volunteer.jpg',
    imageAlt: 'نشاط التطوع',
    shortDescription: 'برنامج تطوعي يهدف إلى تعزيز ثقافة العطاء داخل الجامعة.',
    startDate: '2025-02-10T00:00:00.000Z',
  }),
]
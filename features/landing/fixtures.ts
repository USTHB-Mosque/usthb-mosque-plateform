export interface LandingActivity {
  id: string
  title: string
  description?: string
}

// Ported from uM_landing src/data/contentData.ts (ACTIVITIES_DATA).
// The landing section shows these fixed texts/images, ordered by card position:
// featured, top row, bottom-left, bottom-right.
export const landingActivities: LandingActivity[] = [
  {
    id: 'act-featured',
    title: 'حلقات القرآن',
    description: 'حلقات أسبوعية لحفظ وتدبر القرآن الكريم.',
  },
  {
    id: 'act-1',
    title: 'مكتبة',
    description: 'حلقات أسبوعية لحفظ وتدبر القرآن الكريم.',
  },
  {
    id: 'act-2',
    title: 'نشاط مسع',
  },
  {
    id: 'act-3',
    title: 'المسابقة الرمضانية',
  },
]

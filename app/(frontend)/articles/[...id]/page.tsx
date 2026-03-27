'use client'

import React from 'react'
import Layout from '@/components/layouts'
import { ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const articleContent = `
# أهمية المكتبة في المسجد: منارة العلم والعبادة

المكتبة ليست مجرد رفوف للكتب، بل هي **قلب المسجد النابض** الذي يغذي العقول كما تغذي الصلاة الأرواح.

---

### 1. الأهداف الرئيسية للمكتبة
تساهم المكتبة في تحقيق عدة أهداف استراتيجية داخل المجتمع المسجدي:
* **نشر الوعي الشرعي:** توفير المصادر الموثوقة للتفقه في الدين.
* **دعم الطلبة:** مكان هادئ للمطالعة والبحث العلمي.
* **حماية الفكر:** توجيه الشباب نحو القراءة النافعة.

### 2. إحصائيات تقريبية (مثال لجدول)
| نوع الكتاب | عدد المجلدات | القسم |
| :--- | :---: | :--- |
| علوم القرآن | 150 | القسم أ |
| الفقه المالكي | 300 | القسم ب |
| التاريخ الإسلامي | 200 | القسم ج |

> "العلم صيد والكتابة قيده، قيد صيودك بالحبال الواثقة" - الشافعي

---

### 3. نصائح لترتيب المكتبة
1. استخدام تصنيف **ديوي العشرِي** المعدل.
2. توفير إضاءة مريحة للعين (Warm Light).
3. تخصيص ركن للأطفال لزرع حب القراءة مبكراً.

---

*تم كتابة هذا المقال لدعم مشروع مكتبة مسجد جامعة باب الزوار (USTHB).*
`

const BookDetailPage: React.FC = () => {
  const name = 'أهمية المكتبة في المسجد'
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex gap-3 items-center">
          <span className="text-2xl">فهرس المقالات</span>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-primary text-2xl font-bold">{name}</span>
        </div>
        <div className="flex flex-col gap-10 max-w-6xl mx-auto">
          <p className="text-center text-4xl text-secondary font-bold">أهمية المكتبة في المسجد</p>
          <Image
            src="/static/images/usthb-mosque.jpg"
            alt="Book"
            width={0}
            height={0}
            className={'w-full object-cover h-100 rounded-xl'}
            style={{
              width: '100%',
            }}
          />
          <div
            className="prose prose-lg max-w-none font-yamama text-right leading-relaxed 
                prose-headings:font-khalid prose-headings:text-secondary 
                prose-strong:text-primary prose-blockquote:border-r-4 
                prose-blockquote:border-primary prose-blockquote:pr-4"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{articleContent}</ReactMarkdown>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default BookDetailPage

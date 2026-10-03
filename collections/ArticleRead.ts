import { CollectionConfig } from 'payload'
import { isAdmin } from '@/utils/access-helpers'

/**
 * Article read counters (#156). The admin analytics screen reports "article
 * reads" from this table, so the numbers it shows have to come from rows the
 * platform wrote itself — there is no external analytics service anywhere in
 * this project (CONTEXT.md, Analytics).
 *
 * One row per (article, member): `readCount` is how many times that member
 * opened the article and `lastReadAt` when they last did. A counter table
 * rather than an event log keeps the write cheap enough to sit in the page
 * render and keeps the aggregation a single `SUM`.
 *
 * Only authenticated members are counted. An anonymous read cannot be
 * attributed to anyone, and letting unauthenticated callers write here would
 * make the number forgeable, so the admin screen labels the metric as member
 * reads rather than claiming to be traffic.
 *
 * Every access rule is closed: the rows are written by the server through
 * `overrideAccess: true` (see `features/articles/server/article-reads.ts`) and
 * read by the admin analytics screen. A member cannot inflate their own
 * popularity, and cannot read anyone else's counter.
 */
export const ArticleRead: CollectionConfig = {
  slug: 'article-reads',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['article', 'user', 'readCount', 'lastReadAt'],
  },
  access: {
    read: ({ req: { user } }) => isAdmin(user),
    // Counter rows are server-owned: only the page render may change them, and
    // it goes through the Local API with `overrideAccess: true`.
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'article',
      type: 'relationship',
      relationTo: 'articles',
      required: true,
      label: 'المقال',
      index: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'المستخدم',
      index: true,
    },
    {
      name: 'readCount',
      type: 'number',
      required: true,
      defaultValue: 1,
      min: 0,
      label: 'عدد القراءات',
    },
    {
      // No default on purpose: the only writer is `recordArticleRead`, which
      // always stamps the moment of the read. A default here would be a second
      // way for the column to be filled that nobody reads.
      name: 'lastReadAt',
      type: 'date',
      required: true,
      label: 'آخر قراءة',
    },
  ],
}

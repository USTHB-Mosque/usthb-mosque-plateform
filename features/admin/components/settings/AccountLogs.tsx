import { format } from 'date-fns'
import { arDZ } from 'date-fns/locale'
import type { Log, User } from '@/payload-types'
import Image from 'next/image'
import Link from 'next/link'
import { getImageUrl } from '@/shared/lib/image-utils'

const targetPaths: Record<string, string> = {
  book: '/admin-panel/library/book',
  article: '/articles',
  activity: '/activities',
  user: '/admin-panel/users',
}

export default function AccountLogs({
  entries,
  user,
}: {
  entries: Log[]
  user: Pick<User, 'fullName' | 'profilePicture'>
}) {
  const groups = Object.groupBy(entries, (entry) => format(new Date(entry.timestamp), 'yyyy-MM-dd'))
  const name = user.fullName || 'المشرف'
  const picture = typeof user.profilePicture === 'object' ? user.profilePicture : null
  const avatarUrl = picture?.url && !picture.isPrivate ? getImageUrl(picture.url) : undefined
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">قائمة آخر أحداث الحساب</p>
      {!entries.length ? (
        <p className="rounded-xl border border-stroke-grey bg-background-2 p-6 text-muted-foreground">
          لا توجد أحداث مسجلة بعد.
        </p>
      ) : (
        <div className="space-y-8 rounded-xl border border-stroke-grey bg-background-2 p-5 sm:p-8">
          {Object.entries(groups).map(([day, logs], index) => (
            <section key={day} className="space-y-3">
              <h3 className="flex items-center gap-3 text-sm font-bold text-primary-300">
                <span
                  aria-hidden="true"
                  data-testid="account-log-marker"
                  className={`size-4 shrink-0 rounded-full ${index === 0 ? 'bg-primary-300' : 'bg-stroke-grey'}`}
                />
                <span data-testid="account-log-time">
                  {format(new Date(day), 'd MMMM yyyy', { locale: arDZ })}
                </span>
              </h3>
              <ol className="ms-2 border-s border-stroke-grey ps-5">
                {logs?.map((entry) => {
                  const base = entry.targetType ? targetPaths[entry.targetType] : undefined
                  const href =
                    base && entry.targetId
                      ? `${base}/${encodeURIComponent(entry.targetId)}`
                      : undefined
                  return (
                    <li key={entry.id} className="flex items-center justify-between gap-3 py-4">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-main-20">
                          {avatarUrl ? (
                            <Image
                              src={avatarUrl}
                              alt={name}
                              width={32}
                              height={32}
                              className="size-full object-cover"
                            />
                          ) : (
                            <span role="img" aria-label={name} className="text-primary-300">
                              {name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <p className="min-w-0 break-words text-base">
                          <strong>{name}</strong>{' '}
                          {href ? (
                            <Link
                              href={href}
                              className="text-primary-300 underline underline-offset-2"
                            >
                              {entry.message}
                            </Link>
                          ) : (
                            entry.message
                          )}
                        </p>
                      </div>
                      <time
                        className="shrink-0 text-sm text-muted-foreground"
                        dateTime={entry.timestamp}
                        data-testid="account-log-time"
                      >
                        {format(new Date(entry.timestamp), 'HH:mm')}
                      </time>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

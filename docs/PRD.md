# PRD: USTHB Mosque Platform, MVP

Rewritten 2026-09-05 against the Figma file, which is the source of truth for scope and visuals.

**Design file:** `mosque-website`, key `3SxNbbKMi8ZR6bYdl2ctec`

- Viewer views: [`731-3454`](https://www.figma.com/design/3SxNbbKMi8ZR6bYdl2ctec/mosque-website?node-id=731-3454)
- User views: [`1315-6383`](https://www.figma.com/design/3SxNbbKMi8ZR6bYdl2ctec/mosque-website?node-id=1315-6383)
- Admin views: [`1464-17224`](https://www.figma.com/design/3SxNbbKMi8ZR6bYdl2ctec/mosque-website?node-id=1464-17224)

Where this document and Figma disagree, Figma wins and this document is wrong. Where Figma is silent (password reset, legal pages), this document decides.

---

## 1. Decisions (locked 2026-09-05)

| Topic             | Decision                                                                        |
| ----------------- | ------------------------------------------------------------------------------- |
| Source of truth   | The Figma file, for both scope and visuals                                      |
| First users       | Real USTHB students, this semester                                              |
| Admin panel       | Full custom admin at `/admin`, matching Figma. Payload admin is not the product |
| Loan flow         | Five states with a pickup step and a pickup code, per the Borrowings screens    |
| Notifications     | Full subsystem: collection, SSE bell, and per-type email opt-in                 |
| Deployment        | One root `docker-compose` that runs the app and Postgres. Host not yet chosen   |
| Storage           | S3 compatible in every environment                                              |
| Language          | Arabic only, RTL                                                                |
| Password reset    | In scope. Not designed in Figma, so it follows the existing auth screens        |
| Privacy and terms | In scope. Required by Law 18-07 since identity documents are collected          |

**Cut, because Figma does not show them:** book requests, article bookmarks, article like/dislike feedback, activity feedback. Article opinions are covered by article **reviews**, which the admin Reviews screen shows as a tab.

---

## 2. Personas

| Persona     | Scope                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| **Visitor** | Landing, library, articles, activities, about, contact. Any write action redirects to sign in and returns           |
| **User**    | The `/user/*` portal: dashboard, books, borrowings, articles, activities, latest updates, event log, settings       |
| **Admin**   | The `/admin` panel: dashboard, books, cards, loans, users, articles, activities, reviews, logs, analytics, settings |

**Verification gate.** A student uploads a school certificate at registration. An admin approves or rejects it. Only a verified user can reach the pickup step.

---

## 3. What already exists

Verified by running the app on 2026-09-05, not read from the code.

**Working:** the whole auth flow (registration with certificate upload and consent, login, logout with server side session revocation, Google OAuth for existing accounts, session hardening); borrow with its verification, duplicate and availability gates; activity registration with open, deadline, capacity and duplicate gates; book favorites with a duplicate guard; review creation; every visitor and portal route returning 200.

**Collections:** `users`, `media` (private, owner scoped verification documents), `books`, `activities`, `articles`, `loans`, `reviews`, `activity-registrations`, `book-favorites`.

**Architecture:** feature folders with a shared layer, ESLint import boundaries, Next 16 `proxy.ts`.

**Defects in shipped features:**

| Defect                                                                                                                           | Fixed by |
| -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Marking a loan returned does not release the copy (`availableBooks` 59 before, 59 after)                                         | #19      |
| Nothing marks loans overdue: 8 seeded loans past due, still pending or approved                                                  | #19      |
| `books.averageRating` and `ratingCount` never recalculated: book 52 shows 30 ratings and an average of 5 against one real review | #25      |
| Registration collects `speciality` and throws it away, and never sends `studyYear`                                               | #19      |
| `/user` returns 404, dead rewrite                                                                                                | #94      |
| `/privacy` and `/terms` are linked from registration and return 404                                                              | #38      |

**Not built:** migrations, tests, a deployable container, the entire admin panel, and everything in section 5.

---

## 4. Design system

Every admin and user screen shares one shell and one component set. Building screens before these exist produces thirteen inconsistent pages.

**Shell:** right hand sidebar with a main menu (الرئيسية، الكتب، الإعارات، المقالات، الأنشطة، المستخدمون، آراء القرّاء، الإحصائيات) and a secondary menu (آخر التحديثات، سجل الأحداث، الإعدادات), a header with global search (`اسم الكتاب / المؤلف ...`) and a user block, and a content area. RTL throughout.

**Shared components:** KPI stat card (value, label, `145% أكثر من الشهر الماضي` delta), DataTable (server side search, sort, pagination, row selection with `0 من أصل 100 صف تم اختياره`, `عدد الصفوف في الصفحة`, `الصفحة 1 من 4`, row action dropdown), filter dialog, confirm dialog, status badge, tab bar, and a Hijri calendar used on both dashboards.

Pull tokens and component definitions from Figma rather than eyeballing them.

---

## 5. Scope

### 5.1 Loan lifecycle

Five states, from the Borrowings tabs: `قيد الانتظار` pending, `مقبول` accepted, `تم الأخذ` picked up, `تم الإرجاع` returned, `مرفوض` refused.

Each loan carries a pickup code (`الرمز`, for example `تز/0/23`), a pickup date and hour, and a return date. Loan duration is configurable per book (`مدة الاعارة (بالأيام)`) with a platform default.

Transitions: request creates `pending` and joins the waitlist when no copy is free; an admin accepts, which reserves a copy and issues a pickup code; the student collects and an admin marks picked up, which sets the due date; an admin marks returned, which releases the copy and promotes the next waitlisted user; an admin refuses with a reason. Overdue is derived from the due date. Extensions move the return date, auto approved when nobody is waiting.

### 5.2 Notifications

`notifications` collection, an SSE stream, a navbar bell with unread count, and per-type email opt-in in user settings with exactly the four toggles Figma shows: loan requests, activity registration requests, extension requests, and return reminders.

### 5.3 Admin panel

| Screen     | Content                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard  | Pending verification, severe overdue, pending extension and loan request counts, upcoming pickups with date and hour, Hijri calendar                                                 |
| Books      | Table, grid and detail. Book code, publisher, category, loan duration, copies available of total, shelf location, ratings, similar books                                             |
| Cards      | Library card index: card ID, holder, situation, photo, created date, active state, plus counts of active, inactive and archived                                                      |
| Loans      | List with the five status tabs, waitlist queue, extension queue with original and new return dates, KPIs, manual add                                                                 |
| Users      | Users and admins tabs, CSV import, card ID, situation, study year, speciality, active state. Detail with info, loan requests, extension requests, borrowed books, ratings and delete |
| Articles   | Grid and list, CRUD                                                                                                                                                                  |
| Activities | List and detail, CRUD                                                                                                                                                                |
| Reviews    | Books and articles tabs, total and positive and negative shares, delete                                                                                                              |
| Logs       | Event feed grouped by day, actor, action, target, timestamp                                                                                                                          |
| Analytics  | Most read categories, most requested books, busiest loan request days, computed from Postgres                                                                                        |
| Settings   | Info, security (email, password, 2FA, linked devices, account log), notifications                                                                                                    |

### 5.4 User portal

Dashboard with the Hijri calendar and upcoming returns; books in table and grid; borrowings split into current and previous requests showing code, pickup date, return date and state; articles; activities and detail; latest updates; account event log; settings with info, security, notifications, keyboard shortcuts and delete account.

### 5.5 Outside Figma but required

Password reset, and the privacy and terms pages.

---

## 6. Delivery order

```
Phase 0  #95 migrations -> #96 tests, #94 cleanup, #76 deployable
Phase 1  #65 admin shell and design system
         #19 loan lifecycle (schema, five states, pickup, waitlist, extensions)
Phase 2  #17 notifications
         #99  admin dashboard         #100 admin loans, queue, extensions
         #101 admin users and cards   #102 admin content CRUD
         #103 admin reviews, log, analytics
         #104 admin settings
Phase 3  #105 align the user portal with Figma
Phase 4  #22 password reset           #38 privacy and terms
         #25 review aggregates
```

Migrations first, because every schema change after it is invisible in production otherwise. The design system before any admin screen. The loan lifecycle before the admin screens that operate on it.

---

## 7. Architecture

- **One process.** Next.js 16 App Router with Payload 3 in process. REST and GraphQL at `/api/*`.
- **Two data paths.** Server components and server actions use the Payload Local API through `shared/lib/auth.ts`, always with `req` and `overrideAccess: false`. Client components use TanStack Query through `shared/lib/http-client.ts`.
- **Feature folders.** `features/<domain>/{components,api,server}`, a `shared/` layer, `app/` for routing only. Cross feature imports go through the feature barrel, enforced by ESLint.
- **Auth.** Payload JWT in an httpOnly cookie, role and verification status in the JWT, re-checked server side on every action. `proxy.ts` is a UX redirect, never the security boundary.
- **Admin.** A custom `/admin` route group with its own layout and guard. Payload's admin stays reachable for emergencies but is not the product.

**Stack:** Next.js 16 (Turbopack), Payload 3, PostgreSQL 17, S3 compatible storage, TanStack Query v5, Tailwind 4 with shadcn/ui and Base UI, react-hook-form with zod, nodemailer, Vitest, Node 22 in Docker, pnpm.

**Data model additions:** loan states with pickup code and dates, per book loan duration and code, library cards, user situation and study year and speciality and card ID, article reviews, notifications, logs, analytics events, and a settings global. Each ships with a migration in the same pull request.

---

## 8. Definition of done

- A student registers, is verified, browses, requests a book, is accepted, collects it with a code, and returns it, and is told about each step by bell and email.
- An admin runs the whole library from `/admin` without opening Payload admin or the database.
- A forgotten password is recoverable without an admin.
- `docker compose up` produces a working app with migrations applied.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass in CI.
- Every screen matches its Figma frame.

---

## 9. Deferred to v2

On site borrowing and the librarian view, per copy tracking beyond a pickup code, user facing audit log beyond the account event log, onboarding tours and contextual helpers, activity waitlists, bulk digest email, i18n, book damage tracking.

---

## 10. Open questions

1. Pickup window length, and what happens when it lapses. Figma shows a pickup date and hour but no expiry rule.
2. Extension policy: how many per loan, and how close to the due date.
3. Library cards: are they issued per user automatically, or created by an admin, and what does archived mean.
4. Overdue: reminder cadence, and whether an overdue loan blocks new requests.
5. SMTP sender for production.
6. The user Settings frames show admin sidebar entries (المستخدمون، آراء القرّاء، الإحصائيات). Assumed a copy paste artifact in the design, to confirm with the designer.

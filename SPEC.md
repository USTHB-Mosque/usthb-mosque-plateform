# Spec: USTHB Mosque Library Platform - Full Implementation

## 1. Overview & Scope

**Vision:** A digital platform for the USTHB mosque community covering library (borrowing/waitlist/extensions/reviews), activities, articles, and notifications - with a full admin panel for management.

**Guardrails (binding):**
- **Design is final.** All UI must follow the completed design system/Figma. No new features beyond this spec.
- Existing implemented pages are **polish-only** - flows stay, visuals conform to design tokens.
- Arabic-first, RTL throughout.

**Audience:** stakeholders (features/priority) + engineering (flows, data contracts).

**Personas:**

| Persona | Description |
|---|---|
| **Visitor** | Not logged in. Browsing landing, library catalog, activities, articles. Can search/view detail. Auth-required actions (borrow, waitlist, register, review, favorite/bookmark) -> sign-in gate + redirect back. |
| **User (member)** | Logged-in community member. Borrow books, waitlist, extend, register for activities, review, favorite/bookmark articles & books, notifications, personal dashboard. |
| **Admin** | Full management: loans queue, pickups, users, books, articles, activities, reviews, logs, analytics, settings. |
| **Librarian** | v2 (documented as non-goal for v1). On-site borrowing, today's pickups. |

**Roles & permissions model:**
- `role: admin | user` on User (already in JWT). Visitor = unauthenticated.
- **No publisher role** - admins can create/edit/delete any article, activity, or book.
- **Verification gate:** a user is **verified** when they have a stored **verification document** (student card or registration certificate, uploaded at registration, stored in v1). **Borrowing/checkout is blocked until verified** (browsing/waitlisting allowed). Admin resolves verification state.

**Scope v1 (confirmed):**
- User core: notifications, loans (waitlist + extension + pickup), dashboards + calendars, articles (bookmarks, feedback, reviews), onboarding/helpers.
- Full admin panel: dashboard, loans, users, books, articles, activities, reviews, logs, analytics, settings.
- Landing polish (force autoplay).
- **Google OAuth** in scope; **password reset deferred** (not v1).
- Algerian data protection compliance (Law 18-07): consent, privacy policy, terms of use, soft delete.
- Security fixes from audit.

---

## 2. Non-Goals (v1 explicitly out)
- **Librarian dedicated view** - v2.
- **On-site borrowings** (reading in musalla, not taking home) - v2.
- **User-side audit activity log** - v2 (admin logs in scope).
- **Tasks** - v2.
- **Book damage tracking** - v2.
- **Password reset / forgot password** - deferred.
- **2FA** - deferred.
- **Multi-language / i18n** - Arabic-only for v1.
- **External analytics tools** - analytics computed from the DB only.
- **Payment integration** - not needed for v1.
- **Advanced search** - basic search per section is sufficient for v1.
- **Admin role granularity** - single admin role for v1.
- **Mobile app** - web-only for v1.
- **ANPDP declaration** - legal process outside technical scope.
- Any feature not in this document, or any new visual element not in the approved design.

---

## 3. Cross-Cutting UX Specs (apply to every screen)
- **Component skeletons** for all async views (match final card/table layouts; shimmer in design tokens).
- **Empty states** for tables, listings, 404, and error states - use approved illustrations + CTA.
- **Confirmation alerts** on every destructive/mutating action (delete, cancel, accept/refuse, mark-as-returned, overrides).
- **Upload component** (profile picture, certificates) - drag-drop + validation, uses existing Media/S3.
- **In-app toasts** via Sonner (already present) for success/error on all actions.
- **Review KPI components** (rating summaries) reused on book and article contexts.

---

## 4. Loan Lifecycle State Machine (the heart)

**Real-world flow (confirmed):** loans are **physical** - the book is picked up at the mosque. Flow: verified user requests -> (auto-approve if a copy is free) -> reservation + **pickup window** -> user collects at the mosque -> admin marks `picked` -> due date from a **configurable duration** -> admin marks `returned`. Extensions go through admin, with auto-approval when the queue is empty.

**States:**

1. `requested` (book req created; queued if no copies; user notified of state)
2. `waitlisted` (no copy available at request time; position in queue)
3. `approved_pickup` (copy reserved + pickup window set; "accepted borrowings" tag)
4. `picked` (user collected the book; loan active; due date set from config)
5. `on_site` (v2)
6. `extension_requested` (user asks to extend)
7. `returned` (book returned; copy released -> next waitlist notified)
8. `overdue` (past due date without return/extension; escalation)
9. `no_show` (pickup window missed; reservation released, user warned)
10. `cancelled` (request/registration cancelled by user or admin)

**Key transitions & system actions (locked rules):**

- **Request & approval:** preconditions to request - user is **verified** AND **under the configurable borrow limit** (max concurrent loans). If `availableBooks > 0` -> **auto-approve** -> `approved_pickup` + pickup window + notification. If `availableBooks === 0` -> `waitlisted` + position shown + notification on promotion.
- **Pickup window:** if the window expires without pickup -> auto `no_show`, release copy to the waitlist, warn user (threshold -> D2). Admin dropdown actions: **mark done / reschedule**. Needs a **pickup list view** ("picked and not" tags) - see Section 7.2.
- **Due date & return:** loan duration **configurable** in Settings (default 14 days). Admin marks `returned` -> `availableBooks + 1` -> notify next waitlisted member that the book is free.
- **Overdue:** auto **email + in-app alert** "borrowing duration is over". **Suspension of new loans** until book is returned. If waitlist non-empty -> **request return**; else -> **suggest extension**.
- **Extension:** user requests -> **auto-approve when the queue is empty**; else admin approves/refuses with a reason.
- **Cancelability:** every operation (loan req, extension, registration, pickup) has explicit cancel rules (to be defined - see D6 in Section 14).

**Verification tie-in:** unverified users can request/waitlist but **cannot reach `picked`**; admin is alerted to verify before pickup.

---

## 5. Notifications

**Channels:** **SSE** for in-app (bell + dropdown, the approved design) and **email** via nodemailer (existing; provider to be set later). Per-channel opt-in in Profile -> Settings.

**Delivery model (locked):** events write a `notifications` collection (relation -> user, `seen`, `type`, `link`, `emailSent` flag); an SSE push is delivered to the connected session on create; email is triggered from the same hook.

**Bell UX:** bell in navbar (desktop) + mobile menu; hidden for Visitor. Unread badge count. Click -> dropdown (recent 10) -> "view all" page with filters (all/unread by type).

**Trigger matrix:**

| Trigger | Audience | When |
|---|---|---|
| Book free/waitlist available | Waitlisted user | Copy released |
| Request response (book) | Requesting user | approved/refused |
| Request response (activity) | Registered user | registration accepted/rejected/quota |
| Loan period end / near-end | Active borrower | Due date approaching (onboarding helper + alert) |
| Overdue escalation | Borrower | past due |
| New activity | All users | activity created/published |
| New article | All users | article created/published |
| Pickup reminder/no-show warning | Borrowers | pickup window |
| Admin notifications | Admin panel | severe overdues, pending queues, request arrivals, new user count |

**Email policy (proposed defaults):**
- **Mandatory email:** request responses (book), extension results, overdue, pickup reminders, no-show warnings, verification result.
- **Bulk audiences** ("new activity"/"new article" to all users): in-app + **digest email** (daily/on-demand).
- **Opt-in defaults:** in-app ON; transactional email ON by default; bulk email OFF unless opted-in.

**Admin bell (proposed):** severe overdues, new pending borrow/extension/verification requests, pickups due today, new users, new reviews.

**Email templates:**
- `verification-approved`: Welcome email with verification confirmation
- `verification-rejection`: Rejection email with reason and re-registration instructions
- `reservation-available`: Book available for pickup (pickup window duration)
- `loan-due-soon`: Reminder before due date
- `loan-overdue`: Overdue notice with suspension warning
- `extension-approved`: Extension granted notification
- `extension-rejected`: Extension refused with reason
- `pickup-reminder`: Reminder to collect reserved book
- `no-show-warning`: Warning that pickup window expired
- `new-activity`: New activity published (digest)
- `new-article`: New article published (digest)

---

## 6. Features - User View

Each item tagged **New / Extend / Polish**, with data impact.

### 6.1 Landing *(Polish)*
- Hero video **auto-plays forcibly** (muted, playsinline, autoplay, no-poster-gate).
- Based on approved Figma design.

### 6.2 Notifications *(New)*
- Bell + dropdown in navbar (Visitor -> hide bell). Unread badge. Tap -> destination route (loan, article, activity). Mark-as-read.
- List page with filters (all/unread by type). See Section 5.

### 6.3 My Activities *(Extend)*
- Registered activities (exists in profile) + **calendar view** (New): activities mapped to dates (existing `schedules`).
- **Dashboard calendar** (New): month grid combining activities + loan due dates (Section 6.4).

### 6.4 Dashboard (user) *(New)*
- Calendar of activities & due returns.
- Book request status cards.
- Activity log of **own** actions (light; full user log is v2).

### 6.5 Loans *(New + Extend)*
- **My loans** - currently borrowed list (exists; extend with state machine badges, pickup window, return due).
- **Extension request** (New) - button when eligible; per Section 4.
- **Waitlist** (New) - join if no free copy; show position; auto-promotion to request on availability.
- **Borrow-limit indicator** - show remaining concurrent loans.
- **Verification notice** - checkout blocked with a clear "needs verification" state until verified.

### 6.6 Books *(Extend)*
- **Request a non-existing book** (New) - form -> new collection `book-requests`; surfaced to admin queue + "requested books" analytics.
- **Add review** (exists; polish to design).
- **Bookmarks** (exists as favorites; polish to design).

### 6.7 Articles *(Extend)*
- **Info dialog** (New) - overlay with metadata (publisher, type, cover, date) on list items.
- **Reading-feedback popup** (New) - after finishing reading: like/dislike + optional comment (feeds analytics).
- **Add review** (New) - merged with feedback: like/dislike + optional comment (single interaction type).
- **Sections refinement** (Polish): fill/stroke styles + indentation per approved design.
- **Bookmark articles** (New) - mirrors book favorites; appears in Profile -> bookmarks.

### 6.8 Activities *(Extend)*
- Registration exists. **Document all flows** in Section 8 (register -> confirm -> reminder -> attended -> feedback).
- Post-event **positive/negative feedback** (New) - small rating on detail after end date (feeds analytics).
- Capacity indicator exposed (participant counts already tracked).

### 6.9 Profile / Settings *(Extend + New)*
- **Bookmarks** tab: books (exists as favorites) + articles (new).
- **Notifications** tab: per-channel opt-in for the matrix in Section 5.
- **Info** tab: personal data (existing account tab).
- **Security** tab: change password (exists). **Password reset + 2FA deferred.**

### 6.10 Onboarding / Helpers *(New)*
- **First onboarding** - books + loan flow: 3-4 step intro on first library visit (dismissible, remembers seen).
- **Contextual helper** - when a borrowed book's return is near: explain extension possibility.
- **Waitlist helper** - explain waitlist & auto-promotion when requesting an unavailable book.

---

## 7. Features - Admin View (full panel)

### 7.1 Dashboard *(New)*
- Pending-request card (borrowing / extension / account verification / severe overdues).
- **Today's pickups** list (user, book, code, day+hour) with dropdown: mark done / reschedule.
- Latest reviews (top 3).
- Activities calendar (1).
- Today's activities log (3).
- New-users count (recent registration).

### 7.2 Loans *(New)*
- Request queue (if no copy -> waitlist indicator).
- Extension-request queue.
- **KPIs:** total loans, this month, exceeded-time count, extension requests.
- Table: user, book, date, book status, quantity.
- **Duplicate-loan check:** alert before approving - "user has unreturned books" (2 actions: accept / refuse with reason).
- **Manual add** borrowing/extension dialog - **search by name/email**, book search, take/return dates.
- **Pickup view:** "picked / not" tags; used for no-show signalling.

### 7.3 Users *(New)*
- KPI of user books (low priority).
- User table; row actions (dropdown or right-click menu).
- Previous borrowings per user (status: returned / not returned).
- Reviews per user (low).
- Extension requests with **due-check logic** (queue empty -> available; else refuse).
- **Certificate** in profile info (stored in v1) + **verification state management**.

### 7.4 Books *(Extend)*
- Consistent sidebar elements (already designed).
- Books list/CRUD; multi-copy model with counters (totalBooks/availableBooks).

### 7.5 Articles *(New)*
- **KPIs:** total, this month, views, interactions.
- **Grid + list views** (list: title, description, type, date, publisher).
- **CRUD** - any admin can edit (no publisher ownership rule).
- Row dropdown: edit / delete / info (who, when, type, cover) / share / copy.
- Article reading page (exists; invoke from admin).

### 7.6 Activities *(New)*
- **KPIs:** total, current (open), enrolled, upcoming.
- Types: events vs "all-time" activities.
- List + dropdown actions; **add activity dialog**.
- **Calendar.**
- **Horizontal snippet-card layout** (not article-like).
- Activity info: name, description, image, date, who can participate, location, type, duration, state.
- Detail page (exists).

### 7.7 Logs *(New)*
- Two partitions: **admins** (v1) + **users** (v2).
- Required info: user, timestamp, action, date.
- Filters: multi-user, date (value/range), action type (via filter dialog).

### 7.8 Analytics *(New)*
Computed **from the DB** (Postgres aggregation) - no external service.
- Article insights: reads, feedback (likes/dislikes).
- Activity insights: registrations, positive/negative feedback.
- Most-borrowed books; requested books; article with most interactions; categories most read; borrowings **monthly evolution**; days & hours where borrowings increase; days & hours when pickups increase.
- Phased: basic KPIs (counts, top items) in v1, computed charts (monthly evolution, peak hours) in v1.1.

### 7.9 Settings *(New)*
- Admin info (name, email, pfp).
- **Security**: change password, **2FA deferred**, logged-in devices/link device - **must verify identity first** (edit/manage as pages; verifications as dialogs).
- **Notifications**: toggles for logs, borrowing/extension/user requests, reviews, severe overdues, daily activities.
- **Loan configuration (New):** default loan duration + **borrow limit** (max concurrent loans).
- **Keyboard shortcuts** (add new borrowing, etc.).

### 7.10 Reviews *(New)*
- Two categories: **book reviews** and **article reviews** (merged with article feedback - single interaction type).
- Admin actions: delete / copy.
- KPIs (counts, avg per category).

---

## 8. Activities - Complete Flows (documented for both views)

1. **Browse -> detail** (info: name, desc, image, dates, participants, location, type, duration, state).
2. **Register** (gates: open, deadline, max capacity) -> confirmation notification.
3. **Pre-event**: reminder notification (schedule-based).
4. **Event day**: `attended` marked by admin/user.
5. **Post-event**: feedback (positive/negative) + auto-completion.
6. **Branch**: overflow capacity -> waitlist/notification when spot opens (matches book waitlist pattern - decision in Section 14).
7. **Cancel**: registration cancellation rules (before deadline) + quota re-open.

---

## 9. Multi-Copy Model

- One `Book` doc with `totalBooks/availableBooks` counters (current model) satisfies "same book, one id".
- Copies aren't individually tracked in v1. Consequences for pickups ("book code"), no-show release, and on-site (v2) -> generate a copy code at pickup time; revisit per-copy records only if design requires distinct copy codes.

---

## 10. Legal Compliance (Law 18-07)

### User Registration Fields

Add the following fields to the existing User collection:
- `phone` (text, optional)
- `faculty` (text, optional)
- `studyYear` (select: 1-5, optional)
- `verificationDocument` (upload to Media, required - student card or registration certificate)
- `verificationStatus` (select: pending_verification, verified, rejected, default: pending_verification)
- `verificationNote` (text, optional - admin note on rejection)
- `consentGiven` (checkbox, required - Law 18-07 compliance)
- `consentTimestamp` (date, auto-set on registration)
- `deletedAt` (date, nullable - for soft delete)
- `deletionScheduledFor` (date, nullable - 30 days after deletedAt)

### Consent & Data Processing

- **Explicit consent checkbox** during registration (not pre-checked) - Article 4 compliance.
- **Purpose-limited data collection** - Article 3 compliance.
- Data access and rectification capabilities - user rights compliance.

### Account Deletion (Right to Erasure)

- Soft delete: account disabled immediately.
- Data retained for 30 days, then permanently deleted.
- Verification document image deleted immediately on soft delete (not after 30 days).
- Cleanup job for soft-deleted accounts after 30 days.

### Privacy & Terms Pages

Static pages at `/privacy` and `/terms`:
- Privacy policy covering data collection, purpose, retention, and rights.
- Terms of use covering loan rules, account responsibilities, and content moderation.
- Both in Arabic (bilingual optional).
- Version-controlled, no CMS management needed.
- Privacy policy must identify the data controller (mosque scientific association).

### Data Residency

- Database and uploaded files stored on Supabase (S3-compatible).
- Verification documents: private URLs only (no public access).
- Signed URLs with short expiry for admin access.
- Data residency in Algeria preferred; if using foreign hosting, document in privacy policy.

### ANPDP Declaration

- Legal process outside technical scope - deferred to post-v1.
- Document requirements in README for future reference.

---

## 11. Security Fixes & Technical Debt

### Security Fixes Required (from audit)
1. Fix `reviewBook` action - add `req` and `overrideAccess: false`
2. Fix `Review` collection - change `create: () => true` to authenticated only
3. Fix login form - change `type="text"` to `type="password"` for password field
4. Remove `/seeding` page from production or add admin-only access
5. Add access control to `Admin` collection
6. Fix `BookFavorite` hook - use `overrideAccess: false`

### Technical Debt to Address
- Extract `isAdmin` helper to shared utility
- Remove unused Apollo/GraphQL dependencies
- Fix Docker Compose configuration (Postgres, not MongoDB)
- Add `output: 'standalone'` to next.config.ts for Docker

---

## 12. Testing Strategy

### Test Strategy
- Unit tests for hooks (reservation queue logic, loan duration calculation)
- Integration tests for server actions (verification flow, loan approval)
- E2E tests for critical user flows (registration -> verification -> loan)

### Key Test Cases
1. Registration with consent checkbox
2. Admin approval/rejection flow
3. Book reservation queue (FIFO order)
4. Loan duration calculation (configurable, default 14 days)
5. Reservation expiry (pickup window)
6. Overdue detection and suspension
7. Notification creation on status changes
8. Soft delete with 30-day retention
9. Access control enforcement (users can't approve loans)
10. Loan state machine transitions (all 10 states)
11. Extension auto-approve when queue empty
12. Waitlist auto-promotion on copy release
13. No-show handling and copy release

### Prior Art
- Existing test patterns in `__tests__/` directories
- React Query hooks tested with MSW (Mock Service Worker)

---

## 13. Data Model

### Current Collections
users, media, books, activities, articles, loans, reviews, activity-registrations, book-favorites

### Planned New Collections (v1)
- `notifications` - user, type, seen, link, emailSent
- `book-requests` - user, book details, status, admin notes
- `loan-extensions` - loan, user, status, reason, admin response
- `logs` - actor, action, target, timestamp, metadata
- `analytics-events` - event type, entity, user, timestamp
- `article-bookmarks` - user, article
- `article-feedback` - user, article, sentiment (like/dislike), comment
- `activity-feedback` - user, activity, sentiment (positive/negative)

### Access Control Matrix

| Collection | Create | Read | Update | Delete |
|---|---|---|---|---|
| Users | Anyone (registration) | Admin or self | Admin (verification), self (profile) | Admin only |
| Books | Admin only | Anyone (public catalog) | Admin only | Admin only |
| Loans | Verified users (via system) | Admin or self | Admin only | Admin only |
| Notifications | System only (hooks) | Admin or self | Self only (mark read) | System only |
| Reviews | Authenticated users | Anyone | Author or admin | Author or admin |
| Book Requests | Authenticated users | Admin or self | Admin only | Admin only |
| Activity Registrations | Authenticated users | Admin or self | Admin or self (cancel) | Admin or self |
| Logs | System only (hooks) | Admin only | Never | Never |

---

## 14. Open Decisions (must be resolved before build)

**Resolved in this spec:**

| ID | Decision | Resolution |
|---|---|---|
| Multi-copy model | Counters (totalBooks/availableBooks) | Section 9 |
| Loan duration | Configurable in Settings (default 14 days) | Section 4 |
| Borrow limit | Configurable max concurrent loans | Section 4 |
| Publisher role | None - all admins edit all content | Section 1 |
| Deployment | Docker/VPS | Section 15 |
| Scale | Thousands of users | Section 15 |
| Language | Arabic-only v1 | Section 2 |
| Admin panel location | Stays under /admin | Section 15 |
| Password reset / 2FA | Deferred | Section 2 |
| Email provider | Nodemailer (provider TBD) | Section 5 |
| Extension auto-approve | Auto-approve when queue empty | Section 4 |
| Article feedback/reviews | Merged: single interaction type (like/dislike + comment) | Section 6.7 |

**Remaining (must be resolved before build):**

1. **D1 - Pickup window behavior**: duration (e.g., 24h/48h/72h), tolerance, reschedule limits, and exactly when `no_show` triggers.
2. **D2 - No-show threshold**: 2 warnings -> restriction scope (blocks borrows? days? configurable?).
3. **D3 - "Finishing reading" trigger** for article feedback popup.
4. **D4 - Activity overflow** - waitlist or plain "full" refusal?
5. **D5 - Extension policy**: max extensions, max total duration, when eligible (X days before due).
6. **D6 - Cancelability rules** per operation type.
7. **D7 - Borrow-limit default value** (proposal: 3 concurrent loans).

---

## 15. Tech Stack & Architecture

### Architecture
- **Monolith**: one Next.js (App Router) process hosts the public site **and** Payload CMS in-process. REST at `/api/*`, GraphQL at `/api/graphql`, admin at **/admin** (same app).
- **Rendering split**: public read pages = Server Components + `getPayload`; interactive pages = Client Components + TanStack Query (cookie auth).
- **Auth**: Payload JWT cookie, `role` in JWT, role-based redirect + server-side re-checks. **Google OAuth** = only social login. **Password reset deferred.** Visitor->user gating: borrow/bookmark/register/review require sign-in (visitor is redirected, never blocked from browsing).

### Stack Table
| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Runtime | Node (Docker) |
| Language | TypeScript |
| CMS | Payload CMS (in-process) |
| Database | PostgreSQL 17 (local Supabase CLI / remote) |
| Storage | Supabase S3 |
| Data fetching | TanStack Query v5 (client) |
| State | Zustand |
| UI | Tailwind + shadcn/ui + Base-UI |
| Animation | motion |
| Forms | react-hook-form + zod |
| Toasts | sonner |
| Email | nodemailer (provider later) |
| Auth | Payload auth + Google OAuth |
| Fonts | Local Arabic fonts |
| Package manager | pnpm |
| Lint | ESLint |
| Local Supabase | Supabase CLI |

### Environments
- **dev** `.env.local` -> local Supabase (DB :54322, S3 :54321, Studio :54323, Inbucket :54324 for email).
- **preview/prod** `.env` -> remote Supabase; `NODE_ENV` switches CSP/headers.

### Deployment
- **Docker/VPS** (multi-stage standalone image; Vercel not targeted).
- Build = `payload migrate && next build`.

### Scale & Performance
- Target **thousands** of users.
- Notes: indexed/filtered queries, pagination on all listings, `select`/`maxDepth` limits, caching of public read queries; SSE connection pooling.

---

## 16. Suggested v1 Priority

**P0 (foundation):** security fixes, notification subsystem (SSE), loan state machine, multi-copy model, book-requests, legal compliance (consent, soft delete, privacy/terms pages).
**P1:** user waitlist + extension + my-loans, dashboards/calendars, article bookmarks+feedback, onboarding.
**P2 (admin):** loans queue + pickups + KPIs, articles/activities CRUD + analytics, logs, settings, reviews.
**P3 (polish):** landing autoplay, sections refinement, cross-cutting empty states/skeletons/confirmation-alerts.

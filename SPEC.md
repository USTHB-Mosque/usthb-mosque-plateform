# Spec: USTHB Mosque Library Platform - Full Implementation

## 1. Overview & Scope

**Vision:** A digital platform for the USTHB mosque community covering library (borrowing/waitlist/extensions/reviews), activities, articles, and notifications - with a full admin panel for management.

**Guardrails (binding):**

- **Design is final.** All UI must follow the completed design system/Figma. No new features beyond this spec.
- Existing implemented pages are **polish-only** - flows stay, visuals conform to design tokens.
- Arabic-first, RTL throughout.

**Audience:** stakeholders (features/priority) + engineering (flows, data contracts).

**Personas:**

| Persona           | Description                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Visitor**       | Not logged in. Browsing landing, library catalog, activities, articles. Can search/view detail. Auth-required actions (borrow, waitlist, register, review, favorite/bookmark) -> sign-in gate + redirect back. |
| **User (member)** | Logged-in community member. Borrow books, waitlist, extend, register for activities, review, favorite books, notifications, personal dashboard.                                                                |
| **Admin**         | Full management: loans queue, pickups, users, books, articles, activities, reviews, logs, analytics, settings.                                                                                                 |
| **Librarian**     | v2 (documented as non-goal for v1). On-site borrowing, today's pickups.                                                                                                                                        |

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

### Cut from v1 (not in the approved design)

Removed by the design team, not deferred to v2. Section 1 makes the design final, so these must not be
built even though earlier drafts of this spec asked for them:

- **Article Bookmark** - the member-facing toggle on an article. The `article-favorites` collection, the
  server action and the Profile bookmarks tab all exist and are readable and removable; only the
  _create_ affordance on the article page is cut. The dead heart control on the article detail should be
  **removed**, not wired up (#157).
- **Article Feedback** - the like/dislike + optional comment interaction, and the "finishing reading"
  trigger that would have prompted it (D3, Section 14).

**Not cut, despite sitting next to them:** an Article as a **Review** target is live and in scope for admin
review management (Section 7.10). What is obsolete is the earlier framing that merged a like/dislike
feedback into a formal Review - not the article review relation itself.

**Still undecided, not cut:** Onboarding / helpers (Section 6.10). No approved design was found for it.
It needs a design decision, not a build - do not treat it as either in scope or removed until that call is
made.

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

**Real-world flow (confirmed):** loans are **physical** - the book is picked up at the mosque. Flow: verified user requests -> admin accepts -> copy reserved + **pickup window** -> user collects at the mosque -> admin marks `picked_up` -> due date from a **configurable duration** -> admin marks `returned`. Extensions go through admin, with auto-approval when the queue is empty.

**Stored states (5):** the `loans` collection stores exactly these five.

1. `pending` (fresh request awaiting an admin decision; the "accepted borrowings" queue)
2. `accepted` (copy reserved, pickup code minted, pickup slot + **pickup window** set)
3. `picked_up` (user collected the book; loan active; due date stamped)
4. `returned` (book returned; copy released -> next waitlisted member promoted + notified)
5. `refused` (admin declined, or the pickup window expired; a reason is always recorded)

**Deliberately not a stored state:**

- **Waitlist** - a separate FIFO collection (`waitlist-entries`: book, user, position). A request with no free copy joins the queue instead of creating a Loan.
- **Extension request** - a separate collection (`loan-extensions`). The Loan stays `picked_up` throughout, so an extension can never itself go overdue or be picked up.
- **Overdue** - **derived, never stored.** A `picked_up` Loan past its `dueDate` reads as overdue via `getEffectiveLoanStatus`. The borrower is notified exactly once through an `overdueNotified` flag, on a lazy check at read time rather than a scheduled job. Accepted trade-off: a member who never opens the portal is not notified.
- **No-show** - a `refused` Loan whose reason is window expiry. A separate state would only have duplicated `refused`.
- **`on_site`, `cancelled`** - v2, see Section 2.

**Key transitions & system actions (locked rules):**

- **Request & approval:** preconditions to request - user is **verified** AND **under the configurable borrow limit** AND has no active Loan or queued row for the book. If `availableBooks > 0` -> a `pending` Loan is created for an **admin to accept**. It is **not** auto-approved: v1 ships a request queue (Section 7.2), and acceptance is where the duplicate-loan check and the mandatory refusal reason live. If `availableBooks === 0` -> join the waitlist with a server-stamped position, notified on promotion.
- **Pickup window:** see **D1** in Section 14. Admin dropdown actions: **mark done / reschedule**. Needs a **pickup list view** ("picked and not" tags) - see Section 7.2.
- **Due date & return:** loan duration **configurable** in Settings (default 14 days), overridable per book. Admin marks `returned` -> `availableBooks + 1` -> the waitlist head is promoted in the same transaction and notified.
- **Overdue:** auto **email + in-app alert** "borrowing duration is over", exactly once. **Suspension of new loans** until the book is returned. If the waitlist is non-empty -> **request return**; else -> **suggest extension**.
- **Extension:** user requests -> **auto-approve when the queue is empty**; else admin approves/refuses with a reason. Eligibility, caps and the total-duration bound are in **D5**.
- **Cancelability:** every operation (Loan request, extension, registration, pickup) has explicit cancel rules - see **D6** in Section 14.

**Verification tie-in:** unverified users can request/waitlist but **cannot reach `picked_up`**; admin is alerted to verify before pickup. Shipped behaviour blocks one state earlier, at request time; corrected in #153.

---

## 5. Notifications

**Channels:** **SSE** for in-app (bell + dropdown, the approved design) and **email** via nodemailer (existing; provider to be set later). Per-channel opt-in in Profile -> Settings.

**Delivery model (locked):** events write a `notifications` collection (relation -> user, `seen`, `type`, `link`, `emailSent` flag); an SSE push is delivered to the connected session on create; email is triggered from the same hook.

**Bell UX:** bell in navbar (desktop) + mobile menu; hidden for Visitor. Unread badge count. Click -> dropdown (recent 10) -> "view all" page with filters (all/unread by type).

**Trigger matrix:**

| Trigger                         | Audience        | When                                                              |
| ------------------------------- | --------------- | ----------------------------------------------------------------- |
| Book free/waitlist available    | Waitlisted user | Copy released                                                     |
| Request response (book)         | Requesting user | approved/refused                                                  |
| Request response (activity)     | Registered user | registration accepted/rejected/quota                              |
| Loan period end / near-end      | Active borrower | Due date approaching (onboarding helper + alert)                  |
| Overdue escalation              | Borrower        | past due                                                          |
| New activity                    | All users       | activity created/published                                        |
| New article                     | All users       | article created/published                                         |
| Pickup reminder/no-show warning | Borrowers       | pickup window                                                     |
| Admin notifications             | Admin panel     | severe overdues, pending queues, request arrivals, new user count |

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

### 6.1 Landing _(Polish)_

- Hero video **auto-plays forcibly** (muted, playsinline, autoplay, no-poster-gate).
- Based on approved Figma design.

### 6.2 Notifications _(New)_

- Bell + dropdown in navbar (Visitor -> hide bell). Unread badge. Tap -> destination route (loan, article, activity). Mark-as-read.
- List page with filters (all/unread by type). See Section 5.

### 6.3 My Activities _(Extend)_

- Registered activities (exists in profile) + **calendar view** (New): activities mapped to dates (existing `schedules`).
- **Dashboard calendar** (New): month grid combining activities + loan due dates (Section 6.4).

### 6.4 Dashboard (user) _(New)_

- Calendar of activities & due returns.
- Book request status cards.
- Activity log of **own** actions (light; full user log is v2).

### 6.5 Loans _(New + Extend)_

- **My loans** - currently borrowed list (exists; extend with state machine badges, pickup window, return due).
- **Extension request** (New) - button when eligible; per Section 4.
- **Waitlist** (New) - join if no free copy; show position; auto-promotion to request on availability.
- **Borrow-limit indicator** - show remaining concurrent loans.
- **Verification notice** - checkout blocked with a clear "needs verification" state until verified.

### 6.6 Books _(Extend)_

- **Request a non-existing book** (New) - form -> new collection `book-requests`; surfaced to admin queue + "requested books" analytics.
- **Add review** (exists; polish to design).
- **Bookmarks** (exists as favorites; polish to design).

### 6.7 Articles _(Polish)_

- **Info dialog** (New) - overlay with metadata (publisher, type, cover, date) on list items. Needs a
  `publisher` field on Article, which does not exist yet.
- **Sections refinement** (Polish): fill/stroke styles + indentation per approved design.
- ~~Reading-feedback popup~~, ~~Add review (like/dislike)~~, ~~Bookmark articles~~ - **cut**, see Section 2.
  Check the approved design before building the info dialog too.

### 6.8 Activities _(Extend)_

- Registration exists. **Document all flows** in Section 8 (register -> confirm -> reminder -> attended -> feedback).
- Post-event **positive/negative feedback** (New) - small rating on detail after end date (feeds analytics).
- Capacity indicator exposed (participant counts already tracked).

### 6.9 Profile / Settings _(Extend + New)_

- **Bookmarks** tab: books (exists as favorites). Articles were cut - see Section 2.
- **Notifications** tab: per-channel opt-in for the matrix in Section 5.
- **Info** tab: personal data (existing account tab).
- **Security** tab: change password (exists). **Password reset + 2FA deferred.**

### 6.10 Onboarding / Helpers _(Undecided)_

No approved design was found for these. They are not cut and not in scope - they need a design decision
first (see Section 2). Listed so the requirement is not silently lost:

- **First onboarding** - books + loan flow: 3-4 step intro on first library visit (dismissible, remembers seen).
- **Contextual helper** - when a borrowed book's return is near: explain extension possibility.
- **Waitlist helper** - explain waitlist & auto-promotion when requesting an unavailable book.

---

## 7. Features - Admin View (full panel)

### 7.1 Dashboard _(New)_

- Pending-request card (borrowing / extension / account verification / severe overdues).
- **Today's pickups** list (user, book, code, day+hour) with dropdown: mark done / reschedule.
- Latest reviews (top 3).
- Activities calendar (1).
- Today's activities log (3).
- New-users count (recent registration).

### 7.2 Loans _(New)_

- Request queue (if no copy -> waitlist indicator).
- Extension-request queue.
- **KPIs:** total loans, this month, exceeded-time count, extension requests.
- Table: user, book, date, book status, quantity.
- **Duplicate-loan check:** alert before approving - "user has unreturned books" (2 actions: accept / refuse with reason).
- **Manual add** borrowing/extension dialog - **search by name/email**, book search, take/return dates.
- **Pickup view:** "picked / not" tags; used for no-show signalling.

### 7.3 Users _(New)_

- KPI of user books (low priority).
- User table; row actions (dropdown or right-click menu).
- Previous borrowings per user (status: returned / not returned).
- Reviews per user (low).
- Extension requests with **due-check logic** (queue empty -> available; else refuse).
- **Certificate** in profile info (stored in v1) + **verification state management**.

### 7.4 Books _(Extend)_

- Consistent sidebar elements (already designed).
- Books list/CRUD; multi-copy model with counters (totalBooks/availableBooks).

### 7.5 Articles _(New)_

- **KPIs:** total, this month, views, interactions.
- **Grid + list views** (list: title, description, type, date, publisher).
- **CRUD** - any admin can edit (no publisher ownership rule).
- Row dropdown: edit / delete / info (who, when, type, cover) / share / copy.
- Article reading page (exists; invoke from admin).

### 7.6 Activities _(New)_

- **KPIs:** total, current (open), enrolled, upcoming.
- Types: events vs "all-time" activities.
- List + dropdown actions; **add activity dialog**.
- **Calendar.**
- **Horizontal snippet-card layout** (not article-like).
- Activity info: name, description, image, date, who can participate, location, type, duration, state.
- Detail page (exists).

### 7.7 Logs _(New)_

- Two partitions: **admins** (v1) + **users** (v2).
- Required info: user, timestamp, action, date.
- Filters: multi-user, date (value/range), action type (via filter dialog).

### 7.8 Analytics _(New)_

Computed **from the DB** (Postgres aggregation) - no external service.

- Article insights: reads. There is **no** likes/dislikes counter - that interaction is cut (Section 2).
- Activity insights: registrations, positive/negative feedback.
- Most-borrowed books; requested books; article with most reads and reviews; categories most read; borrowings **monthly evolution**; days & hours where borrowings increase; days & hours when pickups increase.
- Phased: basic KPIs (counts, top items) in v1, computed charts (monthly evolution, peak hours) in v1.1.

### 7.9 Settings _(New)_

- Admin info (name, email, pfp).
- **Security**: change password, **2FA deferred**, logged-in devices/link device - **must verify identity first** (edit/manage as pages; verifications as dialogs).
- **Notifications**: toggles for logs, borrowing/extension/user requests, reviews, severe overdues, daily activities.
- **Loan configuration (New):** default loan duration + **borrow limit** (max concurrent loans).
- **Keyboard shortcuts** (add new borrowing, etc.).

### 7.10 Reviews _(New)_

- Two categories: **book reviews** and **article reviews**, one interaction type - a star rating plus a
  comment, on a `book` XOR `article` target. The earlier framing that merged a like/dislike _feedback_ into
  this is obsolete; article reviews stand on their own (Section 2).
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
5. Reservation expiry (pickup window) - **gated on #153.** The D1 window is not implemented, so this is
   pending, not unsatisfiable. Assert: window expires -> `refused` with the expiry reason, copy released,
   waitlist head promoted, borrower warned, no-show counter incremented.
6. Overdue detection and suspension
7. Notification creation on status changes
8. Soft delete with 30-day retention
9. Access control enforcement (users can't approve loans)
10. Loan state machine transitions - **all five stored states** (`pending`, `accepted`, `picked_up`,
    `returned`, `refused`) plus derived overdue. The waitlist and the extension request are separate
    collections and are covered by cases 3, 11 and 12; `overdue` is covered by case 6. The original
    "all 10 states" wording is withdrawn - see Section 2 and Section 4.
11. Extension auto-approve when queue empty
12. Waitlist auto-promotion on copy release
13. No-show handling and copy release - **gated on #153**, same reason as case 5. Assert the D2 threshold:
    two no-shows suspend borrowing and only borrowing, until an admin lifts it.

### Prior Art

- Existing test patterns in `__tests__/` directories
- React Query hooks tested with MSW (Mock Service Worker)

---

## 13. Data Model

### Current Collections

`users`, `media`, `books`, `activities`, `articles`, `loans`, `reviews`, `activity-registrations`,
`book-favorites`, `article-favorites`, `waitlist-entries`, `loan-extensions`, `notifications`, `logs`,
`library-cards`

Note that the waitlist and the extension request are **separate collections**, not Loan states (Section 4).

### Outstanding Collections (v1)

- `book-requests` - user, title, author, description, status (`pending`/`approved`/`rejected`), admin note.
  #152. A request for a book outside the catalog; the counter to the waitlist, not a sibling of it.
- `activity-feedback` - user, activity, sentiment (`positive`/`negative`), comment; one per user per
  activity. #155. Feeds the Activity analytics in Section 7.8.
- `analytics-events` - event type, entity, user, timestamp. #156. Backs Article reads and interactions,
  which have no counter today.

### Outstanding Fields (v1)

The D2 no-show counter is a **field on `users`, not a collection** - `noShowCount` (integer, default 0) plus
`borrowingBlockedAt` (nullable timestamp, set when the D2 threshold is crossed, cleared when an admin lifts
it). There is deliberately no per-no-show history collection: the audit log already records the expiry
event, and D2 only needs a count and a block flag. #153.

### Cut Collections

- `article-feedback` - the like/dislike interaction is not in the approved design (Section 2). Note the
  **Article as a Review target is not cut**: `reviews` already carries a `book` XOR `article` target and
  admin review management covers both (Section 7.10).

### Access Control Matrix

| Collection             | Create                      | Read                    | Update                               | Delete          |
| ---------------------- | --------------------------- | ----------------------- | ------------------------------------ | --------------- |
| Users                  | Anyone (registration)       | Admin or self           | Admin (verification), self (profile) | Admin only      |
| Books                  | Admin only                  | Anyone (public catalog) | Admin only                           | Admin only      |
| Loans                  | Verified users (via system) | Admin or self           | Admin only                           | Admin only      |
| Notifications          | System only (hooks)         | Admin or self           | Self only (mark read)                | System only     |
| Reviews                | Authenticated users         | Anyone                  | Author or admin                      | Author or admin |
| Book Requests          | Authenticated users         | Admin or self           | Admin only                           | Admin only      |
| Activity Registrations | Authenticated users         | Admin or self           | Admin or self (cancel)               | Admin or self   |
| Logs                   | System only (hooks)         | Admin only              | Never                                | Never           |

---

## 14. Decisions

**Canonical register:** this section is the single register of record. `docs/PRD-open-decisions.md` is the
pre-merge design-review checklist and its IDs do **not** line up with the ones below - its `D4` is article
reviews, `D5` is activity overflow, `D7` is the multi-copy model, and cancelability is `D8`. Where the two
disagree, this section wins. The PRD checklist is kept for its resolved answers only.

**Resolved in this spec:**

| ID                         | Decision                                      | Resolution                    |
| -------------------------- | --------------------------------------------- | ----------------------------- |
| Multi-copy model           | Counters (totalBooks/availableBooks)          | Section 9                     |
| Loan duration              | Configurable in Settings (default 14 days)    | Section 4                     |
| Borrow limit               | Configurable max concurrent loans             | Section 4, **D7** (default 3) |
| **D1** - Pickup window     | 48h from acceptance, admin reschedules        | Section 4, **D1**             |
| **D2** - No-show           | 2 no-shows; borrowing only; until admin lifts | Section 4, **D2**             |
| **D3** - Finishing read    | Resolved by removal (article feedback cut)    | Section 2, **D3**             |
| **D4** - Activity overflow | Hard refusal, no waitlist                     | Section 8, **D4**             |
| **D5** - Extension         | 1 per loan, 2x base, from 3 days out          | Section 4, **D5**             |
| **D6** - Cancelability     | Per operation, cancel is never punished       | Section 4, **D6**             |
| **D7** - Borrow default    | 3                                             | Section 4, **D7**             |
| Publisher role             | None - all admins edit all content            | Section 1                     |
| Deployment                 | Docker/VPS                                    | Section 15                    |
| Scale                      | Thousands of users                            | Section 15                    |
| Language                   | Arabic-only v1                                | Section 2                     |
| Admin panel location       | Contested - see note below                    | Section 15, see note below    |
| Password reset / 2FA       | Deferred                                      | Section 2                     |
| Email provider             | Nodemailer (provider TBD)                     | Section 5                     |
| Extension auto-approve     | Auto-approve when queue empty                 | Section 4                     |
| Article feedback/reviews   | **Cut from v1** - see Section 2               | -                             |

> **Admin panel location, contested.** This spec and the design both say `/admin`. The shipped panel is
> served from `/admin-panel`, moved to avoid colliding with Payload's own admin. The move was deliberate
> but was never recorded here. #65 decides: either amend this row, or move thirteen routes late in the
> build. Until then this row is the only record that the two disagree.

### Resolved 2026-09-26 (were blocking #153, #154, #155)

**D1 - Pickup window.** Duration **48h from acceptance**, configurable in Settings. No tolerance beyond
the window itself - the window is the tolerance. Reschedule is an **admin** action, unlimited; each
reschedule sets a fresh 48h window and does **not** reset the no-show counter. `no_show` triggers when the
window expires while the Loan is still `accepted` -> `refused` with reason "window expired", copy released,
waitlist head promoted, borrower warned.
_Reasoning:_ the Loan is collected at the mosque and the community is on campus. The days a member is
present but unavailable are Friday and Thursday evening, so 24h strands people on ordinary weekdays while
72h can hold a scarce copy across a long weekend. 48h spans a weekend without a long stranding.
_Assumption:_ mosque opening hours and the real collection rhythm are not recorded anywhere in the repo. If
the mosque is reachable only on set days, re-decide this as "N days" rather than a fixed 48h.

**D2 - No-show threshold.** **2** no-shows. Restriction scope is **borrowing only** - browsing, waitlisting,
activity registration, reviews and bookmarks all continue. Duration is **until an admin reviews and lifts
it**: not a fixed number of days, not permanent.
_Reasoning:_ a no-show strands a scarce copy and delays everyone queued behind it, so two is
proportionate. A fixed-day expiry invites waiting out the clock; permanent is too harsh for a community
tool. A human decides, because "will this person ever collect" is not a machine question. This is a
borrowing block, **not** the domain's _Suspension_, which is specifically the overdue penalty in
Section 4 - do not conflate the two. The counter is per user, incremented by the D1 expiry, decremented
never except by an admin lifting the block, and it is not reset by a pickup reschedule.

**D3 - "Finishing reading" trigger.** **Resolved by removal.** The only feature it served was Article
Feedback, which is cut (Section 2). If article feedback ever returns this must be decided again from
scratch, not inherited from the 2026 checklist.

**D4 - Activity overflow.** **Hard refusal, no waitlist.** The member is told the activity is full and
pointed at future sessions through the existing new-activity fan-out.
_Reasoning:_ an Activity is a single time-boxed event, unlike a book which circulates. Promoting someone
from an activity waitlist minutes before the start is worthless, and a waitlist would mean a second queue,
a second position sequence, a second promotion path and a second notification set, for occasional events.
_Revisit if:_ Activities become recurring series (a weekly circle, a repeating course) - that is exactly
when queueing starts to pay for itself.

**D5 - Extension policy.** Eligible from **3 days before the due date**, until the due date passes. **Max 1
extension per Loan**, max 21 days per extension (matching the existing cap). Total duration bounded to
**2x the base duration**. Auto-approve when the queue is empty, otherwise admin decides with a reason.
_Reasoning:_ once the due date has passed the correct action is to return the book - extension exists for
a member who knows in advance they need longer. One extension covers a genuine delay without turning
extension into renewal-by-default, and 2x base stops a scarce title being held indefinitely.
_Implementation note:_ "one pending extension per loan" is already enforced; "one extension _ever_ per
loan" is new and needs a rule, not just a constraint on the request.

**D6 - Cancelability.** Per operation, on one principle: **an explicit, prompt action by a member must
never leave the queue worse off than inaction did**, otherwise members get pushed onto the penalised path.

| Operation                     | Rule                                                                                                                                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loan request (`pending`)      | Member may cancel any time before the admin accepts. No copy is reserved at `pending`, so nothing to release.                                                                                                        |
| Accepted, not yet collected   | Member may cancel at any time. The copy is released immediately and the waitlist head promoted. **Not** a no-show - a no-show is the _absence_ of action, and cancelling helps the queue while no-showing delays it. |
| Extension request (`pending`) | Member may withdraw. Once approved the due date has moved and there is nothing to undo.                                                                                                                              |
| Activity registration         | Member may cancel until the activity **starts** - not until the registration deadline, which gates _joining_, not _leaving_. The spot is released and capacity re-opens.                                             |
| Pickup reschedule             | Admin action, see D1.                                                                                                                                                                                                |

_Implementation note:_ shipped behaviour has no cancellation at all for any of these, and
`currentParticipants` is only ever incremented, never decremented. See #153 and #155.

**D7 - Borrow-limit default.** **3**, configurable in Settings.
_Reasoning:_ at a 14-day loan duration a limit of 3 lets a member hold at most ~6 weeks of books at once -
a fair share for a community library, and it keeps scarce titles circulating. The shipped default of 5
allows ~10 weeks, which for a single-campus collection lets a few members hold most of the popular science
stock.
_Migration note:_ the shipped value is **5**, in two places - the `DEFAULT_BORROW_LIMIT` constant, which
the Settings field's `defaultValue` already derives from, and the seeded Settings row in the loan-lifecycle
migration. Changing the constant and backfilling the row in a new migration covers both. Tracked in #153.

---

## 15. Tech Stack & Architecture

### Architecture

- **Monolith**: one Next.js (App Router) process hosts the public site **and** Payload CMS in-process. REST at `/api/*`, GraphQL at `/api/graphql`, admin at **/admin** (same app).
- **Rendering split**: public read pages = Server Components + `getPayload`; interactive pages = Client Components + TanStack Query (cookie auth).
- **Auth**: Payload JWT cookie, `role` in JWT, role-based redirect + server-side re-checks. **Google OAuth** = only social login. **Password reset deferred.** Visitor->user gating: borrow/bookmark/register/review require sign-in (visitor is redirected, never blocked from browsing).

### Stack Table

| Layer           | Choice                                      |
| --------------- | ------------------------------------------- |
| Framework       | Next.js (App Router)                        |
| Runtime         | Node (Docker)                               |
| Language        | TypeScript                                  |
| CMS             | Payload CMS (in-process)                    |
| Database        | PostgreSQL 17 (local Supabase CLI / remote) |
| Storage         | Supabase S3                                 |
| Data fetching   | TanStack Query v5 (client)                  |
| State           | Zustand                                     |
| UI              | Tailwind + shadcn/ui + Base-UI              |
| Animation       | motion                                      |
| Forms           | react-hook-form + zod                       |
| Toasts          | sonner                                      |
| Email           | nodemailer (provider later)                 |
| Auth            | Payload auth + Google OAuth                 |
| Fonts           | Local Arabic fonts                          |
| Package manager | pnpm                                        |
| Lint            | ESLint                                      |
| Local Supabase  | Supabase CLI                                |

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

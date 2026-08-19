# PRD — USTHB Mosque Platform v1

## 1. Overview & Scope

**Vision:** A digital platform for the USTHB mosque community covering library (borrowing/waitlist/extensions/reviews), activities, articles, and notifications — with a full admin panel for management.

**Guardrails (binding):**
- **Design is final.** All UI must follow the completed design system/Figma. No new features beyond this PRD.
- Existing implemented pages are **polish-only** — flows stay, visuals conform to design tokens.
- Arabic-first, RTL throughout.

**Audience:** stakeholders (features/priority) + engineering (flows, data contracts).

**Personas:**

| Persona | Description |
|---|---|
| **Visitor** | Not logged in. Browsing landing, library catalog, activities, articles. Can search/view detail. Auth-required actions (borrow, waitlist, register, review, favorite/bookmark) → sign-in gate + redirect back. |
| **User (member)** | Logged-in community member. Borrow books, waitlist, extend, register for activities, review, favorite/bookmark articles & books, notifications, personal dashboard. |
| **Admin** | Full management: loans queue, pickups, users, books, articles, activities, reviews, logs, analytics, settings. |
| **Librarian (مداوم)** | v2 (documented as non-goal for v1). On-site borrowing, today's pickups. |

**Roles & permissions model:**
- `role: admin | user` on User (already in JWT). Visitor = unauthenticated.
- **No publisher role** — admins can create/edit/delete any article, activity, or book.
- **No matricule field** — admin manual-add searches by name/email instead.
- **Verification gate:** a user is **verified** when they have a stored **school certificate** (uploaded at registration, **stored in v1** — D13 ✓). **Borrowing/checkout is blocked until verified** (browsing/waitlisting allowed). Admin resolves verification state.

**Scope v1 (confirmed):**
- User core: notifications, loans (waitlist + extension + pickup), dashboards + calendars, articles (bookmarks, feedback, reviews), onboarding/helpers.
- Full admin panel: dashboard, loans, users, books, articles, activities, reviews, logs, analytics, settings.
- Landing polish (force autoplay).
- **Google OAuth** in scope; **password reset deferred** (not v1).

---

## 2. Non-Goals (v1 explicitly out)
- **Librarian (مداوم) dedicated view** — v2.
- **On-site borrowings** (reading in musalla, not taking home) — v2.
- **User-side audit activity log** — v2 (admin logs in scope).
- **Tasks** — v2.
- **Book damage tracking** — v2.
- **Password reset / forgot password** — deferred.
- **2FA** — deferred.
- **Multi-language / i18n** — Arabic-only for v1.
- **External analytics tools** — analytics computed from the DB only.
- Any feature not in this document, or any new visual element not in the approved design.

---

## 3. Cross-Cutting UX Specs (apply to every screen)
- **Component skeletons** for all async views (match final card/table layouts; shimmer in design tokens).
- **Empty states** for tables, listings, 404, and error states — use approved illustrations + CTA.
- **Confirmation alerts** on every destructive/mutating action (delete, cancel, accept/refuse, mark-as-returned, overrides).
- **Upload component** (profile picture, certificates) — drag-drop + validation, uses existing Media/S3.
- **In-app toasts** via Sonner (already present) for success/error on all actions.
- **Review KPI components** (rating summaries) reused on book and article contexts.

---

## 4. Loan Lifecycle State Machine (the heart)

Current model only has `pending / approved / returned / overdue`. This PRD defines the full machine; waitlist, extension, pickup and on-site all become transitions, not islands.

**Real-world flow (confirmed):** loans are **physical** — the book is picked up at the mosque. Flow: verified user requests → (auto-approve if a copy is free) → reservation + **pickup window** → user collects at the mosque → admin marks `picked` → due date from a **configurable duration** → admin marks `returned`. Extensions go through admin, with auto-approval when the queue is empty.

States:

1. `requested` (book req created; queued if no copies; user notified of state)
2. `waitlisted` (no copy available at request time; position in queue)
3. `approved_pickup` (copy reserved + pickup window set; "accepted borrowings" tag)
4. `picked` (user collected the book; loan active; due date set from config)
5. `on_site` (v2)
6. `extension_requested` (user asks to extend)
7. `returned` (book returned; copy released → next waitlist notified)
8. `overdue` (past due date without return/extension; escalation)
9. `no_show` (pickup window missed; reservation released, user warned)
10. `cancelled` (request/registration cancelled by user or admin)

**Key transitions & system actions (locked rules):**

- **Request & approval:** preconditions to request — user is **verified** AND **under the configurable borrow limit** (max concurrent loans). If `availableBooks > 0` → **auto-approve** → `approved_pickup` + pickup window + notification. If `availableBooks === 0` → `waitlisted` + position shown + notification on promotion.
- **Pickup window:** if the window expires without pickup → auto `no_show`, release copy to the waitlist, warn user (threshold → D2). Admin dropdown actions: **mark done / reschedule**. Needs a **pickup list view** ("picked and not" tags) — see Section 7.2.
- **Due date & return:** loan duration **configurable** in Settings (default 14 days). Admin marks `returned` → `availableBooks + 1` → notify next waitlisted member that the book is free.
- **Overdue:** auto **email + in-app alert** "borrowing duration is over". If waitlist non-empty → **request return**; else → **suggest extension**.
- **Extension:** user requests → **auto-approve when the queue is empty**; else admin approves/refuses with a reason.

**Verification tie-in:** unverified users can request/waitlist but **cannot reach `picked`**; admin is alerted to verify before pickup.

**Cancelability:** every operation (loan req, extension, registration, pickup) defines explicit cancel rules in Section 10 (open decisions).

---

## 5. Notifications (new subsystem)

**Channels:** **SSE** for in-app (bell + dropdown, the approved design) and **email** via nodemailer (existing; provider to be set later). Per-channel opt-in in Profile → Settings.

**Delivery model (locked):** events write a `notifications` collection (relation → user, `seen`, `type`, link, `emailSent` flag); an SSE push is delivered to the connected session on create; email is triggered from the same hook.

**Bell UX:** bell in navbar (desktop) + mobile menu; hidden for Visitor. Unread badge count. Click → dropdown (recent 10) → "view all" page with filters (all/unread by type).

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

---

## 6. Features — User View

Each item tagged **New / Extend / Polish**, with data impact.

### 6.1 Landing *(Polish)*
- Hero video **auto-plays forcibly** (muted, playsinline, autoplay, no-poster-gate).

### 6.2 Notifications *(New)*
- Bell + dropdown in navbar (Visitor → hide bell). Unread badge. Tap → destination route (loan, article, activity). Mark-as-read.
- List page with filters (all/unread by type). See Section 5.

### 6.3 My Activities *(Extend)*
- Registered activities (exists in profile) + **calendar view** (New): activities mapped to dates (existing `schedules`).
- **Dashboard calendar** (New): month grid combining activities + loan due dates (Section 6.4).

### 6.4 Dashboard (user) *(New)*
- Calendar of activities & due returns.
- Book request status cards.
- Activity log of **own** actions (light; full user log is v2).

### 6.5 Loans *(New + Extend)*
- **My loans** — currently borrowed list (exists; extend with state machine badges, pickup window, return due).
- **Extension request** (New) — button when eligible; per Section 4.
- **Waitlist** (New) — join if no free copy; show position; auto-promotion to request on availability.
- **Borrow-limit indicator** — show remaining concurrent loans.
- **Verification notice** — checkout blocked with a clear "needs verification" state until verified.

### 6.6 Books *(Extend)*
- **Request a non-existing book** (New) — form → new collection `book-requests`; surfaced to admin queue + "requested books" analytics.
- **Add review** (exists; polish to design).

### 6.7 Articles *(Extend)*
- **Info dialog** (New) — overlay with metadata (publisher, type, cover, date) on list items.
- **Reading-feedback popup** (New) — after "finishing reading" (define trigger in §10): like/dislike + optional comment (feeds analytics).
- **Add review** (New) — article reviews category (see §10 conflict with feedback).
- **Sections refinement** (Polish): fill/stroke styles + indentation per approved design.
- **Bookmark articles** (New) — mirrors book favorites; appears in Profile → bookmarks.

### 6.8 Activities *(Extend)*
- Registration exists. **Document all flows** in §8 (register → confirm → reminder → attended → feedback).
- Post-event **positive/negative feedback** (New) — small rating on detail after end date (feeds analytics).
- Capacity indicator exposed (participant counts already tracked).

### 6.9 Profile / Settings *(Extend + New)*
- **Bookmarks** tab: books (exists as favorites) + articles (new).
- **Notifications** tab: per-channel opt-in for the matrix in §5.
- **Info** tab: personal data (existing account tab).
- **Security** tab: change password (exists). **Password reset + 2FA deferred.**

### 6.10 Onboarding / Helpers *(New)*
- **First onboarding** — books + loan flow: 3–4 step intro on first library visit (dismissible, remembers seen).
- **Contextual helper** — when a borrowed book's return is near: explain extension possibility.
- **Waitlist helper** — explain waitlist & auto-promotion when requesting an unavailable book.

---

## 7. Features — Admin View (full panel)

### 7.1 Dashboard *(New)*
- Pending-request card (borrowing / extension / account verification / severe overdues).
- **Today's pickups** list (user, book, code, day+hour) with dropdown: mark done / reschedule.
- Latest reviews (top 3).
- Activities calendar (1).
- Today's activities log (3).
- New-users count (recent registration).

### 7.2 Loans *(New)*
- Request queue (if no copy → waitlist indicator).
- Extension-request queue.
- **KPIs:** total loans, this month, exceeded-time count, extension requests.
- Table: user, book, date, book status, quantity.
- **Duplicate-loan check:** alert before approving — "user has unreturned books" (2 actions: accept / refuse with reason).
- **Manual add** borrowing/extension dialog — **search by name/email (no matricule)**, book search, take/return dates.
- **Pickup view:** "picked / not" tags; used for no-show signalling.

### 7.3 Users *(New)*
- KPI of user books (low priority).
- User/staff table; row actions (dropdown or right-click menu).
- Previous borrowings per user (status: returned / not returned).
- Reviews per user (low).
- Extension requests with **due-check logic** (queue empty → available; else refuse).
- **Certificate** in profile info (stored in v1 — D13 ✓) + **verification state management**.

### 7.4 Books *(Extend)*
- Consistent sidebar elements (already designed).
- Books list/CRUD; duplicate handling via multi-copy model (§9 concern) — multiple copies share the same book id.

### 7.5 Articles *(New)*
- **KPIs:** total, this month, views, interactions.
- **Grid + list views** (list: title, description, type, date, publisher).
- **CRUD** — any admin can edit (no publisher ownership rule).
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
Computed **from the DB** (Postgres aggregation) — no external service.
- Article insights: reads, feedback (likes/dislikes). *(last 2)*
- Activity insights: registrations, positive/negative feedback. *(last 2)*
- Most-borrowed books; requested books; article with most interactions; categories most read; borrowings **monthly evolution**; days & hours where borrowings increase; days & hours when pickups increase.

### 7.9 Settings *(New)*
- Admin info (name, email, pfp).
- **Security**: change password, **2FA deferred**, logged-in devices/link device — **must verify identity first** (edit/manage as pages; verifications as dialogs).
- **Notifications**: toggles for logs, borrowing/extension/user requests, reviews, severe overdues, daily activities.
- **Loan configuration (New):** default loan duration + **borrow limit** (max concurrent loans).
- **Keyboard shortcuts** (add new borrowing, etc.).

### 7.10 Reviews *(New)*
- Two categories: **book reviews** and **article reviews**.
- Admin actions: delete / copy.
- KPIs (counts, avg per category).

---

## 8. Activities — Complete Flows (documented for both views)

1. **Browse → detail** (info: name, desc, image, dates, participants, location, type, duration, state).
2. **Register** (gates: open, deadline, max capacity) → confirmation notification.
3. **Pre-event**: reminder notification (schedule-based).
4. **Event day**: `attended` marked by admin/user.
5. **Post-event**: feedback (positive/negative) + auto-completion.
6. **Branch**: overflow capacity → waitlist/notification when spot opens (matches book waitlist pattern — decision in §10).
7. **Cancel**: registration cancellation rules (before deadline) + quota re-open.

---

## 9. Engineering Concern — Multi-Copy Books

- One `Book` doc with `totalBooks/availableBooks` counters (current model) satisfies "same book, one id".
- Copies aren't individually tracked in v1 (proposed — D7). Consequences for pickups ("book code"), no-show release, and on-site (v2) → generate a copy code at pickup time; revisit per-copy records only if design requires distinct copy codes.

---

## 10. Open Decisions

**Resolved (✅):**

| ID | Decision | Resolution |
|---|---|---|
| D9 | Notification delivery | **SSE** + sync email hook (provider later) |
| D12 | Admin manual add | Search by **name/email** (no matricule field) |
| D13 | User certificate | **Store in v1**; display in admin Users → profile info |
| — | Extension auto | **Auto-approve when queue empty** |
| — | Loan duration | **Configurable** (default 14 days) in Settings |
| — | Borrow limit | **Configurable** max concurrent loans |
| — | Publisher role | **None** — all admins edit all content |
| — | Deployment | **Docker/VPS** |
| — | Scale | **Thousands** of users |
| — | Language | **Arabic-only** v1 |
| — | Admin panel location | Stays under **/admin** |
| — | Password reset / 2FA | **Deferred** |

**Remaining (must be resolved before build):**

1. **D1 — Pickup window behavior**: duration (e.g., 24h/48h/72h), tolerance, reschedule limits, and exactly when `no_show` triggers.
2. **D2 — No-show threshold**: 2 warnings → restriction scope (blocks borrows? days? configurable?).
3. **D3 — "Finishing reading"** trigger for article feedback popup.
4. **D4 — Article reviews vs like/dislike feedback** — are they the same? (Conflicts between §6.7 and §7.8.)
5. **D5 — Activity overflow** — waitlist or plain "full" refusal?
6. **D6 — Extension policy**: max extensions, max total duration, when eligible (X days before due).
7. **D7 — Multi-copy model**: counters vs per-copy records (affects "book code" in pickups).
8. **D8 — Cancelability rules** per operation type.
9. **D10 — 2FA** in admin settings: deferred (confirmed) — revisit post-v1.
10. **D11 — Book-request lifecycle**: confirm `book-requests` collection; submitted → reviewed → procured/refused; notifications on each transition.
11. **Email provider** — to be set later.
12. **Borrow-limit default value** (proposal: 3 concurrent loans).

---

## 11. Suggested v1 Priority

**P0 (foundation):** notification subsystem (SSE), loan state machine, multi-copy model, book-requests.
**P1:** user waitlist + extension + my-loans, dashboards/calendars, article bookmarks+feedback, onboarding.
**P2 (admin):** loans queue + pickups + KPIs, articles/activities CRUD + analytics, logs, settings, reviews.
**P3 (polish):** landing autoplay, sections refinement, cross-cutting empty states/skeletons/confirmation-alerts.

---

## 12. Tech Stack & Architecture

### 12.1 Architecture
- **Monolith**: one Next.js (App Router) process hosts the public site **and** Payload CMS in-process. REST at `/api/*`, GraphQL at `/api/graphql`, admin at **/admin** (same app).
- **Rendering split**: public read pages = Server Components + `getPayload`; interactive pages = Client Components + TanStack Query (cookie auth).
- **Auth**: Payload JWT cookie, `role` in JWT, role-based redirect + server-side re-checks. **Google OAuth** = only social login. **Password reset deferred.** Visitor→user gating: borrow/bookmark/register/review require sign-in (visitor is redirected, never blocked from browsing).

### 12.2 Stack table
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

### 12.3 Environments
- **dev** `.env.local` → local Supabase (DB :54322, S3 :54321, Studio :54323, Inbucket :54324 for email).
- **preview/prod** `.env` → remote Supabase; `NODE_ENV` switches CSP/headers.

### 12.4 Data model
**Current:** users, media, books, activities, articles, loans, reviews, activity-registrations, book-favorites.
**Planned:** notifications, book-requests, waitlist, loan-extensions, logs, analytics-events, article bookmarks, article/activity feedback.
**Access control:** role-based matrix — visitor (read published), user (own data + interactions), admin (full). Field-level guards on roles.

### 12.5 Deployment
**Docker/VPS** (multi-stage standalone image; Vercel not targeted). Build = `payload migrate && next build`.

### 12.6 Logs & Analytics
- **Logs**: Payload `logs` collection — `actor` (user/admin), `action` (enum), `target` (book/loan/article/activity), `timestamp`, `metadata`. Admin view with multi-user / date-range / action-type filters. Admin logs v1; user logs v2.
- **Analytics**: computed **from the DB** (no external service) via aggregation over existing collections + a lightweight `analytics-events` collection (article reads, article feedback, activity feedback, views). KPIs = Postgres `GROUP BY` (monthly evolution via `date_trunc`, peak days/hours).
- **External monitoring**: propose (Sentry for errors + self-hosted Umami/Plausible for traffic, or none) — to be discussed with the team later.

### 12.7 Notifications architecture
- `notifications` collection (user, type, seen, link, emailSent) + **SSE** for real-time in-app delivery + nodemailer for email (provider TBD). Bulk audiences → digest option.

### 12.8 Scale & performance
- Target **thousands** of users. Notes: indexed/filtered queries, pagination on all listings, `select`/`maxDepth` limits, caching of public read queries; SSE connection pooling.

### 12.9 Language
- **Arabic-only** for v1; string/format conventions kept centralized for future locale support.

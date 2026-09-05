# PRD: USTHB Mosque Platform, MVP

Last rewritten 2026-09-05. This replaces the earlier PRD, which specified a v1 far larger than what the team can ship and test this semester. The full feature set is preserved in `SPEC.md` and in the v2 parking lot at the bottom of this document.

**Goal of this document:** define the smallest platform that real USTHB students can use for borrowing books this semester, on infrastructure the team owns, with the code left in a state that is easy to extend.

---

## 1. Decisions (locked)

These were settled on 2026-09-05 and are binding. Anything contradicting them in `SPEC.md` or older issues is out of date.

| Topic | Decision |
| --- | --- |
| First users | Real USTHB students, this semester |
| Admin panel | Payload's built in admin at `/admin`, plus two custom screens (verification queue, loans queue) |
| Deployment | Docker image on a VPS, behind Nginx. Not Vercel |
| Storage | S3 compatible (Supabase S3) in every environment |
| Loan flow | Lean: 4 statuses, plus copy release and waitlist promotion on return |
| Waitlist and extensions | In scope |
| Notifications | In scope, full subsystem: collection, SSE bell, transactional email |
| Book requests | In scope |
| Engagement | In scope: article bookmarks, article feedback, activity feedback |
| Password reset | In scope, required because real students will lock themselves out |
| Privacy and terms pages | In scope, required by Law 18-07 since identity documents are collected |
| Language | Arabic only, RTL |
| Google OAuth | Already shipped, login only, never creates accounts |

---

## 2. Personas

| Persona | Can do |
| --- | --- |
| **Visitor** | Browse landing, library, articles, activities. Any action that writes data redirects to sign in and returns |
| **User** | Everything a visitor can, plus borrow, waitlist, extend, register for activities, review, bookmark, and a personal portal at `/user/*` |
| **Admin** | Manage all content through Payload admin, plus verify users and run the loans queue on two custom screens |
| **Librarian** | v2. On site borrowing is out of scope |

**Verification gate.** A user uploads a student card or registration certificate at registration. An admin approves or rejects it. Only a verified user can borrow. Unverified users can browse and join waitlists.

---

## 3. What is already built

Recorded here so nobody rebuilds it. Verified against `dev` on 2026-09-05.

**Auth (complete apart from password reset).** Registration with identity document upload and Law 18-07 consent, login, logout with server side session revocation, Google OAuth login for existing accounts, session cookie lifetime tied to token expiry, session rotation on password change, admin and member routing, open redirect protection, verification gate on borrowing.

**Collections.** `users`, `media` (with private, owner scoped verification documents), `books`, `activities`, `articles`, `loans`, `reviews`, `activity-registrations`, `book-favorites`.

**Public site.** Landing, library list with filters and search, book detail with reviews and favorites, articles list and detail, activities list and detail, about us, contact us, 404.

**Member portal at `/user/*`.** Dashboard with stat cards and previews, library, book detail, my loans, my registrations, bookmarks (books), articles, activities, latest updates, settings with name change and password change.

**Admin.** Payload admin at `/admin` with custom login, first user and account views.

**Architecture.** Feature folders (`features/<domain>/{components,api,server}`) with a shared layer (`shared/{ui,listing,layouts,hooks,lib}`), import boundaries enforced by ESLint, Next 16 `proxy.ts`.

**Not built.** Migrations, tests, deployment pipeline, and everything in section 5.

---

## 4. Out of scope for the MVP

Cut deliberately. Each one is parked in section 9, not forgotten.

- Full 10 state loan machine, pickup windows, no show automation, on site borrowing.
- Custom admin panel: DataTable, CRUD screens per collection, KPIs, calendars, audit logs, analytics, admin settings UI.
- User facing audit log, dashboard calendar, onboarding tours and contextual helpers.
- Article reviews as a separate concept from article feedback. One feedback model only.
- 2FA, multi language, external analytics, book damage tracking, tasks.

---

## 5. MVP feature set

Each item maps to exactly one issue. Nothing here is optional.

### 5.1 Loan lifecycle (lean)

Today `borrowBook` creates a `pending` loan and decrements `availableBooks`, and nothing ever gives the copy back. That is the gap.

Statuses stay the four that exist: `pending`, `approved`, `returned`, `overdue`.

- **Request.** A verified user under the borrow limit requests a book. A copy free means `pending` and `availableBooks` drops. No copy free means the request joins the waitlist instead.
- **Return.** An admin sets a loan to `returned` in Payload admin. A collection hook gives the copy back and promotes the first waitlisted user.
- **Waitlist.** Position is tracked FIFO. The promoted user gets a notification and an email. The user sees their position in `/user/my-loans`.
- **Extension.** A user requests more time on an active loan. Auto approved when nobody is waiting, otherwise an admin decides. The due date moves by the configured duration.
- **Configuration.** Loan duration (default 14 days) and borrow limit (default 3) live in a Payload global, not in constants.

### 5.2 Notifications

- `notifications` collection: user, type, title, message, link, seen, emailSent.
- SSE endpoint streaming to the signed in session, with heartbeat.
- Navbar bell with unread badge and a recent dropdown, hidden for visitors, plus a list page with filters.
- Transactional email through the existing nodemailer setup for waitlist promotion, extension decisions, verification result, and overdue notices.

### 5.3 Book requests

A user asks for a book that is not in the catalog. It lands in a queue an admin resolves from Payload admin. The user is notified of the outcome.

### 5.4 Engagement

Article bookmarks (mirroring book favorites), article feedback (like or dislike plus an optional comment, one per user per article), and activity feedback (positive or negative after the activity ends).

### 5.5 Password reset

Request a reset link by email, set a new password from the link, all sessions revoked on success. Built on Payload's `forgotPassword` and `resetPassword` operations.

### 5.6 Privacy and terms

Two static Arabic pages, linked from the footer and the registration consent checkbox. The privacy page names the data controller and covers what is collected, why, how long it is kept, and the user's rights, per Law 18-07.

### 5.7 Admin screens (two only)

Everything else is Payload admin.

- **Verification queue.** Pending users with their identity document previewed inline, approve or reject with a reason. This is high frequency work and Payload's default UI makes it several clicks per user.
- **Loans queue.** Open loans and extension requests in one table, with mark returned and approve or reject extension actions.

---

## 6. Delivery order

Blockers are real. Nothing in phase 2 can ship correctly before phase 0 lands.

```
Phase 0  migrations  ->  tests  ->  cleanup  ->  deployment
Phase 1  notifications
Phase 2  loan lifecycle  ->  book requests, engagement
Phase 3  admin screens
Phase 4  password reset, privacy and terms
```

Migrations come first because every collection added later is invisible in production without them. Notifications comes before the loan lifecycle because waitlist promotion and extension decisions are its first consumers.

---

## 7. Architecture

Unchanged from what is built, summarised for reference. `CLAUDE.md` is the detailed contributor guide.

- **One process.** Next.js 16 App Router with Payload 3 mounted in process. REST and GraphQL at `/api/*`, admin at `/admin`.
- **Two data paths.** Server components and server actions use the Payload Local API through `shared/lib/auth.ts`, always with `req` and `overrideAccess: false`. Client components use TanStack Query against the REST API through `shared/lib/http-client.ts`.
- **Feature folders.** `features/<domain>/` owns its components, queries, server actions and types. `shared/` holds anything two features need. `app/` is routing only. Cross feature imports go through the feature barrel, enforced by ESLint.
- **Auth.** Payload JWT in an httpOnly cookie, `role` and `verificationStatus` in the JWT, server side re-check on every action. `proxy.ts` is a UX redirect only, never the security boundary.

### Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| CMS | Payload 3, in process |
| Database | PostgreSQL 17 |
| Storage | S3 compatible (Supabase S3) |
| Client data | TanStack Query v5 |
| UI | Tailwind 4, shadcn/ui, Base UI |
| Forms | react-hook-form and zod |
| Email | nodemailer |
| Tests | Vitest and Playwright |
| Runtime | Node 22 in Docker |
| Package manager | pnpm |

### Deployment

Docker image with `output: 'standalone'`, multi stage build, `sharp` present in the runner stage, behind Nginx with an extended proxy timeout for `/admin` and buffering disabled for the SSE endpoint. PostgreSQL either on the same machine or managed in the same datacenter. Build runs `payload migrate && next build`, so a failed migration fails the deploy.

### Data model

**Exists:** users, media, books, activities, articles, loans, reviews, activity-registrations, book-favorites.

**MVP adds:** notifications, book-requests, loan-extensions, article-bookmarks, article-feedback, activity-feedback, and a settings global. Every one of them ships with a migration in the same pull request.

---

## 8. Definition of done for the MVP

- A student can register, be verified by an admin, browse, borrow, join a waitlist, be promoted, extend, and return a book, and be told about each of those by bell and email.
- An admin can do everything needed to run the library without touching the database.
- A forgotten password is recoverable without an admin.
- The app runs from a Docker image on the VPS, with migrations applied on deploy and backups configured.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass in CI on every pull request.

---

## 9. v2 parking lot

Kept so the cuts stay deliberate. Detail lives in `SPEC.md` and in the closed issues.

Pickup windows and no show handling, the full 10 state machine, on site borrowing, librarian view, custom admin panel with per collection CRUD and KPIs, admin audit logs, analytics dashboards, admin settings UI, user audit log, dashboard and activities calendars, onboarding tours, contextual helpers, activity waitlists, 2FA, i18n, book damage tracking.

---

## 10. Open questions

Small, and none of them block starting.

1. Extension policy: how many extensions per loan, and how close to the due date can one be requested.
2. Overdue handling: reminder cadence, and whether an overdue loan blocks new borrowing.
3. Email sender: which SMTP provider and which from address in production.
4. Bulk notifications: whether "new article" and "new activity" notify everyone, and whether that is opt in.

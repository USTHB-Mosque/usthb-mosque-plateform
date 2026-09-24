# Domain Model - USTHB Mosque Library Platform

## Language

**Visitor**:
An unauthenticated person browsing the platform. Can view public content (landing, catalog, articles, activities) but cannot perform mutations (borrow, register, review, bookmark).
_Avoid_: Guest, anonymous user

**User**:
A logged-in community member with role `user`. Can borrow books, waitlist, extend, register for activities, review, bookmark, and access their dashboard.
_Avoid_: Student (too narrow - platform serves the whole mosque community)

**Admin**:
Library staff with role `admin`. Full management: loans queue, pickups, users, books, articles, activities, reviews, logs, analytics, settings.
_Avoid_: Manager, operator

**Librarian**:
v2 persona. On-site borrowing, today's pickups. Explicitly out of scope for v1.

## Verification

**Verification Document**:
Identity document uploaded during registration - either a student card or registration certificate. Stored in Media (S3). Required for verification; private URLs only.
_Aavoid_: Card image, student card (too narrow - also accepts registration certificates)

**Verification Status**:
Three-state field on User: `pending_verification`, `verified`, `rejected`. Admin reviews the verification document and approves or rejects.
_Avoid_: Account status, approval state

**Verified User**:
A user whose verification document has been approved by an admin. Verified users can borrow books (subject to borrow limit). Unverified users can browse and waitlist but cannot reach the `picked` loan state.
_Avoid_: Approved user, confirmed user

## Books & Copies

**Book**:
A title in the library collection. Has metadata (title, author, ISBN, description, cover image, bookType). Tracks availability via `totalBooks`/`availableBooks` counters.
_Avoid_: Item, publication

**Book Type**:
Classification for filtering: `religious` or `scientific`. Does NOT determine loan duration (duration is configurable in Settings).
_Aavoid_: Category, genre

**Multi-Copy Model**:
One Book doc with `totalBooks`/`availableBooks` counters. Individual copies are NOT tracked in v1. A copy code is generated at pickup time if needed. Per-copy records deferred to v2.
_Avoid_: Copy tracking, barcode system

## Loan Lifecycle

**Loan**:
A physical book borrowing. Moves through five stored states; overdue is derived from `dueDate`. The book is picked up at the mosque - loans are physical, not digital.
_Avoid_: Borrowing, checkout (too e-commerce)

**Loan State**:
Five stored states (phase 1, #19, Figma Borrowings): `pending` (قيد الانتظار, the fresh request), `accepted` (مقبول, copy reserved), `picked_up` (تم الأخذ, due date stamped), `returned` (تم الإرجاع), `refused` (مرفوض). Overdue is NOT stored: a `picked_up` loan past its `dueDate` reads as overdue by derivation (`getEffectiveLoanStatus`), and the borrower is notified once (`overdueNotified` flag) by a lazy check on read — no scheduled job.
_Avoid_: A stored "overdue" state; "requested/approved_pickup/no_show/cancelled" (older 10-state machine, deferred)

**Waitlist**:
A separate FIFO collection, `waitlist-entries` (book, user, position), per issue #19 — this supersedes the earlier "no separate collection" note. A request with no free copy joins the end of the queue (`position` stamped server-side); marking a loan returned releases the copy and promotes the first waiter (who does not already hold an active loan) into a fresh `pending` loan, then resequences the remaining positions.
_Avoid_: Reservation queue, reservation

**Pickup Window**:
Configurable time window after `accepted` during which the user must collect the book. If expired -> `refused`. Admin can reschedule.
_Avoid_: Collection window, pickup deadline

**Extension**:
A request to extend the loan due date. Auto-approved when the waitlist is empty; otherwise requires admin approval with a reason.
_Avoid_: Renewal, prolongation

**Borrow Limit**:
Configurable maximum number of concurrent loans per user. Default proposed: 3. Enforced as a precondition for loan requests.
_Avoid_: Loan cap, borrowing limit

**Suspension**:
When a loan is overdue, the user is suspended from new loans until the book is returned. This is the enforcement mechanism; alerts are the communication layer.
_Avoid_: Block, ban (too strong)

## Notifications

**Notification**:
An event written to the `notifications` collection. Has `user`, `type`, `seen`, `link`, `emailSent`. Delivered via SSE (in-app) and optionally via email.
_Avoid_: Alert, message (too generic)

**SSE**:
Server-Sent Events. Used for real-time in-app notification delivery. Bell in navbar shows unread count; dropdown shows recent 10; "view all" page with filters.
_Avoid_: WebSocket, push notification

**Bell**:
The notification UI element in the navbar (desktop) + mobile menu. Hidden for Visitor. Shows unread badge count.
_Avoid_: Notification icon, alert bell

**Email Digest**:
Aggregated email for bulk audiences (new activity/article). Sent daily or on-demand. Opt-in by default OFF.
_Avoid_: Newsletter, batch email

## Activities

**Activity**:
Community events (lectures, study groups, book clubs, religious circles) managed by admins. Has types: events vs "all-time" activities. Users register to attend.
_Avoid_: Event (too narrow - also includes "all-time" activities)

**Activity Feedback**:
Post-event positive/negative rating. Feeds analytics. Given after the activity's end date.
_Aavoid_: Activity review, activity rating (use "feedback" to distinguish from formal reviews)

## Articles

**Article**:
Admin-created content published on the platform. Users cannot create articles. Has metadata (title, description, type, cover, publisher, date).
_Avoid_: Post, blog entry

**Article Feedback**:
Like/dislike + optional comment on an article. Merged with article reviews into a single interaction type. Feeds analytics.
_Avoid_: Article review (use "feedback" - the like/dislike model is not a star rating)

**Article Bookmark**:
Saved article for later reading. Mirrors book favorites. Appears in Profile -> bookmarks.
_Aavoid_: Save, reading list

## Reviews

**Review**:
Star rating (1-5) + comment on a book. Only on books the user has loaned. Separate from article feedback (which is like/dislike).
_Avoid_: Rating, feedback (keep "review" for the formal star+comment on books)

## Admin Panels

**Logs**:
Audit trail of admin actions. Collection: `logs` with actor, action, target, timestamp, metadata. Admin-only view with filters. User logs deferred to v2.
_Aavoid_: Audit log, activity log (use "logs" as the collection name)

**Analytics**:
Computed from DB via Postgres aggregation. No external service. `analytics-events` collection for article reads, feedback, views. KPIs = GROUP BY queries.
_Avoid_: Metrics, dashboard analytics

**Settings**:
Admin panel for configuration. Includes: admin info, security, notifications toggles, loan configuration (duration + borrow limit), keyboard shortcuts.
_Avoid_: Preferences, configuration

## Legal & Compliance

**Law 18-07**:
Algerian law on protection of personal data. Governs consent, purpose limitation, data residency, and user rights. Platform must comply.
_Avoid_: Data protection law, ANPDP law

**Consent**:
Explicit checkbox during registration (not pre-checked). Required for Law 18-07 compliance. Timestamped.
_Avoid_: Agreement, acceptance

**Soft Delete**:
Account disabled immediately on deletion request. Data retained for 30 days, then permanently deleted. Verification document deleted immediately on soft delete.
_Avoid_: Deactivation, archiving

**Data Controller**:
The entity responsible for data processing: library management / mosque scientific association. Must be identified in privacy policy.

## Deployment & CI/CD

**Preview Deployment**:
A Vercel-generated deployment URL created on every push to `dev` or PR to `main`. Used to verify changes before promoting to production. Ephemeral — replaced on next push.
_Avoid_: Staging deployment, test deployment

**Production Deployment**:
The live deployment at the production URL, served from the `main` branch. Only updated on merge to `main`.
_Avoid_: Live deployment, release

**Branch Workflow**:
`dev` = preview environment (every push gets a Vercel preview URL). `main` = production. Feature work PRs go to `dev` first; promoted to `main` when ready to ship.
_Avoid_: Gitflow, trunk-based (this is a simplified two-branch flow)

**CI Pipeline**:
GitHub Actions runs `pnpm lint` and `pnpm typecheck` on every PR (to `dev` or `main`). No secrets required — these checks don't touch the database or external services. Vercel handles build + deploy separately.
_Avoid_: Build pipeline, deployment pipeline (CI is checks only; deploy is Vercel's job)

**Secrets Management**:
All runtime secrets (PAYLOAD_SECRET, DATABASE_URL, S3 keys, email credentials) live in Vercel's environment configuration only. CI has zero secrets. If CI ever needs secrets (e.g., integration tests), use Vercel's Environments API (`vercel env pull`) to pull them dynamically.
_Avoid_: Environment variable management, secrets vault

## Key Relationships

- **User** -> has many **Loans** (lifetime)
- **User** -> has many **Notifications**
- **User** -> has many **Reviews** (books only)
- **User** -> has many **Article Bookmarks**
- **User** -> has many **Article Feedback**
- **User** -> has many **Activity Registrations**
- **User** -> has many **Activity Feedback**
- **User** -> has many **Book Requests**
- **Book** -> has many **Loans** (history via counters)
- **Book** -> has many **Reviews**
- **Book** -> `totalBooks` / `availableBooks` counters
- **Loan** -> belongs to **User** + **Book**
- **Loan** -> may have **Loan Extension** requests
- **Activity** -> has many **Activity Registrations**
- **Activity** -> has many **Activity Feedback**
- **Article** -> has many **Article Feedback**
- **Article** -> has many **Article Bookmarks**
- **Admin** -> creates **Articles**, **Activities**, **Books**
- **Admin** -> verifies **Users**
- **Admin** -> manages **Loans** (approve, mark picked, mark returned)

## Status Flows

### User Registration Flow

1. User submits registration form with personal data + verification document + consent checkbox
2. Status: `pending_verification`
3. Admin reviews verification document, approves or rejects
4. If approved: status -> `verified` (can borrow, subject to limit)
5. If rejected: status -> `rejected` (can re-upload)

### Loan State Machine Flow

1. Member requests a loan: verified, under the borrow limit, no active loan or queued row for the book
2. A free copy gives a `pending` loan; no free copy joins the end of the `waitlist-entries` queue
3. Admin accepts a `pending` loan -> `accepted`: copy reserved, unique pickup code minted, pickup date/hour stamped, borrower notified
4. Admin refuses -> `refused` with a mandatory reason; any reserved copy is released, borrower notified
5. Admin marks `accepted` -> `picked_up`: due date stamped from the book duration or the Settings global
6. Past due date -> derived overdue; borrower notified exactly once
7. Marking returned -> `returned`: copy released, waitlist head promoted in the same transaction, promoted user notified
8. Member requests extension on their `picked_up` loan: auto-approved when the book's queue is empty (due date moves, both dates recorded), otherwise pending for an admin; approval moves the due date and records both dates

### Verification Gate

- Unverified users: can browse, search, waitlist
- Verified users: can borrow (subject to borrow limit), waitlist, extend
- Blocked at `picked` state if not verified (admin alerted)

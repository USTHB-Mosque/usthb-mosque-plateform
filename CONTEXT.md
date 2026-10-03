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
Three-state field on User: `pending_verification`, `verified`, `rejected`. Admin reviews the verification document and approves or rejects. A rejection always carries a reason in `verificationNote` — the collection refuses a `rejected` write without one on every path, including an admin editing the row in `/admin`, because the member is told the reason in the bell and in the email (#145).
_Avoid_: Account status, approval state

**Verified User**:
A user whose verification document has been approved by an admin. Verified users can borrow books (subject to borrow limit). Unverified users can browse and waitlist but cannot reach the `picked_up` loan state.
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

## Library Cards

**Library Card**:
The `library-cards` row that lets a Verified User borrow. Exactly one per user, and its `cardId` is derived from the user id (`M-` + the id zero-padded to five digits), so the identity is stable and readable. The same id is denormalised onto `users.cardId` for the users table.
_Avoid_: Membership, subscription

**Card Issuance**:
Automatic. Minting happens the moment a user becomes `verified` (`ensureLibraryCard`, run from the User hook) and the migration backfilled the rows for everyone verified earlier. The admin "إضافة بطاقة" action is only a repair: it issues the one card a verified member is missing, or puts a withdrawn one back in service. An admin never hands out a second card for the same person.
_Avoid_: Creating cards by hand; "one card per issue of a book"

**Card Status**:
Three stored states (#145, Figma `cards` 1606:14136): `active` (فعالة — in circulation), `inactive` (غير فعالة — withdrawn but recoverable: lost, being replaced, under review) and `archived` (مأرشفة — retired for good, the member graduated or left). A card is always in exactly one of them; `status` is never null. Only `archived` stamps `archivedAt`, and leaving `archived` clears the stamp, so the date reads as the last time the card left circulation — a redundant re-archive of an untouched card keeps its stamp rather than inventing a second one. The cards index reports the four Figma counts: total, active, inactive, archived.
_Avoid_: "expired"/"suspended" as separate card states; treating `inactive` and `archived` as the same thing

**Card Transition**:
Which state a card may move to from where, in `LIBRARY_CARD_TRANSITIONS`: an `active` card can be withdrawn or retired, a withdrawn one reinstated or retired, a retired one only reinstated. The row menu and the `setCardStatus` action read the same table, so the server refuses the moves the UI does not offer.
_Avoid_: Letting an admin set any status from any status and calling it the same feature

## Loan Lifecycle

**Loan**:
A physical book borrowing. Moves through six stored states; overdue is derived from `dueDate`. The book is picked up at the mosque - loans are physical, not digital.
_Avoid_: Borrowing, checkout (too e-commerce)

**Loan State**:
Six stored states (#19 Figma Borrowings; `cancelled` added by #153): `pending` (قيد الانتظار, the fresh request), `accepted` (مقبول, copy reserved), `picked_up` (تم الأخذ, due date stamped), `returned` (تم الإرجاع), `refused` (مرفوض), `cancelled` (ملغى, the member withdrew it themselves). Overdue is NOT stored: a `picked_up` loan past its `dueDate` reads as overdue by derivation (`getEffectiveLoanStatus`), and the borrower is notified once (`overdueNotified` flag) by a lazy check on read — no scheduled job.
_Avoid_: A stored "overdue" state; "requested/approved_pickup/no_show" (older 10-state machine, still deferred — `cancelled` from it is now built, see Cancellation)

**Waitlist**:
A separate FIFO collection, `waitlist-entries` (book, user, position), per issue #19 — this supersedes the earlier "no separate collection" note. A request with no free copy joins the end of the queue (`position` stamped server-side); marking a loan returned releases the copy and promotes the first waiter (who does not already hold an active loan) into a fresh `pending` loan, then resequences the remaining positions.
_Avoid_: Reservation queue, reservation

**Pickup Window**:
Configurable time window after `accepted` during which the user must collect the book. If expired -> `refused`. Admin can reschedule. Two expired windows suspend borrowing only, until an admin lifts it.
_Avoid_: Collection window, pickup deadline

**Extension**:
A request to extend the loan due date. Auto-approved when the waitlist is empty; otherwise requires admin approval with a reason. The member may withdraw it while it is still `pending`; once approved the due date has already moved and there is nothing to undo.
_Avoid_: Renewal, prolongation

**Cancellation**:
SPEC D6. A member withdrawing their own Loan request while it is still `pending` or `accepted`, or their own extension request while it is `pending`. `pending -> cancelled` releases nothing because no copy was ever reserved; `accepted -> cancelled` releases the copy and promotes the waitlist head exactly as an admin refusal would — but it notifies nobody, records no reason and never increments `noShowCount`, because cancelling helps the queue while a no-show delays it. Written by a server action with `overrideAccess: true` after ownership and state checks (the collection update rules stay admin-only), and recorded in the audit log as `loan_cancelled` / `extension_withdrawn`.
_Avoid_: Withdraw a loan (that word belongs to extension requests), cancellation request

**Borrow Limit**:
Configurable maximum number of concurrent loans per user. Default: 3. Enforced as a precondition for loan requests.
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
Like/dislike + optional comment on an article. **Cut from v1** - not in the approved design, so it is not
being built. Kept here because the term is still used in older design notes. It was _not_ merged into
article reviews: an article can be reviewed (see Review), which is a different, live interaction.
_Avoid_: Article review (use "feedback" - the like/dislike model is not a star rating)

**Article Bookmark**:
Saved article for later reading. Mirrors book favorites. Appears in Profile -> bookmarks. The storage
collection exists and bookmarks are readable and removable, but the **member-facing toggle on the article
is cut from v1** - not in the approved design.
_Aavoid_: Save, reading list

## Reviews

**Review**:
Star rating (1-5) + comment, on a **book or an article** - the target is one or the other, never both.
On a book it is only allowed for a book the user has loaned. Distinct from the cut Article Feedback above.
_Avoid_: Rating, feedback (keep "review" for the formal star+comment)

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
A temporary deployment used to verify changes before promotion. Vercel previews remain available during the VPS transition.
_Avoid_: Staging deployment, test deployment

**Production Deployment**:
The deployment serving the community at the production URL. A VPS is the target host.
_Avoid_: Live deployment, release

## Key Relationships

- **User** -> has many **Loans** (lifetime)
- **User** -> has many **Notifications**
- **User** -> has many **Reviews** (a book **or** an article, never both)
- **User** -> has many **Article Bookmarks** (stored; the member-facing toggle is cut)
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
- **Article** -> has many **Article Bookmarks** (stored; toggle is cut)
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

1. Member requests a loan: **not suspended by an overdue loan**, under the borrow limit, no active loan or queued row for the book. Verification is not a precondition — it is checked at collection (see Verification Gate below)
2. A free copy gives a `pending` loan; no free copy joins the end of the `waitlist-entries` queue
3. Admin accepts a `pending` loan -> `accepted`: copy reserved, unique pickup code minted, pickup date/hour and the pickup window stamped, borrower notified of both the slot and the deadline
4. Pickup window passes without a collection -> `refused` with the window-expiry reason: copy released, waitlist head promoted, borrower warned, `noShowCount` incremented. Two of these suspend borrowing only, until an admin lifts it; rescheduling sets a fresh window and never resets the counter
5. Admin refuses -> `refused` with a mandatory reason; any reserved copy is released, borrower notified
6. Admin marks `accepted` -> `picked_up`: due date stamped from the book duration or the Settings global. Refused unless the borrower is verified; an admin is alerted when one is attempted anyway
7. Past due date -> derived overdue; borrower notified exactly once, and new loan requests are suspended until the book is returned
8. Marking returned -> `returned`: copy released, waitlist head promoted in the same transaction, promoted user notified
9. Member requests extension on their `picked_up` loan: auto-approved when the book's queue is empty (due date moves, both dates recorded), otherwise pending for an admin; approval moves the due date and records both dates
10. Member cancels their own request while `pending` or `accepted` (from the three-dot menu or the details dialog, behind a confirmation): `cancelled`. `pending` releases nothing; `accepted` releases the copy and promotes the waitlist head in the same transaction. Borrower not notified, no reason recorded, `noShowCount` untouched, the D7 budget slot returned, audit row `loan_cancelled`
11. Member withdraws their own extension request while `pending`: `withdrawn`. The due date never moved, so nothing is undone; no notification, audit row `extension_withdrawn`

### Verification Gate

- Unverified users: can browse, search, waitlist
- Verified users: can borrow (subject to borrow limit), waitlist, extend
- Blocked at `picked_up` state if not verified (admin alerted)

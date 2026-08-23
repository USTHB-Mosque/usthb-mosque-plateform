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
A physical book borrowing. Goes through a 10-state lifecycle. The book is picked up at the mosque - loans are physical, not digital.
_Aavoid_: Borrowing, checkout (too e-commerce)

**Loan State**:
10 states: `requested`, `waitlisted`, `approved_pickup`, `picked`, `on_site` (v2), `extension_requested`, `returned`, `overdue`, `no_show`, `cancelled`.
_Avoid_: Loan status (use "state" for the full machine, "status" only for simple flags)

**Waitlist**:
Integrated into the loan state machine as the `waitlisted` state. NOT a separate collection. When a copy is released, the next waitlisted user is promoted to `approved_pickup`.
_Avoid_: Reservation queue, reservation (the old SPEC had a separate Reservation collection - this is eliminated)

**Pickup Window**:
Configurable time window after `approved_pickup` during which the user must collect the book. If expired -> `no_show`. Admin can reschedule.
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
1. User requests loan (or auto from waitlist promotion)
2. If copies available: auto-approve -> `approved_pickup` + pickup window
3. If no copies: -> `waitlisted` (position in queue)
4. User collects at mosque -> admin marks `picked` -> `picked` (due date set from config)
5. Due date approaches -> reminder notification
6. Past due date -> `overdue` (suspension + alerts)
7. Book returned -> `returned` (copy released, next in waitlist notified)
8. If pickup window expires -> `no_show` (copy released, user warned)
9. User can request extension -> `extension_requested` (auto-approve if queue empty, else admin decides)
10. Any state -> `cancelled` (per cancelability rules)

### Verification Gate
- Unverified users: can browse, search, waitlist
- Verified users: can borrow (subject to borrow limit), waitlist, extend
- Blocked at `picked` state if not verified (admin alerted)

# Open Decisions — Review Checklist (Design Team)

**Companion to:** `docs/PRD.md` (§10 Open Decisions)

**Purpose:** Each item below must be answered before build starts. Answers unlock P0 (loan state machine, notifications, multi-copy model, book-requests) and unblock the admin panel. Add a decision date + owner column.

**Instructions for the reviewer:** For each decision, pick an option (or write your own) and mark one of: ✅ confirmed / ❌ reject / 🔄 needs revision.

---

## Resolved (✅)

| ID | Decision | Resolution |
|---|---|---|
| D9 | Notification delivery | **SSE** + sync email hook (provider TBD) |
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

---

### D1 — Pickup window behavior
When a borrower's request is approved, a **pickup window** is created.
- **Duration:** 24h / 48h / 72h / other
- **Reschedule allowed?** How many times? Who can do it (user, admin, both)?
- **Exact `no_show` trigger:** window expires without pickup → auto `no_show`?

### D2 — No-show threshold & restriction
- **Threshold:** after how many no-shows does the user get restricted? (default proposal: **2**)
- **Restriction scope:** block new borrows? all borrows? only hold reservations?
- **Duration:** fixed days / until review / permanent?

### D3 — "Finishing reading" trigger (article feedback popup)
The popup appears "after finishing reading". Define the trigger:
- **Scroll to 100%** of content
- Min **read time** (e.g., ≥60s) AND scroll threshold
- **Manual button** ("أتممت القراءة")
- Combination? Which one wins if conflicting (e.g., user scrolls fast)?

### D4 — Article reviews vs like/dislike feedback
Conflict between §6.7 (article review) and §7.8 (feedback likes/dislikes).
- Are they the **same mechanism**? (choose one)
- Or **two distinct** things (a 1–5 written review AND a quick like/dislike)?
- If two: where does each appear on the reading page? Does the admin Reviews section (§7.10) manage both?

### D5 — Activity overflow behavior
When an activity is at max capacity and a user tries to register:
- **Waitlist** (mirror book waitlist; auto-promote on spot + notify)
- **Hard refusal** ("نشاط مكتمل", no waitlist)
- Waitlist with consent popup?

### D6 — Extension policy
- **Eligibility window:** how many days before due can user request? (e.g., 3–7 days before due)
- **Max extensions per loan:** 1 / 2 / unlimited
- **Max total loan duration** (base + extensions): default proposal 2× base.
- **Auto vs manual:** user requests → admin approves (current §4), or auto-approve when queue empty?

### D7 — Multi-copy model
"Same book, more copies, same id" — decide the data shape:
- **Keep counters** (`totalBooks`/`availableBooks`) — copies NOT individually tracked; copy code generated at pickup. (simplest)
- **Per-copy records** (sub-document per physical copy) — enables per-copy codes, damage tracking (v2), on-site (v2).

### D8 — Cancelability rules (per operation)
Define cancel windows + side effects for:
- **Book request** (before pickup? role? freed copy re-released to waitlist?)
- **Extension request** (before approval only? after approval cannot cancel?)
- **Activity registration** (before deadline? frees a spot → notify overflow?)
- **Pending pickup** (before `picked` only?)

### D9 — Notification delivery ✅ resolved
- **Frontend channel:** **SSE** (authenticated endpoint, one connection per logged-in user). Polling fallback if SSE drops (e.g., 60s) — decide with engineering.
- **Email strategy:** sync send from the same hook on create; provider TBD. Failure policy (retry? fallback to in-app only?) still open.
- **Bulk audiences** ("new activity"/"new article" to all users): in-app + **digest email** (daily/on-demand).

### D10 — 2FA & admin security
Design exists for admin settings §7.9 (must verify identity first).
- **In v1 or deferred?**
- If in: which 2FA method (TOTP app / email OTP / both)? Applies to admin only or all users?

### D11 — "Request a non-existing book" (user)
- **New collection** `book-requests` (title, author, submittedBy, status) — confirm.
- **Lifecycle:** submitted → reviewed → (procured → added to catalog) / refused. Who closes it? Does the requester get notified on each transition?
- **Relationship to waitlist:** not the same thing (this is outside the catalog) — confirm.

### D12 — On-the-day admin verification flow (loans) ✅ resolved
§7.2 duplicate-loan alert ("user has unreturned books" → accept/refuse).
- **Acceptance** — approve anyway, warn admin.
- **Refusal** — requires a **reason** (shown to user in notification).
- **Manual add dialog:** search by **name/email** — **no matricule field** (confirmed: users have no matricule; manual add uses name/email search).

### D13 — User certificate ✅ resolved
Register step collects a **school certificate** file but it's currently dropped (never saved).
- **Store in v1?** ✅ **Yes** — new `certificate` upload field on User → Media.
- **Display location:** admin Users → profile info. User Profile → info tab (see also verification gate — borrowing blocked until verified).
- **Verification gate:** user is **verified** when a stored certificate exists; admin resolves verification state.

---

## Suggested handout format

| ID | Decision | Options / proposal | Choice | Notes | Owner | Date |
|---|---|---|---|---|---|---|
| D1 | Pickup window | 24h/48h/72h | | | | |
| D2 | No-show threshold | proposal: 2 | | | | |
| D3 | Finishing-reading trigger | scroll 100% / read time / manual | | | | |
| D4 | Article reviews vs feedback | same / two mechanisms | | | | |
| D5 | Activity overflow | waitlist / hard refusal | | | | |
| D6 | Extension policy | eligibility + max ext | | | | |
| D7 | Multi-copy model | counters / per-copy | | | | |
| D8 | Cancelability rules | per operation | | | | |
| D9 | Notification delivery | polling/SSE/WS + sync/queue | ✅ SSE | | | |
| D10 | 2FA & admin security | v1 / deferred | ✅ deferred | revisit post-v1 | | |
| D11 | Non-existing book request | collection + lifecycle | | | | |
| D12 | Admin verification flow | matricule source | ✅ name/email | no matricule | | |
| D13 | User certificate | store in v1? display? | ✅ store | + verification gate | | |
| NEW | Loan duration | configurable | ✅ default 14d | in Settings | | |
| NEW | Borrow limit | configurable | ✅ proposal: 3 | in Settings | | |
| NEW | Email provider | TBD | 🔄 set later | | | |

---

## Recommended review order

1. **D7** (multi-copy) and **D4** (reviews vs feedback) first — they shape data models.
2. **D1, D2, D6** — loan state machine.
3. **D3, D5, D8, D11** — feature-level.
4. **D9 ✅, D10 ✅, D12 ✅, D13 ✅** — resolved; remaining: **email provider, borrow-limit default (proposal 3)**.

Already resolved ✅: D9 (SSE), D10 (defer 2FA), D12 (name/email, no matricule), D13 (store certificate + verification gate).
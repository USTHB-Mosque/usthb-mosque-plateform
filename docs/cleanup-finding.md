# Frontend Cleanup — Non-Frontend Dead Code (Restored, Needs Issues)

This document records dead code discovered during the frontend cleanup that lives
**outside** `app/(frontend)/` and `components/` (i.e. in `lib/`, `interfaces/`, `utils/`).
Per workflow rules, these cannot be deleted in the frontend-only cleanup pass.

They have been **restored** to their `origin/dev` state so the tree stays type-clean,
and each item is documented below so a PM/engineer can create issues and clean them up
in a backend/allowed pass.

Each item was verified as **unreferenced** (no imports/usages) across `app/`, `components/`,
`lib/`, `interfaces/`, `utils/` at the time of writing.

---

## 1. `lib/apis/build-query.ts` — dead generic query builder

- **File:** `lib/apis/build-query.ts`
- **Exports:** `buildQuery(filters)`
- **Usage:** Only consumed by `buildBookQuery()` in `lib/apis/books.ts`, which is itself dead (see #2).
- **Fully removable along with #2.**

## 2. `lib/apis/books.ts` — dead book detail hooks + unused builder

- **Exports (dead):**
  - `booksKeys.detail(id)` — unused.
  - `fetchBookById(id)` — unused.
  - `useGetBookByIdQuery(id)` — unused.
  - `buildBookQuery(params)` (private) — unused; `fetchBooks` builds its own query inline.
- **Live exports (keep):** `booksKeys.list`, `fetchBooks`, `useGetBooksQuery` (used by `app/(frontend)/page.tsx`, `app/(frontend)/library/page.tsx`).
- **Action:** remove the 4 dead members + drop `import { buildQuery }` and `Where` if no longer needed.

## 3. `lib/apis/articles.ts` — dead article detail hooks

- **Dead:** `articlesKeys.detail(id)`, `fetchArticleById(id)`, `useGetArticleByIdQuery(id)`.
- **Live:** `articlesKeys.list`, `fetchArticles`, `useGetArticlesQuery`.

## 4. `lib/apis/activities.ts` — dead activity detail hooks

- **Dead:** `activitiesKeys.detail(id)`, `fetchActivityById(id)`, `useGetActivityByIdQuery(id)`.
- **Live:** `activitiesKeys.list`, `fetchActivities`, `useGetActivitiesQuery`.

## 5. `lib/apis/auth-api.ts` — dead logout mutation

- **Dead:** `logoutRequest()` and `useLogoutMutation()`.
  - Uses `POST /users/logout` via httpClient, but logout is actually handled by the
    `logout()` server action in `actions/auth/logout.ts`.
- **Live:** `authKeys.profile`, `fetchProfile`, `useGetProfileQuery`.

## 6. `lib/apis/reviews/keys.ts` — dead review query keys

- **File:** `lib/apis/reviews/keys.ts`
- **Exports:** `reviewsKeys` (all/lists/list/details/detail).
- **Usage:** Only consumed by `lib/apis/reviews/queries.ts`, which is itself dead (see #7).
- **Note:** Actual reviews data flow is via `lib/apis/reviews/requests.ts` (`reviewsRequests.getByBookId`) + `hooks/use-reviews.ts` / components, not these keys.

## 7. `lib/apis/reviews/queries.ts` — dead review hooks

- **Exports (dead):** `useGetReviewsQuery`, `useGetInfiniteReviewsQuery` (neither imported).
- Uses `reviewsKeys` + `reviewsRequests` but nothing consumes these two hooks.

## 8. `utils/constants/data.ts` — dead `availabilityConfigArray` + typo regression

- **Dead:** `availabilityConfigArray` (all/available/not-available) — no longer referenced.
- **Note (verify):** restoring the file from `origin/dev` also reverted the typo fix
  `'الإنجلزية'` → `'الإنجليزية'` in the `en` language label (flagged in Phase 2 of cleanup).
  Re-apply the typo fix independently — the label must be `الإنجليزية`.

## 9. `interfaces/search.interfaces.ts` — dead `subscribe` member

- **Dead:** `SearchStorageAdapter.subscribe` — the `subscribe(callback)` method was removed
  from `lib/adapters/search-params.adapter.ts`; the interface member is now unfulfilled.
- **Action:** remove `subscribe` from the `SearchStorageAdapter` interface (and any
  implementers still declaring it).

## 10. `lib/adapters/search-params.adapter.ts` — already-removed `subscribe`

- Restored file re-adds the removed `subscribe(callback)` method as part of undoing the
  deleted work. If the interface member (#9) is removed, this method can also be dropped.
  (The `subscribe` path was the old popstate-listener sync; the new hook uses
  `use-search.ts` URL-synced state instead.)

---

## Cleanup scope

All of the above are **candidates for removal** in a single backend-pass PR. The live,
must-keep surface is: `fetchBooks`/`useGetBooksQuery`, `fetchArticles`/`useGetArticlesQuery`,
`fetchActivities`/`useGetActivitiesQuery`, `fetchProfile`/`useGetProfileQuery`, and
`lib/apis/reviews/requests.ts` + `reviewsRequests`.

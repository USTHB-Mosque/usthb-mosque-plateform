# Theming — light and dark

How dark mode works in this codebase, what it is allowed to touch, and the rules
that keep a change to one theme from breaking the other.

Issue #172 delivered the audit and the fixes. This document is the contract that
keeps it from regressing.

## 1. Scope — which pages can ever be dark

| Surface             | Routes                                                                             | Layout                         | Dark?                 |
| ------------------- | ---------------------------------------------------------------------------------- | ------------------------------ | --------------------- |
| Public visitor site | `/`, `/library`, `/activities`, `/articles`, `/about-us`, `/contact-us`, `/auth/*` | `app/(frontend)/layout.tsx`    | **No — forced light** |
| Member portal       | `/user/*` (rewritten to `/member-portal/*`), `/member-portal/*`                    | `app/member-portal/layout.tsx` | Yes                   |
| Admin panel         | `/admin-panel/*`                                                                   | `app/(admin-panel)/layout.tsx` | Yes                   |
| Payload admin UI    | `/admin`                                                                           | `app/(payload)/layout.tsx`     | **Never**             |

All three of those layouts render `shared/root-html-shell.tsx`, which is the
single place the machinery is assembled: it imports
`app/(frontend)/globals.css` (the only stylesheet), puts `ThemeInitScript` in
`<head>`, and wraps the body in `ThemeProvider` → `ThemeScopeGuard`.

The Payload admin is out of scope by construction: its layout imports only
`@payloadcms/next/css` and `custom.scss`. It gets none of our Tailwind, none of
our tokens, no init script and no guard, so it renders `<html data-theme="light">`
and never wears `.dark`. Theming it would be a separate piece of work — do not
"fix" it here.

**Visitor pages staying light is deliberate, not an omission.** `ThemeScopeGuard`
forces `light` on any path that is not portal or admin, and the no-flash script
short-circuits to light before it even evaluates `matchMedia`. Whether the
public site ever gets a dark theme is an open product decision.

## 2. Mechanism — three pieces, in this order

1. **`shared/theme-init-script.tsx`** — an inline `<script>` in `<head>`, so it
   runs before first paint and there is no flash of the wrong theme.

   - Visitor path → `dark = false`, returned _before_ `matchMedia` is read.
   - Portal/admin → `dark` when the stored theme is `dark`, or when it is
     anything other than `light` (`system`, `null`, garbage) _and_ the OS
     prefers dark.

   It must stay a Server Component: marking it `'use client'` makes React treat
   the `<script>` as client-rendered, which never executes.

2. **`shared/providers/theme-provider.tsx`** — `next-themes` with
   `attribute="class"`, `defaultTheme="system"`, `enableSystem`. Owns the
   persisted `localStorage.theme` and the `dark` class after hydration.

3. **`shared/theme-scope-guard.tsx`** — a `useLayoutEffect` that re-asserts the
   correct class on every navigation. next-themes applies `dark` from the system
   preference in an effect that is _not_ path-aware, so a visitor page can
   briefly pick up `dark`; the guard watches `<html>` with a `MutationObserver`
   and reverts it. It also re-runs on `prefers-color-scheme` changes.

## 3. Where the controls live

| Control          | Values                   | Where                                                                                |
| ---------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| `DarkModeToggle` | on/off                   | `shared/layouts/user/UserPageHeader.tsx` — portal desktop header (hidden below `md`) |
| `DarkModeToggle` | on/off                   | `shared/layouts/admin/AdminPageHeader.tsx` — admin top bar, always visible           |
| `ThemeSwitcher`  | `نظام` / `فاتح` / `داكن` | `shared/layouts/user/UserSidebar.tsx` — portal **mobile drawer only**                |

Visitor pages have no control, because they have no dark mode. The admin panel
has no `ThemeSwitcher` — parity with the portal, which also exposes the
three-way switcher only in the drawer.

`ThemeSwitcher` writes `localStorage.theme = 'system'` when `نظام` is picked.
That is why the init script treats any non-`light` value as "follow the OS": a
literal `t === 'dark' : light` read would flash light until hydration.

## 4. The token-first rule

> **If the value should change when the theme changes, it is a token. If it
> should not (brand, status hue, public-site palette), it may stay a literal.**

In order of preference:

1. **Token** — give `.dark` a value in `app/(frontend)/globals.css`.
2. **Raw literal** — only if it does not actually break. No blanket rewrite.
3. **`dark:` variant** — only where no token can express the intent. Two
   competing colour systems is the failure mode being fixed, not repeated.

`@custom-variant dark` is `(&:is(.dark *))`, so `dark:x` resolves to
specificity `(0,2,0)` — it beats an unvariant utility regardless of source
order.

## 5. The token inventory

|                                       | Count           |
| ------------------------------------- | --------------- |
| Tokens declared in `:root`            | 87              |
| Overridden in `.dark` before #172     | 37              |
| Overridden in `.dark` now             | 50              |
| Added by #172                         | 13              |
| Deliberately identical in both themes | 36 + `--radius` |

The 13 added:

```
--blue-50 --blue-100 --blue-200 --blue-300 --blue-400 --blue-500
--primary-300 --primary-400 --primary-500
--fill-contrast --fill-main
--stroke-blue --stroke-grey
```

The rest of the issue's original list of 49 is intentionally theme-invariant,
and the reason for each group is recorded in the `DELIBERATELY THE SAME IN BOTH
THEMES` comment block inside `.dark`:

- `--secondary-50..900` — public-site palette; the public site is always light.
- `--primary`, `--primary-50/100/200/600/700/800/900`, `--primary-foreground`,
  `--primary-main-*` — the brand teal scale and its translucent tints.
- `--danger*`, `--success*`, `--warning*` — status hues; the `-50`/`-15` steps
  are translucent so they track the surface automatically.
- `--fill-white`, `--stroke-white`, `--grey-50` — literal white.
- `--radius` — shape, not colour.

## 6. The status-step rule

Status text must **keep its hue** and step up the ramp until it clears 4.5:1 on
its tint bed **over `--card` and over `--muted`** — badges render on both.

Hex statuses in dark (light values unchanged):

| Status    | Light     | Dark      |
| --------- | --------- | --------- |
| warning   | `#B45309` | `#ffcaa2` |
| info/cyan | `#0AAFC2` | `#4dedff` |
| info/blue | `#1864AB` | `#9bceff` |
| danger    | `#C0392B` | `#ffb9b2` |
| violet    | `#6741D9` | `#c9b7ff` |
| success   | `#15803D` | `#00f15a` |

Tailwind-palette statuses use the same rule: `amber → dark:text-amber-300`,
`red → dark:text-red-200`, `green → dark:text-green-300`,
`emerald → dark:text-emerald-300`, `violet-400 → dark:text-violet-300`.

Destructive **fills** are the exception: they keep the light `/10` resting and
`/15` hover bed rather than shadcn's `/20 → /30`, which lands at 4.15:1 and
3.66:1 on `--card`.

## 7. Light must not drift

**This is the invariant that protects the 14 existing baselines.** Every change
in this pass is either:

- a `dark:` variant — inert under light, or
- a token whose `:root` value is **unchanged**.

Two examples of the second case worth remembering:

- `prose-headings:text-secondary` → `text-foreground`. `--secondary` and
  `--foreground` are both `#243245` in `:root`, so light is byte-identical; in
  dark they diverge to `#3d4f60` (1.16:1 on `--card`) vs `#f2f8fc`.
- `bg-[#E8F2F8]` → `bg-fill-contrast`, whose `:root` value is `#e8f2f8`.

If a fix needs a different `:root` value, it is a redesign, not a dark pass —
it belongs in its own change with its own baseline update.

## 8. Raw literals that were left alone

`text-[#243245]` was converted to `text-foreground` everywhere **except 12
sites** sitting on a fill that is bright in both themes (`bg-primary-200`,
`bg-[#00FF92]`) — `AdminSidebar:202,211`, `UserSidebar:137,315`,
`LoansTable:97,379`, `TableCheckbox:28`, `UsersTable:41,76`, `UserDetail:43`,
`ActivitiesTable:39`, `BooksTable:337`.

Also left alone:

- `bg-primary text-white` (~10 sites) — 1.69:1 in _both_ themes, so it is a
  pre-existing light problem, not a dark regression, and touching it would
  churn light baselines.
- Status dots already at or above 3:1 (`#0AAFC2`, `#228BE6`, `#22C55E`).

## 9. Rich text

All three long-form blocks (book `الوصف الكامل`, article body, activity
`عن الدورة`) use `@tailwindcss/typography`, whose default palette is a
gray-700 body on gray-900 headings — dark ink on a dark card.

Each container carries `dark:prose-invert` (flips the prose palette in dark
only) plus `prose-headings:text-foreground`.

## 10. Contrast evidence

Worst case across the four dark surfaces — `--background`/`--sidebar` `#243245`,
`--card`/`--popover` `#2d3d50`, `--muted`/`--sidebar-accent` `#3d4f60`. The
lightest of these, `--muted`, is the binding constraint.

| Token / use                        | vs `--card` | vs `--muted` | Worst |     |
| ---------------------------------- | ----------- | ------------ | ----- | --- |
| `--foreground`                     | 10.35       | 7.89         | 7.89  | AA  |
| `--muted-foreground`               | 7.20        | 5.49         | 5.49  | AA  |
| `--destructive`                    | 7.18        | 5.48         | 5.48  | AA  |
| `--primary` (incl. `prose-strong`) | 7.10        | 5.42         | 5.42  | AA  |
| status amber `#ffcaa2`             | 7.51        | 5.72         | 5.72  | AA  |
| status cyan `#4dedff`              | 7.85        | 5.98         | 5.98  | AA  |
| status blue `#9bceff`              | 6.68        | 5.10         | 5.10  | AA  |
| status red `#ffb9b2`               | 6.77        | 5.16         | 5.16  | AA  |
| status violet `#c9b7ff`            | 6.17        | 4.71         | 4.71  | AA  |
| status green `#00f15a`             | 7.25        | 5.52         | 5.52  | AA  |
| prose body (`dark:prose-invert`)   | 7.53        | 5.74         | 5.74  | AA  |
| `--grey-400`                       | 6.29        | 4.79         | 4.79  | AA  |
| `--grey-500`                       | 7.20        | 5.49         | 5.49  | AA  |
| `amber-300`                        | 7.69        | 5.86         | 5.86  | AA  |
| `red-200`                          | 7.66        | 5.84         | 5.84  | AA  |
| `green-300`                        | 7.89        | 6.02         | 6.02  | AA  |
| `emerald-300`                      | 7.27        | 5.54         | 5.54  | AA  |
| `violet-300`                       | 7.98        | 6.08         | 6.08  | AA  |

Two dark tokens measure below 4.5:1 and are **not** text on a themed surface:

| Token        | Measured            | Where it is actually used                                                                             |
| ------------ | ------------------- | ----------------------------------------------------------------------------------------------------- |
| `--grey-200` | 3.14:1 on `--card`  | `border-grey-200` — a hairline under the book-info tabs. Decorative separator, not a UI boundary.     |
| `--grey-300` | 3.94:1 on `--muted` | `text-grey-300` in `shared/layouts/Footer.tsx`, which renders only on the public site — always light. |

Runtime proof is `e2e/a11y.spec.ts`, which now scans in both themes: axe
computes `color-contrast` from the rendered pixels, so a light-only scan
structurally cannot see a dark failure.

## 11. Regression gates

- **`e2e/visual.spec.ts`** — light and dark captures over the portal and admin
  routes; visitor routes are light-only because a dark capture there is
  pixel-identical. Dark shots append `-dark` to the snapshot name, so existing
  baseline paths never move. Baselines are generated **only** under the
  canonical run (`--update-snapshots=all`); dev runs must not rewrite them.
- **`e2e/a11y.spec.ts`** — runs each in-scope route in `light` and `dark`.
  Fails on serious/critical violations only; the rest are logged, so a green
  run does not mean a clean report.
- **`e2e/lib/theme.ts`** — `pinDarkTheme(page)` sets `localStorage.theme`
  before the first navigation, because the no-flash script reads it
  synchronously in `<head>`.

## 12. Adding to this later

1. Does the value change with the theme? Token first (`app/(frontend)/globals.css`).
2. Give `.dark` a value, or state in the invariance block why it has none.
3. Check it against `--muted` — the lightest dark surface. 4.5:1 for text,
   3:1 for large text and UI boundaries.
4. Leave `:root` alone (§7).
5. Run the canonical e2e and eyeball the new dark baselines.

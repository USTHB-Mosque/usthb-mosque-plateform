# Admin account security — #146

## Screens and approved design

Figma file `3SxNbbKMi8ZR6bYdl2ctec`:

| Screen        | Route                                           | Frame        |
| ------------- | ----------------------------------------------- | ------------ |
| Info          | `/admin-panel/settings`                         | `1873:25538` |
| Security hub  | `/admin-panel/settings/security`                | `1873:27571` |
| Notifications | `/admin-panel/settings/notifications`           | `1923:33033` |
| Email         | `/admin-panel/settings/security/email`          | `1908:29379` |
| Password      | `/admin-panel/settings/security/password`       | `1908:30645` |
| 2FA           | `/admin-panel/settings/security/2fa`            | `1923:31707` |
| Devices       | `/admin-panel/settings/security/linked-devices` | `1923:32138` |
| Account logs  | `/admin-panel/settings/security/logs`           | `1923:32609` |

Security management uses an identity-confirmation dialog before the page's
controls. Mutations enforce the proof independently of that dialog. The retained
Payload `/admin/account` view redirects to the same settings flow.

## Mailboxes and factors

- Add, verify, remove and promote contact addresses. A pending secondary claim
  expires after 24 hours; five addresses per account are supported.
- Identity-document approval is separate from mailbox ownership. Legacy primary
  addresses start unverified; an email OTP establishes mailbox ownership.
- OTP challenges expire after five minutes, allow five guesses, have a
  sixty-second resend cooldown and a five-per-hour purpose/account budget.
- An enrolled account needs its password plus an email OTP or recovery code.
  Starting enrollment alone never enables the factor. SMTP failure leaves login
  and re-authentication recovery-code entry available; verification/enrollment
  failures do not claim success.
- Recovery codes appear only in the enrollment/regeneration result, are stored
  as keyed hashes, and can be used once. Secrets never enter account logs or
  normal User/settings responses.
- Password, primary-email, role and account-lifecycle transitions revoke old
  sessions. Enabling/disabling 2FA or replacing recovery codes does likewise.
  Revoking a device removes only that session and its proofs.

## Deployment and verification

The feature uses the existing `PAYLOAD_SECRET`, SMTP configuration and public
origin; it introduces no authenticator secret or new encryption key. Apply the
new migrations before serving code. They backfill address reservations without
asserting verification, and cascade server-owned security records on permanent
account deletion. The additive audit enum remains on rollback so append-only
history is preserved.

Regression seams are real-Payload integration actions/collection access,
authentication HTTP endpoints, settings/login RTL behavior, Mailpit browser
journeys and canonical light/dark settings screenshots. Destructive journeys
have dedicated seeded admin identities; they do not invalidate other journeys'
shared admin session.

Canonical settings captures use the dedicated settings identity before its
mutating journey: two explicitly verified secondary contacts, an unverified
legacy primary and multi-day own audit entries exercise the populated Figma
layouts. Foreign audit entries are asserted absent. Current sessions are shown
honestly: Payload does not record the hardware names or locations illustrated
by the device frame. Existing public captures also track the shipped splash and
the canonical media seed, rather than old development storage images.

See [ADR 0004](adr/0004-admin-account-security.md) for the scope and enforcement
decision. SMS remains visibly unavailable until [#187](https://github.com/USTHB-Mosque/usthb-mosque-plateform/issues/187)'s separate provider work lands.

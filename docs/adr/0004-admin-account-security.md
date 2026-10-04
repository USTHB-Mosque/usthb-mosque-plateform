# Keep one primary login identity and enforce admin email OTP before sessions

**Status:** Accepted, 2026-10-03, #146.

An account can hold several verified mailboxes, but only its primary address is
used for login, password recovery and ordinary notifications. A single address
registry reserves primary and secondary addresses together; aliases cannot
collide with another account's primary address. Existing primary addresses remain
usable and are not backfilled as mailbox-verified.

The approved first second-factor method is opt-in admin email OTP, using the
existing SMTP adapter and matching Figma's email option. SMS is a separate
provider-dependent follow-up; authenticator-app enrollment and member enrollment
are outside this change. Recovery codes supplement the password as single-use
second factors, including during mail outages.

Keep Payload's password checks and SID/JWT sessions. A password probe aborts
before token issuance, then the application creates a short-lived challenge.
Native REST/GraphQL password-only login must fail for enrolled accounts, and
stored sessions are usable only when their second-factor assurance matches the
current security revision. Credential changes revoke sessions and invalidate
older challenges. Native password reset deliberately returns a signed but
already-revoked token: its password change commits without granting access or
disabling the second factor.

Identity confirmation is valid for five minutes on one session, using the
password and the enabled second factor. Enrollment proves both factors and
establishes a new proof for its replacement session; recovery-code regeneration
preserves only the unexpired remainder of the previous proof. PostgreSQL locks
serialize account changes, mailbox claims and one-use consumption; native login's
pre-transaction password stage is additionally fenced by the security revision,
including device revocation. Browser
cookies are written only after those transactions commit.

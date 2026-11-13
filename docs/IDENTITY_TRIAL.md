# First working integration trial

**Status, 14 November 2026:** Automated versions of these checks pass (`app/VERIFICATION.md`); the live trial is in progress — LinkedIn sign-in has worked on Android.

**Current provider decision, 13 November 2026 (reference v1.58):** LinkedIn is the sole launch sign-in provider. Connect Google Calendar separately after sign-in, with an optional read-only grant. First sign-in opens a usable QR or resumes the interrupted action. Provider configuration and real-device verification are pending.

**Date:** 31 October 2026  
**Status:** Proposed verification checklist, not completed tests or a deployment instruction.  
**Purpose:** Prove the selected services work together on the smallest real journey before building the remaining features.

Use development Supabase and Vercel environments with a stable callback URL, LinkedIn OIDC configuration and a separate read-only Google Calendar grant. Use two test participants and fictional profile/note content. Keep credentials server-side and out of the repository.

## Smallest useful implementation

Implement LinkedIn sign-in, a usable starter QR, public profile viewing, browser-local guest saves and notes, retry-safe import and one draft form. Connect Google Calendar separately for read-only event access. Agree the initial public-field allowlist before exposing a real profile.

## Pass/fail evidence

| Check | Pass condition |
| --- | --- |
| Account A signs in | LinkedIn authentication creates one stable Hi Again identity and shows a usable QR. Repeat sign-in reuses the account. |
| Separate calendar consent | Open Connect Google Calendar after LinkedIn sign-in. Test accept, partial grant, decline and cancel. QR, People and drafts remain usable in every calendar outcome. |
| Calendar continuity | Correct selected-calendar events can be read with privately stored Google credentials after provider-token refresh; missing/expired/revoked credentials lead to a deliberate reconnect without losing the Hi Again session, guest collection or draft. No recurring forced consent on ordinary returns. |
| Guest B scans | A real phone camera opens the correct public profile without sign-in; save confirmation follows successful local persistence. |
| Guest B returns | Refreshing/reopening the same browser retains the save, original timestamp and optional note. No cross-browser recovery claim. |
| B begins an action | The original target and draft survive sign-in and return in the correct account; cancellation retains recoverable local content. |
| B imports saves | Real account records contain the original guest save/time/note. Local data is retained until server acknowledgement. Retry/refresh neither duplicates entries nor overwrites conflicting notes silently. |
| Account isolation | A and an unrelated actor cannot read B's private saves, notes or drafts through the UI, network responses or direct API requests. Public profile responses contain only allowed fields. |
| Failure handling | Simulated storage failure and interrupted network/import produce honest feedback and preserve retryable data. Logout/account switching cannot expose another account's draft or private cache. |
| Devices | Repeat the main scan/auth/return journey on iPhone/Safari and Android/Chrome; record phone-camera and any embedded-browser behaviour actually tested. |

Retain a short recording of the successful flow, test/device results, redacted database checks, direct access-denial results and a list of failures. A UI success message or a simulated sign-in alone is not evidence of durable import or secure access. Do not log tokens, private notes or personal account details.

## Completion boundary

Pass when the real cross-service journey and access/failure checks above work in the tested environments, with exceptions resolved or explicitly recorded. This proves integration feasibility only. Mutual Again privacy/concurrency, complete participation workflows, usability, recovery and production capacity require later verification. No tests have been run against a real application by this planning task.

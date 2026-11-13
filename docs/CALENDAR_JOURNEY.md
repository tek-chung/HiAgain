# Calendar integration journey

**Status, 14 November 2026:** Built as designed in `app/` (separate read-only Google connection, “Likely met at”, overlap choice, manual fallback, Join me ideas). Not yet tried with a real Google OAuth client.

**Designed:** 1 November 2026. Proposed interaction design for review; calendar context and Join me suggestions are confirmed product scope. Provider permissions, matching thresholds and retention require implementation validation. The mock-up uses fictional events and simulated permission; no calendar account is accessed.

## Connect Google Calendar after LinkedIn sign-in

**Current provider decision, 13 November 2026 (reference v1.58):** LinkedIn is the sole launch sign-in provider. Connect Google Calendar separately after sign-in, with an optional read-only grant. First sign-in opens a usable QR or resumes the interrupted action. Provider configuration and real-device verification are pending.

Explain private context and event suggestions beside **Connect Google Calendar**. Read the granted permissions and return to the originating view after consent. Keep manual context and coffee available when calendar access is declined or unavailable.

Recommended initial default: read the primary calendar after full permission, with inline **Calendars** to select other accessible calendars; do not enable all calendars automatically. This default remains a recommendation. Keep a **Connect calendar** / **Reconnect** entry for deliberate retry, missing permission, calendar selection and management. Reconnection preserves the current person, notes and drafts. Guests continue saving before sign-in. The original simulated Work/Personal selection is not evidence of real provider handling.

## Save a person: no extra action on the usual path

**Scan → person saved → private context appears.**

The existing bottom section keeps the precise save timestamp, followed by context, followed by optional private Notes. Context does not appear in People rows or on the public profile. Both outgoing saves and incoming encounters use the list owner's calendar, never the other person's calendar.

| Matching result | What the user sees | Action needed |
| --- | --- | --- |
| One plausible event | **Likely met at** / Product People meetup / From your calendar · Only you | None. Edit or Remove in place. |
| Overlapping candidates | **Where did you meet?** with concise event choices and Neither | Optional one-tap choice; saving is already complete. |
| No match / excluded calendars | **No matching event in your selected calendars.** / Add context | None; manual entry remains optional. |
| No connection | **Add context from your calendar** | Optional connection; notes still work. |
| Expired permission | Existing derived context is labelled potentially out of date; missing context has Reconnect | Continue using People and notes; reconnect when useful. |

Auto-population is a provisional inference, not a factual claim that both people attended. Selecting a candidate or editing the text changes **Likely met at** to **Met at**. Do not require a confirmation for a single plausible match. Do not overwrite a manual correction or recreate removed context on reopening/retry. Manual notes remain separate.

Proposed matching rules for the real build: match against the encounter timestamp, selected calendars and the user's timezone; prefer events actually overlapping the encounter; exclude declined/cancelled items and do not treat all-day events as a precise match. If multiple plausible events remain, ask instead of silently choosing. Exact windows, confidence rules and retrospective enrichment are open. A test fixture matching is not evidence that these rules work.

## Join me: suggestions stay private until chosen

Keep the existing public **Join me — Coffee and a catch-up?** until the owner deliberately replaces it. Place **Ideas from your calendar** at the bottom of **Edit profile**. Beneath Join me, **Choose from calendar ideas ↓** jumps there, preserving current edits. Show two event ideas initially, with **Show more ↓ / Show fewer ↑** to expand/collapse the remaining available suggestions. Each has **Review invitation** and **Dismiss**. Using an idea returns focus to Join me. Suggestions do not appear on My profile. The three action fields are equal-sized, vertically expandable textareas matching Introduction. This supersedes the earlier between-fields placement. The “two initially” request is interpreted as event ideas, not calendar account limits.

**Review invitation → edit public preview → Use on my profile.**

Dismissals show an **Event dismissed · Undo** message in the suggestions section. Undo restores the most recently dismissed event in its original position; repeated Undo works backwards through dismissal history. The current prototype retains this history in private account-specific demo state without a timeout. Reviewed invitation text uses the same 180-character limit as the action prompt and a live bottom-right word/character count.

The selected suggestion becomes an inline editor in Edit profile. Show exactly the invitation wording to be published, rather than exposing the underlying calendar record. A single checkbox states **This event is public and open to invite someone to.** The primary button is **Use on my profile**. If the checkbox or wording is missing, keep the draft and explain inline. After publication, update the Join me field in place; no confirmation screen.

Calendar event visibility cannot establish whether guests may attend. Suggestions must exclude known private appointments, but all candidates still need the owner's confirmation. Show no attendee list, email addresses, private description, meeting URL or private address in public copy by default. The owner can publish an intentionally edited public event title/time/location. Cancellation leaves the previous invitation untouched. Dismissal suppresses that suggestion. Existing owner-written invitations are never silently replaced.

Visitors see only the published invitation and existing Send interest flow. This does not register attendance, book a place, create a calendar event or send a calendar invitation. A new event has its own stable item identity; previous interest must not be carried over merely because the card wording changes. The existing prototype's provider-free publication only demonstrates the owner preview; production event/item lifecycle handling remains to build.

When there are no useful events, retain the current invitation and optional manual editing. For production, when the promoted event ends or is cancelled, propose reverting to coffee or choosing another event, preserving old contributions against their original item. Source edits must not silently republish changed wording; refresh the private draft and request review. These lifecycle behaviours are proposed and not simulated in the current fixture.

## Manage and disconnect

Use the same Calendar entry in My QR for selected calendars and disconnect. On disconnect, stop reading and remove derived context and unused calendar drafts. Preserve saved people, timestamps, manual notes and manually corrected context. Retain an owner-approved public invitation as authored profile content; it can be edited separately. Explain this distinction before disconnecting, without another confirmation screen. Actual token revocation, provider-side grants, cached data deletion and retention must be implemented and verified.

Private context and suggestions belong to the current account only. A guest's anonymous name does not grant access to the guest's calendar or establish event attendance. Avoid calendar details in general analytics or model-facing prototype state. Real server authorisation, least-privilege permissions, deletion and cross-device behaviour remain unverified.

## Prototype coverage

Choose **Calendar · connect once**, **automatic context**, **two possible events**, **no matching event** or **Join me suggestions** in the journey selector. All are fictional. Permission denial, reconnect, context correction/removal, selection, disconnect, invitation review/public confirmation, dismissal and no-suggestion states are interactive. Context fixtures are not real event matching, and clipboard/camera/provider security is not established by local browser tests.

322 interface assertions passed at both 320px and 740px, including existing journeys, private context placement, ambiguity, reconnect, correction/removal persistence, notes preservation, exclusion of a private appointment fixture and explicit publication. Narrow context and wider invitation-review screens were visually inspected; no real phone/provider test was performed.

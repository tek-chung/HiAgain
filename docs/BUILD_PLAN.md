# Hi Again build plan

**Current provider decision, 13 November 2026 (reference v1.58):** LinkedIn is the sole launch sign-in provider. Connect Google Calendar separately after sign-in, with an optional read-only grant. First sign-in opens a usable QR or resumes the interrupted action. Provider configuration and real-device verification are pending.

**Date:** 31 October 2026  
**Status:** Proposed delivery plan; product defaults below require confirmation before dependent implementation.  
**Basis:** HI_AGAIN_REFERENCE.md, version 1.2, and the journey breakdown discussed on 31 October.  
**Objective:** Deliver a small pilot that tests whether first encounters lead to meaningful second interactions.

**Text limits and event Undo (reference v1.47):** Implement per-owner dismissal Undo for calendar ideas. Current chosen defaults: action prompts/questions/reviewed invitations 180 characters; answers and feedback requests 1,500 characters, including edits. Show live words and character usage at the bottom-right of textareas. Use two-line profile previews with full content on opening. Enforce limits on the server/database as well as the client; reject invalid restored drafts without silent truncation. Define consistent Unicode counting before production. Preserve one-answer uniqueness and existing contributions.

**Calendar ideas refinement (reference v1.42):** Put event suggestions at the bottom of Edit profile. A Choose from calendar ideas prompt beneath Join me jumps there without losing edits. Show two ideas initially, expanding/collapsing the rest with an arrow control; choosing one uses the existing private review/public-confirmation flow and returns focus to Join me. This is an event-idea display limit, not a calendar-source/account cap.

**Edit-profile refinement (reference v1.41):** Use equal-sized expandable textareas for all three action fields, matching Introduction. Keep calendar event suggestions and their inline review in Edit profile beneath Join me, rather than on My profile. This supersedes the earlier owner-profile suggestion placement.

**Calendar design, 1 November 2026 (reference v1.40):** Follow the proposed [calendar journey](CALENDAR_JOURNEY.md): optional connection outside immediate-QR onboarding; selected calendars; private provisional auto-context at the profile bottom with inline correction/removal; optional resolution of overlapping events; owner-only Join me suggestions and explicit public preview/confirmation. Preserve existing invitation content until replaced. Implement denial/reconnect, calendar-selection cancellation, manual/no-match fallback, disconnect/deletion and event lifecycle rules. The current prototype demonstrates the design with fictional events; it does not implement provider access, matching or backend privacy. Provider/scopes, inference thresholds and retention still need validation.

**31 October refinement (reference v1.6):** Tek confirmed minimum-step, clean and intuitive journeys: ordinary LinkedIn sign-in leads straight to a usable QR, with optional editing later; Again is prominent above the Share actions; LinkedIn is beside the name; a top-right scanner is always available; People has opposite swipe shortcuts for removal and LinkedIn. These directions supersede the earlier compulsory profile preview/publication sequence. The revised concept chooses left-remove/right-LinkedIn, Undo and visible accessible controls. It demonstrates direct sending with explicit action labels; that exact submission behaviour still needs validation rather than an additional mandatory confirmation by default.

**Saved context and action-copy refinement (reference v1.8, updated in reference v1.38):** Every saved person needs a timestamp and optional notes. People shows date groups (Today, Yesterday, recent weekdays, exact older dates), without timestamps on individual rows; saved-person detail retains the exact timestamp and notes. The concept uses first-save time, private notes, weekday groups for two to six days ago, and exact dates from seven days ago. Calendar integration is in the initial product for event context and public-event-informed **Join me** suggestions. The concise fallback is “Coffee and a catch-up?”; use the same suggestion privately after mutual Again. Confirmed action copy is **Answer a question** — “What would you like to know about my work?” and **Ask for feedback** — “A fresh perspective on a project or idea?” Offer Google Calendar connection separately after LinkedIn sign-in. Further provider coverage, matching, review, storage and retention remain open.

**Archive refinement (reference v1.11):** Tek has replaced saved-person removal with reversible archiving. Use an archive-tray icon rather than a bin, keep the left-side archive action separate from right-side LinkedIn, and add an Archive button in People with a Restore action for each archived person. Preserve notes, the original timestamp and contributions. Current concept: left swipe archives, right swipe opens LinkedIn; repeat scans do not silently restore archived people. This supersedes the removal/bin wording in the earlier refinement history.

## 1. Delivery approach

**Governing design principle:** Always aim for intuitive, simple and frictionless use. Minimise screens, actions and fluff without sacrificing clarity. Prefer editing inside the current view and a dynamic primary CTA; do not add separate edit/save or success screens where in-place state and feedback suffice.

**Approved CTA presentation, updated in reference v1.22:** Tek selected Action led and then retired the three-Share framework from the product interface. Apply concrete action/status wording consistently to profiles, editing, forms, Activity, details and selectors. Profile examples are Join me, Answer a question and offer-specific wording such as Ask for feedback, with concise context, an icon and chevron. Again remains above them. The underlying activity-interest, question-answer and help-request mechanisms continue. Retain the old Share framing only as a possible future marketing concept; no campaign is approved. Validate comprehension with users.

Build complete journeys in sequence, with a demonstrable outcome at each milestone. Test identity, guest continuity and privacy early because they affect every later feature. The current workspace contains reference material and no app implementation. This plan does not establish a launch date, staffing, budget, hosting choice or deployment authorisation.

Confirmed constraints: LinkedIn-only launch sign-in, optional separate read-only Google Calendar connection, public profile viewing, automatic guest and member saving, action-led participation, private mutual Again, one-off contributions and optional ordinary LinkedIn links. Native chat and general connection requests are out of scope. Use the action-led labels across profile settings and Activity.

**Architecture accepted, 31 October 2026 (reference v1.18):** Use one TypeScript Next.js application on Vercel, Supabase PostgreSQL/Auth/Storage with LinkedIn OIDC (provider restored 13 November 2026), and IndexedDB guest saves/notes/drafts. Start on Vercel Hobby where eligible and Supabase Free within allowances; upgrade based on measured usage and reliability needs. PWA installation can follow the working mobile-browser experience. Verify provider access, deployment configuration, privacy and device behaviour during milestone 0; architecture adoption is not evidence of working integrations. This supersedes the earlier proposed/unselected hosting and stack status, but does not confirm every product default below or authorise a paid subscription.

## 2. Proposed defaults to resolve scope

These are recommendations, not confirmed product decisions. Prototype them first; settle each before building the affected behaviour.

| Question | Proposed pilot default | Decision needed by |
| --- | --- | --- |
| Active profile actions | One active activity, question and offer per profile; allow an unconfigured state. No requirement to populate all three to start. | Milestone 1 |
| Authentication timing | View, save and compose as a guest. Requiring sign-in before contribution submission or Again remains proposed. Revised concept: a clearly labelled sign-in-and-send action continues sending after authentication; signed-in users send directly. Preserve drafts and handle cancellation. This supersedes the proposed mandatory review/confirm screen. | Milestone 0 identity trial; finalise in 1 |
| Guest saves | Browser-local profile identifiers with honest same-browser wording. Import after sign-in; retain local saves until the server confirms success. No cross-device guest recovery promise. | Milestone 2 |
| Repeat and self-scans | Repeat scans update the existing save without duplication; self-scans show the owner's preview and do not save the owner as a contact. | Milestone 2 |
| Experiences | Record interest only. Clearly distinguish it from registration, a ticket or confirmed attendance. Offer an owner-supplied event link where appropriate. | Milestone 3 |
| Contribution handling | Confirmed: one answer per sender/question; sender can read/edit afterwards and recipient sees saved updates. Send → saved content and Edit/Save stay on the same view, with no confirmation screen. Preserve participants, original item context and sent time; keep content private. Help-request/interest repeat rules, notifications, conflicts and retention remain open. | Milestone 3 |
| Value fulfilment | Confirmation plus an external follow-up route; defer acknowledgement/decline controls until their user need is tested. Do not imply a response is guaranteed. | Milestone 3 |
| Navigation | Revised concept: People, Activity and My QR, with optional profile editing from My QR. Confirmed: immediate QR after ordinary sign-in and an always-visible top-right scan entry. Exact navigation remains a proposal. | Milestone 1 |
| Mutual Again hand-off | Show mutual interest and offer existing public profile links, including LinkedIn where supplied. Reveal no new private contact information. Prototype a fallback when no external link is available. | Milestone 1 concept; finalise before 4 |
| Notifications / unread Activity | Confirmed: numbered badge at the Activity icon's upper-right, with its label centred underneath, and Mark all as read inside Activity. Current concept counts received submissions/updates and mutual matches, marks opened items read and preserves records on clearing. Final event eligibility and email alerts remain open. Never reveal one-sided Again interest. | Contribution read state in milestone 3; match integration in 4 |
| Again lifecycle | Allow withdrawal before matching; explicitly decide post-match removal and expiry before implementation. Do not promise that previously seen information can be unseen. | Milestone 4 |

Also settle public profile fields, content limits, contribution deletion/retention, blocking effects and account deletion before finalising access rules. Choose a pilot cohort and a practical way to observe second interactions before recruitment.

## 3. Milestones and completion criteria

### Milestone 0 — Prove identity and agree the build rules

The [first working integration trial](IDENTITY_TRIAL.md) covers LinkedIn sign-in, immediate QR, guest saves and notes, draft return, account import and separate Google Calendar connection.

Work:
- Map the 11 journeys into screens, states and entry/exit points.
- Trial LinkedIn sign-in and the separate Google Calendar grant. Check provider access, callback configuration, available fields, cancellation, session expiry, calendar refresh and revocation on the intended mobile browsers.
- Demonstrate returning to the original profile and restoring a draft after authentication.
- Confirm the technology and hosting approach, stable internal user identity and environment separation.
- Run a calendar-provider proof: compare a unified calendar API with direct Google and Microsoft integrations, check iCloud/Exchange coverage, OAuth/review requirements, least-privilege event access, provider terms, data handling and expected cost. Keep a provider-neutral adapter boundary; select providers only after this evidence.
- Draft a visibility matrix: public visitor, sender, recipient, unrelated account and blocked account.
- Define the minimum automatically public starter-profile fields and optional owner editing/visibility controls. Do not add a compulsory publication step before showing a usable QR. Authentication data is not automatically public.

Complete when: identity and draft return work in a small trial; dependencies and unresolved provider access are recorded; access rules and the defaults needed for the next milestone are settled. If provider access is blocked, continue mocked design work but do not describe authentication as complete.

### Milestone 1 — Prototype the full experience

Work:
- Create a mobile-first interactive prototype covering immediate QR after SSO, optional profile editing, public profile, guest saves, activity-interest/answer/request forms, successful submission feedback, People swipes, Activity, owner review and prominent Again. Use action-led wording consistently across every tab and view. Use the confirmed concise defaults: **Answer a question** — “What would you like to know about my work?”; **Ask for feedback** — “A fresh perspective on a project or idea?”
- Include empty categories, missing LinkedIn link, failed save, expired activity, unavailable profile, cancelled sign-in and preserved drafts.
- Use the emerging light/neutral visual direction; keep exact colours and identity choices provisional.
- Walk through the prototype with prospective users. Proposed initial round: 5 people who attend professional events, including both scan and share roles.

Complete when: participants can explain what each action does, that saving is private, that Experiences records interest, and that Again becomes visible only when mutual. Resolve observed confusion before freezing the first implementation slice. Record findings rather than treating five participants as market validation.

### Milestone 2 — Build scan, save and return

Work:
- Establish the application, database changes, automated checks and a private development/staging environment.
- Build sign-in, automatic minimal usable profile/QR creation, optional profile editing, stable profile URL and QR display. Do not require a profile-completion or publication wizard. Define exactly which minimal fields are initially public.
- Keep a camera-scan control at the top right. Implement permission/denial handling, QR decoding and a profile-link fallback, and test self-scans and interrupted drafts.
- Build automatic saving, People, repeat/self-scan handling and guest-to-account import.
- Record a timestamp and support optional saver notes for each saved person, including guests. Group People by local calendar date without per-row timestamps; show the exact timestamp and notes in saved-person detail. Preserve both through account import, retries, Archive/Restore and Undo. Define repeat-encounter and retention behaviour; notes must not become public profile fields.
- Place the timestamp in a bottom saved-context area after the profile actions and immediately before Notes. This area also holds private calendar-derived encounter context, separate from the public profile and manual notes.
- Build calendar connection and context gathering into this initial product milestone. Use the provider selected after milestone 0 and a provider-neutral adapter so coverage can expand without changing saved-person flows. Provide a useful manual path when no provider is connected.
- Offer Connect Google Calendar after LinkedIn sign-in. Explain private encounter context and Join me suggestions beside the control. Let people choose calendars, request focused read-only access, and provide a reconnect route.
- When a saved-person timestamp is near one or more candidate events, offer private, editable context with clear uncertainty. Handle no match and multiple matches without silently assigning context. Keep this distinct from manual notes; support disconnect/revocation and define deletion/expiry for retained derived data.
- Use upcoming event details only for private **Join me** drafts about public events. Calendar metadata cannot reliably prove an event is public or open to guests, so require the owner to confirm both before publishing. Never suggest private appointments as calendar-derived **Join me** content or reveal raw calendar data on the public profile by default. If no suitable public event or calendar data is available, use the generic “Coffee and a catch-up?” fallback; keep exact one-to-one logistics private for a post-match flow.
- Add People swipe gestures: left opens the person's supplied LinkedIn link, right archives a save. Keep the archive button left and LinkedIn button right. Provide Undo and visible keyboard/accessibility alternatives; handle missing links and distinguish horizontal swipes from vertical scrolling. Add People → Archive with one-tap Restore and no expiry/delete step in this flow.
- Prepopulate each newly created profile with Join me — “Coffee and a catch-up?”, Answer a question — “What would you like to know about my work?”, and Ask for feedback — “A fresh perspective on a project or idea?”. Keep optional editing and immediate QR; never overwrite existing custom content on sign-in.
- Record an incoming encounter for the scanned profile owner: registered scanner identity or anonymous guest nickname. Keep scan visibility separate from Again and connection requests. Deduplicate retries/self-scans, retain notes/archive state, protect private fields and define scan notice, guest token/alias scope, retention and registration transition before release. Do not use fingerprinting to identify guests.
- Put an archive-tray icon at the left end and LinkedIn at the right end of each People row, with the name/profile action in the middle. Use no bin icon for archiving. Retain separate generous tap targets and test whether this reduces accidental presses.
- Preserve intended destination and draft state across sign-in. Let people keep participating without completing an extensive profile.
- Provide optional manually entered LinkedIn links with safe validation and clear external navigation.

Complete when: a person creates a profile; another person scans and saves it without signing in; the guest later signs in, retains the saved profile and returns to it. Import retries neither lose nor duplicate saves. A connected calendar can suggest, but never silently assert, private encounter context and can prepare an owner-reviewed **Join me** draft for a public event the owner confirms is open to guests. Without a suitable event/calendar, the profile uses the generic coffee fallback. Exact one-to-one coordination remains private and belongs after mutual Again. Disconnection removes access and follows a defined deletion policy. Failed browser storage or network saving produces honest feedback rather than a false success. Public responses contain only public fields.

### Milestone 3 — Build participation and owner review

Work:
- Configure one active item per category if that proposed limit is adopted.
- Implement Experiences interest, private Ideas answers and specific Value requests.
- Preserve drafts through sign-in, validate before sending, prevent duplicate retries and show a confirmed result only after server success.
- Build sent/received contribution views and useful person/item context without chat threads.
- Add a per-user unread badge anchored at the upper-right of the Activity icon, keeping its text centred, plus unread row dots and Mark all as read. Opening the tab alone should not clear items. Preserve contribution records when marking read; use per-event/version receipts so clearing does not swallow later arrivals or edits. Confirm which updates count before production implementation.
- Replace the form in place with the saved answer/request after sending; provide later access through Activity → Sent. Use inline pencil/Edit → Save changes and Cancel on the same view, with no separate confirmation or editing screen. Store submitted text separately from drafts and preserve original context/time. Recipients see updates; enforce sender-only writes.
- Enforce one answer per sender and stable question ID with a database unique constraint, checking again after authentication. Keep the action headline/question text unchanged after answering and show an Answered check badge; tapping opens the existing answer for inline editing. Return existing records on retries/concurrent attempts rather than duplicating or overwriting content. A new question needs a new identity; do not use text equality or profile owner alone as the key.
- Use the same completion presentation for all profile actions: Interest sent, Answered and Request sent check badges, with original titles/context unchanged. Tapping reopens the existing submission; written requests remain editable. Derive status from the current sender and specific activity/question/offer ID. A new item must not inherit an old badge. Do not imply attendance, acceptance or fulfilment, or extend the question uniqueness rule to every request without a separate decision.
- Preserve edit drafts on failure/interruption, reject invalid blanks, and design version/conflict handling to prevent silent overwrites. Edited-content notifications and retention are separate decisions; no edit deadline is agreed.
- Preserve the original item context when an owner edits or replaces an activity, question or offer. Mark closed/expired items accurately.

Complete when: real accounts can submit/review contributions, with exactly one answer per sender/question even under retries, simultaneous requests and sign-in continuity. Sending and subsequent editing remain on the same view. Senders can edit their own text; recipients see updates but cannot edit it; unrelated accounts have no access. Preserve record identity, original item context/participants and sent time. Owner item edits do not rewrite submitted context. Cancellation/failure/conflicts cause no data loss. The external next step and response expectations remain clear.

### Milestone 4 — Build private mutual Again

Work:
- Store directional interest privately and calculate mutuality on the server.
- Show the sender their own state without exposing the other person's one-sided interest.
- Create a single mutual match when both signals exist, including simultaneous submissions and retries.
- Add the agreed match view, external hand-off, withdrawal/removal rules and notifications.
- Prompt a next step after mutual Again with Coffee, Walk and Call suggestions. The current prototype offers an editable message to copy and an external LinkedIn hand-off. Keep exact one-to-one logistics private; do not imply a message was sent or an event booked. Clipboard failure needs an accessible manual-copy fallback. This is separate from calendar-derived public-event suggestions.
- Check that profile responses, Activity, counts, alerts and analytics cannot expose private inbound interest.

Complete when: first interest remains invisible to the recipient and other users; reciprocal interest produces one match visible only to the pair; blocking and the agreed lifecycle rules work; a matched pair has an understandable next step, including when a LinkedIn link is absent.

### Milestone 5 — Prepare and run a small pilot

Work:
- Finish account deletion, reversible saved-person archiving/restoration, blocking, retention behaviour and a practical route to report misuse. Archiving is distinct from blocking, account deletion and withdrawing Again interest.
- Test the complete scan-to-return journey on iPhone and Android, including phone-camera entry, normal browsers and available in-app browser contexts. Verify LinkedIn navigation with and without its app installed.
- Check keyboard and screen-reader use, form labels, contrast, touch targets, mobile layout and slow/failed connections.
- Verify permissions with multiple accounts; add request limits, input validation, safe rendering, monitoring and a backup/recovery procedure appropriate to the chosen platform.
- Add minimum necessary measurement without logging answer text, help-request content or one-sided Again signals into general analytics.
- Select a cohort and event, establish participant support, publish accurate privacy/product explanations and run a recovery rehearsal.

Complete when: the acceptance checklist passes, serious access/data-loss defects are closed, the pilot owner/cohort are identified and the second-interaction measurement method is agreed. Broad public promotion follows pilot evidence and necessary fixes; it is not implied by completion of this plan.

## 4. Proposed information model

This is a starting model for implementation design, not an approved database schema.

| Record | Purpose / access boundary |
| --- | --- |
| Account and provider identity | Stable internal user identity; private provider mapping, session and account lifecycle. |
| Public profile | Minimal automatically usable profile after ordinary sign-in, with an explicit initial visibility policy and optional later edits/links; separated from private authentication data. |
| Share item | Owner, category, current content, availability and version/archival state. |
| Saved person | Private owner-to-profile relationship with save timestamp, optional saver notes and reversible archive state; unique per pair. Restoration retains the original date group. No reciprocal connection request. Keep notes/archive state out of public responses and general analytics. |
| Contribution | Stable ID, immutable sender/recipient and original item context, separately stored submitted body, sent time and edit/version metadata. Participant-only reads; sender-only permitted content updates. |
| Again interest | Private directional signal; never generally readable by the target account. |
| Mutual match | Pair-level state visible to the two participants after reciprocal interest. |
| Block / lifecycle records | Enforce the agreed visibility and interaction restrictions across routes. |

Guest saves and drafts start separately in browser storage if that proposal is adopted. Treat imported identifiers as untrusted, validate them and make import retryable. Do not place private contribution text or Again signals in public URLs.

## 5. Verification plan

Use focused automated checks for consequential behaviour, alongside real-device and usability checks:

- Integration checks for guest import, sign-in return, contribution authorisation and deletion/blocking rules.
- Concurrency/retry checks for saving, contribution submission and mutual-match creation.
- End-to-end coverage of ordinary SSO → usable QR without editing, plus guest scan → compose → explicit send/sign-in → successful submission → owner review, and both sides of Again. Verify that authentication resumes the intended action.
- Gesture checks for left-LinkedIn/right-archive with unchanged button placement, Undo, missing links, vertical scrolling and accessible alternatives. Check incoming member/guest scans, anonymity, duplicates, self-scans, notes, archive retention and the absence of automatic Again interest. Check People → Archive → Restore, metadata preservation, repeated scans, guest import and duplicate-free restoration. Verify scanner access on all screens and draft restoration after leaving it.
- Direct access checks using unrelated accounts and unauthenticated requests, not only hidden UI controls.
- Manual checks of QR scanning, browser continuity, external links and accessibility on representative phones.

No implementation or test results exist as part of writing this plan. Record actual evidence against each milestone when work occurs.

## 6. Pilot learning and release boundary

Proposed measures: save success; successful guest import; contribution completion; owner review; return visits; mutual matches; and reported meaningful second interactions. Button presses and opening LinkedIn are intent signals, not proof of a meeting.

Agree a simple pilot follow-up method, for example a participant check-in asking whether a further conversation or shared activity happened. Define the denominator and observation window before collecting results. Targets remain open.

Keep native chat, general connection requests, feeds, extra sign-in providers, automated LinkedIn invitations, calendar write actions, automatic public calendar-derived content and elaborate follow-up management outside this build. Calendar-informed suggestions are in scope; generative AI is not required for the first version. Evaluate richer item management, email alerts and installation features only against pilot needs and the confirmed scope.

## 7. Execution and sequencing

Calendar integration is part of the initial product scope. In milestone 0, prove OAuth and calendar access, compare a unified calendar API against direct integrations, verify provider terms and review requirements, and settle the first provider set. In milestone 2, ship the selected integration with narrow read access, explicit calendar selection, private candidate context, owner-reviewed **Join me** drafts, manual fallback, disconnection and a defined deletion policy. Keep suggested context distinct from manual notes and from evidence that an encounter actually happened. This plan does not authorise connecting an account, sharing calendar data with a vendor or incurring a paid service.

Order: 0 → 1 → 2 → 3 → 4 → 5. Prototype the mutual-match hand-off in milestone 1 even though its production implementation comes later. Begin privacy rules and provider checks in milestone 0 rather than leaving them to pilot preparation.

The first implementation task is the real sign-in/draft-return trial, alongside the access matrix, calendar-provider proof and prototype screen map. Estimate delivery after milestones 0 and 1, once provider access, hosting, designs, team capacity and unresolved product rules are known. No reliable calendar commitment is supported by the current evidence.

**Confidence:** 94% in the coverage and dependency order; lower confidence in effort until identity access and prototype findings are known.

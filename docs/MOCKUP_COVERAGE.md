# Hi Again interactive journey concept

**Current showcase access, 1 November 2026:** The [existing mock-up](https://hi-again-journey-demo.woollysnipe13.chatgpt.site) is now public for Tek to share with a friend (Sites access revision 2). A matching standalone HTML export is at `outputs/hi-again-mockup.html`. This supersedes the earlier owner-private access descriptions below. The prototype simulates LinkedIn sign-in followed by optional Google Calendar connection. No real accounts/calendar access or messages are involved.

Verified with an unauthenticated HTTP request: status 200, unchanged Site URL and the mock-up document present, without a sign-in redirect.

**Current provider alignment, 13 November 2026 (reference v1.58):** The published mock-up already illustrates LinkedIn-only sign-in and a separate calendar connection. Both flows are simulated. The real integration is covered by the [identity trial](IDENTITY_TRIAL.md).

**Created:** 31 October 2026  
**Status:** Interactive design exploration reflecting confirmed interface direction; exact design is not approved or production implementation.  
**Latest source:** `C:/Users/tekka/.codex/visualizations/2026/10/31/01a193b9-11f9-7731-b1ed-180bc363d1e8/hi-again-frictionless.html`  
**Earlier source retained:** `C:/Users/tekka/.codex/visualizations/2026/10/31/01a193b9-11f9-7731-b1ed-180bc363d1e8/hi-again-journeys.html`

**Hosted preview (1 November 2026):** [Open the interactive mock-up](https://hi-again-journey-demo.woollysnipe13.chatgpt.site). Owner-private access requires the same ChatGPT account. Deployment succeeded; actual phone access remains unverified. Standalone source: `sites/hi-again-mockup/dist/index.html`, exported from the latest inline source. Changes to the inline source require re-export and publication. All product integrations remain simulated.

The inline concept uses a journey selector and a contained mobile interface. All people, activities and contributions are fictional. Card corner radius and compact spacing can be explored using the host's optional design controls.

**Undo and text-limit revision (reference v1.47):** Calendar dismissals now have persistent per-account reverse-order Undo. Prompts/questions/invitations use 180 characters; answers/feedback requests use 1,500, including inline edits. Textareas show bottom-right live words and characters/limit; existing Introduction/Notes limits remain. Profile previews clamp to two lines. Native input and prototype save validation enforce the new limits without truncating restored drafts. Passed 369 assertions at both widths, including boundaries, edits, counter position and Undo restoration. Backend limits/provider storage remain unimplemented.

Publication succeeded at the existing private URL: commit `6228fb580ef150847113784aaec23a1d0de06458`, deployment `appgdep_6ae78dacdeec81919408bf5b23c83881`.

**Calendar ideas revision, 1 November 2026 (reference v1.42):** Suggestions now occupy the bottom of Edit profile. Join me has a Choose from calendar ideas jump prompt; selecting/publishing an idea returns focus to Join me. Two ideas show initially; Show more/Show fewer with arrows expands/collapses further suggestions. Passed 348 checks at both widths, including ordering, focus, unsaved edits, expansion and selecting an expanded item. Supersedes earlier beneath-Join-me placement; calendar sources are still fictional Work/Personal fixtures.

This revision was published successfully to the existing private URL: commit `ecdf0e222015f54b98db2a9b8b673cd1e02c1b56`, deployment `appgdep_6ae71f4ecc788191a238ca980ea55823`.

**Edit-profile revision, 1 November 2026 (reference v1.41):** All three action fields are equal-sized, vertically resizable textareas matching Introduction. Event suggestions and invitation review now appear only in Edit profile, beneath Join me; My profile has no suggestions. Calendar · Join me suggestions opens Edit profile. Verified 335 local assertions at 320px and 740px, including multiline persistence, equal geometry/resize behaviour and location. Supersedes the previous calendar placement below.

Publication succeeded at the existing private URL for this revision: commit `6509055c0061a9c7f062f1e1a7babf89e9a448b5`, deployment `appgdep_6ae71b57fd6c8191922452a5544f30a8`.

**Calendar revision, 1 November 2026 (reference v1.40):** Added Calendar · connect once / automatic context / two possible events / no matching event / Join me suggestions. See [calendar journey design](CALENDAR_JOURNEY.md). Permission, event matching and publication use fictional local fixtures. Context appears between timestamp and notes, private to the saver. Join me suggestions sit below the owner card and require an edited/reviewed public preview and event-openness confirmation. Local checks passed 322 assertions at 320px and 740px, including denial, reconnect, correction/removal, disconnect, notes preservation and explicit publication. Real phone, provider, server privacy and event-lifecycle verification remain outstanding.

Calendar prototype publication succeeded at the existing private URL: source commit `9a58ce32e4aa05e96b72f1122cc88ec61876f77e`, deployment `appgdep_6ae7193714c48191a0889b328e5f1215` (1 November 2026). This publishes the design simulation only.

**Current revision, 1 November 2026 (reference v1.39):** Left swipe opens LinkedIn; right swipe archives. Buttons remain archive-left/LinkedIn-right. New accounts prepopulate all three confirmed prompts. Mutual Again offers Coffee, Walk and Call with an editable message and copy/external hand-off; nothing is automatically sent/booked. “People who scanned me” demonstrates incoming registered names and anonymous guest nicknames, with no guest LinkedIn/Again, repeat-scan deduplication, notes and archive preservation. This supersedes previous gesture/default descriptions below. The updated same-link publication succeeded; 268 local checks passed at 320px and 740px. Incoming scan events remain a single-device simulation; guest lifecycle and actual mobile/backend verification are outstanding.

Tek's confirmed refinements are recorded in reference v1.6: minimum-step journeys and clean intuitive UI; ready-to-use QR directly after ordinary SSO; optional editing; Again before the three Shares; a persistent top-right scan button; LinkedIn beside the person's name; and opposite People swipes for removal and LinkedIn. The revised concept maps left to remove and right to LinkedIn, adds Undo and visible accessible alternatives, and removes mandatory review screens. These exact implementation choices remain subject to testing.

The subsequent v1.7 layout exploration follows Tek's suggestion to separate the visible actions: bin at the far left, profile/name in the middle and LinkedIn at the far right. Tap targets remain at least 44px, and swipe directions and Undo are retained. Accidental-tap reduction has not yet been measured.

The v1.8 revision adds a save timestamp and optional notes for each saved person. Following Tek's immediate clarification, People shows date headings (Today, Yesterday, recent weekdays, exact older dates) without row timestamps. Person detail keeps the exact save time and a collapsed Notes section. The current concept defaults to private saver notes, preserves the original timestamp on repeat scans, and carries notes through simulated sign-in and Undo. Google Calendar event/context auto-population is planned for a later phase; no calendar was connected or accessed.

The v1.11 revision supersedes removal and bin icons with reversible archiving. People has an Archive button; archived people have Restore. The visible archive-tray icon stays at the opposite end of the row from LinkedIn. Notes, original save time and contributions are retained. Left swipes archive; right swipes open LinkedIn. The concept keeps repeat scans archived until explicitly restored and retains archive state through simulated guest sign-in/import.

The v1.15 placement refinement moves the timestamp below the Share actions, immediately before Notes, in a saved-context area. Future Google Calendar event/context will appear in this same area; the current concept renders no fabricated calendar event or integration control.

| Journey | Interactive coverage |
| --- | --- |
| Create my profile | Simulated LinkedIn sign-in directly to QR; no compulsory editing, preview or publish steps. Starter profile does not invent Share content or a LinkedIn link. |
| Share myself | Immediate QR view, optional editing and a visitor-perspective demo. |
| Scan and save | Guest profile access, automatic saving, duplicate/self-scan handling, top-right scanner and denied-camera profile-link fallback. |
| Share Experiences | Interest-only flow, explicit sign-in-and-send, success feedback and owner view. |
| Share Ideas | Private answer composition, draft continuity, direct sending and owner view. |
| Share Value | Specific request, response expectations, direct sending and owner view. |
| Express Again interest | Prominent action above Shares; private inline toggle with one-tap withdrawal. |
| Discover mutual Again | Switch to the other person's perspective, independent reciprocal interest, mutual match and external next step. Includes missing external-link state. |
| Review participation | Owner Activity and private contribution detail for all three categories. |
| Read/edit sent contributions | Sending shows saved text in place; Activity Sent/Received provides later access. Pencil/Edit → Save changes and Cancel stay on that same view. Failure retains draft, original sent time remains intact and the recipient has no Edit control. No separate confirmation screen. |
| One answer per question | Stable question ID plus sender identity; the card keeps its original headline/question and adds an Answered check badge. Repeat access opens the saved answer; duplicate attempts do not add/overwrite records. New question identities and independent senders remain valid. |
| Other action completion | Join me and Ask for feedback also keep their text and show matching Interest sent / Request sent check badges. Reopening shows the existing submission; requests can be edited. A new activity/offer ID starts without an old badge. |
| Unread Activity | Numbered badge above-right of the Activity icon with centred text below, unread item dots, opening individual items to mark read and Mark all as read across filters. History remains accessible; later arrivals/edited contributions become unread. Mutual Again only; no one-sided count. |
| Return to people | Date-grouped saves without per-row timestamps; detail timestamps and optional notes; profile revisits, left-LinkedIn/right-archive, Undo, visible alternatives, Archive/Restore, missing links and vertical-scroll protection. |
| Convert guest use | Simulated three-profile collection, sign-in and return straight to People with retained saves. |
| Supporting journeys | Profile editing, empty-form validation, cancelled authentication, recovered draft, failed send/retry, reversible archiving, blocking and account-deletion-policy review. |

## Latest verification evidence

- A local headless Chromium run passed **243 assertions at both 740px and 320px widths**. All 15 journey entry views had no horizontal document overflow. Earlier revisions passed 93, 97, 116, 132, 135, 152, 178, 204, 209, 227 and 228 respectively. Context placement remains after the profile actions and immediately before Notes. All three completed cards preserve their headlines and use consistent separate check badges; the narrow all-completed profile was inspected.
- Activity/help completion checks cover badge labels, unchanged headlines, reopening existing records without another submission, retained request completion after editing and clean state for replacement activity/offer IDs. Question uniqueness remains a separate rule.
- Single-answer checks verify same screen/title after sending, no View/confirmation step, answered-card state, saved-answer access rather than blank composition, same-view edits, no second record on duplicate attempts, no overwrite of sent text, draft review as an edit, distinct question identities despite identical wording and independent respondents. Before/after question views were inspected. Post-sign-in checks also cover private saved-answer visibility, duplicate detection, retaining a new draft for explicit editing and cancellation. Server uniqueness and real concurrent race handling are still unverified.
- Inline-edit checks verify the same detail screen/title through edit and save, a primary CTA that changes to Save changes, focus in the text area, and in-place cancellation preserving the saved version. The narrow inline editor was inspected. The earlier separate editing screen is superseded.
- Unread checks cover initial counts, row dots, single-item read, tab entry retaining unread, bulk clear across filters, retained records, persistence of read snapshots, later arrivals, sender/recipient separation, re-unread edited contributions and mutual-only Again. Layout checks confirm centred Activity text and the numbered badge above-right of its icon. The narrow Activity view was inspected.
- Sender-editing checks cover exact submitted text, separate records and composition drafts, original item/recipient retention, direct confirmation access, Sent listing, sender edit/save/cancel, blank validation, interrupted drafts, failed update/retry, original sent time with separate edited time, no duplicate record on edit, private snapshot storage and updated recipient views without an Edit control.
- Archive checks cover empty and populated Archive views, archive rather than bin icon, persistent Restore access, notes/timestamps through archive/restore, snapshot continuity, no archive swipe-away action, duplicate-free restoration, explicit restoration after repeat scans and guest archive import.
- Added checks cover relative/absolute date headings, no row-level timestamps, detail timestamps/notes for all saved people, optional collapsed notes, separate notes per person/actor, private snapshot storage/restoration, guest import, clearing notes, original timestamps on repeat scans, and metadata restoration through Undo.
- Checks cover immediate QR after SSO; no compulsory enrichment; optional editing; Again order/emphasis; LinkedIn beside the name; scanner presence on every journey entry; scan deduplication; direct send without a redundant review step; cancelled sign-in/draft preservation; private-before-mutual Again; mutual match; guest import; send failure/retry; synthetic left/right gestures; Undo; visible action alternatives; missing LinkedIn links; vertical-scroll protection; scanner denial/fallback; self-scan and blocking.
- Grouped People and expanded person notes were visually inspected. The revised fragment passed the visualisation renderer's validation.
- Sender detail at narrow width and the edit form at desktop width were visually inspected. A dedicated Read and edit what I sent example is available. These UI checks do not verify server-side access controls, real authentication, conflict resolution or durable persistence.
- Gesture checks use synthetic pointer events. They do not establish real touch behaviour or conflict-free interaction on actual devices.

## Separate CTA clarity exploration — proposal only

Source: `C:/Users/tekka/.codex/visualizations/2026/10/31/01a193b9-11f9-7731-b1ed-180bc363d1e8/hi-again-cta-options.html`.

Two comparison variants explore Action led (visitor-action headline with supporting context) and Content led (specific invitation/question/offer headline with an explicit action beneath). Optional host controls show/hide secondary Share-category labels. The proposed visitor labels do not change the three underlying categories or replace the agreed labels/main journey concept without a further decision.

A local browser passed 20 checks at both 320px and 740px widths. Checks cover all three actions in each variant, forms, empty-input validation, clearly simulated confirmation and horizontal fit. The narrow action-led view was inspected. No user comprehension study has been completed.

**Subsequent selection, reference v1.21:** Tek explicitly chose Action led. The main journey concept now uses its action headline, short context, icon and chevron for visitor cards and the owner's preview. Configuration and activity labels retain the fixed Share category names. The 135 existing journey checks pass at both widths; the narrow profile has been inspected. The comparison's earlier proposal status is historical: Action led is chosen, Content led is not. No measured comprehension results exist.

**Superseding all-tab direction, reference v1.22:** Tek then retired the three-Share framing from the product altogether, retaining it only as a possible marketing concept. The current profile, owner editor, forms, Activity, details and journey selector use plain action/status wording. Activity cards use the same icon/headline/context/chevron hierarchy, with state-appropriate headlines such as Wants to join and Answered your question. The comparison also retires its branded-label controls. The underlying participation mechanisms continue; the earlier v1.21 retention of category labels in configuration is superseded.

The latest main concept passed 152 local checks at 320px and 740px, including absence of the three retired labels across all journey entries and contribution details. The comparison's 20 checks also pass at both widths. These are simulated UI checks, not a user comprehension study or production implementation.

## Earlier journey concept verification

- A local headless Chromium check passed 48 assertions at both 740px and 320px browser widths.
- Checks exercised all 14 journey entry points, profile publication, automatic save/deduplication, each contribution's sign-in/review/owner flow, draft preservation, private-before-mutual Again presentation, mutual match, absent external link, guest conversion, send failure/retry, removal, blocking and profile editing.
- The final profile view had no horizontal document overflow at either tested width. Its screenshots were visually inspected at both widths.
- The inline fragment passed the visualisation renderer's fragment validation.

These checks verify simulated interface transitions. They do not prove backend authorisation, persistent storage, identity-provider integration, working QR codes, clipboard operations, real LinkedIn navigation, real device compatibility or participant usability. QR patterns and external navigation are explicitly illustrative. Deletion stops at a review screen because detailed retention rules remain undecided.

The concept leaves the build plan's provider trial, initial public-field/privacy specification and usability work outstanding. Confirmed decisions come from Tek's feedback, not from the existence of a mock-up. Sign-in-before-submit, exact send resumption, inline Again toggling, navigation labels, gesture mapping and Undo remain implementation proposals where not explicitly confirmed.

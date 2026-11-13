# Hi Again project reference

**Last updated:** 14 November 2026  
**Version:** 1.67  
**Stage:** Concept definition and MVP planning  
**Owner:** Tek  
**Purpose:** The living reference for Hi Again's product, decisions, reasoning, scope and unresolved questions. Read this before continuing project work and update it as decisions develop.

Hi Again is a mobile-first networking companion that helps people turn a first encounter into a meaningful second interaction. An interactive QR profile uses direct action-led invitations: **Join me**, **Answer a question**, or offer-specific wording such as **Ask for feedback**. The former Share Experiences / Share Ideas / Share Value framing is retired from the product interface and retained only as a possible future marketing idea. A separate **Again** action privately records interest in meeting again and reveals it only when mutual. The initial audience is existing LinkedIn users who already scan QR codes at professional events. [V; Tek's subsequent interface decisions, 31 October 2026]

> **Main brand line:** Don't just meet. Meet again.  
> **Product promise:** Make the second interaction happen.

Tek confirmed these lines and automatic guest saving on 30 October 2026. On 13 November 2026, Tek restored **LinkedIn-only launch sign-in**, followed by a separate optional **Google Calendar** connection.

**Version 1.1 clarification:** The subsequently supplied Product Vision & Decisions brief recovers specific earlier decisions that the first three summaries left unclear. In particular, Share Experiences concerns doing something together, and Again has a private mutual-interest mechanism. These are recovered product decisions, not newly invented features. Tek's direct clarifications remain authoritative.

## Contents

1. [Current decisions at a glance](#1-current-decisions-at-a-glance)
2. [Product intent and decision principles](#2-product-intent-and-decision-principles)
3. [Audience and relationship journey](#3-audience-and-relationship-journey)
4. [Profiles, sharing and Again](#4-profiles-sharing-and-again)
5. [QR capture and saved people](#5-qr-capture-and-saved-people)
6. [Authentication and account identity](#6-authentication-and-account-identity)
7. [The role of LinkedIn](#7-the-role-of-linkedin)
8. [MVP scope](#8-mvp-scope)
9. [Name, brand and research history](#9-name-brand-and-research-history)
10. [Technical direction and data questions](#10-technical-direction-and-data-questions)
11. [Current state and validation](#11-current-state-and-validation)
12. [Decision history](#12-decision-history)
13. [Open questions and next decisions](#13-open-questions-and-next-decisions)
14. [Sources and how to maintain this reference](#14-sources-and-how-to-maintain-this-reference)

## 1. Current decisions at a glance

| Area | Current position | Status / basis |
| --- | --- | --- |
| Product objective | Help something meaningful happen after the first meeting. | Confirmed; P, A |
| Initial audience | Existing LinkedIn users who already scan QR codes at professional events. The exact pilot cohort is still open. | Recorded starting audience; V |
| Working brand | Hi Again remains the preferred name despite unresolved naming overlap. | Provisional brand choice; N |
| Main brand line | **Don't just meet. Meet again.** | Confirmed; C |
| Product promise | **Make the second interaction happen.** | Confirmed; C |
| Preferred domain | `hiagain.link`, ahead of `hi-again.link`. Purchase is unconfirmed. | Preference confirmed; N |
| Launch sign-in | **LinkedIn only at launch.** Connect Google Calendar separately after sign-in. | Confirmed by Tek, 13 November 2026. Supersedes the 1 November Google-only sign-in and first-login calendar request. |
| Public profile access | A QR profile can be viewed without signing in. | Confirmed; P, A |
| Scan behaviour | **Automatically save profiles for both guests and signed-in visitors. Sign-in can follow later.** | Confirmed; C |
| Profile actions | Activity invitations, questions and offers of help use action-led wording throughout. **Join me** favours public-event invitations, using an owner-confirmed event when available and “Coffee and a catch-up?” as a generic fallback when calendar data/a suitable event is unavailable. **Answer a question** defaults to “What would you like to know about my work?” Exact one-to-one logistics remain private; after mutual **Again**, “Coffee and a catch-up?” is also a suggested next step. Retire the branded three-Share framework from product UI. | Action-led structure confirmed 31 October 2026; public-event emphasis and coffee defaults for both contexts confirmed 1 November 2026; concise default copy confirmed by Tek, 1 November 2026. Exact event copy, item limits and fulfilment remain open. **Ask for feedback** default: “A fresh perspective on a project or idea?” |
| Again | A separate expression of interest in meeting again. One-sided interest stays private; reveal only when both people express it. On mutuality, prompt a next step with coffee, walk or call suggestions. | Mutual privacy retained; next-step suggestions confirmed by Tek, 1 November 2026. **Lifecycle confirmed by Tek, 13 November 2026:** withdraw any time before a match; after a match either person can end it, which removes it for both without notification; one-sided Again never expires. **A match reveals no contact details beyond existing public links** (profile and optional LinkedIn) — Tek, 13 November 2026. Exact coordination remains open. |
| Incoming-scan notice | Every profile tells visitors “Name will see you visited”; guests are also told they appear as an anonymous nickname. Signed-in scanners appear in the owner's People by name; guests as a per-owner nickname that cannot be linked across owners. | Confirmed by Tek, 13 November 2026. Guest-encounter retention period remains open. |
| Blocking | Silent, full separation: neither person can save, contribute to or say Again to the other; any match ends; past contributions and saves between them are hidden; the blocked person is not told. Reversible; unblocking restores history but not matches. | Confirmed by Tek, 13 November 2026. |
| Account deletion | Immediate and permanent, including contributions the person sent to others (removed from recipients' Activity). | Confirmed by Tek, 13 November 2026. |
| Public-field allowlist | Name, headline, photo (LinkedIn picture), optional LinkedIn link and active invitations are public to anyone with the link; email and internal IDs never. | Confirmed by Tek, 13 November 2026. |
| Notes length | Private saver notes up to 2,000 characters (contributions 1,500; invitations 180). | Confirmed by Tek, 13 November 2026. |
| Calendar disconnect | Deletes guessed “Likely met at” context; keeps context the person picked or typed. | Confirmed by Tek, 13 November 2026. |
| Retention | Anonymous guest visits are kept for 12 months after the most recent visit; saves, notes and contributions stay until the person deletes their account. | Confirmed by Tek, 13 November 2026. No per-item deletion of sent contributions exists yet. |
| Email notifications | None for the pilot; Activity (in-app badge) is the only notification. | Confirmed by Tek, 13 November 2026. |
| Interaction model | One-off event interest, answers and requests; view contributions in Hi Again and continue externally. | Recorded concept; detailed fulfilment and release boundary open; V |
| Sender contribution access | Senders read/edit written content in place, both on the original submission view and through Activity → Sent. Sending changes the form to the saved contribution with inline Edit; the CTA becomes Save changes while editing. No separate confirmation, edit or save screen. Recipients see saved updates but cannot edit another person's text. | Confirmed read/edit, single-screen and no-confirmation-screen refinements; Tek, 31 October 2026. |
| One answer per question | Each person can submit only one answer to the same question. Revisiting opens their existing answer for viewing/editing rather than another blank form. Identify questions by stable item ID, not wording or owner alone. | Confirmed once-per-person/question requirement; Tek, 31 October 2026. Prototype guard implemented; database uniqueness/concurrency enforcement still to build. |
| Unread Activity | Show a numbered unread badge at the upper-right of the Activity icon, keeping the Activity text centred below it. Provide Mark all as read inside Activity. Clearing unread retains the activity history. | Confirmed unread/count/bulk-clear requirement and placement clarification; Tek, 31 October 2026. Event/read-trigger defaults below remain implementation choices. |
| Connection requests | Removed the general profile-exchange/request system. Saving, participating and mutual Again are distinct. | Recorded decision; V |
| Onboarding principle | Let visitors begin an action before sign-in; preserve the draft and intended action through authentication. | Recorded requirement; V |
| First-use profile | After LinkedIn sign-in, show a usable QR immediately using available identity, or resume the action that prompted sign-in. Calendar connection and profile editing are optional follow-up actions. | Confirmed immediate-QR and draft-continuity requirements. Provider decision updated 13 November 2026. |
| Profile hierarchy | Again is prominent above the profile actions. Place the optional LinkedIn link beside the person's name at the top. | Confirmed; Tek, 31 October 2026 |
| Scan access | Keep an always-available top-right camera/QR-scan button. Camera permissions, decoding, fallbacks and device compatibility still need implementation. | Confirmed interface requirement; Tek, 31 October 2026 |
| People gestures and Archive | Archive a person rather than remove/delete them. Swipe left to LinkedIn, right to archive; keep the archive-tray button left and LinkedIn button right. An Archive button opens restorable archived profiles. Preserve notes and original timestamps. | Tek reversed the gestures on 1 November 2026, retaining button placement. Supersedes the prior left-archive/right-LinkedIn mapping. |
| People action placement | Separate archive and LinkedIn controls onto opposite ends of a row, with the name between them. Current concept: archive-tray icon left, LinkedIn right; no bin icon. | Tek's opposite-side suggestion retained; subsequent request replaces bin/removal with archive. Mock-up implemented; usability benefit unverified. |
| Saved-person context | Every saved person has a timestamp and optional notes. People groups saves by date without per-row timestamps. In person detail, the exact timestamp belongs at the bottom after the profile actions, immediately before Notes; future calendar context uses that same area. | Confirmed; Tek's requests and placement clarification, 31 October 2026. First-save time, private notes and the seven-day grouping boundary are current design defaults. |
| Calendar integration | Google Calendar is the first calendar provider. Offer a separate optional read-only connection after LinkedIn sign-in. Use it for private encounter context and owner-reviewed **Join me** suggestions, with “Coffee and a catch-up?” as the fallback. | Provider split confirmed by Tek, 13 November 2026. [Calendar journey](docs/CALENDAR_JOURNEY.md) covers selection, provisional context, review and recovery. Further providers, matching, retention and implementation remain open. |
| LinkedIn connection | An optional **Connect on LinkedIn** button opens the person's ordinary HTTPS LinkedIn profile link. | Confirmed; P, A |
| LinkedIn link capture exploration | Focus on the owner's paste-link flow. Keep search-and-confirm in the back pocket; preserve its trial for possible later use. | Tek explicitly deferred search on 1 November 2026. Clipboard, normalisation and auto-save details below are recommendations under exploration, not confirmed implementation decisions. |
| App opening | Aim to open LinkedIn's app where device support allows, with browser fallback. | Intended behaviour; device testing outstanding; P |
| Restricted LinkedIn integration | No Invitations API, partnership requirement or API-driven invitations in the MVP. | Confirmed; P, A |
| Native chat | No native Hi Again messaging or chat in the MVP. | Confirmed; P |
| Account identity | Hi Again has its own stable user identity, independent of the sign-in provider. | Confirmed direction; P, A |
| Backend and launch surface | One TypeScript Next.js application on Vercel, Supabase PostgreSQL/Auth/Storage, and IndexedDB guest saves/notes/drafts. Mobile-first web first, progressive PWA support; server-controlled operations and database-enforced privacy/transactional Again. Start with free plans where eligible; upgrade based on usage, eligibility and reliability. | Confirmed architecture choice; Tek, 31 October 2026. Not implemented or deployed. |

**Status key:** Confirmed means explicitly agreed in the supplied records or clarified by Tek here. Provisional means preferred but conditional. Open means no settled answer is recorded. Suggested means an option or interpretation, not an agreed feature. Source codes are defined in section 14.

## 2. Product intent and decision principles

### 2.1 The problem being addressed

People meet at events, have a worthwhile conversation and exchange details, but then lose the name, context or intention that made the encounter valuable. A contact saved somewhere does not necessarily lead to another conversation.

Hi Again is intended to preserve the opportunity created by meeting someone. Capturing a profile is the start of that process; the value is being able to recognise the person, remember why the meeting mattered and take a relevant next step. [P, A, N]

### 2.2 What the decisions say about the intended product

The following is a synthesis of the recorded choices, rather than additional feature commitments:

- **The second interaction is the outcome that matters.** Meeting, scanning and saving should lead towards a conversation, collaboration or opportunity. A large saved-contacts list is an incomplete expression of the idea.
- **The first encounter should stay easy.** A guest can scan, see the profile and save it before signing in. Registration must fit around that moment.
- **Action before administration.** Let someone choose an activity, compose an answer or describe a request before sign-in interrupts them. Record interaction context automatically where appropriate; notes and tags should not be a compulsory first task. [V]
- **Always intuitive, simple and frictionless.** Tek explicitly reinforced the governing design philosophy on 31 October 2026: minimise screens, actions and fluff **without sacrificing clarity**. Challenge the need for every added screen, repeated action and explanatory sentence. Prefer inline changes and a dynamic primary CTA where practical; retain essential meaning, privacy and error feedback. Ordinary sign-in goes straight to a usable QR, with enrichment optional. This supersedes the first compulsory setup/publication path and the later separate contribution-edit screen. The principle is also recorded in AGENTS.md for future workspace tasks.
- **Create opportunities without owning the conversation.** Structured, one-off participation and mutual interest give people a reason to reconnect; existing platforms or a real-world meeting handle the continuing conversation. [V]
- **Hi Again should have its own usefulness.** LinkedIn supplies launch sign-in and can be a route to connect elsewhere through an optional public profile link. Hi Again retains its own profile, saved relationships and purpose.
- **The product should feel human and approachable.** The preference for Hi Again over Followup reflects a conversational, relationship-oriented identity. The scope should not drift into a conventional corporate CRM merely because contacts are being saved.
- **Start with a focused audience while preserving room to grow.** Professional encounters provide the initial context; broader language and provider-independent identity leave future options open.
- **Keep the MVP focused.** Standard LinkedIn links support the launch flow without restricted APIs; native chat is excluded. This leaves the core capture and follow-up experience to define and validate. [P, A, N, C]

### 2.3 Relationship to LinkedIn

The intended role is complementary: Hi Again captures the real-world encounter and helps continue it, while LinkedIn can remain the place where someone maintains their professional presence and sends a connection request. This describes Hi Again's positioning; it is not a comprehensive claim about LinkedIn's capabilities. [A]

## 3. Audience and relationship journey

### 3.1 Initial audience

The more specific initial audience is **existing LinkedIn users who already scan QR codes to connect at professional events**. Examples include conference attendees, founders, product managers, students and professionals at networking meetups. The reasoning is behavioural: Hi Again can build on an existing habit and improve what happens after the scan. This is a product rationale, not verified market-adoption evidence. [V]

The exact pilot cohort, event, geography and pilot size remain unselected. The naming research considered a UK-focused MVP; that is context for those checks, rather than a complete geographic launch plan. [A, N, V]

University events, volunteering, community activities and social gatherings were discussed as possible later settings. They remain expansion possibilities, not launch commitments. [A]

### 3.2 Intended journey

| Stage | Intended experience | Detail still to settle |
| --- | --- | --- |
| Meet | People encounter one another in person or through a shared Hi Again presence. | Precise first use case. |
| Share | One person presents a QR code linked to their lightweight interactive profile. | Stable public URL is the working direction; rotation and access rules remain open. |
| Scan and save | The visitor opens the profile and it is saved automatically, including for guests. | Storage, duplicate handling and the exact save confirmation. |
| Participate | The visitor chooses an activity, answers a prompt or requests offered help. They can begin before sign-in and retain their draft through it. | Identity requirements for each submission, confirmation and owner notification. |
| Remember | Keep a save timestamp and optional notes for each saved person; group People under dates. Add private calendar-derived encounter context in the initial product. | Calendar provider, access scope, matching, retention, privacy implementation and repeat-encounter rules. |
| Again | Either person can privately express interest in meeting again. Reveal shared interest only when mutual. | Post-match information, next-step interface and outcome definition. |

The broader lifecycle was also described as **Meet → Connect → Follow up → Act**. The more specific interaction principle is **Scan → Act → Record context automatically → Optionally add notes later**. These descriptions express intent, not a final screen layout. “Connect” does not reintroduce the removed profile-exchange/request system. [P, A, C, V]

## 4. Profiles, sharing and Again

### 4.1 The Hi Again profile

A person has a shareable networking profile that another person can open through a QR code and save. The profile should communicate who they are and give the receiver a useful reason and route to continue the relationship. [P, A]

The discussed profile fields are name, photo, brief introduction, professional description, optional interests, an optional LinkedIn link, the configured profile actions and a permanent QR/profile link. The emphasis is on what someone can do with the owner. A portfolio belongs in a normal profile link or section, rather than becoming a fourth Share category. These are discussed fields and placement decisions, not a final mandatory-field schema. [V]

Available identity information should populate a minimal starter profile, with enrichment optional rather than a prerequisite. Avoid unnecessary manual name entry when the provider supplies it, while tolerating missing identity fields. Public visibility still needs an explicit field policy; an email obtained for authentication is not automatically a public contact field. [A, V; visibility remains open in P]

**Confirmed refinement, 31 October 2026. Provider restored on 13 November:** After LinkedIn sign-in, make the profile usable and show its QR immediately. The owner can edit later. Display their optional LinkedIn link beside their name when supplied. The initial public-field policy remains to be defined.

### 4.2 Action-led invitations

**Current decision, 31 October 2026:** Tek retired the three-Share product framing after choosing the Action led design and requested consistent changes across all tabs. Use direct action language in profiles, editing, forms, Activity and details. The original Share Experiences / Share Ideas / Share Value framework can remain in the back pocket for possible future marketing; no campaign or publication has been selected. The activity-interest, question-answer and one-off help-request mechanisms continue. This does not establish a new arbitrary-CTA builder or settle content limits.

| Action | Recorded purpose and interaction | Still undefined |
| --- | --- | --- |
| **Join me** | The owner invites the visitor to a public event where available. A calendar item is only a candidate; the owner confirms it is suitable and open to invite someone to before publishing. If no calendar or suitable event is available, use the generic fallback **“Coffee and a catch-up?”** Exact venue/time coordination remains private and can follow mutual Again. | Record interest only, or also facilitate registration and attendance? How many active items? Exact event-specific copy? |
| **Answer a question** | The owner poses a question; the visitor submits one answer privately. | Contribution viewing, notifications, retention and content limits. |
| **Ask for feedback**, or wording matching the offer | The owner offers expertise, feedback, advice, introductions or resources; the visitor submits a specific one-off request. | Acknowledge/decline/fulfilment states without creating native messaging. |

Examples retained from the brief are an invitation to London Product Meetup, a question about a product someone would redesign, and an offer to give startup-idea feedback. These are illustrative content, not actual events or offers being published. [V]

**Public-event and coffee-default clarification, 1 November 2026:** Tek wants **Join me** to focus on public events, with calendar-derived suggestions reviewed by the owner and confirmed suitable/open before publishing. If calendar data is unavailable or supplies no suitable event, **“Coffee and a catch-up?”** remains the generic **Join me** fallback. Coffee is also a suggested private next step after mutual **Again**. Exact one-to-one meeting logistics remain private; the precise post-match flow and any calendar use there remain open.

**Question prompt refinement, 1 November 2026:** Tek first replaced the more demanding “What’s an idea you’ve changed your mind about recently?” with “What’s something you’re enjoying working on at the moment?” to make answering easier. Tek then selected “What part of my work would you like to hear more about?” to make the prompt owner-focused and more distinct from the visitor-focused feedback request. The concise confirmed default is **“What would you like to know about my work?”**

The original rationale was that experiences create shared memories, questions reveal interests and offers create practical opportunities to reconnect. Each remains an invitation to act. The earlier brief described submission confirmation; Tek's current refinement uses in-place saved content/feedback rather than a separate confirmation screen. Continuing externally remains separate from an ongoing Hi Again chat. [V; subsequent Tek refinement]

**Correction to version 1.0:** The Word summary's tentative reading of Share Experiences as background/lived experience is not the intended action defined in V. Share Experiences concerns an activity to do together. Likewise, Share Ideas has a concrete private question-and-answer mechanism. General profile context can still describe background. This corrects an incomplete interpretation; it does not record a new change of mind by Tek.

The number of active events, questions and offers remains open. The old branded three-Share structure is historical product framing, retired by Tek's later instruction. Current interfaces present the concrete actions; broad arbitrary CTA customisation has not been adopted.

**CTA clarity decision and subsequent extension, 31 October 2026:** Tek explicitly selected **Action led**: “yes I like the action led one”, then asked to scrap the three-Share framework from the product and apply the same changes to all tabs. Make the action the strongest line, with concise context, a relevant icon and chevron. Use **Join me**, **Answer a question**, and **Ask for feedback** for the illustrated offer; help wording follows the actual offer. The earlier v1.21 plan to retain branded category labels in configuration is now superseded. Activity uses action/status wording appropriate to what happened, such as **Wants to join**, **Answered your question** and **Asked for feedback**. The main concept and comparison surfaces have been aligned. Faster comprehension has not yet been measured with users.

**Default action-card copy, 1 November 2026:** The concise confirmed defaults for the professional-event audience are **Join me** — “Coffee and a catch-up?” when no suitable calendar event is available; **Answer a question** — “What would you like to know about my work?”; **Ask for feedback** — “A fresh perspective on a project or idea?” The **Join me** wording for a calendar event is owner-reviewed and event-specific. Exact one-to-one coffee logistics remain private. These are confirmed default copy choices; implementation is not included in this decision.

### 4.3 Again

**Again** is a fourth, separate interaction: privately indicate that you would like to meet someone again. The brief records this as the agreed concept, inspired by mutual-interest mechanics and adapted for networking. [V, section 5]

1. One person visits the other's profile and expresses interest in meeting again.
2. The other person can independently do the same.
3. Neither one-sided signal is revealed unless reciprocated.
4. Once interest is mutual, reveal it and encourage a next step outside a Hi Again chat.

The button must be visible to both people; **the interest signal is what stays private until mutual**. **Tek confirmed on 31 October 2026 that Again should be prominent and placed above the profile actions.** Answering a question or requesting help does not itself express Again interest, and a person can use Again without submitting a contribution. [V]

**Lifecycle decision, 13 November 2026:** Tek confirmed that a person can withdraw their own Again at any time before it becomes mutual; after a match, **either person can end it, which removes it for both people without notifying the other**; and a one-sided Again **never expires**. A new match after ending needs both people to say Again afresh. Tek also confirmed that **a match reveals no contact details beyond existing public profile links**, including the optional LinkedIn link. The exact match notification and route to a meeting remain open. The core mutual-interest rule is now recovered; it should no longer be treated as an unanswered concept question. After a mutual match, suggest **“Coffee and a catch-up?”** (alongside walk or call) as a private next step. The detailed one-to-one coordination flow and whether it uses calendar data remain open; this does not authorise creating calendar events. Reminders or follow-up plans may complement it later but are not its current definition. [V; Tek clarification, 1 November 2026]

### 4.4 One-off contributions and continuity

Hi Again can store an event-interest submission, a private question answer or a help request, and let the owner review it. **No native chat** does not mean no stored user contributions. The owner follows up externally rather than replying in an ongoing Hi Again thread. [V]

**Confirmed sender read/edit requirement, 31 October 2026:** Tek requires senders to be able to view what they wrote and edit it afterwards. Sending now reveals the saved content **on the same question/request view**, with later access via **Activity → Sent**. The initial separate confirmation → View my answer path is superseded. Written content stays the same contribution when edited; no reply thread or new submission is created. Recipients see saved updates but cannot edit another sender's text. Activity also offers Received for recipient review.

Current mock-up defaults: submitted text is stored separately from later composition drafts; original participants, item/question context and sent time remain intact; changed saves show a separate Edited time. Cancel keeps the submitted version; failed saves retain the edit draft; blank answers/requests are rejected. No edit deadline or full version-history interface has been introduced. Production concurrency, audit/retention, edit notifications and fulfilment-dependent rules remain open. Server-side ownership checks must enforce sender-only updates; the concept is not backend-security evidence. Event interest remains viewable; its withdrawal lifecycle is separate because it contains no written answer/request.

**Single-screen refinement, 31 October 2026:** Tek rejected separate edit/save screens. Keep the contribution title, context and participant on the same detail view. A pencil in **Edit answer/request** enables the existing text area in place and changes that same primary CTA to **Save changes**. Saving returns the area to read mode on that same screen; **Cancel** discards the edit there. The concept focuses the editor when enabled, retains drafts across interruptions/failures and migrates older saved edit-screen state into this inline view. It adds no new confirmation or success screen.

**Single-answer and completion refinement, 31 October 2026:** Tek explicitly prohibited answering the same question twice and requested staying on the same screen after answering, plus a general UI tidy-up. The card retains its original **Answer a question** headline and question text; an **Answered** check badge separately indicates completion. Reopening shows the existing record with inline Edit. Submission checks for an existing answer again after authentication/before creation. A retry or duplicate attempt does not create a second record or overwrite saved content; if a different unsent draft is discovered after sign-in it can be reviewed as an edit before saving. A different question ID may be answered even if the wording matches; different senders may each answer the same question once. Production must enforce uniqueness on sender + stable question ID and return the existing record safely under retries/concurrent submissions. Question replacement/version lifecycle remains to be specified; changing wording alone must not be used as identity.

**Completion presentation clarification:** Tek rejected changing a CTA's text after answering and requested an intuitive visual state instead. Preserve action headlines and supporting content; show completion with a small check/status badge, without disabling the card or removing its chevron. The first concept's View your answer headline is superseded. The latest concept uses an Answered check badge, still opening the saved answer for editing. At both widths, 228 local checks passed, including unchanged headline and a separate completion indicator; the narrow completed card was inspected.

**All-action completion refinement:** Tek then requested the same treatment for the other two actions. Keep **Join me**, **Answer a question** and **Ask for feedback** unchanged, with consistent separate check badges: **Interest sent**, **Answered** and **Request sent**. Tapping a completed card reopens the existing submission; written requests remain editable inline and event interest remains viewable. Completion belongs to the current sender and specific activity/question/offer ID, so a newly replaced item does not inherit an old badge. Interest sent does not mean registered/attending, and Request sent does not mean accepted/fulfilled. This adds completion presentation and revisit behaviour, not a new blanket database uniqueness restriction on all help requests or event interests.

The current concept also keeps successful requests and interest submissions in their original view rather than using a separate success screen. It removes repeated action headings, generic contribution jargon and redundant success lines, uses one clear privacy label, and left-aligns back controls. Question/offer title, person, saved text and in-place Edit/Save form the core view. The one-answer restriction is specific to question answers; repeated help-request and activity-interest lifecycle rules are not newly settled by this cleanup.

**Confirmed unread Activity requirement and placement, 31 October 2026:** Tek requested a numbered unread indicator and a way to clear all unread activity from the tab, then clarified that **Activity text stays centred and the badge sits at the top right of the icon**. The concept uses a small numbered circular badge, per-item unread dots and **Mark all as read** within Activity, available across its Sent/Received filters. Opening the tab alone does not clear unread items; opening an item marks that item read. At zero, the badge and bulk action disappear. Activity records, written contributions and Again choices remain intact.

**Placement refinement:** Tek subsequently asked for the numbered badge a little farther right and slightly lower, to look cleaner. The concept moves it 4px right and 4px down from the first icon-anchored position, leaving both icon and Activity label centred. This is a visual adjustment, with unread behaviour unchanged. The 320px browser run retained all 209 passing checks, including label centring and badge attachment/placement; the narrow Activity view was inspected.

Current event defaults: count received submissions, changed versions of received contributions and mutual Again matches, with read state private to each account. Do not count a person's own submissions or expose one-sided Again interest through badges or counts. A changed contribution becomes unread for its recipient again, using a version token; it does not create a second contribution. Bulk clearing marks only the currently represented versions read, so later arrivals/edits remain unread. Exact event eligibility, blocked-user behaviour and external notifications still need final specification; server-side per-user read state and safe batch updates are not implemented by the mock-up.

Acknowledging or declining a request, notifying the owner and defining fulfilment are open. The reference does not assume that an event-interest submission is a ticket, registration or attendance confirmation. [V, section 14]

## 5. QR capture and saved people

### 5.1 Confirmed behaviour

**Incoming scans, confirmed 1 November 2026:** If someone scans your profile, they also appear in your People list. Show a registered scanner's profile/name; show guests under an anonymous nickname. This supersedes the earlier assumption that scan-saving has no owner-visible counterpart. Scanning still does not express Again interest or send a connection request. The concept uses “Curious Otter”, labelled Guest, with no invented profile, LinkedIn link or Again action. Stable per-owner guest aliases, repeat-scan deduplication and preserving archives are current prototype defaults. Real guest identity/token design, retention, abuse protection, notice to scanners and whether/how an anonymous encounter changes after registration remain unresolved. An anonymous guest is not a verified identifiable person; do not fingerprint visitors to resolve their identity.

Scanning a Hi Again QR code opens the profile and automatically saves the person. This applies to **both guests and signed-in visitors**. Immediate sign-in and a separate “add contact” step are not prerequisites. [P, C]

For a signed-in visitor, the intended destination is their account's saved people list. A guest should receive a save and a later path to sign in. The concrete proposal is a **browser-local guest collection**, later imported into the account; it is not a final storage selection or a verified implementation. [P, C, V]

### 5.2 Feedback and continuity

The experience should clearly show that saving happened. For guests, the wording must match the actual storage and retention model. Cross-device recovery or survival after clearing browser data must not be promised before the implementation supports it. [P]

If someone chooses to sign in after scanning, preserve the original profile, any draft and intended action so they can continue without scanning or typing again. Let them choose an event, compose an answer or describe a request before asking for identity when needed. Exactly which submission requires authentication at which point still needs implementation-level definition. [A, C, V]

The earlier authentication summary's requirement to sign in before completing an exchange is superseded where it conflicts with automatic guest saving. More specifically, V records **removal of the general bulk profile-exchange/connection-request system**. Do not design a new accept/decline connection flow as the default networking model. [V]

Saving someone privately, participating in a Share action, mutual Again interest and connecting on LinkedIn are distinct actions. One is not automatic consent to the others. [V]

### 5.3 Proposed guest collection

The motivating example is someone scanning ten profiles at a conference without stopping to register. The proposed collection persists in that browser until cleared or otherwise lost, and can later be imported into a signed-in account. Cross-device guest recovery is not established. Sync, duplicate resolution, retention and failure handling remain open. [V, sections 8 and 14]

### 5.4 QR access, People gestures and details still open

**Current refinement, 1 November 2026:** Keep a camera/QR-scan button at the top right throughout the app. In People, **swipe left to LinkedIn, swipe right to archive**, with Undo and visible button alternatives. Tek explicitly reversed the previous mapping while keeping the archive-tray button left and LinkedIn button right. An **Archive** button opens archived people, each with **Restore**. Camera access and external navigation remain simulated.

**Layout history and current revision, 31 October 2026:** Tek first suggested separating LinkedIn and the bin to avoid accidental presses, then requested archiving and explicitly rejected the bin icon. The concept now puts an **archive-tray icon** at the far left, the name/profile area in the middle and LinkedIn at the far right, retaining at least 44px targets. The opposite-side arrangement remains a design exploration; fewer accidental taps has not been established through user testing.

Archiving is private organisation of the saved list: the original timestamp, notes and contributions remain intact. Restoring returns the person to their original saved-date group; there is no automatic expiry or permanent-delete action in this flow. The concept keeps an archived person archived after a repeat scan until explicitly restored. This repeat-scan default and any effect on notification filtering still need validation. Archiving does not block the person or withdraw Again interest. Guest archive state is retained through simulated sign-in/import. No production retention or server authorisation is demonstrated.

- Permanent shareable profile URLs opened by the phone camera are the working direction. Token design, URL/QR rotation and scanner implementation/permission behaviour remain to be specified. The scan entry point is now confirmed. [V; Tek, 31 October 2026]
- How repeat scans, duplicate saves and self-scans behave.
- How limited/private profiles and different sharing contexts work.
- Whether to adopt the browser-local proposal, its retention and how saved profiles transfer to an account.
- **Scanner notice decided (Tek, 13 November 2026):** a short line on every profile — “Name will see you visited”, plus “Guests show as an anonymous nickname” for guests. Build default: an anonymous guest visit stays anonymous after the guest registers. Retention of guest encounters and owner notifications remain open. Incoming scanner visibility remains separate from a reciprocal connection request. [Tek, 1 and 13 November 2026]
- What happens when a saved profile is updated, removed or no longer accessible. [P; these are unspecified lifecycle details]

Saving someone's Hi Again profile is separate from sending them a LinkedIn invitation. Scanning must not automatically send a LinkedIn request. [P, R]

### 5.5 Saved timestamps, optional notes and date grouping

**Confirmed, 31 October 2026:** Tek requested a timestamp and optional notes for every saved person, followed by the clarification that People should not display an individual timestamp per row. Group saves under **Today**, **Yesterday**, recent weekday labels such as **Last Thursday**, then exact dates further back. Show the precise save time in the person's detail view. Notes remain optional and do not interrupt saving or participation.

Current mock-up choices: record first-save time rather than claiming the time people met; preserve it on repeat scans; show dates in Europe/London; use weekday headings for two to six calendar days ago and exact dates from seven days back, newest groups first. Keep a collapsed Notes section in saved-person detail, with notes private to the saver, separate per person and retained through simulated sign-in/import. Editing needs no extra Save screen. These exact defaults, the grouping threshold and production retention rules remain subject to validation. Notes and timestamps are preserved through archiving, Restore and Undo; archiving supersedes removal from the saved collection. Date labels must use calendar days, not just elapsed 24-hour periods.

**Calendar integration scope, updated 13 November 2026:** Google Calendar is the first calendar provider. Offer a separate optional read-only connection after LinkedIn sign-in. Use events for private, editable encounter context and owner-reviewed Join me suggestions. Provider access, matching, disconnection and retention need verification. Keep manual notes and the coffee fallback available.

**Confirmed placement refinement, 31 October 2026:** Put the precise timestamp at the **bottom of saved-person detail, after the profile actions and immediately before Notes**, rather than beside the name/bio. Calendar-derived event context belongs in this same saved-context area. It belongs to the saver's context, separate from the person's public profile and manual private notes.

## 6. Authentication and account identity

### 6.1 Current launch decision

**LinkedIn Sign-In only at launch.** Tek restored this on 13 November 2026 and chose Google for calendar access after sign-in. Keep the Hi Again account and LinkedIn session independent of the Google Calendar grant. Offer calendar connection when its benefit is relevant, as described in [the calendar journey](docs/CALENDAR_JOURNEY.md). The precise prompt placement and real provider setup remain open.

**Historical provider reconsideration:** Tek considered Google-only sign-in after reviewing the basic identity fields available from LinkedIn. On 1 November, Tek chose Google-only login with calendar permission requested during first login. The [historical Google first-login specification](docs/GOOGLE_FIRST_LOGIN.md) preserves that design. Tek restored LinkedIn-only login and separate Google Calendar consent on 13 November.

The earlier authentication summary records LinkedIn plus Google, followed by LinkedIn-only on 30 October, Google-only on 1 November and the return to LinkedIn-only on 13 November. Any further sign-in provider is a separate scope decision.

Email/password, email magic links, email one-time codes and Apple Sign-In are outside the recorded launch scope. Public viewing and automatic guest saving remain available without authentication. [A, P, C]

### 6.2 Why this direction was reached

LinkedIn was originally prioritised for audience fit. The product uses LinkedIn for account identity and Google Calendar for encounter context and Join me suggestions. The decision records Tek’s preference. First-login friction and calendar opt-in rates remain unmeasured.

### 6.3 Account model and onboarding

- Use a stable internal Hi Again user ID, with sign-in provider identities associated with it.
- Keep that identity model independent of LinkedIn so future providers need not create separate Hi Again profiles.
- Use available identity information for a minimal starter profile, avoid redundant manual name entry, and tolerate missing fields. Customisation can follow later. [V]
- Show the usable QR immediately after ordinary sign-in; do not gate it behind profile completion. Preserve the original action when sign-in was triggered by participation rather than sending the visitor through a new setup wizard. [Tek, 31 October 2026; existing action-continuity requirement]
- Preserve the scanned profile, any contribution draft and intended action through sign-in. [V]
- Design account linking and recovery deliberately. The authentication summary cautions against merging accounts solely because an email string matches; the exact verification and recovery process is not yet specified. [P, A]

Supabase Auth is part of the subsequently confirmed architecture choice recorded in section 1 (Tek, 31 October 2026). The earlier source A treated it as a proposal; that historical status is superseded. No production authentication integration is implemented.

### 6.4 Browser sign-in and session continuity research

**External examples for user testing, checked 1 November 2026:** At Tek's request, inspected public login-page content showing LinkedIn sign-in at [Product Hunt](https://www.producthunt.com/login) (“Sign in with Linkedin”), [SlideShare](https://www.slideshare.net/login) (“Continue with LinkedIn”), and [Powtoon](https://www.powtoon.com/account/login/) (“Continue with LinkedIn”, potentially under more options). These are useful examples for Tek to try on the intended phone/browser. Verification covers the exposed button/page content only, not successful end-to-end authentication, whether an account will be created, or device-specific friction. No third-party accounts were created or authorised. Compare first sign-in in the normal mobile browser (with LinkedIn installed) against later return, distinguishing browser login, consent and onboarding steps. No change to the under-review provider decision.

**Assessment, 1 November 2026:** Tek supplied advice about retired native LinkedIn SDKs, browser-cookie reuse and persistent app sessions. Current [LinkedIn sign-in documentation](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2) supports browser OAuth/OIDC. The reviewed sources establish no supported way for ordinary Hi Again sign-in to borrow the LinkedIn mobile app's logged-in session; do not rely on app interception. The claimed SDK retirement date around 2019 was not independently established and is not a verified project fact.

For the confirmed web/PWA-first launch, use a normal browser redirect and preserve the intended action. Native system authentication sessions/Custom Tabs are relevant only if a native app is later chosen, not a requirement to change the delivery architecture. Apple documents shared normal-browser data unless ephemeral sessions are requested; Android Custom Tabs can reuse their providing browser's cookie state, not necessarily Chrome's and not the separate LinkedIn app's. Existing browser sessions can reduce login friction but do not guarantee one tap, silent authentication, an exact completion time or consent only once; expiry, account challenges and browser context still matter. Sources: [Apple ephemeral-session control](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession/prefersephemeralwebbrowsersession), [Android Custom Tabs](https://developer.chrome.com/docs/android/custom-tabs), [LinkedIn native-browser requirement](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow-native).

Keep the **Hi Again/Supabase session separate from LinkedIn API tokens**. Supabase has its own renewable sessions after provider sign-in. Do not assume ordinary LinkedIn OIDC supplies programmatic refresh tokens; availability depends on the provisioned LinkedIn product/permissions (the separate Verified product documents its own token behaviour). Persistent Hi Again sessions do not require continuously refreshing LinkedIn API access merely to keep using Hi Again. Re-authentication/revocation/logout policy still needs implementation and testing; no indefinite-login guarantee. Sources: [Supabase sessions](https://supabase.com/docs/guides/auth/sessions), [Supabase provider-token distinction](https://supabase.com/docs/guides/auth/social-sign-in), [LinkedIn programmatic refresh eligibility](https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens). Browser sign-in improvements do not add a profile URL to standard OIDC, so owner-pasted URL capture remains the active exploration. No new product decision, native-app commitment or integration resulted from this research.

## 7. The role of LinkedIn

### 7.1 Three separate concerns

| Concern | Current decision |
| --- | --- |
| Sign in to Hi Again | LinkedIn only at launch. Offer Google Calendar access separately after sign-in. |
| Open another person's LinkedIn profile | Offer an optional ordinary HTTPS profile link. |
| Send a LinkedIn connection request | Let the person decide and act within LinkedIn; no automated request from Hi Again. |

This separation removes restricted invitation APIs and partnership approval from the MVP's connection-link dependency. It does not mean the sign-in integration needs no setup or provider requirements. [P, A]

### 7.2 LinkedIn profile URLs

**Documentation checked, 31 October 2026:** Standard LinkedIn OpenID Connect sign-in uses `openid`, `profile` and `email` scopes. Its documented UserInfo fields are `sub` (the provider subject identifier), full/given/family name, profile-picture URL, locale, and optional `email` and `email_verified`. Email and its verification indicator may be absent. The documented sign-in response does not supply a public LinkedIn profile URL, headline, employer/job title, employment history, education, skills or connections list. This confirms the earlier implementation assumption for ordinary sign-in; it is not evidence of a working integration. Source: [LinkedIn's official OIDC documentation](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2). [A; current documentation research]

LinkedIn explicitly states that this sign-in does **not verify user identities**. A signed-in LinkedIn account or verified email must not be presented as verification of real-world identity, employment or professional claims. Recommendation for onboarding: prefill available name/photo, keep authentication email private, and invite optional manual professional details and profile URL. This recommendation adds no mandatory fields or new product decision.

The profile URL is therefore **optional and manually supplied or confirmed initially**. Do not treat a provider subject ID as a public LinkedIn username, or sign-in as independent verification of professional claims. URL validation and editing behaviour remain open. [A, P]

**First-use connection concern and research, 1 November 2026:** Tek wants people to be able to connect on LinkedIn from their first Hi Again use and considers manual URL entry undesirable. A visitor does not need to supply their own LinkedIn URL to open another person's already-linked profile; the destination owner's URL is the dependency. This concern does not yet authorise compulsory onboarding or change the optional-link decision.

There is a separate supported automatic route: Verified on LinkedIn's `/identityMe` API documents `basicInfo.profileUrl`, with `r_profile_basicinfo` consent. Its example is a LinkedIn `profile-thirdparty-redirect` link rather than necessarily an `/in/` vanity URL. However, the [Lite tier page](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/verified-on-linkedin/guides/upgrade-to-lite-tier), updated 14 October 2026 and checked 1 November, explicitly says Lite is no longer available to new developers. Some FAQ/search text still describes free Lite applications; do not rely on that contradictory text. Development access is admin-only; production Plus requires partnership discussions. This does not establish Hi Again eligibility, access, pricing or a working integration. Sources: [Profile Details API](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/verified-on-linkedin/api-reference/identity-me), [current overview](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/verified-on-linkedin/overview).

**Recommendation, not a confirmed flow:** Retain immediate QR usability; offer a small inline Add LinkedIn link action on the owner's existing profile. Guide the owner to copy their URL from LinkedIn and paste it once, validate the destination format and save inline. Seed pilot hosts' links before the event where supplied. Do not claim format validation proves ownership. All scans of an already-linked owner can then hand off to LinkedIn immediately, including for Hi Again guests, subject to LinkedIn's own sign-in requirements. Explore approved API access separately; do not make a newly available free integration a launch assumption. LinkedIn's [official URL instructions](https://www.linkedin.com/help/linkedin/answer/a522735/find-your-linkedin-public-profile-url?lang=en) document copying the link from the profile/contact information. No interface or provider configuration was changed in this research task.

### 7.3 App opening and fallback

**Current direction and decision history, 1 November 2026:** After trying the search experiment, Tek explicitly put search-and-confirm in the back pocket and asked to explore the original owner-pasted URL approach, supplying eight Claude recommendations for assessment. Preserve the experiment and prior evidence; do not continue it as the active product direction. Existing immediate-QR and optional-enrichment decisions remain authoritative. No paste-flow UI or production integration was implemented during this assessment.

**Proposed paste flow:** SSO returns directly to the usable QR/profile. An inline Add your LinkedIn link prompt expands in that view with an ordinary paste field, an Open LinkedIn action and concise copy-link help. Returning from LinkedIn may emphasise a Paste my link button, but does not read clipboard contents automatically or assume a link was copied. Read only following an explicit paste action; keep native field paste available if the button is unsupported or permission is refused. On a completed paste, normalise a supported personal-profile URL and save inline, show LinkedIn added with the live link, and offer Change/Undo. For manually typed input, save on an intentional completion boundary such as blur/Enter, not every syntactically valid keystroke, since a partial slug is already valid. Exact persistence/error/retry UI still needs design and implementation.

**Assessment of supplied recommendations:** Accept full/schemeless LinkedIn personal-profile links, supported regional hosts, trailing slash and tracking parameters; do not accept arbitrary web addresses. A bare slug is an optional convenience needing clearly labelled input and deliberate completion, not evidence of the user's identity. Reject viewer-relative self aliases such as `/in/me` as stored public destinations. Do not guarantee that `/in/me` opens the LinkedIn app or that a specific mobile share-menu label exists. LinkedIn's current official mobile instructions use profile → More → Contact info → copy URL; app/browser hand-off and exact labels need real-device testing. A format check establishes only supported structure, never existence or ownership; do not fetch profile pages simply to validate a submitted link. Do not add internal name/slug mismatch flags by default: many legitimate handles differ, and no useful review process or accuracy evidence is established.

Defer installed-PWA share targets and short-link expansion until the basic flow is tested. Chrome documents that share targets require an installed app, so they do not solve the first-visit web flow. A `lnkd.in` link must not be blindly accepted or followed: any later resolver must bound redirects/timeouts, validate every network destination against allowed public hosts, and require a final supported personal-profile URL; not all short links identify profiles. Detailed browser/OS support, resolver behaviour and native iOS options remain unverified. A separate skippable post-SSO screen is not recommended because it adds a screen to the already confirmed immediate-QR flow. Sources checked 1 November: [Clipboard API requirements and browser differences](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API), [Chrome Web Share Target installation requirement](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target), [LinkedIn's current profile-link instructions](https://www.linkedin.com/help/linkedin/answer/a522735/find-your-linkedin-public-profile-url?lang=en).

**Search-and-confirm experiment built, 1 November 2026:** At Tek's request, built a separate local trial in `experiments/linkedin-search/`; see its [README](experiments/linkedin-search/README.md). A real public web query for the supplied name “Tek Kan Chung” returned `https://uk.linkedin.com/in/tek-kan-chung`, titled Tek Kan Chung – FE fundinfo, with London in the identifying details. This is a candidate awaiting owner confirmation, not verified ownership or current-employment evidence. The test starts with this captured real result, offers inline “That's me”, local per-name persistence, Change, safe external inspection, refinement and paste fallback. Four actual Alex Smith + London results exercise ambiguity. It rejects unrelated-title mentions and unsafe/non-person URLs, deduplicates regional links, and prevents stale responses from repopulating results after name changes. No LinkedIn profile pages are fetched by the test.

No search-service key was configured. Captured mode is explicitly labelled with the 1 November research date, and arbitrary new queries report that fresh search is unavailable. A server-side Brave Web Search adapter is implemented; success, zero-result and error responses were tested with controlled responses, not a real Brave credential. Provider choice, display/storage permissions, pricing, general population accuracy and SSO integration remain unverified. This trial is not approval of the proposed product flow or a change to optional onboarding. The existing published mock-up is unchanged. Verification: eight automated core/server test groups passed; 22 browser assertions passed at each of 320, 390 and 1,000px, with screenshots captured. The local preview is `http://127.0.0.1:4178` while its server is running. All confirmations remain browser-local test data; nothing is published to a real account and no connection requests are sent.

**Verified API access assessment, 1 November 2026:** Further official-document review distinguishes easy admin-only Development access (documented automatic provisioning) from selective production Plus access. The [Plus quickstart](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/verified-on-linkedin/guides/plus-tier/quickstart) explicitly requires LinkedIn Business Development approval for enterprise partners with strategic use cases. Its access-request link targets `https://www.linkedin.com/help/linkedin/ask/VERIFIED_REQUEST`; the form could not be fetched in this research, so its exact fields were not inspected. The [production certification checklist](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/verified-on-linkedin/guides/plus-tier/certification) includes demonstrated OAuth/verification flows, token/revocation and data-freshness handling, policy compliance and a LinkedIn InfoSec assessment. Treat this as materially more than enabling ordinary sign-in. No approval probability, response deadline, minimum company size or price was established from the reviewed material. Hi Again's professional-networking context aligns with a listed use-case category, but a URL-only requirement may not justify the wider product: this is an assessment, not LinkedIn feedback. Recommendation: make an honest eligibility enquiry describing the URL need and actual trust features, asking whether basic-profile-only production access is possible, applicable certification scope, price and timetable. No enquiry submitted. The documentation supports privacy/consent, security and verification-brand controls as review concerns; it does not explain why Lite closed or why the profile URL was excluded from standard sign-in.

**Search-assisted linking explored, 1 November 2026:** Tek asked whether name-based guessing or a user-confirmed search could reduce URL-entry friction. Recommendation: do not generate and publish a presumed `/in/firstname-lastname` URL, because display names do not establish unique public handles. A possible optional inline “Is this your LinkedIn?” picker could query publicly indexed profile links through a search provider whose terms permit the use, using the sign-in name and optional user-supplied company/location to disambiguate. Require explicit owner confirmation before saving; confirmation is self-assertion, not proof of ownership. Include “None of these” and paste-link fallback. Search coverage, result quality, permitted result display/storage, provider cost and mobile usability are untested; this is a proposal, not an available integration or approved design. Ordinary sign-in does not supply a general people-search/picker API: LinkedIn's [Profile API is restricted](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api). Manual [people search on LinkedIn](https://www.linkedin.com/help/linkedin/answer/a525054/searching-for-people-on-linkedin?lang=en) is a fallback but does not automatically return the selected URL to Hi Again. Avoid scraping LinkedIn to populate candidates; LinkedIn [prohibits unauthorised scraping/automation](https://www.linkedin.com/help/linkedin/answer/a1341387/prohibited-software-and-extensions). No implementation or product decision resulted from this exploration.

Use the person's normal HTTPS LinkedIn profile URL directly for **Connect on LinkedIn**. The intended behaviour is to open the LinkedIn app where supported and otherwise use the browser. [P]

The recorded technical direction is to avoid unnecessary redirects and undocumented `linkedin://` schemes. Device, browser and operating-system behaviour control the destination; app opening is an aim rather than a guarantee. Real iPhone and Android testing, with and without LinkedIn installed, remains outstanding. A native Hi Again app has not been established as necessary for this link behaviour. [P]

### 7.4 Prefilled LinkedIn messaging

Opening a specific LinkedIn conversation with a prefilled message was explored and removed as a dependency. The brief records that a reliable generally supported public mechanism had not been established. This preserves the decision to avoid relying on that hand-off; it is not a fresh assessment of LinkedIn's current APIs. [V, sections 6 and 13]

## 8. MVP scope

### 8.1 Agreed scope

| Capability | Boundary |
| --- | --- |
| LinkedIn sign-in and separate Google Calendar connection | LinkedIn is the sole launch sign-in provider. Hi Again owns the account identity. A separate optional read-only Google Calendar connection supports context and suggestions. |
| Hi Again profile | Lightweight profile with owner-configured activity invitations, questions and offers of help; action-led wording across all tabs. |
| QR sharing | Present a QR code opening the public profile; permanent URL and phone-camera entry are the working direction. |
| Automatic saving | Guest and signed-in saving, with clear feedback and a defined persistence model. |
| Saved people | A route back to saved profiles and useful encounter context. |
| Saved-person timestamp and notes | Record a timestamp and allow optional notes for every save. Group People under dates without row-level timestamps; retain the exact time in person detail. |
| Participation | One-off event interest, private question answers and specific help requests; exact limits and fulfilment to be defined. |
| Again | Private interest in meeting again, revealed only when mutual; post-match hand-off to be defined. |
| Contribution review | The concept includes viewing submitted contributions without native reply threads; the exact owner interface is open. |
| Connect on LinkedIn | Optional standard profile link, with app opening where supported and browser fallback. |

These are recorded product directions, not a completed release specification. V's section 15 recommends a first release with LinkedIn sign-in, permanent QR profiles, guest viewing, three configurable Share sections, one-off contributions, private mutual Again, saved people and basic contribution viewing. That release package is labelled a **recommendation** in the source; retain that distinction rather than treating it as a newly approved delivery commitment. [P, A, C, V]

### 8.2 Explicitly outside launch scope

- Native Hi Again chat or messaging.
- General Hi Again profile-exchange and connection-request flows. [V]
- Public discussion threads in place of private one-off contributions. [V]
- Reliance on prefilled LinkedIn conversations as a core flow. [V]
- LinkedIn Invitations API access, partnership-dependent invitations or automatic connection requests.
- LinkedIn connections/employment importing and automatic public-profile-URL discovery.
- Additional sign-in providers at launch. Google is the first calendar provider.
- Email/password, magic-link, email-code and Apple sign-in flows. [P, A, C]

### 8.3 Later phases and discussed extensions

**Calendar integration is now an initial-product requirement**, following Tek's 1 November 2026 decision. Its confirmed purpose is private event-context gathering and public-event-informed **Join me** suggestions; use “Coffee and a catch-up?” as the generic **Join me** fallback when calendar data or a suitable event is unavailable. The owner must confirm a suggested calendar event is suitable/open before publishing. The same coffee wording is a suggested private next step after mutual **Again**; one-to-one logistics remain private and their flow remains open. Calendar write access, automatic publishing, shared-event discovery, richer follow-up management, smarter reminders, voice notes, wallet passes and weekly digests remain outside the confirmed scope. Google Calendar is the first provider (13 November 2026); further providers, permissions, matching, review, storage and retention remain unresolved and no calendar has been connected. [Tek, 1 November 2026]

The source also recommends keeping social feeds, follower counts, elaborate profile verification and a full CRM outside the first release. These are consistent with the focused product thesis but remain attributed recommendations where no separate agreement is recorded. Notification channels, a full content-publishing system, an analytics stack and native mobile distribution have not been selected. [V, P]

## 9. Name, brand and research history

### 9.1 Current identity

**Hi Again** is the preferred working name. Earlier records also use **Hi-Again** and **HiAgain**. This reference uses Hi Again consistently; a final identity system covering spacing, punctuation, casing, wordmark and handle conventions is still open. [N, P, A]

The intended tone is human, friendly, modern, clean and approachable. The naming discussion explored warm neutral backgrounds, restrained typography and simple connection motifs. These are visual directions, not a final logo, palette or typography specification. [N]

V reports a positive response to minimalist wireframes and adds a more concrete emerging direction: light/white-neutral mobile screens, rounded cards, straightforward typography, minimal forms and three recognisable Share sections. The suggested colour mapping is **blue for Experiences, green for Ideas and pink for Value**. V's earlier suggestion that Again be quieter is **superseded by Tek's 31 October direction: make Again prominent, above the profile actions**. Exact colour codes and final components remain unapproved. [V, section 12; Tek, 31 October 2026]

### 9.2 Agreed language

| Role | Current line | Status |
| --- | --- | --- |
| Main brand line | **Don't just meet. Meet again.** | Confirmed by Tek, 30 October 2026. |
| Product promise / action | **Make the second interaction happen.** | Confirmed by Tek, 30 October 2026. |
| Underlying philosophy | Meeting someone is the beginning, not the outcome. | Established product principle. |

The naming summary's statement that no tagline was formally selected is superseded by Tek's confirmation. **Make more of the people you meet.** remains a previous positioning proposal, not an additional selected tagline. [N, A, P, C]

Other explored lines were “Meet once. Connect beyond.”, “Meet once. Stay connected.”, “Good connections deserve a second conversation.” and “Beyond the introduction.” Retain them as history, not current defaults. [N]

### 9.3 Naming exploration and rationale

The preference developed from **Followup**, which clearly described the functional problem, to **Hi Again**, which sounded like something people naturally say when reconnecting. Followup's sales-software and CRM associations were a weakness. Hi Again better supported the human identity and broader relationship ambition. [N]

| Candidate | Appeal recorded | Concern recorded |
| --- | --- | --- |
| Hi Again | Human, memorable, conversational. | Existing similar brands. |
| Followup | Clear purpose and action. | CRM associations. |
| After | Minimal; captures the post-meeting moment. | Abstract. |
| Tandem | Collaborative and sophisticated. | Less directly linked to the product. |
| Nexo | Short, modern, international. | Generic connection idea. |
| Orbit | Social circles and relationships. | Less descriptive. |
| Mingle | Friendly and social. | Less professional. |
| Venn | Elegant connection metaphor. | Existing uses and distinctiveness concerns. |
| Along | Warm and understated. | Less immediately explanatory. |

Additional exploratory names: **Folo, Follo, FollowOn, Relay, Loop, Mesh, Nodi, Kivo and Rapport**. None is recorded as replacing Hi Again. [N]

### 9.4 Domain

`hi-again.link` was considered first. The `.link` ending fitted the purpose and the hyphen separated the words, but a spoken address would require explaining the hyphen. [N]

**`hiagain.link` is preferred** because it is cleaner and easier to communicate. A profile address such as `hiagain.link/tek` was an illustration, not a confirmed URL scheme or live page. [N]

A user-supplied Cloudflare screenshot was recorded as displaying **US$7.20 per year for registration and renewal**. This is a historical observation; availability, current pricing, ownership and purchase have not been verified in this consolidation. The preference is not purchase authorisation. [N]

### 9.5 Trademark and existing-brand research

The following preserves the supplied research record. It is **preliminary historical research, not fresh register checking or legal clearance**. [N]

| Research item | Finding recorded | What remains unresolved |
| --- | --- | --- |
| UK IPO search | A similar-word search showed no matches for Hi Again; Tek reported repeating searches for variants. | Search coverage, current active similar marks and relevant unregistered use. |
| Historical EU mark | **HI AGAIN**, application **001839927**, classes **9, 35, 42**, recorded as ended **14 November 2006**. | Other potentially relevant rights; this single record does not settle availability. |
| Mexican mark | **OH, HI AGAIN!**, registration **2284917**, class **35**, recorded as registered **10 August 2021**. | Current scope and relevance if expansion is considered. |

Classes discussed were **9** for applications/software, **35** for business/professional networking, **38** for communications, **42** for SaaS/software platforms and **45** for online social networking. They are research leads from the conversation, not a settled filing specification. [N]

Two existing uses were identified:

- **HiAgain — Never Lose Touch:** the supplied research associated an iPhone social-networking app with Rushil Patel and a February 2026 launch, focused on alumni, classmates and existing networks. It was the most significant naming-overlap concern. Source links retained: [website](https://www.hiagain.co/) and [App Store listing](https://apps.apple.com/us/app/hiagain-never-lose-touch/id6758457241). Current status and UK presence are not freshly verified here.
- **hi again — DubHacks project:** a [Devpost submission](https://devpost.com/software/hi-again), attributed in the research to Kingston Du, using NFC student IDs to exchange profiles and preserve meeting context. It was closer in functionality but appeared to be a hackathon project. Commercial status was unverified. [N]

### 9.6 Current naming position

The discussion first raised changing the name after discovering the overlaps, then reconsidered that reaction. The retained position is to **keep Hi Again as the leading candidate while the remaining legal and commercial questions are resolved**. The records do not establish that the name is cleared or that it must be abandoned. [N]

The distinction matters: legal rights, customer confusion and search discoverability are different questions. The earlier qualitative assessment described confusion and discoverability as moderate concerns, a small private MVP as manageable, and a major public launch as requiring further diligence. Those assessments were discussion judgements, not legal findings or a completed launch approval. [N]

The naming summary recommends checking UK presence and relevant rights, avoiding substantial brand-specific investment prematurely, and obtaining professional clearance before significant public launch or filing. These remain recorded recommendations; no completed clearance, registration, purchase or final public-brand commitment is evidenced. [N]

### 9.7 Marketing idea under consideration

**User-suggested idea, 31 October 2026:** Tek proposed using the Thor cup-smashing meme as Hi Again marketing, recalling the line as “again”. The diner scene actually uses “Another!” and a coffee cup ([scene reference](https://www.rogerebert.com/reviews/thor-2011)). The suggested creative connection is enthusiasm for a second conversation after a good first encounter. This is an exploratory content idea, not an approved campaign, asset-use clearance or publication instruction. Suggested execution: a caption about wanting another conversation, followed by the existing “Don't just meet. Meet again.” brand line. No asset created or published.
## 10. Technical direction and data questions

### 10.1 Requirements already established

The build must support independent Hi Again identities, LinkedIn launch sign-in, public profile viewing, guest and account saving, continuity of drafts/actions through sign-in, optional manually supplied LinkedIn URLs, ordinary outbound profile links, structured one-off contributions and private mutual Again interest. Exact data/access rules and release scope still need definition. [P, A, C, V]

The recovered working architecture is below. V explicitly labels it **proposed**, so no technology is promoted to a final selection. [V, section 11]

| Layer | Recorded proposal |
| --- | --- |
| Frontend | Next.js. |
| Database/backend | Supabase. |
| Authentication | Supabase Auth with LinkedIn OIDC and a provider-independent account model. Use a separate Google authorisation flow for calendar read access. |
| Delivery | Mobile-first responsive web application / PWA. |
| Profile sharing | Permanent URLs and QR codes. |
| Guest collection | Browser-local storage, with later account import. |
| Interaction storage | Structured records rather than chat threads. |
| External continuation | LinkedIn profile hand-off. |

Hosting, detailed data models, library choices, URL/QR lifecycle and the precise launch surface remain unfinalised. The key requirements are minimal collection, reliable navigation, private-contribution access control, modular authentication and preservation of in-progress actions. [V]

**Architecture recommendation, 31 October 2026:** At Tek's request, [MVP architecture](docs/MVP_ARCHITECTURE.md) recommends a single TypeScript Next.js application on Vercel, Supabase PostgreSQL/Auth/Storage, LinkedIn OIDC, and IndexedDB for browser-local guest saves/notes/drafts. Start with the mobile website and add PWA installation progressively. Keep public profile fields separate from private data; protect private records with row-level security and explicit server authorisation. Import guest entries with retry-safe operations and server acknowledgement, preserving timestamps/notes. Calculate Again mutuality transactionally with per-pair serialisation and uniqueness, including concurrent requests; never expose incoming one-sided signals. Proposed sign-in-before-submission and in-app-first notifications remain recommendations. Region proximity, separate staging/production and a focused integration/privacy/device verification sequence are recommended. Stack/hosting selection and lifecycle rules remain open; no app or infrastructure was created. Official Supabase LinkedIn/SSR/RLS, LinkedIn OIDC, Next.js PWA, Vercel regions and MDN IndexedDB documentation were checked; links and limitations are in the architecture note. Provider access and actual integration behaviour remain unverified.

**Hosting comparison, 31 October 2026:** Tek asked whether Cloudflare could replace Vercel. It can host the application while Supabase remains the database/auth/image backend. Current official Cloudflare guidance recommends Workers with vinext for new Next.js applications; vinext reimplements the Next.js API surface and is labelled beta, so required features, session/callback handling and guest continuity need a Workers compatibility trial. Vercel remains the recommendation for the simplest standard Next.js deployment; Cloudflare is a viable alternative for cost/platform preference if that trial passes. Checked starting prices: Workers Paid US$5/month versus Vercel Pro US$20/month, with usage limits/additional charges; Vercel Hobby is personal/non-commercial. This is not a full application cost estimate or a measured performance comparison. Sources and detail are in [MVP architecture](docs/MVP_ARCHITECTURE.md). No hosting choice, migration or deployment was authorised or implemented.

**Vercel cost clarification, 31 October 2026:** [Official Pro plan documentation](https://vercel.com/docs/plans/pro-plan) confirms a US$20/month platform fee including one deploying seat and US$20/month infrastructure usage credit; additional deploying seats cost US$20/month each. Usage beyond allowances/credit and paid add-ons can increase the bill. [Pricing](https://vercel.com/pricing) excludes applicable taxes. For one developer, use US$20/month before tax as the hosting baseline, not a guaranteed cap or a total MVP budget; Supabase and other services remain separate. No usage measurements or spend settings were changed.

**Prototype eligibility correction, 31 October 2026:** Tek clarified that Hi Again is not commercial yet. The earlier US$20 hosting baseline was too categorical for the current concept/prototyping stage. A [Vercel Community response on SaaS prototypes](https://community.vercel.com/t/is-hobby-plan-suitable-for-a-saas-prototype/7205/5) says Hobby can be used to try ideas and build a product prototype, subject to fair-use rules. However, the [current official definition](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage) concerns financial purpose, not just revenue: selling/advertising services or being paid to build/host can qualify. Recommend considering US$0 Hobby for personal, non-commercial prototyping within limits; do not claim that every free/pre-revenue pilot qualifies or that payment starts only at first revenue. Reassess eligibility when the actual deployed use becomes a business-facing pilot or commercial service. No plan selected or deployment made.

**Hobby capacity clarification, 31 October 2026:** Official [Hobby documentation](https://vercel.com/docs/plans/hobby) lists resource allowances rather than an app-user quota: monthly 100 GB fast transfer, 10 GB origin transfer, 1 million CDN requests, 1 million function invocations, 4 active CPU-hours, 360 GB-hours provisioned memory and 5,000 image transformations. Exceeding limits can pause affected features until reset. User capacity depends on measured activity and resource use; no Hi Again capacity benchmark exists. The architecture note includes an explicitly hypothetical 1,000-active-user resource calculation, not a supported user limit. Supabase quotas and non-commercial eligibility are separate constraints. No hosting/account usage inspected or plan selected.

**Supabase Free capacity, 31 October 2026:** Checked [current pricing](https://supabase.com/pricing) and [billing documentation](https://supabase.com/docs/guides/platform/billing-on-supabase): Free includes unlimited registered users, 50,000 monthly active Auth users, 500 MB database allowance, 1 GB file storage, 5 GB egress and separately 5 GB cached egress, unlimited API requests subject to resources/rate limits, shared compute and two active free projects across organisations where the account is owner/admin. Automatic backups are not included; projects may pause after one week of inactivity. [MAU documentation](https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users) counts distinct users signing in or refreshing tokens during a billing cycle. Guest public-profile visits consume resources without automatically creating Auth users. Quotas do not guarantee that 50,000 users fit Hi Again: photos, interaction records, traffic and peak load can bind earlier. Pro starts at US$25/month with one Micro project's compute covered by included credits; extra projects, compute, usage and add-ons can increase cost. A hypothetical 100 kB photo viewed 50,000 times transfers about 5 GB before other traffic; cached/uncached egress remain separate meters. No project provisioned or benchmarked; upgrade timing should use measured resources and reliability needs, not only user count.

**Scaling assessment, 31 October 2026:** The recommended stack has a practical growth path without a planned rewrite for initial growth, but this is an architectural assessment, not measured capacity. [Vercel functions scale automatically](https://vercel.com/docs/functions/concurrency-scaling) within platform/burst limits and plan allowances. [Supabase compute](https://supabase.com/docs/guides/platform/compute-and-disk) can be resized separately from a subscription upgrade; this is not automatic CPU scaling and can incur downtime (usually under two minutes, potentially longer). Improve indexes, pagination, query/access-policy performance, image sizes and connection management before simply buying compute. Add background jobs or [read replicas](https://supabase.com/docs/guides/platform/read-replicas) only for measured needs; replicas lag asynchronously, so authoritative Again writes/mutuality remain on the primary. Event-driven scan bursts, private-data cache isolation, costs, backups and recovery need testing as growth occurs. No reliable user-count ceiling or large-scale readiness is established; no implementation, benchmark or scaling configuration performed.

**Architecture adopted, 31 October 2026:** Tek accepted the recommendations after discussing Cloudflare/Vercel, free-plan limits and scaling. The selected MVP architecture is TypeScript Next.js on Vercel; Supabase PostgreSQL, Auth with LinkedIn OIDC (provider restored 13 November), and Storage; IndexedDB for guest saves, notes and drafts; mobile-first responsive web with progressive PWA support. Keep one modular application, explicit public/private boundaries, retry-safe guest import and transactional private Again. Start prototyping on Vercel Hobby where non-commercial eligibility holds and Supabase Free within its allowances; upgrade based on actual usage and reliability needs. This supersedes the earlier proposed/unselected stack and hosting status. The rationale is the simplest standard Next.js deployment plus an incremental database growth path. Cloudflare remains a researched alternative, not the selected host. Acceptance selects architecture and initial cost approach, not every unresolved product default, lifecycle rule, a paid subscription or completed infrastructure. Provider access/configuration, real-device continuity and security/performance verification remain outstanding.

### 10.2 Information the product needs to represent

This is an organising view for later design, not an approved database schema:

| Concept | Information to clarify |
| --- | --- |
| Account | Internal identity, linked provider identity, recovery and account deletion. |
| Profile | Owner-controlled identity information, action-led activity/question/help content and optional LinkedIn URL. |
| Sharing context | Which profile information a particular QR or link reveals. |
| Saved person | Private save with timestamp, optional saver notes and reversible archive state; date-grouped active/archived views, repeated scans and later profile availability; not a connection-request relationship. |
| Contribution / interaction | Event interest, one-off private answer or specific request; person, type, timestamp and associated event are candidate context fields. |
| Guest continuity | Save location, retention, recovery and transfer into an account. |
| Again interest | Private directional interest and mutual-match state, with the external next step still to define. |
| Follow-up | Optional later reminders and plans; separate from the core Again signal. Optional saved-person notes are now a current requirement rather than dependent on a later follow-up feature. |

Maintain the distinction between **saved people**, **specific interactions**, **mutual Again interest** and **LinkedIn connections**. The generic Hi Again exchange/request state has been removed. A person can have multiple interactions over time; a single contact record should not erase that history. The exact schema and automatic metadata remain design choices. [V]

### 10.3 Navigation and relationship history

V records **People** for saved profiles and people interacted with, and **Interactions** for specific experiences, ideas and value exchanges, as strong working proposals. **Follow-ups** for reminders and next steps is proposed with MVP inclusion undecided. The minimum navigation could be Profile and People or include Activity/Follow-ups; it has not been selected. [V, sections 10 and 14]

### 10.4 Privacy and visibility

Two privacy rules are already recorded: question answers are received privately by the owner, and one-sided Again interest is not revealed before mutual interest. Secure access to private contributions remains a requirement even without chat. [V]

The remaining detailed rules are open. Before a live pilot, define which profile information is public, who can see notes and each contribution, what is retained for guests, and how removal, deletion and blocking behave. Account information and public profile information need explicit visibility rules. Notification design must preserve Again's private-interest promise. [P, A, V]

The source documents describe requirements and assumptions. They do not demonstrate working integrations, completed privacy design, deployed infrastructure or tested security controls.

### 10.5 Calendar provider evidence and audience limits

**Research check, 1 November 2026:** No public, representative source was found that breaks calendar-provider use down specifically for LinkedIn users attending professional events in their 20s to 40s. Available numbers are directional and come from different populations:

- Efficient App's 2026 Software Selection Report asked 482 people actively shopping for calendar/scheduling software which calendar they currently use: Google Calendar 58.1%, Outlook 13.5%, Apple 11.2%, Other 17.2%. The report's full sample was 7,296 self-selected business-software shoppers; geography and age breakdowns for the calendar subgroup are not published. Treat these as a signal, not market shares for Hi Again's audience. [Efficient App](https://efficient.app/blog/software-selection-report)
- Reclaim's 2025 report surveyed more than 10,000 Outlook users and reports 3.04 calendars across work and life on average; 63.9% also had Google Calendar, 30.7% Apple Calendar, and 21.1% all three. This is an Outlook-user cohort reported by a calendar-product vendor, not a representative population survey, but it supports designing for multiple calendar accounts. [Reclaim](https://reclaim.ai/blog/microsoft-outlook-productivity-report)
- A 2024 Japanese survey of 327 working Gen Z adults under 30 found Google Calendar was the most-used named app for private scheduling, with Outlook next. 34.9% said they clearly separate work and personal scheduling, 27.7% mix them depending on situation and 22.3% use the same approach for both. This is relevant to younger workers, but not a UK or LinkedIn-event sample. [TIME MACHINE survey](https://prtimes.jp/main/html/rd/p/000000027.000076337.html)

These sources do not justify estimating the target audience's exact provider percentages or excluding Apple. Separate **calendar app/client** from **calendar account/provider**: Apple Calendar can display Google or Microsoft calendars, so an iPhone user selecting Apple Calendar does not necessarily need an iCloud connection. Ask which calendar account to connect and let the person select calendars. As a mobile-web/PWA product, Hi Again cannot call Apple's native EventKit framework directly; iCloud access therefore needs a server/API integration (or later native application). This is an implementation inference from [Apple's EventKit access model](https://developer.apple.com/documentation/eventkit/accessing-the-event-store).

**Recommendation, not yet a provider decision:** Prove Google, Microsoft 365 and iCloud coverage in milestone 0. A unified provider API may cover Google, Microsoft 365, iCloud and Exchange in one integration; Cronofy and Nylas document that coverage. Compare provider scope/least privilege, OAuth and review friction, data processing/retention, reliability and total cost before selection. Keep Hi Again's event model provider-neutral and manual context entry available. [Cronofy provider list](https://docs.cronofy.com/support/); [Nylas provider list](https://developer.nylas.com/docs/provider-guides/)

**Direct Google + Microsoft launch feasibility, 1 November 2026:** Supporting both at launch is technically practical if limited to read-only event access, one OAuth connection per provider, a normalised internal event model and no calendar writes. It is two provider implementations and consent/configuration tracks, not one combined integration. Google Calendar event-reading scopes can require Google verification for public apps; Microsoft needs a multitenant Entra app registration for broad work/school coverage, optionally including personal Microsoft accounts, and some organisations may restrict user consent. Provider choice/order remains open; assess using working production OAuth, tenant-consent behaviour, review time and end-to-end event matching. [Google sensitive-scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification); [Microsoft supported account types](https://learn.microsoft.com/en-us/entra/identity-platform/supported-accounts-validation)

**Setup and maintenance comparison, 1 November 2026:** Google is likely lighter for a small team at first: one Cloud project/API/OAuth configuration, with a potentially meaningful public-app verification step for calendar event access. Microsoft setup is also a single app registration but adds multitenant account configuration and publisher verification; verification improves consent trust and may be required by some tenant policies. Neither entails per-customer organisation setup. Ongoing work for both is mainly token security/refresh/revocation, permission changes, API reliability and consent support; Microsoft's organisation-level consent policies create more user-support edge cases. Effort is moderate rather than high, with provider verification timelines and enterprise policy behavior as schedule risks. [Google verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification); [Microsoft publisher verification](https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview); [Microsoft consent policies](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/manage-consent-requests)

## 11. Current state and validation

### 11.1 Current concept state

The product thesis, brand lines, action-led participation mechanisms, private mutual Again, automatic guest/member saving, LinkedIn-only launch sign-in and separate optional Google Calendar access are recorded. The provider split still needs real integration verification.

### 11.2 Implementation state

- **Production application:** in `app/`. Built (13 November 2026): the whole first milestone — LinkedIn OIDC sign-in, immediate QR, guest saves/notes/drafts with retry-safe import and note-conflict choice, draft resumed and sent after sign-in, and the separate optional read-only Google Calendar connection (private “Likely met at” context, choice for overlaps, manual fallback, owner-confirmed Join me ideas); owner-editable invitations; sender in-place editing; Activity (Received/Sent, icon badge, per-version read state, Mark all as read); People Archive/Restore with left-LinkedIn/right-archive swipes; Again with private one-sided signals, transactional mutual matching, Coffee/Walk/Call next steps and match ending; incoming scans with the scanner notice and anonymous guest nicknames; blocking, reporting and permanent account deletion. Verified locally with fictional data (unit, database access-control and concurrency, browser checks, and 56 signed-in/Calendar/Activity/Again/scans/blocking/photo journeys against a test-only Supabase and Google stand-in); see `app/VERIFICATION.md`. Not yet verified with a real LinkedIn app, hosted Supabase, a Google OAuth client, Vercel or phones. The public-field allowlist, note length, calendar-disconnect and retention rules were confirmed on 13 November 2026 and are implemented (12-month guest-visit retention added). Profile photo upload added (own-folder Supabase Storage, 512px JPEG). Email notifications are not part of the pilot (Tek, 13 November 2026). A GitHub Actions workflow runs all checks on push (not yet run on GitHub).
- **Interactive mock-up:** fictional, simulated services. Standalone [HTML](outputs/hi-again-mockup.html), identical to `sites/hi-again-mockup/dist/index.html`, publicly viewable at https://hi-again-journey-demo.woollysnipe13.chatgpt.site. It shows LinkedIn sign-in followed by an optional Google Calendar connection.
- **Deferred experiment:** LinkedIn search-and-confirm in `experiments/linkedin-search/` (back pocket, not in scope).
- **Detailed history:** every dated mock-up revision, hosting change and local verification result is kept in the [implementation log](docs/IMPLEMENTATION_LOG.md). Add new implementation entries there and keep this summary current.

### 11.3 Validation direction

**Integration proof checklist, 31 October 2026:** In response to Tek asking how to prove the first milestone, [first working integration trial](docs/IDENTITY_TRIAL.md) specifies a small real LinkedIn/QR/public-profile/guest-save/notes/draft/import build, two participants, real iPhone/Android checks, direct API access-denial tests and interrupted storage/network/import cases. Evidence should include observed persistence, account isolation and retry behaviour, not only UI confirmations. This is a recommended test procedure, not completed work or a new commitment to every unresolved product default. Updated the build plan's stale publication-step wording to match confirmed immediate-QR onboarding. No accounts configured, code built, external deployment or integration tests performed.

**Separate CTA comparison, 31 October 2026:** `C:/Users/tekka/.codex/visualizations/2026/10/31/01a193b9-11f9-7731-b1ed-180bc363d1e8/hi-again-cta-options.html` contains two proposed hierarchies: Action led and Content led. Each opens the relevant illustrative interest/answer/request form. A local browser passed 20 checks at both 320px and 740px widths, covering three actions per variant, form entry, validation, simulation labelling and horizontal fit. The narrow action-led view was visually inspected. These are interface checks, not evidence of faster understanding. The existing journey prototype and confirmed labels were not changed.

**Subsequent action-led selection:** Tek approved Action led and it was first applied to visitor cards and owner preview, with 135 checks passing at both widths. Tek then retired the branded three-Share framework from the rest of the product interface. Profile, owner editor, forms, journey selector, Activity and detail views now use plain action/status wording; the comparison no longer offers branded-category labels. The latest revision passed 152 local checks at both widths, including absence of the retired labels across journey entries and contribution details. These are mock-up checks, not production implementation or measured comprehension evidence.

**Sender editing revision, 31 October 2026:** The current concept keeps submitted contribution records, Sent/Received activity views, sender read/edit screens and direct confirmation links. Original sent time/context remain intact, edits have a separate time and recipients see saved changes without an Edit control. The revision passed 178 local checks at both widths, covering exact-body viewing, independent records/drafts/recipients, save/cancel/failure retry, no duplicate record on edit, private snapshots and recipient visibility. Sender detail was visually inspected. A dedicated Read and edit what I sent example is available. This does not complete the separate real-integration checklist or establish backend ownership/concurrency enforcement.

**Unread Activity revision, 31 October 2026:** Added the icon-anchored numbered badge, centred navigation label, row dots, per-item read state and Mark all as read. Local checks passed 204 assertions at 320px and 740px, including counts, label alignment/badge location, single/bulk read, history preservation, snapshot continuity, later arrivals, edited contributions, independent accounts and mutual-only Again notifications. The narrow Activity view was inspected. These are simulated UI checks; real delivery/read-state persistence and privacy enforcement remain unverified.

**Inline contribution editing revision, 31 October 2026:** Replaced the separate editing screen with read/edit modes on the existing contribution detail. A pencil/Edit CTA becomes Save changes; Cancel and save remain on the same screen. Local checks passed 209 assertions at both widths, including stable screen/title, dynamic primary action, keyboard focus, save/cancel behaviour and the existing privacy, unread and retry checks. The narrow inline editor was visually inspected. Production implementation remains outstanding.

**Single-answer/UI cleanup revision, 31 October 2026:** Added stable question IDs and a per-sender existing-answer guard, an answered-state profile card and same-view compose → saved answer → inline edit/save. Removed the current confirmation-screen route, simplified form hierarchy/privacy wording, suppressed duplicate success lines and aligned back controls. Legacy confirmation state is mapped to the saved form. Local checks passed 227 assertions at 320px and 740px, including same-view/title completion, repeat access, duplicate attempts, unchanged saved text, same-record edits, new question identities and independent respondents. Before/after question views were inspected. These remain client-side mock-up checks; real database uniqueness, authentication, concurrency and persistence are unverified.

**All-action completion revision, 31 October 2026:** All three profile actions now retain their original text and show matching check/status badges when submitted. Completed interest/request cards reopen saved records, and request edits retain the badge. Stable item identity prevents a new activity/offer inheriting old completion. The concept passed 243 local assertions at both widths, including unchanged titles, badges, saved-record reopening, no new record on revisit, editable requests and new-item state. The narrow all-completed profile was inspected. No backend completion enforcement or real persistence is demonstrated.

**Build planning, 31 October 2026:** At Tek's request to plan the build, a [proposed build plan](docs/BUILD_PLAN.md) now maps the journeys into six milestones: identity/rules trial, interactive prototype, scan/save/return, participation and owner review, private mutual Again, and pilot preparation. It includes proposed defaults, access boundaries, milestone acceptance criteria and a verification plan. Defaults such as one active item per category, sign-in before submitting, browser-local guest storage, navigation and match hand-off remain recommendations awaiting confirmation, not new agreed product decisions. The workspace inventory still contains reference/planning material rather than app code. No provider setup, implementation, deployment, usability research or tests were completed by this planning task. Delivery estimates remain open pending the identity trial, prototype and team capacity.

The Word reference suggested measuring the path from scanning to saving and from saving to a second interaction. Candidate measures were scan completion, save success for guests and signed-in users, profile revisits and Again usage. These are **proposed measures, not agreed targets or collected results**. [P]

V explicitly describes the desired outcome as how many first encounters lead to a meaningful second interaction. The operational definition still needs care: opening LinkedIn, pressing Again, matching or revisiting a profile may indicate intent, but none automatically demonstrates that a second meaningful interaction occurred. No numerical target or measurement method has been agreed. [V]

## 12. Decision history

Dates below distinguish the original chat history from this consolidation. Where the supplied summaries do not date an intermediate choice, its order is retained without inventing a date.

| Topic | Earlier position | Change and reasoning | Current position |
| --- | --- | --- | --- |
| Product objective | Could focus on exchanging contact details. | The conversation prioritised making something happen after meeting. | Meaningful follow-up and a second interaction. [A, P] |
| Name | Followup was a strong functional candidate. | Its CRM associations were less suited to the desired human identity. | Hi Again preferred, conditionally. [N] |
| Domain | `hi-again.link` considered. | Unhyphenated form is cleaner and easier to say. | `hiagain.link` preferred; purchase unknown. [N] |
| Naming conflict | Existing uses initially prompted a recommendation to change name. | The concern was reconsidered; legal and commercial risks were separated. | Retain the leading candidate while clearance remains open. [N] |
| Sign-in exploration | Google, LinkedIn-only, then LinkedIn plus email were considered. | Professional fit favoured LinkedIn; speed favoured Google over email as a fallback. | Led to the earlier LinkedIn + Google agreement. [A] |
| Earlier sign-in finalisation | The 27 October chat and authentication summary agreed LinkedIn + Google. | The Word brief differed; Tek explicitly resolved it on 30 October. | LinkedIn only was confirmed then [C]; superseded by the 1 November Google decision below. |
| Google-only and first-login calendar consent | LinkedIn-only authentication with a later calendar connection. | Tek chose Google only with identity and calendar consent at first login on 1 November 2026. | Historical decision, superseded on 13 November. See docs/GOOGLE_FIRST_LOGIN.md. |
| LinkedIn launch sign-in and separate Google Calendar access | Google-only first login requested both identity and Calendar permissions. | Tek changed the provider split on 13 November 2026. | LinkedIn only for launch sign-in. Offer optional Google Calendar connection after sign-in. |
| Guest capture | Authentication summary required sign-in to complete an exchange. | Word brief required automatic guest saves; Tek explicitly confirmed that behaviour. | **Save automatically for guests; sign-in can follow later.** [C] |
| LinkedIn invitations | A one-tap Invitations API integration was explored as a possible future path. | Authentication and ordinary profile navigation were separated; restricted integration was unnecessary for the launch experience. | Standard link only; no restricted API/partnership in MVP. [P, A, R] |
| LinkedIn app opening | Asked whether the app could be forced to open. | Platform and browser behaviour set practical limits. | Aim for app opening, retain browser fallback, test on devices. [P] |
| Native messaging | Own chat was considered in the scope discussion. | The product reference records scope and moderation overhead without needing it for the central goal. | No native chat in MVP. [P] |
| Brand language | Naming and authentication summaries treated taglines as proposals. | Word brief selected two roles; Tek explicitly confirmed both on 30 October. | **Don't just meet. Meet again.** / **Make the second interaction happen.** [C] |
| Share structure | Fixed Share Experiences / Share Ideas / Share Value framing was originally agreed. | Tek found the cards unclear, selected Action led and subsequently retired the branded framework from all product tabs. | Direct activity/question/help actions; old framing retained only as a possible marketing idea. Content limits remain open. |
| Action labels | Join, Ask, Help, Meet, See; then Invite, Discuss, Offer. | Consistent imperative Share wording was preferred. | Superseded by the action-led labels (**Join me**, **Answer a question**, **Ask for feedback**), 31 October 2026. [V; Tek] |
| General connections | Bulk profile exchange and connection requests. | Felt too much like rebuilding LinkedIn. | Removed; private saving, participation and mutual Again are distinct. [V] |
| Conversation model | Native conversations and public discussion threads. | Storage, privacy, moderation and notification complexity; existing platforms can handle the continuing conversation. | Private one-off contributions without ongoing reply threads. [V] |
| LinkedIn messaging | Prefilled LinkedIn messaging as a core hand-off. | Reliable supported behaviour had not been established in the discussion. | Do not depend on it. [V] |
| Context collection | Mandatory encounter forms, tags or notes before acting. | Avoid administration interrupting the useful interaction. | Act first, record context where possible, optional notes later. [V] |
| Portfolio | A signature action category. | The three Share actions serve the participation model. | Normal profile link or section. [V] |
| First-use onboarding | First mock-up required editing, preview and publication before showing QR. | Tek asked for the fewest possible steps and an already usable profile after sign-in, 31 October 2026. | Show My QR immediately after ordinary SSO; optional editing later. Preserve action-triggered sign-in continuity. |
| Again hierarchy | V suggested a separate, quieter action; first mock-up placed it below the Share actions. | Tek explicitly prioritised Again, 31 October 2026. | Prominent primary action above the profile actions; mutual privacy unchanged. |
| LinkedIn placement | First mock-up placed the link below the Share actions. | Tek wanted visibility beside the person's name, 31 October 2026. | Optional link at the top beside the name; still manually supplied/confirmed. |
| Scan and People shortcuts | External-camera entry and tap-based People navigation; later left-swipe removal. | Tek requested persistent scanning and opposite swipe actions, then changed removal to archiving on 31 October 2026. | Always-visible scan entry; archive/open LinkedIn via left/right swipes, plus Archive/Restore and accessible buttons. |
| People action layout | LinkedIn and bin were adjacent; then bin moved to the opposite end. | Tek suggested separation, then rejected the bin in favour of a sensible archive action, 31 October 2026. | Archive-tray icon left, name in the middle and LinkedIn right; validate through usability testing. |
| Saved-person removal | Removal with a temporary Undo was explored in the first concepts. | Tek asked for Archive with a button to retrieve and restore people, 31 October 2026. | Reversible archiving with persistent Archive access and Restore; preserve notes and original timestamps. |
| Saved-context placement | The first timestamp concept placed save time near the profile name/bio. | Tek moved it to the bottom before Notes and specified that future calendar event/context belongs there, 31 October 2026. | Shares → saved timestamp/future calendar context → Notes. |
| Visitor CTA wording | Branded Share labels were used publicly, then retained only in configuration after the first Action led selection. | Tek subsequently asked to scrap that framing and apply action-led changes across all tabs, 31 October 2026. | Prominent concrete action plus short context, icon and chevron; no branded Share labels in product UI. |
| Sent contributions | Owner review existed, while sender detail could depend on transient compose state and had no edit path. | Tek requested that senders can read and edit what they wrote afterwards, 31 October 2026. | Separate submitted records, sender read/edit through confirmation and Activity → Sent, retained original context/time and updated recipient views. |
| Unread Activity | Activity had no unread indicator or clearing action. | Tek requested a numbered unread dot and bulk clearing, then moved the badge away from the centred Activity label to the icon's upper-right corner, 31 October 2026. | Icon-anchored numbered badge, centred label and Mark all as read; preserve records and one-sided Again privacy. |
| Contribution edit layout | The first sender-edit concept opened a separate edit screen, then returned to detail after saving. | Tek requested one screen with a pencil and dynamic Edit/Save CTA, reinforcing the always-simple/frictionless design principle, 31 October 2026. | Inline read/edit/save/cancel modes on the same detail view; no extra edit/save screen. |
| Answer submission and completion | The mock-up could create repeated answers and used a separate submission confirmation. | Tek required one answer per person/question and same-screen completion, and requested a general UI tidy-up, 31 October 2026. | Stable question identity, existing-answer view/edit, a guard against duplicate creation and in-place saved content instead of confirmation navigation. |
| Answered-card state | The initial once-only answer concept changed the headline to View your answer. | Tek asked to keep CTA text unchanged and use a visual completion cue, 31 October 2026. | Original action/question wording with a separate Answered check badge; card remains tappable for view/edit. |
| Completion across actions | Only the question card showed a completion badge. | Tek requested the same treatment for the other two actions, 31 October 2026. | Unchanged action text with Interest sent / Answered / Request sent check badges; reopen existing submissions. |
| Saved-person context | Notes and context were discussed, with no concrete timestamp/notes interface. | Tek required a timestamp and optional notes for each save, then clarified that People should group by date rather than show individual timestamps, 31 October 2026. | Date-grouped People; exact timestamp and optional notes in saved-person detail. Capture stays automatic. |
| Calendar enrichment and Join me scope | Calendar context was recorded as a later-phase Google Calendar integration; **Join me** initially defaulted to coffee, then was narrowed to public events only. | Tek confirmed coffee remains the generic **Join me** fallback when calendar/event context is unavailable, and also a private next-step suggestion after mutual Again, 1 November 2026. | Use owner-reviewed public-event suggestions when available; retain coffee in both contexts. Keep one-to-one logistics private and post-match. Provider, scope, matching, privacy and implementation remain open. |
| Question prompt | The selected default asked the visitor what they were enjoying working on, overlapping with the feedback request about their project or challenge. | Tek preferred a question about the profile owner, then asked for a more concise version, 1 November 2026. | “What would you like to know about my work?” Confirmed default; distinct from the visitor-focused feedback request. |
| Again lifecycle | Withdrawal before a match was a proposed default; post-match removal and expiry were open. | Tek chose the recommended options when asked before Again was built, 13 November 2026. | Withdraw any time before a match; either person can end a match, removing it for both without notification; one-sided Again never expires. |
| Incoming scans, blocking, deletion and match disclosure | Incoming scans were confirmed without a notice rule; blocking, deletion effects and match disclosure were open. | Tek chose the recommended options when asked before building, 13 November 2026. | Short scanner notice; silent full-separation blocking; permanent deletion including sent contributions; matches reveal only existing public links. |
| Public fields, note length, calendar disconnect and retention | Implemented as provisional defaults pending confirmation; guest visits had no retention limit. | Tek confirmed the recommended options, 13 November 2026. | Allowlist as built; 2,000-character notes; delete guessed calendar context only; guest visits 12 months, everything else until account deletion. |

**Recovered detail, not a preference change:** Version 1.1 replaces version 1.0's incomplete Share interpretations and open-ended Again description with V's recorded event/question/help mechanisms and mutual-interest rule. The source is dated 29 October and was supplied later; the update reflects better evidence, not a claim that Tek reversed those decisions on 30 October.

## 13. Open questions and next decisions

The order below is a suggested sequence based on dependencies in the concept, not a new roadmap commitment.

| Priority | Decision needed | Why it matters |
| --- | --- | --- |
| 1 | After mutual Again, how do contact disclosure and coordination work? | Coffee/walk/call suggestions and the withdrawal/ending/no-expiry lifecycle are confirmed (13 November 2026); exact logistics and contact disclosure remain open. |
| 2 | How are contributions viewed and notified: activity entry, email, or both? | Defines the owner experience without adding an inbox-style conversation. |
| 3 | Does **Join me** record interest only or also facilitate registration/attendance? | Prevents an interest signal being mistaken for a booking or attendance commitment. |
| 4 | Can an owner acknowledge or decline an **Ask for feedback** (help) request, and how? | Defines closure without expanding into native messaging. |
| 5 | One active event/question/offer per action, or multiple? | Fixes content configuration and profile complexity. |
| 6 | Adopt browser-local guest saves? How do retention, import, duplicates and sync work? | Makes automatic guest saving reliable, with honest recovery expectations. |
| 7 | Which actions require sign-in, and at precisely which submission point? | Preserves act-first composition and drafts while defining identity-dependent actions. |
| 8 | Which navigation is necessary at launch: Profile/People, Activity, Interactions, Follow-ups? | Separates recorded concepts from a final release interface. |
| 9 | What pilot cohort and professional event should be first? | The initial LinkedIn/QR behaviour is specified; the exact validation setting is not. |
| 10 | How do permanent profile URLs, QR rotation, repeat scans and the confirmed scanner entry work? | Defines capture reliability, permission/fallback handling and access behaviour. |
| 11 | Should people be able to delete individual sent contributions or saved people? | Blocking, deletion, Again lifecycle and retention were decided on 13 November 2026; today only account deletion removes sent items, and People offers Archive rather than removal. |
| 12 | How are LinkedIn URLs entered, validated and updated? | The launch integration does not supply automatic URL discovery. |
| 13 | Are the selected stack's provider requirements, deployment configuration and device behaviours verified? | Architecture is adopted; LinkedIn access, integrations, privacy and mobile behaviour still need implementation evidence. |
| 14 | What is the domain ownership and brand-clearance position? | Resolves the provisional public identity before material brand commitments. |
| 15 | What counts as a meaningful second interaction and how will the pilot observe it? | Measures the product outcome beyond contacts, button presses or mutual matches. |

The first eight questions derive from outstanding decisions in V, with sign-in timing explicit from its act-first journey. Preserve the settled private mutual-interest rule, participation mechanisms and removal of general connection requests. The old three-Share product framing has since been retired; use the current action-led direction throughout the UI.

Other matters with no settled decision in the supplied material: monetisation, pricing, company/legal structure, budget, team and build ownership, delivery timetable, launch date, marketing channels and detailed accessibility requirements. Keep these as unknowns; do not import decisions from another project.

## 14. Sources and how to maintain this reference

### 14.1 Source register

The supplied files are retained as unchanged local snapshots so this reference remains usable if the Downloads or attachment copies move.

| Code | Source | What it establishes |
| --- | --- | --- |
| **P** | [Product reference, 30 October 2026](docs/sources/2026-10-30-product-reference.docx) | Product thesis, Share labels, Again questions, scan-to-save, no native chat, LinkedIn approach and MVP boundaries. |
| **N** | [Naming and brand research reference, 30 October 2026](docs/sources/2026-10-30-naming-and-brand.md) | Naming exploration, brand intent, domain preference, historical trademark/competitor findings and provisional brand commitment. |
| **A** | [Authentication and product strategy reference, 30 October 2026](docs/sources/2026-10-30-authentication-and-strategy.md) | Professional starting audience, earlier sign-in decisions, public viewing, account continuity and provider-independent identity. |
| **V** | [Product Vision & Decisions, dated 29 October 2026; supplied 30 October](docs/sources/2026-10-29-product-vision-and-decisions.md) | Specific Share mechanisms, private mutual Again, removed requests, act-first onboarding, proposed stack/storage, design preferences, reported illustrative prototype and outstanding fulfilment decisions. |
| **R** | [Partial chat excerpts retrieved on 30 October 2026](docs/sources/2026-10-30-chat-excerpts.json) | Five recent exchanges from each of the three relevant chats; corroborates historical sign-in, LinkedIn-link and positioning discussions. |
| **C** | Tek's direct clarifications in this chat, 30 October 2026 | LinkedIn only at launch; automatic guest saving with later sign-in; both brand lines agreed. Exact decisions are transcribed below. |
| **F** | Tek's interface refinements in the journey-mock-up chat, 31 October 2026 | Fewest steps and clean intuitive UI; usable QR immediately after sign-in with optional editing; prominent Again above Shares; top-right scan button; LinkedIn beside the name; opposite People swipes for removal and LinkedIn. Exact direction mapping and Undo are implementation choices. |
| **S** | Tek's saved-context request and follow-up in the journey-mock-up chat, 31 October 2026 | Timestamp and optional notes for every saved person; People grouped by Today, Yesterday, recent weekdays and exact older dates, without individual row timestamps; Google Calendar event/context auto-population in a later phase. |

**Direct clarification record:**

- Launch authentication: **“LinkedIn only at launch”**.
- Guest scanning: **“Automatically save for guests; sign-in can follow later”**.
- Main brand line and product promise: **“Yes, record both as agreed”**, in response to the question specifying “Don't just meet. Meet again.” and “Make the second interaction happen.”

The earlier retrieval also exposed five recent exchanges each from **Networking app idea** (29 October), **LinkedIn SSO Comparison** (27 October) and **Brainstorm App Names** (27 October). These supported the integration history and identification of conflicting summaries. They were partial excerpts, not a full review of those conversations. The supplied summaries and Tek's direct clarifications form the main basis of this reference.

**Reconciliation rule:** Tek's direct clarification takes precedence over conflicting summaries. A newer file creation time alone is not evidence of a newer product decision. Where P supplies tentative interpretations or placeholders and V records explicit earlier decisions, use V to recover that detail and retain the discrepancy in history. V's architecture, storage and first-release recommendations remain proposals. Suggestions, interpretations, source-reported prototype history and historical external research retain their labels.

**Confidence:** 96% that this version faithfully consolidates the supplied references and direct clarifications. This is confidence in the record, not evidence of product demand, a working implementation or legal clearance. Material absent from those references can be added later.

### 14.2 Keeping the reference current

1. Read this file at the start of every Hi Again chat/task in this workspace, before substantive advice or changes. Re-read relevant sections after a direction change or context compaction. Use current decisions, not superseded options from older summaries.
2. When Tek makes a decision, update the relevant section and the snapshot table if affected. Record the date, rationale and source in decision history.
3. Preserve a changed decision as superseded rather than leaving two conflicting “current” statements. Mark unresolved conflicts instead of choosing silently.
4. Keep proposed features separate from agreed scope, and intended behaviour separate from implemented or tested behaviour.
5. Refresh external facts when they become relevant to an action. Domain prices, availability, provider requirements, competitor status and trademark findings are historical until checked again.
6. Record prototypes, deployments, test evidence and pilot results in section 11 as they become available. Do not infer completion from a plan.
7. Update the version, last-updated date and change log. Add source snapshots when useful; do not overwrite the original supplied records.
8. Maintain the reference during work without waiting for a separate request. Before a substantive final response, reconcile material new decisions, corrections, constraints, research, open questions, implementation progress and verification evidence. Do not turn brainstorming into confirmed decisions or add an update when nothing changed.
9. Read the latest file before editing if another chat may have changed it. Make focused amendments that preserve other work. Briefly report material updates, and disclose if the file could not be accessed or updated.

Tek requested continuous reference maintenance on 30 October 2026. The project's `AGENTS.md` records this read-and-update workflow for future work in this workspace. This is project guidance, not a background synchronisation service: separate chats or tools without access to this folder do not automatically contribute their changes.

This reference records project decisions. Action recommendations in the source material do not themselves authorise purchases, publication, account changes or other external actions.

### 14.3 Change log

| Date | Version | Change |
| --- | --- | --- |
| 30 October 2026 | 1.0 | Consolidated the product, naming and authentication references. Resolved launch sign-in, guest saving and brand-line conflicts through Tek's explicit clarifications. Preserved decision reasoning, superseded choices, historical research and open questions. |
| 30 October 2026 | 1.1 | Added the subsequently supplied 29 October product brief. Corrected Share Experiences and recovered the fixed participation model, private mutual Again and removal of connection requests. Added act-first/draft continuity, structured contribution rules, proposed stack/local collection, design preferences and reported illustrative prototype. Narrowed open questions to genuinely unresolved details; retained Tek's direct clarifications and proposal status. |
| 30 October 2026 | 1.2 | Made continuous reference maintenance explicit in project guidance: read at the start of each project chat/task, reconcile material updates before substantive final responses, preserve concurrent edits and distinguish this workspace workflow from cross-chat/background synchronisation. Product decisions unchanged. |
| 31 October 2026 | 1.3 | Added the proposed build plan requested by Tek, with journey-based milestones, explicit proposed defaults, acceptance criteria and verification/pilot gates. Recorded planning progress without treating recommendations as confirmed decisions or claiming implementation. |
| 31 October 2026 | 1.4 | Recorded the requested inline mobile journey concept, 11 core journeys and supporting states, coverage document and local browser verification. Kept simulated behaviour distinct from production implementation and proposed defaults distinct from confirmed decisions. |
| 31 October 2026 | 1.5 | Checked official LinkedIn OIDC documentation: recorded available identity fields, optional email claims, absent professional/profile-link data and the explicit limit on identity-verification claims. Added an attributed onboarding recommendation; no integration or new product decision. |
| 31 October 2026 | 1.6 | Recorded Tek's frictionless onboarding, profile hierarchy, scan access, LinkedIn placement and People-gesture decisions. Superseded quieter Again/mandatory first-use setup, updated the build plan and revised the inline concept. Recorded 93 local interface checks at both widths; retained proposal status for exact send/toggle/navigation/Undo behaviour and preserved the LinkedIn documentation research. |
| 31 October 2026 | 1.7 | Recorded Tek's suggested separation of People-row buttons to reduce accidental presses. Moved bin left and LinkedIn right with the name between, retained swipe/Undo behaviour and verified 97 local checks at both widths. Kept the usability benefit unverified. |
| 31 October 2026 | 1.8 | Added Tek's saved-person timestamp/optional-notes requirement, incorporating the follow-up correction to group People under dates without per-row timestamps. Recorded exact timestamps in detail, proposed private-note/repeat/grouping defaults, later Google Calendar event-context intent and 116 local interface checks at both widths. No calendar account connected or production persistence/privacy verified. |
| 31 October 2026 | 1.9 | Added the requested MVP architecture recommendation and official-documentation checks: single Next.js/Vercel application, Supabase, IndexedDB guests, access boundaries, retry-safe import and transactional private Again. Recorded hosting/data/notification recommendations separately from adopted decisions. No application, provider configuration or deployment implemented. |
| 31 October 2026 | 1.10 | Added the requested Cloudflare/Vercel comparison, checked Workers/vinext beta guidance and starting hosting prices/commercial-plan restriction. Retained Vercel as the least-friction recommendation for standard Next.js and recorded Cloudflare as viable subject to compatibility verification. No host selected or implementation performed. |
| 31 October 2026 | 1.11 | Recorded Tek's change from removal/bin to reversible archiving with an archive-tray icon and an Archive/Restore route. Preserved original timestamps and notes; updated plan/coverage and verified 132 local interface checks at both widths. Kept earlier architecture/hosting research and history intact. |
| 31 October 2026 | 1.12 | Clarified current Vercel Pro platform fee, included deploying seat/usage credit, extra seat costs and tax/overage boundaries from official documentation. Recorded one-developer hosting baseline separately from total MVP costs; preserved archive decision and concurrent reference updates. |
| 31 October 2026 | 1.13 | Recorded Tek's non-commercial-yet clarification and corrected the implication that paid hosting is already required. Added prototype Hobby guidance alongside the broader financial-purpose commercial-use definition; no automatic eligibility assumed for all pre-revenue pilots. |
| 31 October 2026 | 1.14 | Checked Hobby resource limits, clarified absence of a hosting user-count threshold and documented hypothetical capacity arithmetic separately from measured app performance. Recorded limit-exhaustion behaviour and separate Supabase/eligibility constraints. |
| 31 October 2026 | 1.15 | Recorded Tek's timestamp placement at the bottom of person detail immediately before Notes, with future Google Calendar event/context in the same area. Updated the concept and plan; verified 135 local checks at both widths. Preserved concurrent hosting research; no Calendar integration implemented. |
| 31 October 2026 | 1.16 | Recorded checked Supabase Free Auth/storage/traffic/project/compute allowances, absent automatic backups, inactivity pause and Pro starting cost. Distinguished Auth quota from actual user capacity and preserved concurrent timestamp-layout updates. No provider configuration or performance testing performed. |
| 31 October 2026 | 1.17 | Added requested scaling assessment with checked Vercel automatic scaling, Supabase manual compute/downtime and read-replica consistency boundaries. Distinguished plan upgrades from engineering/capacity verification; no load test or implementation performed. |
| 31 October 2026 | 1.18 | Tek accepted the recommended Next.js/TypeScript, Vercel, Supabase and IndexedDB mobile-web/PWA architecture and free-first prototype approach where eligible. Superseded unselected hosting/stack status, retained unresolved product defaults and verification work, and aligned architecture/build documents. No app, subscription or deployment created. |

| 31 October 2026 | 1.19 | Recorded Tek's exploratory Thor meme marketing idea, corrected the scene's wording and prop, and kept campaign approval, asset clearance and publication unconfirmed. |
| 31 October 2026 | 1.20 | Recorded Tek's CTA-clarity concern and an unapproved action-led/content-led wording comparison. Retained the fixed categories and existing agreed labels pending a decision; verified 20 comparison checks at each width. Preserved concurrent architecture and marketing updates. |
| 31 October 2026 | 1.21 | Recorded Tek's explicit Action led selection and applied it to the main journey mock-up. Superseded category-led public headlines while retaining the three Share categories, updated the plan and coverage, and retained passing journey checks. No production implementation or user comprehension study. |
| 31 October 2026 | 1.22 | Recorded Tek's retirement of the three-Share product framework and possible future marketing reuse. Applied plain action-led wording across current profile, editor, forms, Activity, detail and selector views; superseded retention of branded configuration labels. Underlying participation mechanisms continue. Verified 152 local checks at both widths; no marketing publication or production implementation. |
| 31 October 2026 | 1.23 | Added the requested first-integration pass/fail checklist and evidence requirements; distinguished a real identity/guest-import trial from simulated mock-up checks and later scaling/privacy verification. Corrected stale mandatory-publication wording in milestone 0. No real integration implemented or tested. |
| 31 October 2026 | 1.24 | Recorded Tek's sender read/edit requirement and implemented the simulated Sent/Received, confirmation/detail and edit/save/cancel/retry flows. Verified 178 local checks at both widths. Preserved the concurrent real-integration checklist; no server ownership, concurrency or real integration verified. |
| 31 October 2026 | 1.25 | Added Tek's unread Activity badge/bulk-clear requirement and icon-placement clarification. Implemented centred label, numbered badge, item dots and per-account read/version state in the concept; verified 204 checks at both widths. No production delivery/read persistence verified. |
| 31 October 2026 | 1.26 | Recorded Tek's universal intuitive/simple/frictionless design principle in the reference and AGENTS.md. Replaced separate contribution editing with inline modes and pencil/Edit → Save changes on the same detail screen. Verified 209 local checks at both widths; no production integration claimed. |
| 31 October 2026 | 1.27 | Refined the Activity unread badge slightly right/down at Tek's request, retaining centred icon/text and the same behaviour. Rechecked the narrow layout with 209 passing local checks. |
| 31 October 2026 | 1.28 | Recorded one answer per sender/question, same-screen answer completion and UI cleanup. Added identity-based duplicate guarding, answered-state cards, in-place saved contributions and simpler form/back/privacy presentation. Verified 227 local checks at both widths; no server uniqueness or real integration claimed. |
| 31 October 2026 | 1.29 | Recorded Tek's completion-state clarification: keep CTA wording unchanged and use a visual indicator. Replaced View your answer with the original headline plus a separate Answered check badge; retained read/edit behaviour and verified 228 local checks at both widths. |
| 31 October 2026 | 1.30 | Applied Tek's completion-state treatment to the activity and help actions: stable CTA text, consistent Interest sent / Answered / Request sent check badges and reopening saved submissions. Verified 243 local checks at both widths; retained question-only uniqueness scope and outstanding lifecycle rules. |
| 1 November 2026 | 1.31 | Published the latest mock-up to an owner-private Sites URL at Tek's request for phone access. Recorded source, commit and successful deployment; 243 narrow-layout checks passed. Actual phone access and production integrations remain unverified. |
| 1 November 2026 | 1.32 | Recorded Tek's selected default copy for the three action cards, tailored to LinkedIn users meeting at professional events. No mock-up or product implementation was requested or performed. |
| 1 November 2026 | 1.33 | Moved calendar integration from a later phase into the initial product based on its value for event context and Join me suggestions. Recorded privacy and owner-review boundaries while leaving provider choice, permissions and implementation open. No account was connected and no integration was built. |
| 1 November 2026 | 1.34 | Clarified that Join me is for owner-confirmed public events and superseded the coffee default. Recorded private one-to-one planning after mutual Again as a possible later flow, not a confirmed feature. Updated calendar suggestion boundaries; no implementation performed. |
| 1 November 2026 | 1.35 | Restored “Continue the conversation over coffee?” as a generic Join me fallback when calendar/event context is unavailable, and recorded it as a suggested private next step after mutual Again. Kept event suggestions owner-reviewed and exact one-to-one logistics private. No implementation performed. |
| 1 November 2026 | 1.36 | Replaced the challenging Answer a question default with “What’s something you’re enjoying working on at the moment?” to make replies easier and support natural professional-event conversation. Recorded as confirmed copy; no implementation performed. |
| 1 November 2026 | 1.37 | Changed the Answer a question default to “What part of my work would you like to hear more about?” so it focuses on the profile owner and is distinct from the feedback request. No implementation performed. |
| 1 November 2026 | 1.38 | Shortened the three confirmed action-card defaults to “Coffee and a catch-up?”, “What would you like to know about my work?” and “A fresh perspective on a project or idea?” No product implementation performed. |
| 1 November 2026 | 1.39 | Reversed gestures while retaining buttons; confirmed mutual Again next-step suggestions, first-account default prepopulation and owner-visible registered/anonymous scanners. Preserved previous mappings/privacy assumptions as history and identified guest lifecycle questions. Updated and republished the simulated prototype; 268 local checks passed at both widths. |
| 1 November 2026 | 1.40 | Designed the requested calendar auto-context and Join me suggestion journeys. Added optional connection, provisional private context, inline correction/ambiguity/no-match paths, invitation preview/public confirmation, disconnect and access-failure states to the prototype. Recorded design proposals separately from confirmed scope; 322 local checks passed at both widths. No calendar integration connected. |
| 1 November 2026 | 1.41 | Made all three action fields equal-sized expandable textareas matching Introduction; moved event suggestions/review from My profile into Edit profile beneath Join me. Verified 335 local checks at both widths. |
| 1 November 2026 | 1.42 | Moved calendar ideas to the editor bottom with a Join me jump prompt and return focus after selection. Added two initial event suggestions with arrow expansion/collapse, interpreting the follow-up in the event-ideas context. Verified 348 local checks at both widths; no real provider integration. |
| 1 November 2026 | 1.43 | Added sourced calendar-provider evidence and its limits: available surveys do not represent LinkedIn professional-event attendees aged 20-49. Recorded multiple-account findings, app-versus-provider distinction, Apple web-access implication and a proposed Google/Microsoft/iCloud provider proof. No provider selected or connected. |
| 1 November 2026 | 1.44 | Compared Google Calendar, Microsoft Graph and iCloud access for Hi Again's read-only context and owner-approved event suggestions. Recommended Google as the focused first direct integration, Microsoft as the next direct provider, and iCloud through an aggregator or native-app route, subject to implementation proof and cost/security review. No final provider decision or integration made. |
| 1 November 2026 | 1.45 | Recorded that Google and Microsoft can be shipped together in the initial release with provider-neutral event handling, while requiring separate OAuth implementations and reviews. Added Google verification and Microsoft multitenant/admin-consent considerations; no provider choice or implementation made. |
| 1 November 2026 | 1.46 | Compared Google and Microsoft app registration, verification and ongoing support load. Recorded Google as likely lighter initial setup, Microsoft as similar code effort with more enterprise consent edge cases, and both as moderate overall; no new provider decision or implementation. |
| 1 November 2026 | 1.47 | Added requested event-dismiss Undo and live bottom-right word/character counts. Set implementation defaults of 180 characters for prompts/invitations and 1,500 for answers/requests, retaining drafts on validation failure; profile preview clamps to two lines. Verified 369 local checks at both widths. |
| 1 November 2026 | 1.48 | Recorded first-use LinkedIn connection friction, distinguished the owner's destination URL from the visitor's URL, and researched the separate profile-URL API. Flagged Lite closure to new developers despite contradictory FAQ text. Proposed one-time inline paste and pre-event pilot enrichment without changing optional onboarding or implementing an integration. |
| 1 November 2026 | 1.49 | Explored name-based profile discovery at Tek's request. Recommended confirmed public-search candidates over guessed URLs, with no-match/paste fallback; recorded search-provider permission, coverage and usability checks as unresolved. No picker built or new product decision confirmed. |
| 1 November 2026 | 1.50 | Assessed Verified API access difficulty: automatic admin-only testing versus Business Development approval and production certification/InfoSec for Plus. Recorded enquiry route, fit assessment and unknown pricing/timing/eligibility; no application submitted or integration authorised. |
| 1 November 2026 | 1.51 | Built the requested local search-and-confirm trial with Tek's actual indexed candidate and a real common-name ambiguity case. Distinguished captured results from the implemented but uncredentialled fresh-search adapter, local confirmation from verification, and test implementation from product adoption. Eight core/server test groups and 22 browser assertions at each of three widths passed; published mock-up unchanged. |
| 1 November 2026 | 1.52 | Recorded Tek's decision to defer search-and-confirm and explore paste-link capture. Assessed supplied Claude recommendations, preserving immediate QR and optional enrichment; proposed explicit clipboard access, native paste fallback, completed-input auto-save and reversible editing. Deferred share targets/short-link resolution; no new UI implemented or detailed flow approved. |
| 1 November 2026 | 1.53 | Assessed supplied browser/native SSO advice: distinguished browser cookies from LinkedIn app sessions and Supabase sessions from provider tokens; retained web/PWA-first architecture and paste-link exploration. Corrected section 6's obsolete proposal-only wording for the already confirmed Supabase choice. SDK retirement date and device behaviour remain unverified; no authentication built. |
| 1 November 2026 | 1.54 | Recorded Tek's reconsideration of LinkedIn-only sign-in and a recommendation for Google-only launch with separate optional LinkedIn URL capture. Distinguished basic authentication value from LinkedIn-specific benefits and kept audience-friction assumptions unmeasured. Provider switch remains unconfirmed; no implementation changed. |
| 1 November 2026 | 1.55 | Checked LinkedIn sign-in buttons on Product Hunt, SlideShare and Powtoon login pages as requested hands-on examples. Recorded page-level evidence and its limits; no third-party authorisation, account creation or provider decision. |
| 1 November 2026 | 1.56 | Tek confirmed Google-only launch sign-in and requesting needed identity/calendar access at first login. Superseded LinkedIn-only and deferred calendar-request timing, preserved rationale/history, and added the scoped first-login specification plus current planning amendments. Actual OAuth/Calendar setup, prototype revision and real integration verification remain outstanding. |
| 1 November 2026 | 1.57 | Made the existing showcase mock-up publicly accessible and supplied a matching standalone HTML export. The demo depicted simulated LinkedIn sign-in and later calendar connection. |
| 13 November 2026 | 1.58 | Restored LinkedIn-only launch sign-in and separate optional Google Calendar access at Tek’s direction. Updated active plans and marked the earlier Google first-login specification historical. |
| 13 November 2026 | 1.59 | Prepared the Claude build handover and portable package with the integration checklist and HTML mock-up. Recorded a suggested application directory and retained open product and integration questions. |
| 13 November 2026 | 1.60 | Housekeeping, no product decision changed. Aligned stale coffee wording with the confirmed “Coffee and a catch-up?” default, replaced retired Share framing in current text and open questions, marked the Share action-label row superseded, and updated the calendar-provider line. Moved the section 11.2 implementation/verification history verbatim to docs/IMPLEMENTATION_LOG.md, leaving a current-state summary. |
| 13 November 2026 | 1.61 | Recorded the first production build in `app/` (milestone steps 1–3) and its local verification evidence; listed provisional allowlist and note-limit choices for Tek. No product decision changed. |
| 13 November 2026 | 1.62 | Recorded the second build slice in `app/` (Google Calendar connection, prompt editing, sender editing, Activity, People Archive/swipes) and its verification; added the calendar disconnect default to the provisional choices. No product decision changed. |
| 13 November 2026 | 1.63 | Recorded Tek's Again lifecycle decisions (withdraw before match; either can end a match, removing it for both without notification; no expiry) in the summary, Again section, decision history and open questions. Recorded the Again build and its verification. |
| 13 November 2026 | 1.64 | Recorded Tek's decisions on the scanner notice, blocking, account deletion and match contact disclosure (summary rows, Again and incoming-scan sections, decision history, open questions). Recorded the corresponding build and verification. |
| 13 November 2026 | 1.65 | Recorded Tek's confirmation of the public-field allowlist, 2,000-character notes, calendar-disconnect rule and retention (guest visits 12 months; everything else until account deletion). Implemented guest-visit retention. |
| 13 November 2026 | 1.66 | Recorded Tek's decision: no email notifications for the pilot. |
| 14 November 2026 | 1.67 | Recorded profile photo upload and the CI workflow. No product decision changed. |

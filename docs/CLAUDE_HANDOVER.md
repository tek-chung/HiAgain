# Hi Again build handover

**Prepared 13 November 2026.** Hi Again helps people turn a first meeting into a second interaction. Start with people who already use LinkedIn and scan QR codes at professional events.

## Start here

1. Read [project guidance](../AGENTS.md) and the [current decisions and open questions](../HI_AGAIN_REFERENCE.md). Dated historical entries document earlier choices.
2. Open the [interactive mock-up](https://hi-again-journey-demo.woollysnipe13.chatgpt.site/) or its [standalone HTML](../outputs/hi-again-mockup.html). Use the journey selector to inspect sign-in, guest saves, contributions, mutual Again and Calendar. The screens use fictional people and simulated services.
3. Build the first milestone against the [identity trial](IDENTITY_TRIAL.md). Use the [architecture](MVP_ARCHITECTURE.md) and [build plan](BUILD_PLAN.md) for the wider release. See the [calendar journey](CALENDAR_JOURNEY.md) for consent and event suggestions.

The workspace contains product documentation, a static demo and a deferred LinkedIn search experiment. Start the application in a dedicated `app/` directory so its source, dependencies and deployment are separate from the showcase. This directory choice is a suggested implementation default.

## First milestone

Build a small runnable Next.js and TypeScript application with Supabase Auth, PostgreSQL and Storage, intended for Vercel. Use IndexedDB for guest saves, notes and drafts. Keep the interface mobile-first. Provide setup instructions, placeholder environment variables, schema migrations and a repeatable verification procedure.

| Step | Deliverable and pass condition |
| --- | --- |
| 1. Sign in and share | LinkedIn OIDC is the sole launch sign-in option. A stable Hi Again account gets a starter profile and usable QR after sign-in. Returning sign-in reuses the profile. A sign-in prompted by an action resumes that action with its draft. |
| 2. Scan and save | A phone camera opens a public profile URL. Visitors can view and automatically save without signing in. The same browser retains a guest save and its timestamp and optional note across refreshes. A repeat scan creates no duplicate. A storage failure has an honest, actionable state. |
| 3. Return and import | After sign-in, import guest saves into the intended account. Retain the local records until the server acknowledges them. Retries must preserve timestamps and notes without duplication or silent conflict overwrites. Check cancellation, interrupted import, and account switching. |
| 4. Connect Calendar | Offer Google Calendar as a separate optional connection after LinkedIn sign-in. Read the selected calendars with a narrowly scoped grant. Test accept, decline, partial access, cancellation, expiry and reconnect. QR, People and drafts stay usable through each outcome. |
| 5. Verify | With fictional data and two accounts, test public field exposure, private record isolation and access checks at the API/database boundary. Record evidence from iPhone/Safari and Android/Chrome when available. List the tests still awaiting devices or provider credentials. |

Start with local scaffolding, fictional profiles, real QR encoding and guest persistence while provider credentials are arranged. Identify the LinkedIn developer app and Supabase callback setup, Google Calendar OAuth configuration, and stable HTTPS preview URL needed for the trial. Confirm the initial public-field allowlist before putting real profiles online. Use stable opaque profile IDs, and keep provider grants, identity mapping, guest notes and drafts private. Use explicit development fixtures for local testing. Treat real provider access and the real-device journey as separate acceptance checks.

## Behaviour to carry into the MVP

- **Profile and sharing.** Keep Scan at the top right and the optional LinkedIn link beside the person’s name. Show Again above the three action cards. Make profile enrichment optional. Use a user-supplied LinkedIn URL, with safe validation and an ordinary link hand-off. The paste interaction is still a design choice.
- **People.** Group by Today, Yesterday, recent weekday and older exact dates. Put the exact timestamp and private encounter context at the bottom of person detail, immediately before Notes. For incoming scans show a member profile or a clearly anonymous guest alias. Define scanner notice, deduplication and guest lifecycle before releasing incoming scans. Swipe left for LinkedIn and right to archive. Keep the archive button on the left and LinkedIn on the right. Restore from Archive with the original timestamp and notes.
- **Profile actions.** Prepopulate **Join me** with “Coffee and a catch-up?”, **Answer a question** with “What would you like to know about my work?”, and **Ask for feedback** with “A fresh perspective on a project or idea?”. Keep labels stable after participation and show separate completion cues. The prototype uses 180 characters for prompts and 1,500 for answers and feedback requests, with live word and character counts and two-line previews. Keep the full content on opening.
- **Contributions and Activity.** Keep one answer per sender and stable question ID, including simultaneous sends and retries. On send, show the saved contribution in place. Allow the sender to edit in the same view with Save changes. Preserve the original participants, item context and sent time. Use participant-only reads and sender-only edits. Place the unread count near the upper right of the Activity icon with the label centred below. Mark all as read keeps the history.
- **Again.** Keep a one-sided signal private across the interface, APIs, counts and analytics. Resolve mutual interest as a single pair transaction. Show coffee, walk and call as suggested next steps. Settle withdrawal, blocking and post-match lifecycle before releasing it.
- **Calendar.** Show a plausible match as private “Likely met at” context and allow inline correction or removal. Offer a choice for overlapping matches and a manual fallback. Keep private calendar ideas at the bottom of Edit profile, with a jump from Join me, two initial suggestions, expansion and Undo after dismissing. Publish only the wording the owner approves for a public event that welcomes others.

Exclude native chat, general connection requests, automated LinkedIn invitations, LinkedIn search discovery, calendar writes and automatic publication of calendar content. Use the published prototype for the interface and the current reference for policy and scope.

## Delivery and decisions

Record the first milestone’s working journeys, commands, migration state, test evidence and any external setup still needed. Keep provider credentials out of project files and logs. Agree the public profile allowlist before real profile exposure and resolve incoming-scan privacy, contribution lifecycle and Again withdrawal before those features ship. For routine reversible choices, document the assumption and proceed. Preserve the project reference’s decision history as work progresses.

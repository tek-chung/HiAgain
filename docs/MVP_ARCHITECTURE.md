# Agreed MVP architecture

**Current provider decision, 13 November 2026 (reference v1.58):** LinkedIn is the sole launch sign-in provider. Connect Google Calendar separately after sign-in, with an optional read-only grant. First sign-in opens a usable QR or resumes the interrupted action. Provider configuration and real-device verification are pending.

**Date:** 31 October 2026  
**Status:** Architecture and free-first prototype approach accepted by Tek, 31 October 2026. Product defaults explicitly labelled proposed remain unresolved. No application or infrastructure was implemented by this task.  
**Basis:** Project reference v1.18, preceding architecture/hosting/limits/scaling research, and official documentation checked on the date above.

**Adoption:** Use Next.js/TypeScript on Vercel, Supabase PostgreSQL/Auth/Storage with LinkedIn OIDC (provider restored 13 November 2026), IndexedDB guest saves/notes/drafts, and mobile-first web with progressive PWA support. Begin on Vercel Hobby where eligible and Supabase Free within allowances. Upgrade based on measured usage, eligibility and reliability needs. Earlier unselected-host language below records the comparison stage and is superseded by this adoption; Cloudflare was considered but not selected. No paid plan or external deployment has been created.

## Architecture

Use one TypeScript Next.js application on Vercel with Supabase PostgreSQL, LinkedIn OIDC authentication and profile-image storage. Use IndexedDB for guest saves, notes and drafts. Deliver a responsive mobile website and add installable PWA behaviour progressively.

Browser → Next.js interface and server operations → Supabase Auth / PostgreSQL / Storage. LinkedIn handles launch sign-in. Authorise Google Calendar separately after sign-in. The browser holds a local guest collection.

This is the recommended continuation of the existing Next.js/Supabase proposal. PostgreSQL suits directional interests, unique saves, structured contributions and transactional matching. Choose an available UK/European database location appropriate to the pilot and place server functions nearby. Hosting location alone does not establish complete data residency. Plan staging and production separately, version database migrations and verify backup recovery before a live pilot. Paid plan selection and costs have not been evaluated here.

## Cloudflare versus Vercel clarification

Cloudflare is a viable alternative app host while retaining Supabase Auth/PostgreSQL/Storage and the browser-local guest model. Use Workers for the full-stack application. Cloudflare's current Next.js guide recommends vinext for new projects: it reimplements the Next.js API surface using Vite and is labelled beta. Check required feature/library compatibility and prove OAuth callbacks, cookie sessions, server operations and draft/import continuity in the Workers runtime. It is not identical to deploying the standard Next.js runtime on Vercel. OpenNext remains another deployment path, but is not Cloudflare's current recommendation for new projects.

For the proposed Next.js MVP, Vercel remains the recommendation for the least deployment friction; Cloudflare is reasonable if reducing hosting costs or using Cloudflare is a priority and a compatibility trial passes. There is no measured performance winner for this application. Keep Supabase for transactional private Again rather than introducing D1/KV/Durable Objects solely to change app host.

Prices checked 31 October 2026: Workers has a free tier and Workers Paid starts at US$5/month plus applicable usage; Vercel Pro starts at US$20/month with included usage and potential additional charges. Vercel Hobby is for personal non-commercial use, so budget Pro for a commercial MVP. These are hosting starting prices, not total application costs; Supabase, domain, tax and optional services are additional. No host has been selected and no deployment or compatibility trial was performed.

**Prototype-stage clarification:** Tek says Hi Again is not commercial yet. US$20 is the Pro baseline, not an established current hosting requirement. A [Vercel Community prototype response](https://community.vercel.com/t/is-hobby-plan-suitable-for-a-saas-prototype/7205/5) permits trying ideas/product prototypes on Hobby subject to fair use. Consider US$0 Hobby for personal non-commercial prototyping within limits; reassess actual deployment purpose before a business-facing pilot. The [official commercial-use definition](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage) includes financial purpose and paid development, not just taking revenue. Eligibility for the eventual pilot remains unverified.

Sources: [Cloudflare Next.js/vinext guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Vercel pricing and Hobby restriction](https://vercel.com/pricing).

## Hobby capacity clarification

Checked 31 October 2026 against [Vercel Hobby documentation](https://vercel.com/docs/plans/hobby): there is no registered-user quota for this hosting plan. Main included monthly resources are 100 GB fast data transfer, 10 GB origin transfer, 1 million CDN requests, 1 million function invocations, 4 active CPU-hours, 360 GB-hours provisioned memory and 5,000 image transformations. These are separate meters; one page visit can produce many requests. Exceeding a Hobby allowance can prevent use of the affected feature until reset (often a 30-day wait), rather than purchasing automatic overages. Non-commercial eligibility is an independent requirement.

Do not promise a user threshold before measuring this application. An illustrative 1,000 monthly active users at 20 MB delivered per user, 100 function calls per user and 20 ms active CPU per call would consume roughly 20 GB transfer, 100,000 function calls and 0.56 CPU-hours. These assumed numbers fit those three allowances only; they are not benchmarks or proof that memory, origin, CDN/image or Supabase limits fit. Supabase accounts, storage and traffic have separate allowances. For a small personal prototype, begin within Hobby limits and use observed resource consumption to decide when to optimise/upgrade; no account usage or runtime tests have been inspected.

## Main boundaries

- Public profile routes return an explicit allowlist of public fields. Keep authentication email, private notes, submissions and Again signals out of public responses and shared caches. A stable opaque public identifier resolves to the internal user ID, so changing a display name need not invalidate a QR. Public links are shareable, not access credentials.
- Use a stable Hi Again account UUID with a LinkedIn provider identity. Validate the Supabase session on server operations. Create the starter profile idempotently and preserve interrupted actions. Keep read-only Google Calendar credentials private and separate from the account session.
- Browser storage holds guest profile IDs, first-save timestamps, optional private notes and drafts. Save only after an actual page visit, not during server rendering or link prefetch. Exclude self-saves and deduplicate repeat visits. Acknowledge a save only after storage succeeds; offer recovery feedback if storage is unavailable. Guest data can be lost and does not automatically cross browsers or devices.
- Import guest entries after sign-in using retry-safe operations. Keep local data until server acknowledgement, preserve original timestamps and avoid overwriting existing account notes silently. Offer a deliberate merge when both copies contain different notes. Scope signed-in drafts by account and clear or isolate private local state on logout. An OAuth callback must validate its destination and intent; a login callback or page refresh is not sufficient authority to submit an arbitrary action.
- Recommended default: guests can save and compose, but contributions and Again require sign-in before submission. This remains a product proposal. Preserve the draft, target and explicit send intent through authentication; revalidate the target item and prevent duplicates before committing. Same-browser continuity is the MVP expectation; test OAuth in phone-camera and embedded-browser entry paths before claiming broader continuity.
- Keep private tables protected with row-level security and explicit server authorisation. Public-profile data should be separated from private account data. Never place privileged Supabase credentials in the browser. Any privileged database function must check its authenticated actor explicitly and expose only a narrow operation.
- For Again, allow users to read their own directional signal and mutual matches, never another person's incoming one-sided signal. Execute signal changes and mutual-match creation in a database transaction serialised per unordered user pair. A unique match key prevents duplicate matches, but uniqueness alone does not prevent missed matches from simultaneous requests; locking or equivalent serialisation is required. Define withdrawal, blocking and deletion semantics before implementation. No public counts, responses, analytics or notifications may reveal one-sided interest.
- Use in-app activity initially for submissions and mutual matches. Decide whether email alerts are needed before the pilot; if adopted, persist a notification outbox in the same transaction and deliver with retry/deduplication. Email or push infrastructure is not needed to begin the first implementation slice.
- Avoid offline caching of private server responses at launch. Local guest saves and retained drafts do not mean participation or matching works offline. Camera scanning needs permission handling, a maintained decoder and a fallback; phone-camera links remain an entry route. Verify real iPhone and Android flows.

## Suggested data model

| Record | Purpose and access |
| --- | --- |
| Accounts and provider identities | Stable internal identity; private authentication mapping. |
| Public profiles | Explicit public fields, stable public identifier, optional validated LinkedIn URL. |
| Saved people | Unique saver/subject pair, original save timestamp, saver-only notes and private reversible archive state. Tek's subsequent archive refinement replaces removal: Archive/Restore retains metadata and does not delete contributions or withdraw Again interest. |
| Profile action items | Owner, supported interaction type (activity interest, question answer or help request), content/version and active/closed state. One active item per type is a proposed UI limit. The former Share branding is retired from the product interface; internal type identifiers need not be user-facing labels. |
| Action completion display | Derive sender-specific Interest sent / Answered / Request sent states from submissions linked to the exact current item ID. Keep titles unchanged and reopen the saved record. A replacement item needs a distinct identity and no inherited badge; completion is not acceptance/attendance/fulfilment. |
| Contributions | Sender, recipient, original item/version/context, type, submitted body, sent time, edit/version metadata and idempotency key. Tek confirmed sender read/edit access afterwards. Enforce participant-only reads and sender-only updates to permitted content fields. Editing must not change original participants, sent time or item context. Add conflict handling for concurrent saves. |
| Question-answer uniqueness | One answer per sender + stable question item ID, enforced by a database unique constraint for question answers. Return the existing row on retries/concurrent duplicate attempts; route the user to view/edit it. Different question instances and different senders remain independent, regardless of matching wording. Preserve original context when question text is edited. |
| Again signals | Private directed pair; unique sender/recipient; sender-only visibility. |
| Again matches | Unique unordered pair and creation time; participant-only visibility. |
| Activity | Participant-specific Sent/Received contribution views and mutual-match events; senders can revisit/edit written contributions. Never expose one-sided incoming Again interest or another person's private saves, notes or archive state. |
| Activity read state | Private per-user event/version receipts for unread counts, individual reads and Mark all as read. Count only events the account may receive; exclude own submissions and one-sided Again. Bulk reads must acknowledge the represented versions/cutoff rather than silently clearing later arrivals or edits. Keep activity/contribution records intact. |

Store timestamps in UTC and group by calendar day in the chosen timezone. Keep recorded save time, inferred encounter context and manual notes separate. Store calendar grants independently of the Hi Again session.

## Build and verification sequence

1. Prove LinkedIn sign-in, immediate QR creation, guest save/import and draft restoration on phones. Separately verify Google Calendar consent, selected-calendar reads and reconnect.
2. Build scan, People, timestamps and notes; then the three one-off contribution types and owner review.
3. Build private Again and activity, with concurrency and privacy tests before a pilot.

Required evidence includes two-account and unrelated-account access tests, direct database/API denial checks, simultaneous reciprocal Again, retry-safe contributions/import, import interruption, account-switch draft isolation, storage failure, deleted/closed targets, logout, and real mobile camera/OAuth/LinkedIn hand-offs. Capture errors without logging notes, answers, access tokens or one-sided signals. Basic pilot events should distinguish save, submission, mutual match and external-link opening; none alone proves a second interaction occurred.

## Checked sources

- [Supabase LinkedIn sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-linkedin): LinkedIn OIDC provider, developer-app/product access, credentials, callback and PKCE configuration. Actual project access remains unverified.
- [Supabase server-side authentication](https://supabase.com/docs/guides/auth/server-side): cookie-based server/client session integration.
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security): database access-control mechanism; no project policies have been implemented or tested.
- [LinkedIn OIDC](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2): available identity claims and identity-verification limitation.
- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps): progressive web application support.
- [Vercel function regions](https://vercel.com/docs/functions/configuring-functions/region): server region configuration.
- [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API): structured browser-local storage.

**Confidence:** 90% in this architecture's fit to the recorded MVP. Remaining uncertainty concerns actual LinkedIn OIDC and separate Google Calendar setup and review, real-device guest/auth continuity, notification needs and unresolved lifecycle rules, rather than demonstrated production behaviour.

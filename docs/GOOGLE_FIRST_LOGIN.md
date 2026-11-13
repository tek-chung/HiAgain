# Google first login and calendar permissions

**Historical specification.** Superseded on 13 November 2026 by LinkedIn-only launch sign-in and a separate Google Calendar connection. See [current calendar journey](CALENDAR_JOURNEY.md).

**Decision date:** 1 November 2026.  
**Confirmed by Tek:** Google is the only launch sign-in provider. Request the information needed by Hi Again, including calendar access, at first login. This supersedes LinkedIn-only authentication and the proposal to defer the initial calendar request.  
**Status:** Implementation specification and recommended handling, not a configured OAuth application or a working integration. No real Google account has been authorised. Existing mock-ups still simulate LinkedIn sign-in and later calendar connection and need revision.

## The first-use journey

Before **Continue with Google**, explain in the existing sign-in view: “Use your name and photo to get started. Read your calendar to help remember where you met and suggest events to share.” Do not add a separate explanation screen.

1. Start Google OAuth through Supabase, requesting identity and calendar read permissions together. Google controls the number of account/consent screens; do not promise a single screen or tap.
2. On return, establish the Hi Again identity, preserve the target/draft/guest collection, and inspect the permissions actually granted.
3. Return directly to My QR, or to the interrupted action. No compulsory calendar selection, editing, review or publication wizard.
4. Show calendar connection status in that existing view. Proposed default: use the account's primary calendar, with **Calendars** to choose others inline. This default is an implementation recommendation, not a separately confirmed product decision. Never silently enable all subscribed/shared calendars.
5. If calendar access was declined, keep sign-in, QR and core functions usable, with manual context and the existing coffee fallback. Offer calendar permission again only when the user deliberately chooses the feature. If all sign-in consent was cancelled, preserve guest state/drafts and allow retry.

Google-only login does not mean every user has Google Calendar data. A Google account can use a non-Gmail address, organisational policy may block access, and the relevant work calendar may be elsewhere. Empty/missing Calendar, Workspace admin denial and an unsuitable Google account are expected states. Other providers and additional linked accounts remain later possibilities, not authorised launch sign-in providers.

## Permissions to request

| Scope | Why Hi Again needs it |
| --- | --- |
| `openid` | Authenticate the Google account and obtain its subject identifier. Link it to a stable internal Hi Again user ID. |
| `profile` | Prefill available name and photo. Handle missing fields and allow later editing. |
| `email` | Obtain the permitted sign-in email and email-verification claim. Treat as private account data, not a public contact field or proof of professional identity. |
| `https://www.googleapis.com/auth/calendar.calendarlist.readonly` | List the account's subscribed calendars so the user can choose which Hi Again reads. |
| `https://www.googleapis.com/auth/calendar.events.readonly` | Read event details for private encounter context and owner-reviewed Join me suggestions, including accessible shared calendars the user selects. |

The two focused calendar scopes are recommended instead of broad calendar management or `calendar.readonly`. Free/busy-only access cannot supply event titles for context/suggestions. Owned-events-only access would omit subscribed/shared event calendars. Google grants these read scopes more broadly than an app-selected calendar subset: selecting calendars limits Hi Again's own reads, not the OAuth grant itself. Request only these scopes; no Gmail, Contacts, Drive, phone, birthday, attendee-contact import, event creation/editing, calendar sharing or invitation sending is needed for the agreed features.

## Fields to use, rather than importing everything

**Account/profile:** Google subject/provider ID, permitted email and verification flag, available full/given/family name and photo URL. Locale may be used if supplied, but is not required; timezone should come from calendar/event metadata or user/device settings rather than assuming locale implies timezone. Keep account identity separate from editable profile content. Default public profile fields still need their final allowlist; email and provider IDs remain private. Do not infer job title, employer or LinkedIn URL.

**Calendar selection:** calendar ID, display label, primary flag, timezone and access role. Fetch event data only for selected calendars. Do not persist unnecessary calendar descriptions or share settings.

**Event matching/suggestions:** source calendar/event ID, title, start/end including all-day dates and timezone, location where needed, cancellation/status, event visibility/type and source event link where useful. If needed to exclude declined attendance, use only the current member's self-response and discard other attendees' data. Omit descriptions, attachments, conferencing credentials and attendee identities/emails from requested fields wherever possible. Never copy provider tokens or raw event records into public responses, analytics or prototype state.

Read bounded time windows, not the user's entire calendar history. Proposed trial defaults are the encounter's local day for context and the next 30 days for suggestions; validate these with actual event behaviour. Match windows, cache/derived-data retention and deletion periods remain unresolved. Do not retain raw calendars indefinitely.

All derived context stays private to the saver. All Join me suggestions stay private until the owner edits/reviews the invitation and confirms that the event is public and open to invite someone to. Calendar visibility or a source link alone does not establish guest eligibility. Source updates must not silently publish changes. An approved public invitation is owner-authored content, distinct from raw calendar data.

## Supabase and Google token handling

- Use Supabase's Google OAuth flow with a server callback and PKCE-based application session exchange. Include the two calendar scopes and request offline Google access (`access_type=offline`) so approved event reads can continue after the initial Google access token expires.
- Supabase session refresh and Google provider-token refresh are separate. Capture the Google provider access token and, when issued, refresh token in trusted server handling. Encrypt provider tokens at rest with keys kept outside the database; never expose refresh tokens in public profile payloads, logs or general client state.
- On an initial connection, Google may need explicit consent to issue a refresh token. Use `prompt=consent` when establishing/recovering the calendar grant and refresh credential, not indiscriminately on every returning login. Preserve an existing valid refresh credential if the provider omits a new one. Never assume a token was issued just because sign-in succeeded.
- Confirm granted scopes from trusted token/provider information. Support identity-only, event-read-only, calendar-list-only and full-grant cases; do not label Calendar connected unless the permissions needed by the enabled flow and a successful API check are present. Partial or missing grants should not break the Hi Again session. Avoid broadening a reconnect request with unused historic permissions.
- Handle expiry, invalid/revoked refresh credentials, Workspace restrictions, rate limiting, no calendar service and account changes. Reconnect only through an explicit user action, preserving the current view and drafts. A temporary provider failure must not erase the user's selected calendars or manual notes.
- Disconnect stops calendar reads, removes stored calendar credentials/cache and follows the defined derived-data deletion policy. Google can group grants under one OAuth client: confirm revocation effects on sign-in and other Google grants during integration testing, rather than assuming selective revocation. Preserve independent Hi Again identity, saves and manual notes.

## Configuration and verification before real users

Create/configure the chosen Google Cloud OAuth client, consent branding, verified domains/redirects, Calendar API and scope declarations; configure the Google provider and callback in the development Supabase project. Exact projects, credentials, domain ownership and return URLs are not established here. Do not commit secrets or claim that requesting scopes itself grants access.

Calendar reading can require sensitive-scope verification for a public app. Complete the applicable Google review and publish accurate purpose/privacy/deletion information. Development testing uses named test users; Google testing-mode offline grants with calendar scopes can expire after seven days. Check the project's actual publishing/review state before pilot use. Google's granular-consent guidance prefers incremental requests unless upfront scopes are essential to core functionality; document Hi Again's actual encounter-context and Join me functionality honestly for this combined initial request. Review remains a release dependency, not guaranteed approval.

Required real integration evidence: full grant; identity-only; each partial calendar grant; total cancellation; missing refresh token; returning session without recurring consent; browser closure/reload; token expiry/revocation; Google Workspace refusal; no calendars/events; primary and selected shared calendars; different account; public/private response checks; guest import/draft return; disconnect/deletion; actual iPhone and Android behaviour. No real OAuth/calendar checks have passed yet. Mock-up assertions cannot substitute for this evidence.

## Official sources checked 1 November 2026

- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Calendar scopes](https://developers.google.com/workspace/calendar/api/auth)
- [Granular consent and partial grants](https://developers.google.com/identity/protocols/oauth2/resources/granular-permissions)
- [Offline access and web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Supabase Google provider and provider-token capture](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Supabase does not refresh provider tokens](https://supabase.com/docs/guides/auth/social-sign-in)
- [Google sensitive-scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [Google token expiry and testing-mode limits](https://developers.google.com/identity/protocols/oauth2#expiration)

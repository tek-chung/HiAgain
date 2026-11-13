# Hi Again — app

The production application. Built so far: the whole first milestone (**LinkedIn sign-in → immediate QR → guest scan and save → import after sign-in**, with a draft that survives sign-in, plus the **separate optional Google Calendar connection**), owner-editable invitations with calendar ideas, sender editing, **Activity** with unread state, People **Archive** with swipes, **Again** (private interest in meeting again, revealed only when mutual), **incoming scans** with a notice, **blocking, reporting and account deletion**, and **profile photo upload**. Mobile-first Next.js 16 (App Router, TypeScript) with Supabase Auth, Postgres and row-level security, built for Vercel. Guest saves, notes and drafts live in the browser (IndexedDB).

See [VERIFICATION.md](VERIFICATION.md) for what has been tested and what still needs real credentials or phones.

## Quick start (no accounts needed)

```bash
cd app
npm install
npm run dev            # http://localhost:3000
```

With no Supabase settings the app runs in **development-fixture mode**: fictional profiles (`/p/DevAlexM0rgn`, `/p/DevJamieChen`, `/p/DevSamPatel1`), a real scannable QR on `/me`, and real browser-local guest saves, notes and drafts. Sign-in is shown as unavailable.

## Connect Supabase and LinkedIn

1. **Supabase project** (choose a UK/EU region). Apply the schema, either in the SQL editor (paste `supabase/migrations/*.sql` in order) or with the Supabase CLI: `supabase link` then `supabase db push`.
2. **LinkedIn developer app** at <https://www.linkedin.com/developers/apps>. It must be associated with a LinkedIn company page. Add the product **Sign In with LinkedIn using OpenID Connect**. Under *Auth*, add the redirect URL `https://<project-ref>.supabase.co/auth/v1/callback`.
3. **Supabase → Authentication → Sign In / Providers → LinkedIn (OIDC)**: enable it and paste the LinkedIn Client ID and Client Secret. Disable providers you are not using (email sign-up included) — LinkedIn is the only launch sign-in.
4. **Supabase → Authentication → URL Configuration**: set the Site URL to your deployed URL and add redirect URLs for every environment, e.g. `http://localhost:3000/auth/callback` and `https://<your-preview>.vercel.app/auth/callback`.
5. **Google Calendar (optional).** In Google Cloud Console: enable the Google Calendar API; configure the OAuth consent screen with the scopes `.../auth/calendar.calendarlist.readonly` and `.../auth/calendar.events.readonly`; create a *Web application* OAuth client with redirect URIs `http://localhost:3000/calendar/callback` and `https://<your-domain>/calendar/callback`. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `CALENDAR_TOKEN_KEY` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). Calendar scopes count as sensitive, so Google limits an unverified app to test users you add, and refresh tokens for apps in *Testing* status expire after about 7 days. Plan Google's verification before a public pilot. Without these settings the Calendar card is hidden.
6. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key) and `NEXT_PUBLIC_SITE_URL`. Never add the service-role key: the app doesn't need it.

**Phones:** OAuth and camera both need HTTPS. Deploy a Vercel preview (set the same environment variables there) and use its URL as `NEXT_PUBLIC_SITE_URL`, so the QR codes point somewhere a phone can open.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development server, production build, production server |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit tests for the pure logic (dates, LinkedIn links, redirects, import reconciliation, drafts) |
| `npm run test:db` | Applies the migrations to a throwaway local Postgres and runs the access-control tests, including 8 concurrent imports and 20 pairs pressing Again simultaneously. Needs a local Postgres 15+ superuser. |
| `npm run check:browser` | Playwright guest journey at 320px and 390px against a running fixture-mode server (`BASE_URL`, default `http://localhost:3000`) |
| `npm run check:signed-in` | Signed-in, Calendar and Activity/Archive journeys end-to-end (56 steps): real migrations, a **test-only Supabase and Google stand-in** (`scripts/supabase-stub.mjs`, never deploy it), a production build and Playwright. Needs local Postgres. |

Playwright needs a browser once: `npx playwright install chromium`.

## How it fits together

```
src/
  app/                 routes: / · /sign-in · /auth/callback · /me (My QR) · /p/[publicId] · /people · /people/archive
                       · /activity · /scan · /calendar/connect|callback · /api/calendar[/context|/ideas]
  components/          client UI (ProfileView, ImportPanel, PeopleList, NoteEditor, Scanner…)
  lib/core/            pure, unit-tested logic shared by browser and server
  lib/guest-store.ts   IndexedDB: guest saves and drafts; never reports success before the write commits
  lib/supabase/        server/browser clients bound to session cookies (no privileged key)
  lib/calendar/        Google OAuth + Calendar client, AES-256-GCM token encryption, server-only
  proxy.ts             refreshes the Supabase session cookie (Next 16's renamed middleware)
supabase/migrations/   schema, RLS and the only write paths (SECURITY DEFINER functions)
supabase/tests/        auth stand-in for local Postgres + access-control tests
scripts/               DB test runner, browser checks, test-only Supabase stub
```

**Security model.** Tables are readable only by their owner via RLS and are never directly writable by `anon` or `authenticated`. Every write goes through a narrow database function that checks `auth.uid()` itself. Public profiles are served only by `get_public_profile()`, which **defines the public-field allowlist**: display name, headline, photo URL, LinkedIn link and active action prompts, under an opaque 12-character ID. Email and internal user IDs never appear in public responses.

**Guest saves.** Scanning saves automatically after an actual page visit (not during server rendering or link prefetch). Guests see "Saved on this browser" only after IndexedDB commits; failures show "Not saved" with Try again. After sign-in, `ImportPanel` offers to add them to the named account. Local records are deleted only after the server acknowledges each one. The database keeps the earliest timestamp, never duplicates, and returns `note_conflict` instead of overwriting a different note. The person then chooses: keep account note, use this browser's note, or keep both.

**Drafts.** Drafts are stored per scope (`guest` or the user ID). "Sign in with LinkedIn and send" stores the draft with a send intent, then returns to the same profile. After sign-in the draft moves into the new account and is sent once, with an idempotency key that survives sign-in, so retries never duplicate. Signing out deletes that account's drafts from the browser.

**Contributions.** Join me, Answer a question and Ask for feedback can be sent. The database allows one answer per sender per question, enforced by a unique index, and a retry returns the existing row. Sent content is shown in place with a completion badge. Senders can edit answers and requests in place, on the profile or under Activity → Sent; Join me interest has no editable text. Each edit raises a version number. A stale edit is reported as a conflict rather than overwriting, and the recipient sees the edit as unread again. The sent time, participants and original question wording never change. When the owner edits an invitation, it becomes a new item: earlier answers keep their original wording, and the new item starts without anyone's completion badges.

**Activity.** Received and Sent tabs, newest first, with a numbered badge on the Activity icon. Opening an item marks that version read. "Mark all as read" marks exactly the versions on screen, so anything arriving or edited afterwards stays unread. Your own submissions never count as unread. Read state is private to each account.

**People Archive.** The archive button is on the left of each row and LinkedIn on the right. Swipe right to archive, with Undo; swipe left to open LinkedIn. Vertical scrolling isn't affected. Archive → Restore puts the person back in their original date group. Archiving keeps notes, save times, context and contributions, and isn't blocking. A repeat scan keeps an archived person archived. Archiving also works for guests and carries through import.

**Again.** The button sits above the action cards. A one-sided Again can be read only by the person who sent it. It never appears to the other person, in their Activity, in their unread count or on the public profile, and it never expires, though the sender can withdraw it any time. When both people have said Again, the match is created in the same database transaction. Changes for each pair are serialised with a lock, so two people tapping at the same moment can't miss each other or create a duplicate (tested with 20 pairs tapping at once, and shown to fail without the lock). On a match, both see "It's mutual." with Coffee, Walk and Call suggestions, an editable message to copy (with a fallback if copying fails) and their LinkedIn link. Hi Again sends and books nothing. Each person gets one unread Activity event. Either person can end a match: it disappears for both without notification, and a new match needs both to say Again afresh. Guests are asked to sign in. Their Again goes through only if this browser recorded the tap, so a crafted link can't express interest for someone.

**Incoming scans.** Every profile tells visitors "Name will see you visited", and guests are also told they show as an anonymous nickname. A signed-in scanner is added to the owner's People with a "Scanned you" label, unless the owner had already saved them. A guest appears as a nickname (e.g. "Witty Heron"), never as a verified person, with notes and Archive but no profile, LinkedIn or Again. The guest's browser sends only a hash of a random browser token plus the owner's profile ID. Repeat visits aren't duplicated, the same guest can't be linked across different owners, and nobody can read the hash back. The database caps new guest encounters at 100 per owner per day to limit flooding. After a guest signs up, their earlier anonymous visit stays anonymous.

**Blocking, reporting, deletion.** Block and Report are under "More" at the bottom of a profile.
- **Blocking is silent full separation:** in both directions the profile shows as "not available" to the other signed-in person; neither can save, contribute to or say Again to the other; any match and Again signals end; and saves and contributions between them are hidden from People and Activity. Unblocking (My QR → Privacy and account) restores saves and history but not matches. Anonymous visitors can still open a public profile, because public links can't be restricted.
- **Reports** are stored for review in the Supabase dashboard. They aren't readable through the app's API, and each person can file at most 20 a day.
- **Delete account** requires typing DELETE. It revokes Google Calendar access, then deletes the account permanently. Everything cascades, including contributions sent to others, which disappear from their Activity. Reports keep their text without the identity.

`delete_my_account()` deletes the caller's row in `auth.users` from a SECURITY DEFINER function. This is a common Supabase pattern, but confirm that your project's migration role has delete permission on `auth.users`.

**Photos.** Add, change or remove a photo under Edit profile. It's saved straight away. The browser crops it to a 512×512 JPEG, which also drops location and other EXIF data, then uploads it to Supabase Storage at `avatars/<your user id>/`. The bucket is public, because the photo is a public profile field, and limited to 1 MB of JPEG, PNG or WebP. Storage policies allow writing only in your own folder. The database accepts only an avatar URL inside your own folder, so a profile can't point at an outside or tracking image. Older photos are deleted when you change or remove yours, and all of them when you delete your account. Migration `20261114090000_avatars.sql` creates the bucket and policies.

**Google Calendar.** It's a separate, optional connection under My QR. It never changes the LinkedIn sign-in. It uses read-only permission to list calendars and view events, with PKCE and a CSRF state cookie, and the grant must come back to the same account. People can untick permissions on Google's screen: without event access nothing is stored, and with events but no calendar list only the main calendar is used. The refresh token is stored encrypted with a server-only key and tied to the account, and the database never sees it in clear. Raw events are never stored. When someone is saved and exactly one event fits the time, the app privately notes "Likely met at …". With several, the person chooses; with none, they can type it. Context can be edited or removed with Undo, and a removed context isn't guessed again. If access expires or is revoked, the app asks to reconnect while everything else keeps working. Disconnecting revokes the token at Google and deletes inferred context, but keeps context the person chose or typed. Join me ideas from upcoming events sit at the bottom of Edit profile: two at first, Show more, Dismiss with Undo, and private events left out. Nothing is published until the owner edits the wording, ticks "This event is public and open to guests" and saves.

## Not built yet (next steps)

- Email notifications: none for the pilot, by decision (Activity is in-app only).

## Confirmed product rules reflected in the code (Tek, 13 November 2026)

- **Public profile:** name, headline, photo (LinkedIn picture), optional LinkedIn link and active invitations, all defined in `get_public_profile()`. Email and internal IDs are never public.
- **Notes:** saver notes up to 2,000 characters. Contributions are limited to 1,500 and invitations to 180.
- **Calendar disconnect:** deletes guessed "Likely met at" context but keeps context the person picked or typed.
- **Retention:** anonymous guest visits are kept for 12 months after the guest's most recent visit. They're hidden as soon as they expire and purged on the next guest visit, and daily if `pg_cron` is enabled. Saves, notes and contributions stay until the person deletes their account.
- **Again:** withdraw any time before a match; either person can end a match, quietly; a one-sided Again never expires; a match reveals only existing public links.
- **Scanner notice, blocking, deletion:** described above.

## Continuous checks

`.github/workflows/ci.yml` (at the repository root) runs the typecheck, unit tests, database tests, a build, and both browser suites on each push that touches `app/`. It uses a throwaway Postgres and fictional data only, so no secrets are needed.

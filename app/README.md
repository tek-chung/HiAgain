# Hi Again — app

Mobile-first web app for turning a first meeting into a second interaction. Next.js 16 (App Router, TypeScript) on Vercel, with Supabase for sign-in (LinkedIn), Postgres with row-level security, and Storage. Guests' saves, notes and drafts live in their browser (IndexedDB).

**Status (14 November 2026):** feature-complete for the pilot and deployed. Everything below is built and tested with fictional data; [VERIFICATION.md](VERIFICATION.md) lists what has been tested and what still needs real credentials or phones. Decisions and history live in [the project reference](../HI_AGAIN_REFERENCE.md) and [implementation log](../docs/IMPLEMENTATION_LOG.md).

## Try it locally (no accounts needed)

```bash
cd app
npm install
npm run dev            # http://localhost:3000
```

Without Supabase settings the app runs in **development-fixture mode**:
- **Fictional profiles:** `/alex-morgan`, `/jamie-chen` and `/sam-patel`.
- **A real QR code** on `/me` that you can scan.
- **Real guest saves, notes and drafts** in the browser.
- **No sign-in:** it's shown as unavailable.

## Going live

1. **Supabase project** (London region). In **SQL Editor** run every file in `supabase/migrations/` in name order, or use the CLI: `supabase link`, then `supabase db push`. Each new migration must run *before* the code that needs it is deployed.
2. **LinkedIn developer app** (linked to a LinkedIn Company Page). Add the product **Sign In with LinkedIn using OpenID Connect**, and on the **Auth** tab add the redirect URL `https://<project-ref>.supabase.co/auth/v1/callback`.
3. **Supabase → Authentication → Sign In / Providers → LinkedIn (OIDC):** turn it on. The *API Key* field takes the LinkedIn **Client ID**, and the *API Secret Key* takes the **Client Secret**. Leave "Allow users without an email" off.
4. **Vercel:** import the repository with **Root Directory `app`**, add the environment variables below and deploy. `vercel.json` pins the app server to London, next to the database.
5. **Domain:** in Vercel → Settings → Domains, add `hiagain.link` and `www.hiagain.link`, and create the DNS records Vercel shows at your registrar. Then redirect `www` and the `*.vercel.app` addresses to `hiagain.link`: use 307 while testing, then 308 permanent.
6. **Supabase → Authentication → URL Configuration:** set the Site URL to `https://hiagain.link` and add `https://hiagain.link/auth/callback` to Redirect URLs. Keep `http://localhost:3000/auth/callback` for local work. LinkedIn needs no change, because it returns to Supabase.
7. **Vercel → Settings → Deployment Protection:** visitors must not hit a Vercel login, so protect at most the preview deployments.
8. **Google Calendar (optional):**
   - In Google Cloud, enable the Calendar API.
   - Set up the consent screen with the scopes `…/auth/calendar.calendarlist.readonly` and `…/auth/calendar.events.readonly`.
   - Create a *Web application* client with redirect URIs `https://hiagain.link/calendar/callback` and `http://localhost:3000/calendar/callback`, then add the three Google variables below.
   - Calendar scopes are "sensitive". Until Google verifies the app, only test users you add can connect, and their access lapses after about 7 days.
9. **Check once:** delete a throwaway account to confirm the database role can delete from `auth.users`. Account deletion relies on it.

| Variable | Where | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production + Preview | Supabase publishable key (the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works) |
| `NEXT_PUBLIC_SITE_URL` | Production | `https://hiagain.link`, used in QR codes. Read at build time, so redeploy after changing it |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional | Google OAuth client |
| `CALENDAR_TOKEN_KEY` | optional | 32 random bytes, base64: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Changing it disconnects everyone's calendar |

Never add the Supabase service-role key: the app doesn't use one.

**If sign-in fails,** the sign-in page explains the likely cause and shows the technical detail. "Came back in a different browser" means the sign-in finished somewhere other than where it started, often after approving in the LinkedIn app. Starting again in the browser showing the message fixes it.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Development server, production build, production server |
| `npm run typecheck` | TypeScript, including unused-code checks |
| `npm test` | Unit tests for the pure logic |
| `npm run test:db` | Migrations + access-control tests on a throwaway local Postgres, including race tests (simultaneous imports, Again taps, same-name sign-ups). Needs a local Postgres 15+ superuser |
| `npm run check:browser` | Guest journey and camera scanning (Chromium's fake camera) against a running fixture-mode server (`BASE_URL`, default `http://localhost:3000`) |
| `npm run check:signed-in` | 64 signed-in journeys end to end: real migrations, a production build, Playwright, and a **test-only Supabase and Google stand-in** (`scripts/supabase-stub.mjs`, never deploy it). Needs local Postgres |
| `npm run check:perf` | Times bottom-tab navigation with 80 ms of simulated app–database distance |

Playwright needs a browser once: `npx playwright install chromium`. `.github/workflows/ci.yml` runs all of these on every push that touches `app/`.

## Layout

```
src/
  app/                 / · /sign-in · /auth/callback · /me (My QR) · /[handle] and /p/[publicId] (profiles)
                       · /people · /people/archive · /people/guest/[id] · /activity · /scan
                       · /calendar/connect|callback · /api/calendar[/context|/ideas] · /api/account/delete
  components/          UI (ProfilePage + ProfileView, PeopleList, ActivityList, AgainBlock, Scanner, …)
  lib/core/            pure, unit-tested logic shared by browser and server
  lib/guest-store.ts   IndexedDB guest saves and drafts; never reports success before the write commits
  lib/supabase/        session-bound clients (no privileged key); sign-in verified locally with getClaims()
  lib/calendar/        Google OAuth and Calendar client, AES-256-GCM token encryption (server only)
  proxy.ts             session refresh; finishes sign-in if Supabase returns to the wrong page
supabase/migrations/   schema, row-level security and the only write paths (SECURITY DEFINER functions)
supabase/tests/        local stand-ins for Supabase's auth and storage schemas + access-control tests
scripts/               test runners, browser checks, fake camera, test-only Supabase/Google stand-in
```

## How it works

**Security model.** Tables are readable only by their owner via RLS and are never directly writable by `anon` or `authenticated`. Every write goes through a narrow database function that checks `auth.uid()` itself. Public profiles are served only by `get_public_profile()`, which **defines the public-field allowlist**: display name, headline, photo URL, LinkedIn link and active action prompts, under an opaque 12-character ID. Email and internal user IDs never appear in public responses.

**Profile addresses.** Profiles live at `hiagain.link/<name>`, e.g. `hiagain.link/tek-chung`.
- **Where the name comes from:** always the person's LinkedIn name, never chosen by hand. Accents are simplified and punctuation dropped.
- **Same names:** numbered, e.g. `tek-chung-2`.
- **No Latin letters in the name:** the address becomes `member-2` and so on.
- **Reserved words:** app pages such as `/people` and `/me` are never used.
- **Name changes:** if the LinkedIn name changes, the address follows at the next sign-in. Every earlier address stays reserved for that person and redirects, so printed QR codes never break.
- **Older addresses:** `/p/<id>` addresses still work, and the app links between pages with them internally.
- **Where it's set up:** migration `20261114120000_name_handles.sql`.
- **Privacy:** name addresses can be guessed, so anyone can check whether someone has a profile. The profile itself was already public.

**Scanning and guest saves.** People can scan a QR code with their phone's own camera app; it's a normal link. The in-app scanner reads the whole square viewfinder, using the browser's built-in QR reader where there is one and jsQR otherwise. It accepts name links from Hi Again's own addresses and `/p/` links from anywhere, and always opens the profile on this site. `/scan?debug=1` shows diagnostics. Scanning saves automatically after an actual page visit (not during server rendering or link prefetch). Guests see "Saved on this browser" only after IndexedDB commits; failures show "Not saved" with Try again. After sign-in, `ImportPanel` offers to add them to the named account. Local records are deleted only after the server acknowledges each one. The database keeps the earliest timestamp, never duplicates, and returns `note_conflict` instead of overwriting a different note. The person then chooses: keep account note, use this browser's note, or keep both.

**Drafts and sign-in.** Drafts are stored per scope (`guest` or the user ID). "Sign in with LinkedIn and send" stores the draft with a send intent, then returns to the same profile. After sign-in the draft moves into the new account and is sent once, with an idempotency key that survives sign-in, so retries never duplicate. Signing out deletes that account's drafts from the browser.

**Contributions.** Join me, Answer a question and Ask for feedback can be sent. The database allows one answer per sender per question, enforced by a unique index, and a retry returns the existing row. Sent content is shown in place with a completion badge. Senders can edit answers and requests in place, on the profile or under Activity → Sent; Join me interest has no editable text. Each edit raises a version number. A stale edit is reported as a conflict rather than overwriting, and the recipient sees the edit as unread again. The sent time, participants and original question wording never change. When the owner edits an invitation, it becomes a new item: earlier answers keep their original wording, and the new item starts without anyone's completion badges.

**Activity.** Received and Sent tabs, newest first, with a numbered badge on the Activity icon. Opening an item marks that version read. "Mark all as read" marks exactly the versions on screen, so anything arriving or edited afterwards stays unread. Your own submissions never count as unread. Read state is private to each account.

**People and Archive.** The archive button is on the left of each row and LinkedIn on the right. Swipe right to archive, with Undo; swipe left to open LinkedIn. Vertical scrolling isn't affected. Archive → Restore puts the person back in their original date group. Archiving keeps notes, save times, context and contributions, and isn't blocking. A repeat scan keeps an archived person archived. Archiving also works for guests and carries through import.

**Again.** The button sits above the action cards. A one-sided Again can be read only by the person who sent it. It never appears to the other person, in their Activity, in their unread count or on the public profile, and it never expires, though the sender can withdraw it any time. When both people have said Again, the match is created in the same database transaction. Changes for each pair are serialised with a lock, so two people tapping at the same moment can't miss each other or create a duplicate (tested with 20 pairs tapping at once, and shown to fail without the lock). On a match, both see "It's mutual." with Coffee, Walk and Call suggestions, an editable message to copy (with a fallback if copying fails) and their LinkedIn link. Hi Again sends and books nothing. Each person gets one unread Activity event. Either person can end a match: it disappears for both without notification, and a new match needs both to say Again afresh. Guests are asked to sign in. Their Again goes through only if this browser recorded the tap, so a crafted link can't express interest for someone.

**Incoming scans.** Every profile tells visitors "Name will see you visited", and guests are also told they show as an anonymous nickname. A signed-in scanner is added to the owner's People with a "Scanned you" label, unless the owner had already saved them. A guest appears as a nickname (e.g. "Witty Heron"), never as a verified person, with notes and Archive but no profile, LinkedIn or Again. The guest's browser sends only a hash of a random browser token plus the owner's profile ID. Repeat visits aren't duplicated, the same guest can't be linked across different owners, and nobody can read the hash back. The database caps new guest encounters at 100 per owner per day to limit flooding. After a guest signs up, their earlier anonymous visit stays anonymous.

**Google Calendar.** It's a separate, optional connection under My QR. It never changes the LinkedIn sign-in. It uses read-only permission to list calendars and view events, with PKCE and a CSRF state cookie, and the grant must come back to the same account. People can untick permissions on Google's screen: without event access nothing is stored, and with events but no calendar list only the main calendar is used. The refresh token is stored encrypted with a server-only key and tied to the account, and the database never sees it in clear. Raw events are never stored. When someone is saved and exactly one event fits the time, the app privately notes "Likely met at …". With several, the person chooses; with none, they can type it. Context can be edited or removed with Undo, and a removed context isn't guessed again. If access expires or is revoked, the app asks to reconnect while everything else keeps working. Disconnecting revokes the token at Google and deletes inferred context, but keeps context the person chose or typed. Join me ideas from upcoming events sit at the bottom of Edit profile: two at first, Show more, Dismiss with Undo, and private events left out. Nothing is published until the owner edits the wording, ticks "This event is public and open to guests" and saves.

**Photos.** Add, change or remove a photo under Edit profile. It's saved straight away. The browser crops it to a 512×512 JPEG, which also drops location and other EXIF data, then uploads it to Supabase Storage at `avatars/<your user id>/`. The bucket is public, because the photo is a public profile field, and limited to 1 MB of JPEG, PNG or WebP. Storage policies allow writing only in your own folder. The database accepts only an avatar URL inside your own folder, so a profile can't point at an outside or tracking image. Older photos are deleted when you change or remove yours, and all of them when you delete your account. Migration `20261114090000_avatars.sql` creates the bucket and policies.

**Blocking, reporting, deletion.** Block and Report are under "More" at the bottom of a profile.
- **Blocking is silent full separation:** in both directions the profile shows as "not available" to the other signed-in person; neither can save, contribute to or say Again to the other; any match and Again signals end; and saves and contributions between them are hidden from People and Activity. Unblocking (My QR → Privacy and account) restores saves and history but not matches. Anonymous visitors can still open a public profile, because public links can't be restricted.
- **Reports** are stored for review in the Supabase dashboard. They aren't readable through the app's API, and each person can file at most 20 a day.
- **Delete account** requires typing DELETE. It revokes Google Calendar access, then deletes the account permanently. Everything cascades, including contributions sent to others, which disappear from their Activity. Reports keep their text without the identity.

`delete_my_account()` deletes the caller's row in `auth.users` from a SECURITY DEFINER function. This is a common Supabase pattern, but confirm that your project's migration role has delete permission on `auth.users`.

**Speed.** Each page checks your sign-in token locally instead of calling Supabase, and makes its database queries in parallel. The bottom tabs load in the background and are reused for 30 seconds; any change you make clears them, so a tab never shows stale data. Each tab also shows a loading placeholder straight away.

## Confirmed product rules reflected in the code

All confirmed by Tek on 13–14 November 2026.

- **Public profile:** name, headline, photo, optional LinkedIn link and active invitations, all defined in `get_public_profile()`. Email and internal IDs are never public.
- **Profile address:** `hiagain.link/<name>`, always from the LinkedIn name. Same names are numbered. It follows name changes, and old addresses keep redirecting.
- **Lengths:** saver notes are up to 2,000 characters, contributions 1,500 and invitations 180.
- **Again:** withdraw any time before a match; either person can end a match, quietly; a one-sided Again never expires; a match reveals only existing public links.
- **Scanners are told** they're visible to the profile owner. Guests appear as an anonymous nickname.
- **Blocking** is silent, full separation. **Deleting an account** removes everything, including contributions sent to others.
- **Calendar disconnect** deletes guessed context and keeps context the person picked or typed.
- **Retention:** anonymous guest visits last 12 months after the most recent visit. Everything else stays until account deletion.
- **No email notifications** for the pilot. Activity is in-app.

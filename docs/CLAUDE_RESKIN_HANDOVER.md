# Hi Again connection reskin

**Ready for implementation · 23 November 2026**

> Claude, implement the Hi Again connection reskin in the existing `app/` in this repository. Open the packaged `preview.html` and review the screenshots. Use the three designs for the public QR profile, saved People and mutual Again. Preserve the current journeys and privacy rules, run the relevant checks, and show before-and-after screenshots. Read the rest of this brief before editing.

## Start here

1. Open this ZIP alongside the Hi Again repository. Read its `AGENTS.md`, `HI_AGAIN_REFERENCE.md` and `app/README.md`. The repository contains the application and current product rules.
2. Open `preview.html` directly in a browser. Try **Again**, open **Maya Patel** in People, and select a mutual Again suggestion. The preview is an offline design reference with fictional people and local interactions. The `screens/` folder shows the overview and open encounter.
3. Use the existing app as the behavioural baseline. The older first-build handover in the repository is historical.

## Apply the designs

| Surface | Design | Start in |
| --- | --- | --- |
| **QR profile** | Give the face and name the strongest visual emphasis. Use the existing wordmark, a shallow abstract cover in warm cream and sage, and a roughly 74px overlapping portrait. Keep the headline compact and the optional LinkedIn link beside the name. Place the full-width green **Again** above the active invitations. Use simple icons and divided invitation rows. | `app/src/components/ProfileView.tsx`, `ProfilePage.tsx`, `Avatar.tsx`, `app/src/app/globals.css` |
| **People and saved detail** | Use photo-led rows with clear date groups and restrained dividers. In the existing saved-person view, place a warm inset for the exact save time and private encounter context after the profile actions, immediately before Notes. Retain the distinction between confirmed **Met at** and inferred **Likely met at**. | `app/src/app/people/page.tsx`, `app/src/components/PeopleList.tsx`, `PersonRow.tsx`, `ProfileView.tsx`, `SavedContext.tsx`, `NoteEditor.tsx` |
| **Mutual Again** | Bring the two portraits together on a soft sage-and-cream surface, then show **You both want to meet again** and selectable coffee, walk and call ideas. Apply this in the existing matched section. Keep the existing Activity entry and its link to that section. | `app/src/components/AgainBlock.tsx`, `ProfileView.tsx`, `ProfilePage.tsx`, `ActivityList.tsx` |
| **Bottom navigation** | Keep the existing People, Activity and My QR icons, labels and order. Centre each icon above its label, with three equal touch areas. Use a thin divider above the bar, a soft sage pill behind the selected icon and a stronger green label. Use the dark theme equivalents at night. Anchor the unread badge to the upper-right of the bell without moving the label or icon. | `app/src/components/Shell.tsx`, `Icons.tsx`, `app/src/app/globals.css` |

Use the app's shared system font, logo components and green `#28533E`. The light mock-up uses off-white `#F7F7EF`, warm white `#FFFEFA`, sage `#EAF2E7`, warm inset `#F3E9DB` and ink `#23352B`. Use roughly 14–16px for inner surfaces and pill-shaped primary buttons. Adapt these values to the existing theme tokens, with equally legible dark mode. The rounded outer frames and side-by-side view belong to the comparison. The app should use its existing responsive shell.

Apply shared colour and type refinements consistently where appropriate. Scope the new layouts to these three surfaces. Reuse the repo's wordmark and avatar components. The packaged SVGs are the original brand reference. Use actual profile portraits from authorised data and the existing initials fallback. Show both portraits only in the confirmed mutual state. If the viewer's portrait is unavailable in the current render path, use initials or pass the minimum existing viewer-owned display data through the authenticated render path.

Keep the global navigation in the existing shell, including its destinations, prefetching, active-route logic, accessible current-page and unread announcements, and bottom safe-area spacing. The mock-up's Activity example shows the selected style. Keep the real selected item tied to the active route.

## Preserve the live journeys

- **QR visit and public profile.** Keep canonical and legacy links, the top-right scan control, self-preview, the scanner notice and anonymous guest wording. Carry the current browser/account/pending/failure save states into the new styling. The preview's static **Saved** badge is illustrative. Keep the existing active prompts, inline forms, completion cues, validation and LinkedIn hand-off. Retain draft and Again intent restoration through LinkedIn sign-in.
- **People.** Keep grouped dates with no per-row timestamps, the current details route, archive on the left, LinkedIn on the right, swipe right to archive and swipe left to LinkedIn. Retain Undo and Restore, private notes and timestamps, guest visitor states, context editing and calendar disconnect behaviour.
- **Again and Activity.** Retain sender-only pending state, withdrawal, the existing match gate, unread and mark-as-read behaviour, editable suggestion text, **Copy message**, optional LinkedIn hand-off and **End match**. Keep copy failure and other error states. A suggestion prepares text for the user to send externally. Continue to rely on the existing match and block rules and public-field allowlist.

Keep the work at the presentation layer. Preserve existing routes, auth, storage, RPC contracts and database access rules. Use the existing production components and test fixtures. The preview's sample portraits, notes and interactions are for design review.

## Acceptance and hand-back

- Capture before-and-after views of the QR profile, People list, saved encounter detail and mutual Again at mobile widths. Check 320px and 390px and a wider viewport in light and dark mode. Exercise long names and headlines, missing photos or LinkedIn URLs, visible focus, comfortable touch targets and no horizontal overflow. Verify that all three navigation labels and icons align, the active item follows the route, the bell stays centred with and without an unread count, and the fixed bar leaves the final action reachable.
- From `app/`, run `npm run verify` and `npm run build`. Run `npm run check:browser` against the fixture server and `npm run check:signed-in` where the documented local Postgres prerequisites are available. See `app/README.md` and `app/VERIFICATION.md` for setup and coverage. Verify a guest scan/save, saved detail, People archive/restore, Again and undo, mutual match, editable copy and end match through their existing routes.
- Summarise the changed components, tests, and any checks that still need a real device or credentials. Update the living reference and implementation log with what actually shipped or was verified. Leave deployment for a separate request.

# LinkedIn search-and-confirm trial

Run `node server.mjs` in this folder, then open http://127.0.0.1:4178.

The test opens with Tek Kan Chung's **real public search result captured on 1 November 2026**. It does not infer the URL from the name. An Alex Smith + London case includes four real results to exercise ambiguity. Result titles and brief identifying details may be stale; no profile was independently verified. No photographs or full profile content are stored.

Choose **That's me** to save the selected link in this browser, grouped by the entered name. It is a local experiment, not a connected Hi Again account, SSO, ownership verification or a sent LinkedIn invitation. Change removes the test selection; the linked profile can be opened for inspection. A pasted link is also supported.

## Fresh searches

No search-provider credentials were available during this build. With no key, the server serves **only the two labelled captured searches**; unknown names/refinements show an honest unavailable state rather than fabricated results or silent sample substitution.

The server implements Brave Web Search using `BRAVE_SEARCH_API_KEY` in its environment. Configure the key securely outside source control and restart the server. The browser never receives it. When configured, all lookups use fresh search results, including no-match handling. The live adapter has been tested with controlled provider responses, not with a real Brave account. Provider pricing and result display/storage permissions require checking before production use. This is not a selected production provider.

Reference: https://api-dashboard.search.brave.com/api-reference/web/search/get

The experiment searches the web index; it does not fetch or scrape LinkedIn. Candidates must be personal `/in/` profile URLs, have all searched name tokens in their result title, and survive URL validation/deduplication. Result ordering is the search provider's order, not a confidence score. No candidate is saved automatically. A matching title does not establish ownership.

## Verification

- `node --test test.mjs`: core URL filtering, name matching, captured/live distinction, query construction, provider success/error/zero-result responses, and HTTP asset restrictions.
- `node browser-check.mjs`: actual browser confirmation/paste/refinement/error/stale-response flows and layout at 320, 390 and 1,000px. Browser path defaults to the installed local Chromium; override with `CHROMIUM_PATH` elsewhere.
- Browser screenshots and assertion results are in `verification/`.

The first trial found one exact-name candidate for Tek Kan Chung (`https://uk.linkedin.com/in/tek-kan-chung`); the broader Tek/Chung query also surfaced other people and profiles merely mentioning the name. The experiment therefore filters on result title and never treats mentions as identity matches. The common-name query returned several different Alex Smiths. These targeted searches do not measure representative coverage, precision or completion time.

Not yet verified: real Brave credentials, search-service storage/display terms, authentication integration, real mobile app hand-off, accessibility with assistive technology or representative user success rates. This local test does not change the published Hi Again mock-up.

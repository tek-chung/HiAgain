# Hi Again

Read [AGENTS.md](AGENTS.md) and [HI_AGAIN_REFERENCE.md](HI_AGAIN_REFERENCE.md) before making changes. Use British English and include a confidence score in user-facing replies.

Start with [the build handover](docs/CLAUDE_HANDOVER.md). Its first milestone is the small working sign-in, QR and guest-save journey. Use the latest dated decisions in the reference when older material differs.

Use [the HTML mock-up](outputs/hi-again-mockup.html) to inspect the interactions. The production application is in `app/`.

## Workspace map

- `HI_AGAIN_REFERENCE.md` — current decisions, history and open questions (the source of truth).
- `docs/` — build handover, identity trial, architecture, build plan, calendar journey, mock-up coverage, and `IMPLEMENTATION_LOG.md` for dated implementation and verification evidence. `docs/sources/` is preserved historical input; `GOOGLE_FIRST_LOGIN.md` is superseded.
- `outputs/` — the standalone HTML mock-up and the portable handover zip. Rebuild the zip when its files change.
- `sites/` — the published mock-up's own git repository (ignored by the root repository).
- `experiments/linkedin-search/` — deferred search-and-confirm trial; not in launch scope.
- `app/` — the production application. First milestone, Activity/Archive, Again, incoming scans, blocking and deletion are built; start with `app/README.md` and `app/VERIFICATION.md`.

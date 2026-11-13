# Hi Again

Read [AGENTS.md](AGENTS.md) and [HI_AGAIN_REFERENCE.md](HI_AGAIN_REFERENCE.md) before making changes. Use British English and include a confidence score in user-facing replies.

The app is built and deployed. Start with [app/README.md](app/README.md) (setup, features, confirmed rules) and [app/VERIFICATION.md](app/VERIFICATION.md) (tests and what is still unverified). Use the latest dated decisions in the reference when older material differs; record implementation progress in [docs/IMPLEMENTATION_LOG.md](docs/IMPLEMENTATION_LOG.md).

The [HTML mock-up](outputs/hi-again-mockup.html) is historical; the live app is the reference for behaviour.

## Workspace map

- `HI_AGAIN_REFERENCE.md` — current decisions, history and open questions (the source of truth).
- `docs/` — `IMPLEMENTATION_LOG.md` (dated build and verification evidence) plus the historical planning documents (handover, identity trial, architecture, build plan, calendar journey, mock-up coverage). `docs/sources/` is preserved historical input; `GOOGLE_FIRST_LOGIN.md` is superseded.
- `outputs/` — the standalone HTML mock-up (historical) and an out-of-date handover zip from 13 November (superseded by the repository itself; safe to `git rm`).
- `sites/` — the published mock-up's own git repository (ignored by the root repository).
- `experiments/linkedin-search/` — deferred search-and-confirm trial; not in launch scope.
- `app/` — the production application (deployed). `.github/workflows/ci.yml` runs its checks on every push.

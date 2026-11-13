# Hi Again

**Don't just meet. Meet again.** Hi Again turns a first meeting into a second interaction. Share your profile as a QR code, invite someone to join you, answer their question or ask for feedback. Or privately say you'd like to meet again; it's only revealed when it's mutual.

Live at **[hiagain.link](https://hiagain.link)** (pilot).

## In this repository

| Path | What it is |
| --- | --- |
| [`app/`](app/) | The web app: Next.js 16, Supabase, Vercel. Start with [`app/README.md`](app/README.md) for setup, features and confirmed rules, and see [`app/VERIFICATION.md`](app/VERIFICATION.md) for test evidence |
| [`HI_AGAIN_REFERENCE.md`](HI_AGAIN_REFERENCE.md) | Product decisions, reasoning, history and open questions: the source of truth |
| [`docs/IMPLEMENTATION_LOG.md`](docs/IMPLEMENTATION_LOG.md) | Dated record of what was built and how it was verified |
| [`docs/`](docs/) | Historical planning documents (build plan, architecture, calendar journey, identity trial) |
| [`AGENTS.md`](AGENTS.md), [`CLAUDE.md`](CLAUDE.md) | Working guidance for AI assistants on this project |
| `outputs/`, `experiments/` | Historical mock-up and a deferred experiment |

Checks run on every push that touches `app/` ([workflow](.github/workflows/ci.yml)). All tests use fictional data.

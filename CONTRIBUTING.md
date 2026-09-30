# Contributing to haass-weather-travel

## Overview

This document describes the development workflow, conventions, and standards for contributing
to the haass-weather-travel middleware. Read it before opening a pull request.

Last verified: 2026-09-30

---

## Prerequisites

- Node.js 24 LTS (Active LTS until April 2028)
- npm 10+
- Docker (for container builds)
- A Freshservice trial or sandbox account (for end-to-end tests)
- A `.env` file with real credentials (see `.env.example`)

---

## Development workflow

This project uses trunk-based development with a protected `main` branch.

1. Pick up a GitHub Issue (or create one if it does not exist).
2. Create a short-lived feature branch from the latest `main`:

   ```
   git checkout main
   git pull --rebase origin main
   git checkout -b feat/<scope>-<short-desc>
   ```

3. Make one logical change per commit (see Commit conventions below).
4. Push and open a PR against `main`.
5. All CI checks must pass before merging.
6. Merge with `--no-ff` (squash is never used; the commit history is the audit trail).
7. Delete the branch after merge.

**Phase 0 is the only work committed directly to `main`. All subsequent phases go through PRs.**

---

## Branch naming

| Prefix    | Use                                        |
|-----------|--------------------------------------------|
| feat/     | New feature or capability                  |
| fix/      | Bug fix                                    |
| docs/     | Documentation only                         |
| test/     | Test additions or improvements             |
| chore/    | Build, tooling, or config changes          |
| refactor/ | Code restructure with no behaviour change  |
| ci/       | CI/CD workflow changes                     |

Examples: `feat/geocoding-client`, `fix/retry-backoff`, `docs/adr-no-mocks`

---

## Commit conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

Format:

```
<type>(<scope>): <short subject in imperative mood>

<optional body - explain WHY, not WHAT>

<optional footer - issue refs, breaking changes>
```

Rules:
- Subject line: 72 characters or fewer, imperative mood, no trailing period.
- Body: explain why the change is needed when it is not immediately obvious.
- Reference the related GitHub Issue: `Closes #7` or `Refs #7`.
- One logical change per commit. Never batch unrelated work.
- Target 50+ meaningful commits across the project lifetime.

Types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `ci`

---

## Pull request process

1. Fill in the PR template completely.
2. Ensure the PR title follows Conventional Commits format.
3. All checklist items in the PR template must be checked.
4. Request at least one review before merging.
5. Address all comments before merging.

---

## Code standards

### No emojis - strict

No emojis or decorative Unicode symbols anywhere:
- Source code, comments, log messages
- Commit messages, branch names, PR titles
- Documentation, README, markdown headings
- Test names, sample data, email templates
- Ticket notes posted to Freshservice

Plain professional ASCII text only. The CI no-emoji check fails the build on violation.

### Code quality

- ESLint and Prettier configs are committed. Run `npm run lint` and `npm run format:check` before pushing.
- No `console.log` - use the structured logger (`src/logger.js`).
- No dead code. No commented-out code. No TODO without a linked entry in `docs/known-limitations.md`.
- All configuration via environment variables; validated at startup. No hardcoded URLs or magic numbers.
- Small single-responsibility modules. Pure functions for validation and the recommendation engine.
- Meaningful JSDoc on all public functions.

### Security

- Secrets go in `.env` only. `.env` is gitignored and must never be committed.
- Run `npm audit` before pushing. The CI enforces a clean audit.
- No mock providers, no bundled static city lists, no saved-response fixtures posing as live data.

### Testing

- Unit tests: `middleware/test/unit/` - every validation rule and recommendation rule.
- Live contract tests: `middleware/test/live/` - run with `npm run test:live`.
- Manual e2e: `scripts/e2e.js` - run with `npm run e2e` locally only, never in CI.
- Minimum coverage threshold: 85% for `middleware/src/`.
- Tests are deterministic; date-dependent functions take `today` as an argument.

---

## Running locally

```sh
cd middleware
cp ../.env.example ../.env   # then fill in real values
npm install
npm run dev
```

Health checks:

```sh
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

---

## CI pipeline

GitHub Actions runs on every push and PR:

| Job           | What it checks                                      |
|---------------|-----------------------------------------------------|
| lint          | ESLint, Prettier format check                       |
| no-emoji      | No emoji or non-ASCII pictographs in tracked files  |
| secret-scan   | No secrets committed (gitleaks)                     |
| unit-test     | npm test with coverage threshold                    |
| audit         | npm audit (no high/critical vulnerabilities)        |
| docker-build  | Dockerfile builds successfully                      |
| live-contract | Separate job hitting real Open-Meteo APIs           |

---

## Documentation

Every document must state its purpose, scope and last-verified date at the top.
ADRs live in `docs/adr/`. Update `CHANGELOG.md` with every meaningful change.
Screenshots in `docs/screenshots/` must not contain any credentials.

---

## Definition of done

Before marking a phase complete:
- [ ] Code complete and passing lint
- [ ] Unit tests green with coverage >= 85%
- [ ] CI green on all required jobs
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No secrets in the diff
- [ ] No emojis in the diff
- [ ] Summary given and awaiting "continue"

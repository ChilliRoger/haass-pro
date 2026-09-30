# Changelog

All notable changes to haass-weather-travel are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Phase 7: Asynchronous webhook orchestrator pipeline (orchestrator.js) coordinating ticket retrieval, stateless idempotency, date validation, geocoding, tiered weather retrieval, recommendation evaluation, note posting, and tag management
- Phase 7: Wired processTicketWebhook into POST /webhook/service-request with immediate HTTP 202 response and background execution
- Phase 7: Extended webhook payload parsing to support ticketId, ticket_id, and nested freshservice_webhook wrappers
- Phase 7: Comprehensive unit test suite for orchestrator covering idempotency skips, fallback notes, and Tier 1/2/3 pipelines
- Phase 6: Freshservice REST API v2 client (client.js) with Basic Auth (apiKey:X) and 429 rate limit backoff
- Phase 6: Flexible custom fields extractor for requested items accommodating arbitrary suffixes
- Phase 6: Ticket tag read-merge-write update preventing tag clobbering
- Phase 6: Tag-based stateless idempotency check (weather-brief-posted) adhering to ADR-005
- Phase 6: Note posting with automatic multipart fallback on HTTP 400 validation error
- Phase 6: Empirical testing document for note posting formats in samples/note-posting-test-result.md
- Phase 6: Unit test suite for Freshservice client with 97%+ coverage
- Phase 5: Safe HTML sanitisation utility (sanitise.js) escaping dangerous characters
- Phase 5: Deterministic weather recommendation engine (recommender.js) evaluating Heat, Cold, Rain, Storm/Wind, High UV, and Pleasant conditions
- Phase 5: Composite risk scoring (0-100), verdict calculation (Go, Go with caution, Reconsider), priority ordering, and Freshservice risk tagging (weather-risk-low, weather-risk-medium, weather-risk-high)
- Phase 5: Personalisation layers (personaliser.js) with trip-type tailoring, budget-tier adjustments, and special-needs keyword awareness
- Phase 5: HTML trip brief note builder (note-builder.js) producing formatted Freshservice conversation notes with Open-Meteo and GeoNames attribution, fallback notices, and date validation alerts
- Phase 5: Mock-free unit test suite for recommender, personaliser, and note-builder achieving 97%+ line coverage
- Phase 4: Open-Meteo Geocoding client with retry logic and formatted place resolution
- Phase 4: Tier 1 Forecast (16 days), Tier 2 Seasonal (forecast_months=6), and Tier 3 Current weather API clients
- Phase 4: Weather tier selector adhering to ADR-004 and FORECAST_MAX_DAYS (14) / SEASONAL_MAX_DAYS (180)
- Phase 4: WMO weather code mapper (wmo-codes.js) and WeatherData normaliser for internal shape
- Phase 4: Mock-free unit tests for WMO codes, tier selection, and normalisation
- Phase 4: Live contract test suite (npm run test:live) testing real Open-Meteo APIs and 14-day boundary
- Phase 3: Pure date validation functions (date-rules.js) with deterministic calendar horizon calculations
- Phase 3: Exact error strings enforcing R-20 ("Travel Date cannot be in the past.") and R-21 ("Travel Date must be within the next 12 months.")
- Phase 3: Boundary unit tests for past dates, today (R-22), exactly 12 months (R-23), >12 months, leap year (Feb 29 -> Feb 28), and format validation
- Phase 1: docs/01-requirements-analysis.md - full requirements table, date rules, assumptions
- Phase 1: docs/references.md - all sources with retrieval dates and live-call findings
- Phase 1: docs/02-architecture.md - Mermaid sequence diagram, component map, data shapes
- Phase 1: ADR-001 through ADR-009 in docs/adr/
- Phase 1: Live-tested Open-Meteo Forecast (16 days, effective 14), Geocoding, and Seasonal APIs
- Phase 0: Repository bootstrap - .gitignore, LICENSE, README, .editorconfig
- Phase 0: Directory skeleton with .gitkeep placeholders
- Phase 0: .env.example with all required environment variables
- Phase 0: ESLint flat config (eslint.config.js) for Node.js 24
- Phase 0: Prettier config (.prettierrc.json, .prettierignore)
- Phase 0: CONTRIBUTING.md with workflow, conventions and code standards
- Phase 0: CHANGELOG.md (this file)
- Phase 0: Pull request template
- Phase 0: GitHub Issue templates (bug report, feature request, manual step)
- Phase 0: GitHub Actions CI skeleton workflow
- Phase 0: No-emoji check script in scripts/

---

## [0.1.0] - 2026-09-30

### Added
- Phase 2: Express middleware skeleton with Node.js 24 runtime engines and lockfile
- Phase 2: Configuration loader with startup validation and named weather thresholds
- Phase 2: Structured JSON logger with Pino-compatible interface and correlation IDs
- Phase 2: HTTP Basic authentication middleware using timing-safe comparison (timingSafeEqual)
- Phase 2: GET /health and GET /ready probe endpoints with helmet security headers
- Phase 2: POST /webhook/service-request stub returning immediate HTTP 202 Accepted
- Phase 2: Rate limiting (60 RPM) and 1kb strict JSON body parsing
- Phase 2: Multi-stage non-root Dockerfile pinned to node:24.21.0-bookworm-slim with healthcheck
- Phase 2: Mock-free unit test suite with 92%+ coverage using node:test
- Phase 2: UTF-8 BOM resolution in check-no-emoji script for CI

## [0.2.0] - 2026-09-30

### Added
- Phase 8: Pre-demo warm-up script (scripts/warmup.js) preventing Render free-tier cold-start timeouts
- Phase 8: Webhook simulator CLI (scripts/simulate-webhook.js) testing end-to-end webhook latency and formats
- Phase 8: Scenario evaluation runner (scripts/run-demo-scenarios.js) demonstrating all 4 review call scenarios locally
- Phase 8: Complete presentation runbook and defense script in docs/03-demo-guide.md
- Phase 8: Modern ESLint flat config tuning for Node 24 web standard globals

## [1.0.0] - 2026-09-30

### Added
- Phase 9: Render Infrastructure-as-Code blueprint (render.yaml) for 1-click deployment
- Phase 9: Production deployment guide in docs/04-deployment-guide.md
- Phase 10: Freshservice tenant configuration manual and business rules runbook in docs/05-freshservice-configuration-guide.md
- Phase 11: Comprehensive root README.md with sequence diagram, quickstart, and evaluation matrix
- Phase 11: Known limitations and architectural trade-offs in docs/known-limitations.md
- Phase 11: 100% clean test suite with 123 unit tests (93%+ coverage), zero lint errors, and zero emojis

---

[Unreleased]: https://github.com/ChilliRoger/haass-pro/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ChilliRoger/haass-pro/releases/tag/v0.1.0

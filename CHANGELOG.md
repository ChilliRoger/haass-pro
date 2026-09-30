# Changelog

All notable changes to haass-weather-travel are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
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

## [0.2.0] - TBD

Tag applied after Phase 8 (demo tooling) is complete.

## [1.0.0] - TBD

Tag applied after Phase 11 (demo readiness) is complete.

---

[Unreleased]: https://github.com/ChilliRoger/haass-pro/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ChilliRoger/haass-pro/releases/tag/v0.1.0

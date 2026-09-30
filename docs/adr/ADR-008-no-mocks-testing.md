# ADR-008: No-Mocks Testing Strategy

Status: Accepted
Date: 2026-09-30
Deciders: Project team

## Context

Testing weather integrations is typically done with saved API responses or mock HTTP servers.
The project brief explicitly prohibits this approach.

## Decision

Three testing tiers are used, none of which use mocks, stubs, fakes or fixtures:

1. Unit tests (npm test): Pure functions tested with plain literal inputs (dates as arguments,
   weather objects as plain data literals). No HTTP calls, no fake servers.

2. Live contract tests (npm run test:live): Hit the real Open-Meteo APIs and assert on
   response structure and invariants only (e.g. temperature is a number, time array is
   non-empty). Never assert on specific values. Run in a separate CI job so upstream
   outages are visible and do not silently pass.

3. Manual e2e (npm run e2e): Creates a real service request on the Freshservice tenant via
   the API, waits for the workflow, then asserts that the note and tags exist. Runs locally
   only with credentials from .env. Never run in CI.

## Rationale

- The no-mocks policy ensures tests fail when external APIs change their schema.
- Pure function unit tests are inherently deterministic without any mocking needed.
- The separation of live tests into a separate CI job makes upstream outage visibility explicit.

## Consequences

- Live contract tests require network access during CI. They are allowed to fail due to
  Open-Meteo rate limits or outages without failing the main CI pipeline.
- The e2e test requires a live Freshservice tenant and credentials; it is never automated.

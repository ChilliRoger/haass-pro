# ADR-001: Middleware Approach

Status: Accepted
Date: 2026-09-30
Deciders: Project team

## Context

Freshservice Workflow Automator can call external HTTP endpoints via the Trigger Webhook or
Web Request node. The business logic (weather lookup, recommendation generation, note posting)
must run outside Freshservice because Freshservice has no native code execution environment.

## Decision

Implement a stateless Node.js 24 Express middleware hosted on Render. The middleware receives
a webhook from Freshservice with only the ticket id, fetches all form data via the Freshservice
REST API, calls Open-Meteo, runs the recommendation engine, and posts the result back via the
API. The webhook returns 202 immediately; all processing is asynchronous.

## Rationale

- Freshservice's own workflow cannot execute arbitrary code or make multi-step API calls.
- A dedicated middleware keeps Freshservice configuration simple (one webhook call with just the id).
- Async processing after 202 ensures we never exceed the 15-second webhook timeout.
- Stateless design allows Render free-tier hosting with no persistent disk.

## Consequences

- Cold-start on Render free tier causes the first webhook call to timeout after idle; Freshservice
  retries at 3 minutes. Demo warm-up procedure required.
- The middleware must be idempotent (tag-based) because Freshservice retries up to 4 times.

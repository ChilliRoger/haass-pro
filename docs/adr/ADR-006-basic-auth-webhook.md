# ADR-006: HTTP Basic Auth on the Webhook Endpoint

Status: Accepted
Date: 2026-09-30
Deciders: Project team

## Context

The middleware exposes a public HTTPS endpoint that receives POST requests from Freshservice.
We must ensure only Freshservice (not arbitrary callers) can trigger processing.

## Decision

Use HTTP Basic authentication on POST /webhook/service-request. The username and password
are stored in environment variables (WEBHOOK_AUTH_USER, WEBHOOK_AUTH_PASS). Comparison uses
Node.js crypto.timingSafeEqual to prevent timing attacks. Freshservice Workflow Automator
supports Basic auth on the Trigger Webhook action.

## Rationale

- Basic auth over HTTPS is well-supported by Freshservice's webhook action natively.
- Constant-time comparison prevents brute-force credential discovery via timing.
- A shared-secret header (e.g. X-Webhook-Secret) would be preferred but Freshservice's
  documented Trigger Webhook action does not guarantee custom header support. This is a
  MANUAL STEP to verify on the tenant (see Phase 10, Section 10 checklist item 1).
- If the tenant's Web Request node does support custom headers, we will switch to a
  shared-secret header and document the change.

## Consequences

- The WEBHOOK_AUTH_PASS must be a strong random secret (minimum 32 characters).
- Unauthorised requests receive 401 and are logged at warn level with no sensitive detail.

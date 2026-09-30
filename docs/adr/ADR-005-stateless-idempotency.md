# ADR-005: Stateless Idempotency via Ticket Tags

Status: Accepted
Date: 2026-09-30
Deciders: Project team

## Context

Freshservice retries failed or timed-out webhooks up to 4 times (at 3, 5, 9 and 17 minutes).
A cold-start on Render free tier guarantees at least one timeout for the first post-idle call.
We must ensure duplicate webhook deliveries do not result in multiple notes on the same ticket.

## Decision

Use Freshservice ticket tags as a stateless idempotency marker. Before processing any ticket:
1. GET the ticket and read its current tags.
2. If the tag "weather-brief-posted" is present, stop immediately (duplicate delivery).
3. After successfully posting the note, PUT the tags list including "weather-brief-posted"
   and the appropriate risk tag ("weather-risk-low", "weather-risk-medium", or "weather-risk-high").

## Rationale

- Render free tier has no persistent disk, so a database or file-based store is not viable.
- Tag-based idempotency uses Freshservice itself as the state store, which is always consistent.
- Read-modify-write on tags is required because the PUT /tags API replaces the entire list.
- This approach adds no external dependencies.

## Consequences

- A small race condition exists if two webhook deliveries arrive simultaneously (unlikely in
  practice given the retry schedule). This is documented in known-limitations.md.
- Tags must be read before every write to avoid losing existing tags.

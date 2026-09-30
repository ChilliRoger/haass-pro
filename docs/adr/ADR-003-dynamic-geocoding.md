# ADR-003: Dynamic Geocoding Instead of Static City List

Status: Accepted
Date: 2026-09-30
Deciders: Project team

## Context

The Destination City field is a plain text input. We need to convert city names to
coordinates (latitude, longitude, timezone) for the weather API calls.

## Decision

Use the Open-Meteo Geocoding API at runtime for every request. Take the first result.
Print the resolved name, admin1, and country in the ticket note so agents can spot a wrong match.

## Rationale

- A static list would be a bundled data fixture violating the no-mocks policy.
- Runtime geocoding handles any city the requester types, not just a predefined set.
- Open-Meteo Geocoding is free, no-key, and returns timezone (required by the forecast API).
- The first-result approach is simple and auditable; the resolved place appears in the note.

## Consequences

- If the city is not found (empty results), a fallback note is posted and processing stops.
- Geocoding is a separate call before the weather call; the requirement of ONE weather call
  per request is preserved (geocoding is a separate lookup step, disclosed in docs and demo).
- Ambiguous city names (e.g. "Springfield") resolve to the highest-population match.

# ADR-004: Single Weather Call with Date Tiers

Status: Accepted
Date: 2026-09-30
Deciders: Project team

## Context

The project requires ONE weather API call per request. Travel dates can range from today to
12 months from today. No single Open-Meteo endpoint covers the full range.

## Decision

Select the endpoint based on days from today:
- Tier 1 (0-FORECAST_MAX_DAYS days): Forecast API with daily variables.
- Tier 2 (FORECAST_MAX_DAYS+1 to SEASONAL_MAX_DAYS days): Seasonal API.
- Tier 3 (SEASONAL_MAX_DAYS+1 days onward): Forecast API with current= parameter only.

FORECAST_MAX_DAYS = 14 (live-tested).
SEASONAL_MAX_DAYS = 180 (live-tested).

## Rationale

- The brief explicitly requires exactly one weather call per request.
- Tier selection is transparent; the confidence label in the note tells the agent and
  requester which endpoint was used and how reliable the data is.
- Tier 3 is honest: for dates beyond the seasonal range, we use current conditions as a
  proxy and label the note "Current conditions only, not a prediction".

## Consequences

- Dates in tier 3 (> 6 months out) receive a note based on current conditions only.
  This is explicitly disclosed in the confidence label and documented in known-limitations.md.
- The seasonal API (tier 2) has no UV index or precipitation probability. These are null in
  the normalised shape and excluded from tier-2 recommendation logic.

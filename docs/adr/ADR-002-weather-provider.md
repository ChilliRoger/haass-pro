# ADR-002: Weather Provider (Open-Meteo)

Status: Accepted
Date: 2026-09-30
Deciders: Project team

## Context

We need a weather API that:
- Requires no API key (to avoid credential management for the demo)
- Provides forecast, seasonal, and current-conditions data
- Is free for non-commercial use
- Supports daily aggregates including temperature, precipitation, UV, and wind

## Decision

Use Open-Meteo as the sole weather provider:
- Forecast (tier 1): api.open-meteo.com/v1/forecast
- Seasonal (tier 2): seasonal-api.open-meteo.com/v1/seasonal
- Current conditions (tier 3): api.open-meteo.com/v1/forecast?current=...

## Rationale

- Open-Meteo is free, no-key, with a CC BY 4.0 license (attribution required).
- It provides all variables needed (temp, feels-like, rain probability, UV, wind).
- OpenWeatherMap One Call 3.0 requires a credit card even for the free tier; ruled out.
- A single provider simplifies the interface and avoids managing multiple API keys.

## Consequences

- Rate limit: 10,000 calls/day, 5,000/hr, 600/min per IP. At 1 call per request, this is
  far above any realistic demo load.
- Attribution to Open-Meteo and GeoNames is required in README and ticket notes.
- Seasonal API provides ensemble mean values but no UV index or rain probability (null-safe in normaliser).
- CMIP6 Climate API must never be used for trip advice (it is a long-term projection, not weather).

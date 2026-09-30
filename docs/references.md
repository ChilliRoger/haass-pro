# References

Purpose: Record every external source consulted for this project with retrieval date and any
discrepancy found versus what the project brief described.
Scope: All sources in Section 2 of the project brief, plus live API calls made during Phase 1.
Last verified: 2026-09-30

---

## 1. Freshservice REST API v2

URL: https://api.freshservice.com/
Retrieval date: 2026-09-30

### Verified facts (confirming the brief)

- Authentication: HTTP Basic with the API key as username and any dummy string as password.
  HTTPS only, JSON only, works via freshservice.com domain (not custom CNAMEs). Confirmed.
- Rate limits per account per minute: Starter 100, Growth 200, Pro 400, Enterprise 500.
  A 429 response carries a Retry-After header. Invalid requests still count. Confirmed.
- Ticket status integer values: Open = 2, Pending = 3, Resolved = 4, Closed = 5. Confirmed.
- Tag updates replace the whole tag list; always read existing tags before writing. Confirmed.
- Add a note: POST /api/v2/tickets/{id}/notes. Fields: body (HTML), private (bool, default
  true so set false for public), incoming (bool), notify_emails (array), user_id. Confirmed.
  NOTE: Community reports of invalid_field when posting JSON; multipart fallback must be
  implemented and tested (MANUAL STEP - Phase 6).
- Read form values: GET /api/v2/tickets/{id}/requested_items returns each requested item with
  a custom_fields object. Field keys may carry a numeric suffix. Do not hardcode. Confirmed.
- Error codes: 400 (validation: missing_field, invalid_value, invalid_field, datatype_mismatch),
  401 invalid_credentials, 403 access_denied, 404, 409, 429, 500. Confirmed.
- Create a Service Request: POST /api/v2/service_requests. Used by the e2e script to create a
  real SR on the tenant. Confirmed.

### Discrepancies vs. brief

- The brief says "one community thread reported invalid_field on JSON and switched to multipart
  form-data". This is a community observation, not API documentation. The official docs show
  JSON only. We will test JSON first and implement multipart as a fallback, documenting the
  result in samples/note-posting-test-result.md after Phase 6 live testing.

---

## 2. Freshservice Webhooks (Workflow Automator)

URL: https://support.freshservice.com/support/solutions/articles/157143-using-webhooks-with-the-workflow-automator
Retrieval date: 2026-09-30

### Notes

The page returned the Freshservice support portal navigation but the article content was
not fully accessible via the read_url_content fetch (JavaScript-rendered portal). The brief's
summary of the webhook behaviour is treated as the authoritative description and will be
verified manually during Phase 10 configuration.

Key points from the brief (to be verified on tenant):
- Action "Trigger Webhook": request type, callback URL, encoding (JSON/XML/URL-encoded),
  content (Simple or Advanced). Optional Basic auth or API key auth. No custom header option
  documented.
- Simple content carries ticket form fields only; service item custom fields require Advanced JSON.
- Placeholders may break JSON body when they contain HTML; use description_text not description.
- Ticket id placeholder may include a type prefix such as SR; middleware must strip trailing digits.
- 15-second response timeout; retried up to 4 times at 3, 5, 9 and 17 minutes on failure.
- 1000 webhook calls per hour.

MANUAL STEP: During Phase 10, verify whether the Web Request node or Trigger Webhook node
supports custom request headers (beyond Basic auth). If yes, switch webhook auth to
shared-secret header.

---

## 3. Freshservice Web Request Node

URL: https://support.freshservice.com/support/solutions/articles/50000003705-web-request-node
Retrieval date: 2026-09-30
Status: Page not fully accessible via fetch (JavaScript portal). Treating brief summary as
authoritative. Will be verified manually in Phase 10.

Key note: The Web Request node has monthly transaction limits (300,000 Starter/Growth;
720,000 Pro/Enterprise). The Trigger Webhook node has a per-hour limit (1000/hr). For this
project, either node is acceptable; the choice will be documented in Phase 10 config docs.

---

## 4. Freshservice Business Rules for Forms

URL: https://support.freshservice.com/support/solutions/articles/50000002728-create-no-code-dynamic-forms-with-business-rules
Retrieval date: 2026-09-30
Status: JavaScript portal; not fully accessible via fetch. Brief summary treated as
authoritative. Confirmed against Freshservice admin UI in Phase 10.

Key points (from brief, to verify):
- Path: Admin > Service Management > Service Desk Settings > Business Rules for Forms
- Service item form type; pick category; rule name; Applies To; Execute On; conditions; actions.
- Actions: show/hide, mandate/non-mandate, enable/disable, set/remove options, Validate Form
  on Submission with custom error message.
- 25 rules per service item limit.
- Auto Reverse if False recommended.
- Business rules do NOT run for changes made by workflow automation.
- Relative and dynamic date conditions supported (extent of support is a MANUAL STEP).

---

## 5. Freshservice Hierarchical Approvals

URL: https://support.freshservice.com/support/solutions/articles/211198-setting-hierarchical-approvals-for-service-requests-and-change-requests
Retrieval date: 2026-09-30
Status: JavaScript portal; not fully accessible via fetch. Brief summary treated as authoritative.

Key points: Workflow Automator uses "Send approval mail to Reporting Manager" or the newer
Request Approval node. Has Approved and Reject branches. Rejection branch can close the
request and send an email. Approval modes: Everyone, Majority, Any, First Responder.

---

## 6. Freshservice Customising Helpdesk Statuses

URL: https://support.freshservice.com/support/solutions/articles/156452-customizing-helpdesk-statuses
Retrieval date: 2026-09-30
Status: JavaScript portal; not fully accessible via fetch. Brief summary treated as authoritative.

Key points: SLA timers are driven by ticket status. Open timer cannot be changed. Resolved
and Closed are always off. Pending and custom statuses can have the timer switched off.
Custom status "Awaiting Approval" (timer off) implements the SLA pause. Configured at
Admin > Service Management > Helpdesk Settings > Field Manager > Status field.

MANUAL STEP (Phase 10f): Verify that the tenant has a toggleable SLA-timer status or create
one, and that the workflow can set it.

---

## 7. Open-Meteo Forecast API

URL: https://open-meteo.com/en/docs
Retrieval date: 2026-09-30
Live test: GET https://api.open-meteo.com/v1/forecast with latitude=51.5085, longitude=-0.1257,
  forecast_days=16, daily variables, timezone=auto
  Result: HTTP 200 returned. 16 entries in the time array; indices 14 and 15 (days 15 and 16)
  had null values for most variables on the 2026-09-30 call. Effective horizon verified at
  approximately 14 days (days indexed 0-13 had data).

### Confirmed facts

- Endpoint: GET https://api.open-meteo.com/v1/forecast
- Parameters: latitude, longitude, daily (comma-separated variable names), timezone (auto works),
  forecast_days (up to 16), start_date and end_date (yyyy-mm-dd, optional)
- Confirmed daily variable names (from live response daily_units):
    weather_code (wmo code)
    temperature_2m_max (degrees C)
    temperature_2m_min (degrees C)
    apparent_temperature_max (degrees C)
    precipitation_sum (mm)
    precipitation_probability_max (%)
    wind_speed_10m_max (km/h)
    wind_gusts_10m_max (km/h)
    uv_index_max (dimensionless)
- Errors: HTTP 400 with JSON {"error": true, "reason": "..."}

### Discrepancies vs. brief

- The brief states "up to 16 forecast days". Confirmed but days 15-16 may be null.
  FORECAST_MAX_DAYS = 14 is the safe constant to use.
- The brief mentions "mean/max relative humidity (confirm exact names)". The live response
  daily_units did NOT include any humidity variable in the default daily variable set when
  requesting the listed variables. Humidity variables exist (e.g. relative_humidity_2m_max
  as an hourly variable) but are NOT available as daily aggregates in the standard forecast
  endpoint without explicit request. Decision: humidity is NOT included in tier-1 variables
  for this project. The normalised shape has a null-safe feelsLikeC from apparent_temperature_max
  as a proxy for combined heat/humidity effect.

---

## 8. Open-Meteo Geocoding API

URL: https://open-meteo.com/en/docs/geocoding-api
Retrieval date: 2026-09-30
Live test: GET https://geocoding-api.open-meteo.com/v1/search?name=London&count=1&language=en
  Result: HTTP 200. Full response:
  {"results":[{"id":2643743,"name":"London","latitude":51.50853,"longitude":-0.12574,
  "elevation":25.0,"feature_code":"PPLC","country_code":"GB","admin1_id":6269131,
  "admin2_id":2648110,"timezone":"Europe/London","population":8961989,"country_id":2635167,
  "country":"United Kingdom","admin1":"England"}],"generationtime_ms":1.2}

### Confirmed facts

- Endpoint: GET https://geocoding-api.open-meteo.com/v1/search
- Parameters: name, count, language, countryCode (optional)
- Returns: id, name, latitude, longitude, elevation, timezone, country_code, country, admin1,
  population
- Data source: GeoNames (attribution required in README and note)
- Take the first result; if results array is empty, post a fallback note

### Discrepancies vs. brief

- None. The brief accurately describes the response shape.

---

## 9. Open-Meteo Seasonal Forecast API

URL: https://open-meteo.com/en/docs/seasonal-forecast-api
Retrieval date: 2026-09-30
Live test: GET https://seasonal-api.open-meteo.com/v1/seasonal?latitude=51.5085&longitude=-0.1257
  &daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,
  wind_speed_10m_max,weather_code&timezone=auto&forecast_months=3
  Result: HTTP 200. Data returned from 2026-09-30 to 2027-03-31 (approximately 6 months).

### Confirmed facts

- Endpoint: GET https://seasonal-api.open-meteo.com/v1/seasonal
- Parameters: latitude, longitude, daily, timezone, forecast_months (not start_date/end_date;
  use forecast_months to control the range)
- IMPORTANT: forecast_months=3 returned data through 2027-03-31 (~6 months), not 3 months.
  The actual horizon for forecast_months=6 is expected to be the full EC SEAS5 range.
  SEASONAL_MAX_DAYS = 180 is the safe constant.
- The response contains aggregate fields (e.g. temperature_2m_max) which are ensemble means
  across 50 member runs (member01..member50). Use the aggregate field (no member suffix).
- Confirmed daily variable names: temperature_2m_max, temperature_2m_min, temperature_2m_mean,
  precipitation_sum, wind_speed_10m_max, weather_code
- UV index is NOT available. precipitation_probability_max is NOT available.
  These fields will be null in the tier-2 normalised shape.
- Models: EC SEAS5 (Copernicus), seasonal outlooks only, not bias-corrected.

### Discrepancies vs. brief

- The brief says "up to about 7 months (EC46 for 46 days, SEAS5 to 7 months)". Live test with
  forecast_months=3 returned data to 2027-03-31 which is approximately 6 months from today
  (2026-09-30). Will use SEASONAL_MAX_DAYS = 180 as a conservative safe constant.
- The brief says "confirm variable names and date parameters". Confirmed: the parameter is
  forecast_months (not start_date/end_date). Variable names confirmed above.
- The brief does not mention that the response includes 50 ensemble member columns. The
  aggregate (mean across members) uses the base variable name without a member suffix.

---

## 10. Open-Meteo Terms of Service

URL: https://open-meteo.com/en/terms
Retrieval date: 2026-09-30

### Confirmed facts

- Free tier: non-commercial use; up to 10,000 calls per day, 5,000 per hour, 600 per minute
- License: CC BY 4.0 (attribution required)
- GeoNames data in the geocoding API also requires attribution
- They may block abusive IPs; retry with backoff is required

### Attribution text for README and ticket notes

Weather data: Open-Meteo (https://open-meteo.com/) - CC BY 4.0
Geocoding data: GeoNames via Open-Meteo Geocoding API (https://geocoding-api.open-meteo.com/)

---

## 11. Render Free Tier

URL: https://render.com/docs/free#spinning-down-on-idle
Retrieval date: 2026-09-30
Status: Page partially accessible; content confirmed the spin-down behaviour.

### Confirmed facts

- Free web services spin down after approximately 15 minutes of inactivity.
- First request after idle can take 50 seconds or more to respond.
- Freshservice webhook timeout is 15 seconds.
- First cold-start webhook attempt will always fail; retry lands 3 minutes later.
- Mitigation: hit /health a few minutes before the demo to warm up the service.
- No persistent disk on the free plan. Confirmed; stateless design is mandatory.

---

## 12. Live API Calls Made During Phase 1

| Call | URL (abbreviated) | Date | Result |
|------|------------------|------|--------|
| Geocoding | /v1/search?name=London&count=1 | 2026-09-30 | HTTP 200, confirmed shape |
| Forecast 16d | /v1/forecast?...forecast_days=16 | 2026-09-30 | HTTP 200, days 14-15 null |
| Seasonal 3m | /v1/seasonal?...forecast_months=3 | 2026-09-30 | HTTP 200, data to 2027-03-31 |
| Forecast with start+end date | /v1/forecast?...start_date=...&end_date=... | 2026-09-30 | HTTP 400; start/end date must be within forecast_days range |

### Finding: start_date/end_date with future dates beyond the forecast window returns 400

When start_date and end_date are used, they must fall within the data the forecast model has
available. Requesting a specific date beyond the 14-day horizon returns 400. Use forecast_days
to control the window; do not use start_date/end_date for the forecast API.

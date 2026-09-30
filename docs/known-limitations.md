# Known Limitations & Architecture Trade-offs

This document explicitly details known limitations, architectural trade-offs, and mitigations in the Weather-Based Travel Recommendation middleware implementation.

---

## 1. Render Free Tier Spin-Down & Cold Starts

### Limitation
Render free-tier instances spin down after 15 minutes of inactivity. When a request arrives on a sleeping instance, the spin-up process takes 30-50 seconds before the server responds.

Freshservice Workflow Automator webhooks enforce an unconfigurable 15-second response timeout. If a webhook triggers while the service is cold, Freshservice will time out on the first attempt.

### Mitigation
1. **Automated Freshservice Retries:** Freshservice automatically retries failed or timed-out webhooks at 3, 5, 9, and 17 minutes. The retry attempt at 3 minutes succeeds once the instance has warmed up.
2. **Pre-Demo Warm-Up Script:** For live evaluation calls, run `node scripts/warmup.js <URL>` 10 minutes prior to ensure the container is warm and responds in <100ms.
3. **Stateless Idempotency:** The tag-based idempotency marker (`weather-brief-posted`) ensures that retried deliveries do not duplicate ticket notes.

---

## 2. Stateless Tag-Based Idempotency Race Condition

### Limitation
Because the middleware is stateless and has no external database or distributed locking mechanism, idempotency relies on reading the ticket's current tags via `GET /api/v2/tickets/{id}`.

If two webhook requests for the same ticket were processed concurrently within the same 500ms window, both could read the ticket before either posts the tag, potentially resulting in two notes.

### Mitigation
- In practice, Freshservice retries are spaced by minutes (3, 5, 9, 17 min), making simultaneous deliveries virtually impossible under normal workflow operation.
- In enterprise environments requiring strict distributed mutual exclusion, an external Redis or PostgreSQL lease lock can be inserted prior to processing.

---

## 3. Dynamic Geocoding First-Match Resolution

### Limitation
When a requester inputs an ambiguous city name (e.g., "Springfield" or "Cambridge"), the Open-Meteo Geocoding API returns multiple geographic matches ordered by population. The middleware selects the first result (highest population).

### Mitigation
- The resolved place name (including admin region and country, e.g., "Cambridge, England, United Kingdom") is explicitly printed in the header of the ticket note.
- If the resolved location is incorrect, the travel desk agent can spot the discrepancy immediately and re-verify with the requester.
- If no match is found, the middleware posts a fallback note and does not halt ticket processing silently.

---

## 4. Open-Meteo 14-Day Standard Forecast Boundary

### Limitation
Standard numerical weather prediction models (ECMWF, GFS) lose daily predictability beyond 14 days. Open-Meteo returns null values for days 15 and 16.

### Mitigation
- We designed and implemented a **3-Tier Horizon Selector** (ADR-004):
  - **Tier 1 (0-14 days):** Daily standard forecast with high confidence.
  - **Tier 2 (15-180 days):** Seasonal ensemble climate outlook with medium confidence.
  - **Tier 3 (181+ days):** Current climate baseline with indicative confidence.
- Each ticket note explicitly labels the horizon tier and confidence level to ensure transparency.

---

## 5. Freshservice Custom Status Tenant Differences

### Limitation
Tenants with different Freshservice subscription plans (Starter vs Growth vs Pro) have varying permissions for custom ticket statuses (such as creating an "Awaiting Approval" status with SLA pause).

### Mitigation
- Documented in `docs/05-freshservice-configuration-guide.md` as an optional configuration step. If the tenant does not support custom statuses, standard "Pending" status (which also pauses SLA) can be used.

# 01 - Requirements Analysis

Purpose: Translate the project brief into an auditable record of every requirement, every
ambiguity, and every assumption made before a line of code was written.
Scope: Freshservice catalog item, form rules, validation, integration, approval, SLA, tasks,
email notifications, and middleware engineering standards.
Last verified: 2026-09-30

---

## 1. Service Catalog Item

| # | Requirement | Source |
|---|-------------|--------|
| R-01 | Catalog item named exactly "Weather-Based Travel Recommendation" | Brief S1 |
| R-02 | Field: Destination City - text search (plain text, geocoding-validated in middleware) | Brief S1 |
| R-03 | Field: Travel Date - date picker | Brief S1 |
| R-04 | Field: Trip Type - dropdown with values Vacation, Business, Adventure | Brief S1 |
| R-05 | Field: Budget Range - dropdown with values Low, Medium, High | Brief S1 |
| R-06 | Field: Special Needs? - Yes/No toggle | Brief S1 |
| R-07 | Field: Notes - paragraph (multi-line text), conditionally visible | Brief S1 |

---

## 2. Dynamic Form Rules

| # | Rule | Trigger | Action |
|---|------|---------|--------|
| R-10 | BR-WTR-01 | Destination City is empty | Hide Travel Date, Trip Type, Budget Range, Special Needs?, Notes |
| R-11 | BR-WTR-02 | Special Needs = Yes AND Destination City is not empty | Show Notes |
| R-12 | Notes remains hidden while city is empty (R-10 takes precedence via rule ordering) | - | - |
| R-13 | Auto Reverse if False enabled on all rules | Brief S1, Freshservice docs |
| R-14 | Execute On: New Form (requester-facing; field must be displayed and requester-editable) | Freshservice docs |

---

## 3. Date Validation Business Rules

| # | Condition | Exact Error Text |
|---|-----------|-----------------|
| R-20 | Travel Date < today | "Travel Date cannot be in the past." |
| R-21 | Travel Date > 12 months from today | "Travel Date must be within the next 12 months." |
| R-22 | Travel Date = today | Valid (no error) |
| R-23 | Travel Date = exactly 12 months from today | Valid (no error) |

---

## 4. Integration - Weather API

| # | Requirement |
|---|-------------|
| R-30 | ONE call to a third-party weather API per request submission |
| R-31 | Use Open-Meteo Forecast API (tier 1: 0-14 days), Seasonal API (tier 2: 15 days to ~6 months), or current conditions (tier 3: beyond ~6 months) |
| R-32 | If forecast data exists for the date, use forecast; otherwise use current weather |
| R-33 | Parse temperature, rain chance, UV index, and wind from the response |
| R-34 | Generate ONE recommendation string and post it as a public note on the ticket |
| R-35 | Middleware must return HTTP 202 within 15 seconds; process asynchronously |

---

## 5. Recommendation Examples (minimum bar; creativity graded)

- "Expect sunny skies - perfect for outdoor sightseeing!"
- "High chance of rain - carry an umbrella and plan indoor activities."
- "Hot temperatures - stay hydrated and avoid long outdoor walks."

The WOW Feature (Section 12 of brief) adds a Risk Score, trip-type and budget tailoring,
special-needs awareness, a packing list, and a confidence label. See docs/02-architecture.md.

---

## 6. Approval Flow

| # | Condition | Action |
|---|-----------|--------|
| R-40 | Budget Range = High | Send approval request to requester's reporting manager |
| R-41 | Budget Range = Low or Medium | No approval; proceed directly to fulfillment |
| R-42 | Approver approves | Continue workflow |
| R-43 | Approver rejects | Close request immediately with rejection status; send exact email text |

Exact rejection email text: "Your travel recommendation request has been rejected."

---

## 7. SLA

| # | Requirement |
|---|-------------|
| R-50 | SLA timer pauses while awaiting approval (status: Awaiting Approval or equivalent, timer off) |
| R-51 | SLA timer resumes after approval (status returns to Open) |
| R-52 | SLA pause is only meaningful on the Budget = High path |

---

## 8. Group Assignment (post-approval or immediately for Low/Medium)

| Trip Type | Agent Group |
|-----------|-------------|
| Vacation | Leisure Travel Team |
| Business | Corporate Travel Desk |
| Adventure | Adventure Travel Support |

The three fulfillment tasks are assigned to Travel Desk Support Group (fourth group).

---

## 9. Fulfillment Tasks (auto-created, assigned to Travel Desk Support Group)

| # | Task Title |
|---|-----------|
| T-01 | Check weather conditions for requested travel date |
| T-02 | Generate travel recommendation |
| T-03 | Share recommendation with requester |

---

## 10. Completion

| # | Condition | Action |
|---|-----------|--------|
| R-60 | All three tasks completed | Auto-close the request |
| R-61 | On auto-close | Send exact email text to requester |

Exact completion email text: "Your travel recommendation has been generated successfully. Have a safe trip!"

---

## 11. Assumptions (stated explicitly as assumptions, not facts)

These assumptions resolve gaps in the brief. They must be verified against the tenant before demo.

| # | Assumption | Implication |
|---|-----------|-------------|
| A-01 | Low and Medium budgets skip approval; "post-approval" steps (group assignment, task creation) run immediately after submission | Workflow branches: High gets approval node; Low/Medium bypass it |
| A-02 | The SLA pause is only meaningful on the Budget = High path; Low/Medium tickets remain Open throughout | A custom "Awaiting Approval" status (timer off) is only entered on the High branch |
| A-03 | The parent ticket is routed to the trip-type agent group; the three child tasks are created and assigned to Travel Desk Support Group (a fourth separate group) | Four agent groups must be created in the tenant |
| A-04 | If the weather API fails, is rate-limited, or the city is not found, the middleware posts a fallback note asking the agent to check manually; the ticket is never left silent | Fallback logic is required in every external call path |
| A-05 | "Text Search" for Destination City is a plain text input field in Freshservice; geocoding validation happens in the middleware at request processing time, not on form submission | No Freshservice-native location field type is used |
| A-06 | The Open-Meteo Forecast API effective horizon is approximately 14 days (days 15-16 may return null; verified by live call on 2026-09-30); this is defined as FORECAST_MAX_DAYS = 14 | Tier 1 boundary test must confirm the exact day where null begins |
| A-07 | The Open-Meteo Seasonal API horizon is approximately 6 months (forecast_months=6 accepted; verified as returning data); this is defined as SEASONAL_MAX_DAYS = 180 | Tier 2 covers days 15 to 180 |
| A-08 | The Seasonal API does not return UV index or precipitation probability; these fields are null-safe in the normaliser and excluded from tier-2 recommendations | The normalised shape handles missing fields |
| A-09 | "Rejection status" on a closed Freshservice ticket may be implemented as a custom closed status (e.g. "Rejected") or as a standard Closed status with a resolution note; the exact approach depends on tenant capabilities and is a MANUAL STEP | See Phase 10e |
| A-10 | The middleware uses stateless tag-based idempotency (tag: weather-brief-posted); no database or persistent disk is used; Render free tier has no persistent disk | Re-entrant webhook calls are safe |
| A-11 | The webhook authentication uses HTTP Basic auth; if the tenant's Web Request node supports custom headers, we may switch to a shared-secret header (MANUAL STEP to verify) | Auth secret is stored only in env |
| A-12 | Business rules for forms may not support relative date conditions of "more than 12 months from today" on all tenants; if not supported, the 12-month upper bound is enforced only in the middleware (defence-in-depth) and documented as a known limitation | MANUAL STEP to verify in Phase 10d |
| A-13 | Freshservice natively refuses to close a request that has open tasks; the task-module workflow attempts the close only after all tasks are resolved | WF-WTR-05 design |
| A-14 | The Special Needs field may be implemented as a checkbox (boolean) or a Yes/No dropdown depending on tenant field configuration; the middleware handles both boolean true and string "Yes" as affirmative | Field key discovery must check value type |

---

## 12. Out of Scope

- OpenWeatherMap One Call 3.0 (requires subscription with credit card)
- CMIP6 Climate API (long-term projections, not weather)
- LLM-generated recommendations
- Persistent database or disk storage
- Horizontal scaling (single Render instance)

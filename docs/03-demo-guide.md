# Review Call Demo Guide & Presentation Runbook

This document is the presentation runbook for the Haass.io (Chennai) screening assignment:
**"Weather-Based Travel Recommendation" built on Freshservice.**

Review date: On or before 2 October 2026.
Target duration: 20-30 minutes.

---

## 1. Executive Summary & Evaluation Criteria

| Evaluation Criterion | Implementation Highlights | Demo Proof Point |
|:---|:---|:---|
| **Form Design & Rules** | Service Catalog item with 6 fields; 2 dynamic Business Rules (BR-WTR-01, BR-WTR-02). | Empty city hides dependent fields; checking Special Needs dynamically reveals Notes. |
| **API Integration** | Render-hosted Node.js 24 Express middleware with Basic Auth, 1kb body limit, 60 RPM rate limit, Open-Meteo Forecast, Seasonal, and Geocoding APIs. | Live ticket creation triggers webhook; immediate HTTP 202 Accepted (<100ms); background processing fetches weather and posts back. |
| **Workflow Automation** | Multi-branch Freshservice Workflow Automator with manager approval on High budget, SLA pause, group routing, and automated task generation. | High budget ticket enters approval; Low/Medium tickets proceed directly to fulfillment. |
| **Creativity in Output (WOW Feature)** | 0-100 composite risk scoring, 3-tier horizon selector, trip-type tailoring, budget-tier adjustments, and special-needs accessibility awareness. | Clean, branded HTML ticket note displaying verdict badge, risk score meter, and personalized accessibility cards. |

---

## 2. Pre-Call Checklist (T-15 Minutes)

Execute these steps 15 minutes before the evaluation call starts:

```bash
# 1. Warm up the Render middleware to prevent the 50-second free-tier spin-down
node scripts/warmup.js https://<your-render-app>.onrender.com

# 2. Verify all local tests are green
cd middleware
npm test
npm run check:no-emoji
cd ..

# 3. Open Freshservice Agent Portal in browser
# - Navigate to Service Catalog: "Weather-Based Travel Recommendation"
# - Open Workflow Automator to review workflow nodes
```

---

## 3. Walkthrough Step 1: Freshservice Catalog Configuration

### 3.1 Service Catalog Item Fields

Navigate to **Admin > Service Catalog > Items > Weather-Based Travel Recommendation**:

| Field Label | Field Name / Key | Type | Choices / Validation | Required |
|:---|:---|:---|:---|:---|
| Destination City | `destination_city` | Single Line Text | Mandatory field | Yes |
| Travel Date | `travel_date` | Date Picker | Format `YYYY-MM-DD` | Yes |
| Trip Type | `trip_type` | Dropdown | `Vacation`, `Business`, `Adventure` | Yes |
| Budget Range | `budget_range` | Dropdown | `Low`, `Medium`, `High` | Yes |
| Special Needs? | `special_needs` | Checkbox / Yes-No | Default: Unchecked (No) | No |
| Notes | `notes` | Multi-line Text | Paragraph | No (Conditional) |

### 3.2 Business Rules Verification

Show the Business Rules tab on the catalog item:

1. **BR-WTR-01 (Dependent Field Visibility)**:
   - Condition: `Destination City is empty`
   - Actions: `Hide Travel Date`, `Hide Trip Type`, `Hide Budget Range`, `Hide Special Needs?`, `Hide Notes`.
   - *Demo Action:* Clear the city field. Note how the remaining fields disappear immediately. Type "Tokyo". All fields reveal.

2. **BR-WTR-02 (Conditional Notes Visibility)**:
   - Condition: `Special Needs is checked` AND `Destination City is not empty`
   - Action: `Show Notes`.
   - *Demo Action:* Check "Special Needs?". The "Notes" textarea appears smoothly. Uncheck it; "Notes" hides.

---

## 4. Walkthrough Step 2: Workflow Automator Architecture

Navigate to **Admin > Automation & Productivity > Workflow Automator**:

Show the workflow named **"WF-WTR: Weather Travel Request Orchestration"**:

1. **Trigger Node**:
   - Event: `Service Request is Created`
   - Condition: `Service Item is "Weather-Based Travel Recommendation"`

2. **Action Node 1 (Trigger Webhook)**:
   - Request Type: `POST`
   - Callback URL: `https://<middleware-domain>/webhook/service-request`
   - Authentication: `Basic Auth` (Username: `haass-freshservice`, Password: `<secret>`)
   - Body Format: `JSON`
   - Content: `{ "ticketId": {{ticket.id}} }`
   - *Architecture Note:* The middleware returns `HTTP 202 Accepted` immediately in under 100ms, well within Freshservice's 15-second webhook timeout limit.

3. **Condition Branch Node (Budget Approval Routing)**:
   - Branch A (`Budget Range = High`):
     - Action: Send Approval Request to Requester's Reporting Manager.
     - Status: Set status to `Awaiting Approval` (SLA timer paused).
     - If Approved: Route to Fulfillment.
     - If Rejected: Set status to `Closed` with resolution note: "Travel request rejected by reporting manager."
   - Branch B (`Budget Range = Low` OR `Budget Range = Medium`):
     - Action: Bypass approval; proceed directly to Fulfillment.

4. **Fulfillment Node**:
   - Action: Assign ticket to `Travel Desk` group.
   - Action: Create Sub-Tasks:
     1. "Review Weather Recommendation & Risk Score in Ticket Note"
     2. "Book Transit & Accommodation per Budget Tier"

---

## 5. Walkthrough Step 3: Live Ticket Submission & Scenarios

Demonstrate the 4 canonical scenarios live in Freshservice.

### Scenario 1: Ideal Autumn Vacation (Tier 1 Forecast, Go)
- **Input Values**:
  - Destination City: `Kyoto`
  - Travel Date: `7 days from today` (e.g. October 8, 2026)
  - Trip Type: `Vacation`
  - Budget Range: `Medium`
  - Special Needs: `No`
  - Notes: `Sightseeing ancient shrines and temple gardens.`
- **Expected Outcome**:
  - Webhook returns 202; tags ticket with `weather-brief-posted` and `weather-risk-low`.
  - Public note posted with green `[ VERDICT: GO ]` badge and low risk score (e.g. 0-15 / 100).
  - Forecast shows comfortable temperatures (~22 deg C), clear skies, and walking shoe recommendations.

### Scenario 2: Severe Coastal Storm (Tier 1 Forecast, Reconsider)
- **Input Values**:
  - Destination City: `Miami`
  - Travel Date: `3 days from today`
  - Trip Type: `Adventure`
  - Budget Range: `Medium`
  - Special Needs: `No`
  - Notes: `Kayaking and open coastal excursions.`
- **Expected Outcome**:
  - Tags ticket with `weather-risk-high`.
  - Public note posted with dark red `[ VERDICT: RECONSIDER ]` badge and risk score >70.
  - Storm warning headline, gale-force wind advisory, heavy precipitation caution.

### Scenario 3: Corporate Summit with Approval Trigger (Tier 2 Seasonal, High Budget)
- **Input Values**:
  - Destination City: `Zurich`
  - Travel Date: `75 days from today` (e.g. December 15, 2026)
  - Trip Type: `Business`
  - Budget Range: `High`
  - Special Needs: `No`
  - Notes: `Attending executive summit at conference center.`
- **Expected Outcome**:
  - Tags ticket with `weather-risk-medium`.
  - Selected tier is `Tier 2 Seasonal Outlook (Medium Confidence)`.
  - Workflow triggers Reporting Manager approval email (SLA paused).
  - Note includes High-budget vehicle transfer recommendation to prevent winter transit delays.

### Scenario 4: Accessibility Awareness (Cold Rain + Wheelchair + Senior)
- **Input Values**:
  - Destination City: `London`
  - Travel Date: `10 days from today`
  - Trip Type: `Vacation`
  - Budget Range: `Low`
  - Special Needs: `Yes` (Checked)
  - Notes: `Traveling with elderly parent who uses a wheelchair.`
- **Expected Outcome**:
  - Special orange card appears: **Accessibility and Health Advisory**.
  - Highlights slip risks on wet walkways, step-free access verification, and senior hypothermia precautions.
  - Adds wheelchair device poncho and thermal base layers to the packing checklist.

### Scenario 5: Boundary Validation Handling
- **Input Values**:
  - Destination City: `Paris`
  - Travel Date: `Yesterday's Date` (or date >12 months out)
- **Expected Outcome**:
  - Middleware intercepts invalid date, posts clear Date Validation Notice on ticket:
    `"Travel Date cannot be in the past."` (R-20) or `"Travel Date must be within the next 12 months."` (R-21).
  - Ticket is never left silent.

---

## 6. Technical Architecture Defense

Key questions and talking points for the technical interviewers:

1. **Why use an external middleware instead of calling APIs directly from Freshservice?**
   - Freshservice Web Request nodes cannot chain multiple API calls, parse complex nested weather payloads, normalize WMO codes, or generate styled dynamic HTML notes.
   - The middleware pattern isolates all business logic, keeps the Freshservice workflow clean (one single webhook call), and scales independently.

2. **Why Open-Meteo?**
   - Free tier provides up to 10,000 calls/day and 600/minute without requiring API keys, eliminating key management risk during evaluations.
   - Provides global geocoding, 16-day daily forecasts, and 6-month seasonal ensembles. Attribution to Open-Meteo (CC BY 4.0) and GeoNames is embedded in all notes.

3. **How do you handle the 14-day forecast ceiling?**
   - We implemented a transparent 3-Tier Horizon architecture (ADR-004):
     - Tier 1 (0-14 days): Open-Meteo standard daily forecast. High confidence.
     - Tier 2 (15-180 days): Open-Meteo seasonal ensemble model. Medium confidence.
     - Tier 3 (181+ days): Current climate baseline. Indicative confidence.
   - The note clearly labels the confidence level so travelers are never misled.

4. **How do you handle Freshservice webhook retries?**
   - Freshservice retries webhooks up to 4 times (3, 5, 9, 17 minutes).
   - We implemented stateless tag-based idempotency (ADR-005): before processing, the middleware checks if `weather-brief-posted` is present on the ticket. If found, it skips execution immediately without duplicate notes.

5. **Why deterministic rules instead of an LLM?**
   - 100% predictable, zero hallucinations, instant latency (<50ms execution), zero token costs, and 100% testable via unit tests.

6. **What is your testing strategy?**
   - Follows ADR-008 (No-Mocks Policy):
     - 123 unit tests run with plain literal inputs in <1 second (97%+ coverage).
     - Live contract tests (`npm run test:live`) validate real Open-Meteo API endpoints and the 14-day boundary.

---

## 7. Troubleshooting Playbook

| Symptom | Cause | Remediation |
|:---|:---|:---|
| Webhook timeout on first call | Render free-tier instance was spun down | Hit `/health` using `node scripts/warmup.js`. Freshservice will automatically retry in 3 minutes, or trigger manually from the workflow history. |
| City not found in note | Typo in city name | The middleware posts a clean fallback note asking the agent to check the spelling manually. |
| Duplicate notes on ticket | Idempotency tag missed | The middleware checks `weather-brief-posted` tag. Ensure Freshservice API key has permission to view and update ticket tags. |
| Rate limited by Freshservice | Exceeded 100 calls/min | The Freshservice client automatically reads `Retry-After` header and backs off exponentially. |

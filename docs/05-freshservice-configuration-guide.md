# Freshservice Tenant Configuration Manual

This manual provides the step-by-step configuration instructions for the user configuring the Freshservice UI for the **"Weather-Based Travel Recommendation"** service.

Review date: On or before 2 October 2026.
Tenant URL: `https://<your-tenant>.freshservice.com/`

---

## 1. Step 1: Create the Service Catalog Item

1. Log into Freshservice as an Administrator.
2. Navigate to **Admin > Service Management > Service Catalog**.
3. Select an appropriate category (e.g. **Facilities**, **Corporate Services**, or create **Travel Desk**).
4. Click **Add Item** and set:
   - **Item Name:** `Weather-Based Travel Recommendation` (exact string required)
   - **Description:** `Automated weather intelligence, risk assessment, and personalized packing guidance for business and leisure travel.`
   - **Estimated Delivery Time:** `1 day`
   - **Cost:** `0` (or leave blank)
5. Save the item and proceed to the **Custom Fields / Form Designer** tab.

---

## 2. Step 2: Configure Custom Form Fields

Add the following 6 custom fields in exact order:

| Field Label | Field Type | Choices / Values | Mandatory | Description / Placeholder |
|:---|:---|:---|:---|:---|
| **Destination City** | Single Line Text | N/A | **Yes** | Placeholder: `e.g. Tokyo, London, Paris, New York` |
| **Travel Date** | Date | Format: `YYYY-MM-DD` | **Yes** | Placeholder: `Select travel departure date` |
| **Trip Type** | Dropdown | `Vacation`<br>`Business`<br>`Adventure` | **Yes** | Prompt: `Select trip type` |
| **Budget Range** | Dropdown | `Low`<br>`Medium`<br>`High` | **Yes** | Prompt: `Select budget range` |
| **Special Needs?** | Checkbox (or Dropdown) | `Yes` / `No` (or unchecked/checked) | **No** | Label: `Require accessibility or medical assistance` |
| **Notes** | Paragraph Text (Multi-line) | N/A | **No** | Placeholder: `Specify details (e.g., wheelchair assistance, elderly travelers, dietary or medical requirements)` |

---

## 3. Step 3: Configure Form Business Rules

Click on the **Business Rules** tab in the Service Item editor.

### Rule 1: BR-WTR-01 (Dependent Field Concealment)
- **Rule Name:** `BR-WTR-01: Hide Fields When City Is Empty`
- **Description:** Enforces progressive form disclosure by hiding subsequent fields until a destination is entered.
- **Conditions:**
  - `Destination City is empty`
- **Actions:**
  - `Hide field` -> `Travel Date`
  - `Hide field` -> `Trip Type`
  - `Hide field` -> `Budget Range`
  - `Hide field` -> `Special Needs?`
  - `Hide field` -> `Notes`

### Rule 2: BR-WTR-02 (Conditional Notes Revelation)
- **Rule Name:** `BR-WTR-02: Show Notes When Special Needs Checked`
- **Description:** Displays the Notes field when the requester flags special requirements.
- **Conditions:**
  - `Destination City is not empty`
  - AND
  - `Special Needs? is checked` (or `Special Needs? is Yes`)
- **Action:**
  - `Show field` -> `Notes`

*Note on Rule Ordering:* Ensure `BR-WTR-01` is evaluated before `BR-WTR-02` so that Notes is hidden when the city is cleared.

---

## 4. Step 4: Configure Workflow Automator

Navigate to **Admin > Automation & Productivity > Workflow Automator**.
Click **New Workflow > Ticket Workflow** and name it:
`WF-WTR: Weather Travel Request Orchestration`

### 4.1 Event Trigger Node
- **Event:** `Service Request is Created`

### 4.2 Condition Node: Catalog Filter
- **Condition:**
  - `Service Item is` -> `Weather-Based Travel Recommendation`

### 4.3 Action Node 1: Webhook to Middleware
Add an **Action** node connected immediately following the filter:
- **Action Type:** `Trigger Webhook`
- **Request Type:** `POST`
- **Callback URL:** `https://<your-render-app>.onrender.com/webhook/service-request`
- **Authentication:** `Basic Authentication`
  - **Username:** `<WEBHOOK_USERNAME from Render env>`
  - **Password:** `<WEBHOOK_PASSWORD from Render env>`
- **Encoding:** `JSON`
- **Content:**
  ```json
  {
    "ticketId": {{ticket.id}}
  }
  ```

### 4.4 Condition Branch Node: Budget Approval Routing
Add a **Condition** node branching into two paths:

#### Branch A: High Budget (Approval Required)
- **Condition:**
  - `Budget Range is` -> `High`
- **Actions:**
  1. `Send Approval Request` to `Requester's Reporting Manager`
     - Subject: `Approval Required: High Budget Travel Request - {{ticket.id}}`
  2. `Set Status` -> `Awaiting Approval` (Pauses SLA timer)
- **Approval Sub-Branch (If Approved):**
  - Route to **Fulfillment Node** (Section 4.5)
- **Approval Sub-Branch (If Rejected):**
  - `Set Status` -> `Closed`
  - `Add Private/Public Note`: "High-budget travel request was rejected by reporting manager."

#### Branch B: Low / Medium Budget (Bypass Approval)
- **Condition:**
  - `Budget Range is` -> `Low` OR `Budget Range is` -> `Medium`
- **Actions:**
  - Connect directly to **Fulfillment Node** (Section 4.5)

### 4.5 Fulfillment Node
Add an **Action** node:
- **Set Group:** `Travel Desk` (or `Facilities`)
- **Add Tasks:**
  1. Title: `Review Weather Recommendation & Risk Score in Ticket Note`
     - Description: `Inspect automated weather brief, risk tag, and personal recommendations before proceeding.`
  2. Title: `Book Travel and Accommodations`
     - Description: `Proceed with flight, rail, or hotel bookings per budget tier guidelines.`

---

## 5. Step 5: SLA & Custom Status Configuration

1. Navigate to **Admin > Service Operations > Ticket Fields > Status**.
2. If not already present, ensure a status named **Awaiting Approval** exists.
3. Check the setting: **Pause SLA timer for this status**.
4. Save status configuration.

---

## 6. Step 6: End-to-End Tenant Verification Checklist

Prior to the review call, perform this verification in your tenant:

- [ ] Open the portal as an end-user requester.
- [ ] Navigate to the catalog and open **Weather-Based Travel Recommendation**.
- [ ] Confirm all fields are hidden initially when Destination City is empty.
- [ ] Type `Tokyo` in Destination City; confirm fields appear.
- [ ] Check `Special Needs?`; confirm the `Notes` paragraph appears.
- [ ] Submit a ticket with:
  - Destination: `Tokyo`
  - Travel Date: `7 days from today`
  - Trip Type: `Vacation`
  - Budget: `Medium`
- [ ] Navigate to the agent portal:
  - Verify webhook was triggered.
  - Verify ticket receives the `weather-brief-posted` tag and `weather-risk-low` tag.
  - Verify formatted HTML note appears on the ticket conversation with `[ VERDICT: GO ]` badge.
  - Verify fulfillment tasks are generated.
- [ ] Submit a second ticket with Budget = `High`:
  - Verify ticket status enters `Awaiting Approval` and sends approval mail.

# Note Posting Format Test Result

This document records the empirical testing results for ticket note posting via the Freshservice REST API v2 (`POST /api/v2/tickets/{id}/notes`).

## Background

Section 2 of the project brief noted a community report where JSON payloads were rejected with `invalid_field`, forcing developers to resort to `multipart/form-data`.
This was evaluated during Phase 6 client implementation.

## Test Matrix

| Test Case | Payload Format | Content-Type | Status Code | API Response / Notes |
|:---|:---|:---|:---|:---|
| TC-NOTE-01 | JSON (`{ "body": "...", "private": false }`) | `application/json` | 201 Created | Accepted by Freshservice REST API v2. Note appeared publicly on ticket conversation. |
| TC-NOTE-02 | Multipart (`FormData` with `body`, `private`) | `multipart/form-data` | 201 Created | Accepted by Freshservice REST API v2. Supported natively as fallback. |
| TC-NOTE-03 | JSON with nested HTML string | `application/json` | 201 Created | HTML tags (`<div>`, `<table>`, `<span>`, inline styles) rendered correctly without escaping issues. |

## Client Strategy Implemented

In `middleware/src/freshservice/client.js`:
1. The primary path sends standard JSON (`application/json`) as recommended by the official Freshservice documentation.
2. If Freshservice responds with HTTP 400 (validation error / `invalid_field`), the client automatically intercepts the error and executes an automatic fallback attempt using `multipart/form-data` (`FormData`).
3. This ensures resilience against potential tenant-specific or version-specific API anomalies without sacrificing standard API compliance.

# Production Deployment Guide

This guide details the deployment of the **Haass Weather Travel Middleware** to production environments, focusing on the primary deployment target (Render Free Tier) and secondary targets (Docker, Cloud Containers).

---

## 1. Architecture & Hosting Strategy

The middleware is designed as a **stateless Node.js 24 runtime microservice** (ADR-001):
- **Port:** Configured via `PORT` environment variable (default: `3000` locally, `10000` on Render).
- **Disk:** Strictly zero filesystem persistence required; state is managed statelessly via Freshservice ticket tags (ADR-005).
- **Probes:** `/health` (HTTP 200 liveness) and `/ready` (HTTP 200 readiness).

---

## 2. Option A: Render Free Tier Deployment (Recommended)

Render provides free Node.js web services with automated GitHub deployment and managed TLS certificates.

### 2.1 One-Click Blueprint Deployment via `render.yaml`

1. Log into your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Blueprint**.
3. Connect your repository: `https://github.com/ChilliRoger/haass-pro`.
4. Render detects `render.yaml` at repository root and provisions:
   - Service Name: `haass-weather-travel-middleware`
   - Runtime: `Node` (rootDir: `middleware`)
   - Build Command: `npm ci --omit=dev`
   - Start Command: `npm start`
   - Health Check Path: `/health`
5. Configure the two sensitive environment variables in the Render Dashboard:
   - `FRESHSERVICE_DOMAIN`: Your tenant domain (e.g. `your-tenant.freshservice.com`)
   - `FRESHSERVICE_API_KEY`: Freshservice agent API key with ticket read/write permissions
6. Note the generated `WEBHOOK_USERNAME` and `WEBHOOK_PASSWORD` for configuring Freshservice Workflow Automator.
7. Click **Apply**. Render will build and deploy the service.

### 2.2 Cold-Start Behavior & Warm-Up Mitigation

- **Idle spin-down:** Render free tier services spin down after 15 minutes of inactivity.
- **Cold start duration:** An idle instance takes 30-50 seconds to respond on first wake-up.
- **Freshservice timeout:** Freshservice webhooks time out after 15 seconds. If the instance is idle, the first delivery attempt will time out, and Freshservice will retry 3 minutes later.
- **Pre-Demo Warm-up:** Always execute the warm-up script 10-15 minutes prior to live review calls:
  ```bash
  node scripts/warmup.js https://<your-render-app>.onrender.com
  ```

---

## 3. Option B: Docker Container Deployment

The repository includes a multi-stage, non-root Dockerfile pinned to `node:24.21.0-bookworm-slim` (ADR-009).

### 3.1 Build Container Image

```bash
docker build -t haass-weather-middleware:latest -f middleware/Dockerfile middleware/
```

### 3.2 Run Container

```bash
docker run -d \
  --name haass-middleware \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e WEBHOOK_USERNAME="haass-webhook-user" \
  -e WEBHOOK_PASSWORD="secure-webhook-password-123" \
  -e FRESHSERVICE_DOMAIN="company.freshservice.com" \
  -e FRESHSERVICE_API_KEY="your_api_key" \
  haass-weather-middleware:latest
```

### 3.3 Verify Container Health

```bash
docker inspect --format='{{json .State.Health}}' haass-middleware
curl http://127.0.0.1:3000/health
```

---

## 4. Environment Variables Reference

| Variable | Required in Production | Default Value | Description |
|:---|:---|:---|:---|
| `NODE_ENV` | Yes | `production` | Node environment runtime flag (`production`, `development`, `test`). |
| `PORT` | Yes | `3000` | Port on which the HTTP server listens (`10000` on Render). |
| `LOG_LEVEL` | No | `info` | Minimum log severity level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`). |
| `RATE_LIMIT_RPM` | No | `60` | Max requests per minute per IP before HTTP 429 is returned. |
| `WEBHOOK_USERNAME` | Yes | (None) | Expected HTTP Basic Auth username for `/webhook/service-request`. |
| `WEBHOOK_PASSWORD` | Yes | (None) | Expected HTTP Basic Auth password for `/webhook/service-request`. |
| `FRESHSERVICE_DOMAIN` | Yes | (None) | Freshservice tenant domain (e.g. `your-tenant.freshservice.com`). |
| `FRESHSERVICE_API_KEY` | Yes | (None) | Freshservice Agent API Key used for Basic Auth (`apiKey:X`). |

---

## 5. Webhook Integration Verification

After deployment, verify that the live endpoint accepts webhooks:

```bash
node scripts/simulate-webhook.js \
  --url https://<your-render-app>.onrender.com \
  --username haass-webhook-user \
  --password secure-webhook-password-123 \
  --ticket-id 101
```

Expected output:
```text
[SIMULATE] Status: HTTP 202 (Accepted)
[SIMULATE] Round-trip latency: 85ms (Freshservice limit: 15,000ms)
[SIMULATE] SUCCESS: Webhook accepted for asynchronous execution.
```

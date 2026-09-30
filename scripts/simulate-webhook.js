#!/usr/bin/env node

/**
 * simulate-webhook.js
 *
 * Simulates a Freshservice Workflow Automator Webhook delivery to the middleware.
 * Verifies immediate HTTP 202 response and triggers the asynchronous pipeline.
 *
 * Usage:
 *   node scripts/simulate-webhook.js --ticket-id <id> [options]
 *
 * Options:
 *   --ticket-id <id>      Ticket ID to process (required, e.g. 101)
 *   --url <url>           Middleware URL (default: http://localhost:3000)
 *   --username <user>     Webhook HTTP Basic username (default: test-user or env WEBHOOK_USERNAME)
 *   --password <pass>     Webhook HTTP Basic password (default: test-password-123 or env WEBHOOK_PASSWORD)
 *   --format <fmt>        Payload format: camelCase (default), snake_case, or nested
 *
 * Strictly plain ASCII - no emojis.
 */

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    ticketId: null,
    url: process.env.MIDDLEWARE_URL || 'http://localhost:3000',
    username: process.env.WEBHOOK_USERNAME || 'test-user',
    password: process.env.WEBHOOK_PASSWORD || 'test-password-123',
    format: 'camelCase',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--ticket-id' && args[i + 1]) {
      options.ticketId = parseInt(args[++i], 10);
    } else if (arg === '--url' && args[i + 1]) {
      options.url = args[++i];
    } else if (arg === '--username' && args[i + 1]) {
      options.username = args[++i];
    } else if (arg === '--password' && args[i + 1]) {
      options.password = args[++i];
    } else if (arg === '--format' && args[i + 1]) {
      options.format = args[++i];
    }
  }

  return options;
}

async function simulateWebhook() {
  const options = parseArgs();

  if (!options.ticketId || Number.isNaN(options.ticketId)) {
    console.error('[SIMULATE] Error: --ticket-id <number> is required.');
    console.error('Example: node scripts/simulate-webhook.js --ticket-id 101');
    process.exit(1);
  }

  const endpoint = `${options.url.replace(/\/$/, '')}/webhook/service-request`;
  const authHeader = `Basic ${Buffer.from(`${options.username}:${options.password}`).toString('base64')}`;

  let payload;
  switch (options.format) {
    case 'snake_case':
      payload = { ticket_id: options.ticketId };
      break;
    case 'nested':
      payload = { freshservice_webhook: { ticket_id: options.ticketId } };
      break;
    case 'camelCase':
    default:
      payload = { ticketId: options.ticketId };
      break;
  }

  console.log('[SIMULATE] Dispatching simulated Freshservice webhook');
  console.log(`[SIMULATE] Target Endpoint: ${endpoint}`);
  console.log(`[SIMULATE] Authenticated as: ${options.username}`);
  console.log(`[SIMULATE] Payload: ${JSON.stringify(payload)}`);

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s Freshservice webhook timeout

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const duration = Date.now() - startTime;
    const responseBody = await response.text();

    console.log(`[SIMULATE] Status: HTTP ${response.status} (${response.statusText})`);
    console.log(`[SIMULATE] Round-trip latency: ${duration}ms (Freshservice limit: 15,000ms)`);
    console.log(`[SIMULATE] Response Body: ${responseBody}`);

    if (response.status === 202) {
      console.log('[SIMULATE] SUCCESS: Webhook accepted for asynchronous execution.');
      process.exit(0);
    } else {
      console.error(`[SIMULATE] FAILED: Unexpected response status ${response.status}`);
      process.exit(1);
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[SIMULATE] ERROR: Webhook dispatch failed after ${duration}ms: ${err.message}`);
    process.exit(1);
  }
}

simulateWebhook();

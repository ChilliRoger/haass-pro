#!/usr/bin/env node

/**
 * warmup.js
 *
 * Pre-demo warm-up script for the Weather-Based Travel Recommendation middleware.
 * Prevents the 50-second cold start on Render free-tier hosting by pinging /health and /ready.
 *
 * Usage:
 *   node scripts/warmup.js [URL]
 * Example:
 *   node scripts/warmup.js https://haass-weather-middleware.onrender.com
 *
 * Strictly plain ASCII - no emojis.
 */

const targetUrl = (process.argv[2] || process.env.MIDDLEWARE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

console.log('[WARMUP] Starting pre-demo health warm-up probe');
console.log(`[WARMUP] Target Middleware Base URL: ${targetUrl}`);

async function pingEndpoint(path) {
  const url = `${targetUrl}${path}`;
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for cold starts

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const duration = Date.now() - startTime;
    const body = await response.text();

    if (response.ok) {
      console.log(`[WARMUP] SUCCESS: ${path} responded with HTTP ${response.status} in ${duration}ms`);
      console.log(`[WARMUP] Response body: ${body}`);
      return true;
    }

    console.error(`[WARMUP] FAILED: ${path} responded with HTTP ${response.status} in ${duration}ms`);
    console.error(`[WARMUP] Error body: ${body}`);
    return false;
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[WARMUP] ERROR: Failed to reach ${path} after ${duration}ms: ${err.message}`);
    return false;
  }
}

async function runWarmup() {
  console.log('[WARMUP] Pinging /health liveness probe...');
  const healthOk = await pingEndpoint('/health');

  console.log('[WARMUP] Pinging /ready readiness probe...');
  const readyOk = await pingEndpoint('/ready');

  if (healthOk && readyOk) {
    console.log('[WARMUP] Service is warmed up, responsive, and ready for live demonstration.');
    process.exit(0);
  } else {
    console.error('[WARMUP] Warning: One or more probes failed. Check Render dashboard logs.');
    process.exit(1);
  }
}

runWarmup();

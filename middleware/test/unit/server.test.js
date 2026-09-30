import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { createApp, safeCompare } from '../../src/server.js';

describe('server and authentication', () => {
  const testConfig = {
    nodeEnv: 'test',
    port: 0,
    rateLimitRpm: 100,
    logLevel: 'silent',
    webhookUsername: 'freshservice-agent',
    webhookPassword: 'secret-token-pass',
  };

  let server;
  let baseUrl;

  before(async () => {
    const app = createApp(testConfig);
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('safeCompare', () => {
    it('returns true for identical strings', () => {
      assert.equal(safeCompare('correct-pass', 'correct-pass'), true);
    });

    it('returns false for non-matching strings', () => {
      assert.equal(safeCompare('correct-pass', 'wrong-pass'), false);
      assert.equal(safeCompare('short', 'longer-string'), false);
    });

    it('returns false for non-string inputs', () => {
      assert.equal(safeCompare(null, 'pass'), false);
      assert.equal(safeCompare('pass', undefined), false);
    });
  });

  describe('GET /health', () => {
    it('returns HTTP 200 with status ok and ISO timestamp', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 200);
      assert.ok(res.headers.get('x-content-type-options')); // helmet header present

      const body = await res.json();
      assert.equal(body.status, 'ok');
      assert.ok(body.timestamp);
    });
  });

  describe('GET /ready', () => {
    it('returns HTTP 200 with status ready and uptime number', async () => {
      const res = await fetch(`${baseUrl}/ready`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.status, 'ready');
      assert.equal(typeof body.uptime, 'number');
    });
  });

  describe('POST /webhook/service-request authentication', () => {
    it('rejects unauthenticated requests with HTTP 401 and WWW-Authenticate header', async () => {
      const res = await fetch(`${baseUrl}/webhook/service-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: 101 }),
      });

      assert.equal(res.status, 401);
      assert.equal(res.headers.get('www-authenticate'), 'Basic realm="Freshservice Webhook"');
      const body = await res.json();
      assert.ok(body.error);
    });

    it('rejects invalid credentials with HTTP 401', async () => {
      const auth = Buffer.from('freshservice-agent:incorrect-password').toString('base64');
      const res = await fetch(`${baseUrl}/webhook/service-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({ ticketId: 101 }),
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.error, 'Invalid credentials.');
    });

    it('rejects missing ticketId with HTTP 400 when authenticated', async () => {
      const auth = Buffer.from('freshservice-agent:secret-token-pass').toString('base64');
      const res = await fetch(`${baseUrl}/webhook/service-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, /Missing or invalid ticketId/);
    });

    it('accepts valid ticketId with HTTP 202 and returns accepted payload', async () => {
      const auth = Buffer.from('freshservice-agent:secret-token-pass').toString('base64');
      const res = await fetch(`${baseUrl}/webhook/service-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({ ticketId: 101 }),
      });

      assert.equal(res.status, 202);
      const body = await res.json();
      assert.equal(body.message, 'Accepted');
      assert.equal(body.ticketId, 101);
      assert.equal(body.status, 'processing_scheduled');
    });
  });

  describe('404 handler', () => {
    it('returns HTTP 404 for unknown endpoints', async () => {
      const res = await fetch(`${baseUrl}/non-existent-route`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error, 'Not Found');
    });
  });
});

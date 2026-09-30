/**
 * server.js
 *
 * Express application server for Weather-Based Travel Recommendation middleware.
 * Implements security headers, rate limiting, Basic authentication, health/readiness probes,
 * and webhook stub with immediate HTTP 202 response.
 *
 * Strictly plain ASCII - no emojis.
 */

import crypto from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { processTicketWebhook } from './orchestrator.js';

/**
 * Constant-time string comparison using SHA-256 digest buffers.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Express middleware for HTTP Basic Authentication on webhooks.
 *
 * @param {object} options
 * @param {string} options.expectedUsername
 * @param {string} options.expectedPassword
 * @param {object} [options.log]
 * @returns {import('express').RequestHandler}
 */
export function basicAuthMiddleware({ expectedUsername, expectedPassword, log }) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Freshservice Webhook"');
      return res.status(401).json({ error: 'Missing or invalid authorization header.' });
    }

    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const colonIndex = credentials.indexOf(':');
    if (colonIndex === -1) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Freshservice Webhook"');
      return res.status(401).json({ error: 'Invalid Basic authorization format.' });
    }

    const username = credentials.substring(0, colonIndex);
    const password = credentials.substring(colonIndex + 1);

    const userMatch = safeCompare(username, expectedUsername);
    const passMatch = safeCompare(password, expectedPassword);

    if (!userMatch || !passMatch) {
      if (log) {
        log.warn('Unauthorized webhook request rejected');
      }
      res.setHeader('WWW-Authenticate', 'Basic realm="Freshservice Webhook"');
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    return next();
  };
}

/**
 * Factory to create and configure the Express app.
 *
 * @param {object} [customConfig]
 * @param {object} [options]
 * @param {object} [options.loggerInstance]
 * @returns {import('express').Application}
 */
export function createApp(customConfig, options = {}) {
  const cfg = customConfig || loadConfig();
  const log = options.loggerInstance || createLogger({ level: cfg.logLevel });
  const app = express();

  // 1. Security headers
  app.use(helmet());

  // 2. Body parser with strict size limit (1kb)
  app.use(express.json({ limit: '1kb' }));

  // 3. Rate limiting
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: cfg.rateLimitRpm,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  });
  app.use(limiter);

  // 4. Liveness probe
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // 5. Readiness probe
  app.get('/ready', (_req, res) => {
    res.status(200).json({
      status: 'ready',
      uptime: process.uptime(),
    });
  });

  // 6. Webhook authentication
  const auth = basicAuthMiddleware({
    expectedUsername: cfg.webhookUsername,
    expectedPassword: cfg.webhookPassword,
    log,
  });

  const webhookRunner = options.processWebhookFn || processTicketWebhook;

  // 7. Service request webhook endpoint
  app.post('/webhook/service-request', auth, (req, res) => {
    const rawTicketId =
      req.body?.ticketId ?? req.body?.ticket_id ?? req.body?.freshservice_webhook?.ticket_id;
    const ticketId = Number(rawTicketId);

    if (!ticketId || !Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({
        error: 'Missing or invalid ticketId in request body. Must be a positive integer.',
      });
    }

    // Step 1: Immediate 202 Accepted response
    res.status(202).json({
      message: 'Accepted',
      ticketId,
      status: 'processing_scheduled',
    });

    // Step 2: Asynchronous processing trigger
    const correlationId = `req-${ticketId}-${Date.now()}`;
    const reqLogger = log.child({ ticketId, correlationId });
    reqLogger.info('Webhook accepted; async processing started');

    setImmediate(() => {
      webhookRunner(ticketId)
        .then((result) => {
          reqLogger.info({ result }, 'Webhook pipeline processing completed');
        })
        .catch((err) => {
          reqLogger.error({ err: err.message }, 'Unhandled error in webhook orchestrator');
        });
    });
  });

  // 8. 404 handler for unknown routes
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // 9. Central error handler
  app.use((err, _req, res, _next) => {
    log.error('Unhandled middleware error', { err });
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      error: statusCode === 500 ? 'Internal Server Error' : err.message,
    });
  });

  return app;
}

/**
 * Starts the HTTP server with graceful shutdown handling.
 *
 * @param {object} [customConfig]
 * @returns {Promise<import('node:http').Server>}
 */
export function startServer(customConfig) {
  const cfg = customConfig || loadConfig();
  const log = createLogger({ level: cfg.logLevel });
  const app = createApp(cfg, { loggerInstance: log });

  return new Promise((resolve) => {
    const server = app.listen(cfg.port, () => {
      log.info(`Server listening on port ${cfg.port} [NODE_ENV=${cfg.nodeEnv}]`);
      resolve(server);
    });

    function handleShutdown(signal) {
      log.info(`Received ${signal}. Starting graceful shutdown...`);
      server.close(() => {
        log.info('HTTP server closed. Exiting process.');
        process.exit(0);
      });

      // Force close after 10s if connections refuse to terminate
      setTimeout(() => {
        log.error('Graceful shutdown timeout exceeded. Forcing exit.');
        process.exit(1);
      }, 10000).unref();
    }

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  });
}

// Start server if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer().catch((err) => {
    const log = createLogger();
    log.error('Failed to start server', { err });
    process.exit(1);
  });
}

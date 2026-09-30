/**
 * config.js
 *
 * Central configuration loader, environment variable validator, and named constants
 * for the Weather-Based Travel Recommendation middleware.
 *
 * Follows ADR-004, ADR-006, and docs/02-architecture.md.
 */

/** Maximum horizon in days for Tier 1 Open-Meteo forecast API (live-verified 2026-09-30). */
export const FORECAST_MAX_DAYS = 14;

/** Maximum horizon in days for Tier 2 Open-Meteo seasonal API (live-verified 2026-09-30). */
export const SEASONAL_MAX_DAYS = 180;

/** Temperature threshold in Celsius for heat warnings. */
export const TEMP_HOT_C = 35;

/** Temperature threshold in Celsius for warm weather advisories. */
export const TEMP_WARM_C = 28;

/** Temperature threshold in Celsius for cold weather warnings. */
export const TEMP_COLD_C = 5;

/** Precipitation probability threshold in percent for high rain warnings. */
export const RAIN_HIGH_PCT = 60;

/** Precipitation probability threshold in percent for moderate rain advisories. */
export const RAIN_MODERATE_PCT = 30;

/** UV index threshold for high UV exposure warnings. */
export const UV_HIGH = 6;

/** UV index threshold for very high UV exposure warnings. */
export const UV_VERY_HIGH = 8;

/** Wind speed threshold in km/h for strong wind advisories. */
export const WIND_STRONG_KMH = 50;

/** Wind speed threshold in km/h for storm and high wind warnings. */
export const WIND_VERY_STRONG_KMH = 75;

/** Upstream API endpoints. */
export const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_SEASONAL_URL = 'https://seasonal-api.open-meteo.com/v1/seasonal';
export const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Default outbound HTTP timeout in milliseconds. */
export const HTTP_TIMEOUT_MS = 10000;

/**
 * Validates and loads configuration from an environment object.
 *
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {object} Validated configuration object
 */
export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const port = parseInt(env.PORT || '3000', 10);
  const rateLimitRpm = parseInt(env.RATE_LIMIT_RPM || '60', 10);
  const logLevel = env.LOG_LEVEL || 'info';

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT configuration: "${env.PORT}". Must be an integer between 1 and 65535.`,
    );
  }

  if (Number.isNaN(rateLimitRpm) || rateLimitRpm <= 0) {
    throw new Error(
      `Invalid RATE_LIMIT_RPM configuration: "${env.RATE_LIMIT_RPM}". Must be a positive integer.`,
    );
  }

  const webhookUsername = env.WEBHOOK_USERNAME || (nodeEnv === 'test' ? 'test-user' : '');
  const webhookPassword = env.WEBHOOK_PASSWORD || (nodeEnv === 'test' ? 'test-password-123' : '');
  const freshserviceDomain =
    env.FRESHSERVICE_DOMAIN || (nodeEnv === 'test' ? 'test.freshservice.com' : '');
  const freshserviceApiKey =
    env.FRESHSERVICE_API_KEY || (nodeEnv === 'test' ? 'test_api_key_placeholder' : '');

  const missing = [];
  if (!webhookUsername) {
    missing.push('WEBHOOK_USERNAME');
  }
  if (!webhookPassword) {
    missing.push('WEBHOOK_PASSWORD');
  }
  if (!freshserviceDomain && nodeEnv === 'production') {
    missing.push('FRESHSERVICE_DOMAIN');
  }
  if (!freshserviceApiKey && nodeEnv === 'production') {
    missing.push('FRESHSERVICE_API_KEY');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }

  return {
    nodeEnv,
    port,
    rateLimitRpm,
    logLevel,
    webhookUsername,
    webhookPassword,
    freshserviceDomain: freshserviceDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    freshserviceApiKey,
    constants: {
      FORECAST_MAX_DAYS,
      SEASONAL_MAX_DAYS,
      TEMP_HOT_C,
      TEMP_WARM_C,
      TEMP_COLD_C,
      RAIN_HIGH_PCT,
      RAIN_MODERATE_PCT,
      UV_HIGH,
      UV_VERY_HIGH,
      WIND_STRONG_KMH,
      WIND_VERY_STRONG_KMH,
      OPEN_METEO_FORECAST_URL,
      OPEN_METEO_SEASONAL_URL,
      OPEN_METEO_GEOCODING_URL,
      HTTP_TIMEOUT_MS,
    },
  };
}

let currentConfig = null;

export function getConfig() {
  if (!currentConfig) {
    currentConfig = loadConfig();
  }
  return currentConfig;
}

export default getConfig;

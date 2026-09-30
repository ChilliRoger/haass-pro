import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FORECAST_MAX_DAYS,
  HTTP_TIMEOUT_MS,
  RAIN_HIGH_PCT,
  RAIN_MODERATE_PCT,
  SEASONAL_MAX_DAYS,
  TEMP_COLD_C,
  TEMP_HOT_C,
  TEMP_WARM_C,
  UV_HIGH,
  UV_VERY_HIGH,
  WIND_STRONG_KMH,
  WIND_VERY_STRONG_KMH,
  loadConfig,
} from '../../src/config.js';

describe('config module', () => {
  it('exports verified named constants matching architecture specification', () => {
    assert.equal(FORECAST_MAX_DAYS, 14);
    assert.equal(SEASONAL_MAX_DAYS, 180);
    assert.equal(TEMP_HOT_C, 35);
    assert.equal(TEMP_WARM_C, 28);
    assert.equal(TEMP_COLD_C, 5);
    assert.equal(RAIN_HIGH_PCT, 60);
    assert.equal(RAIN_MODERATE_PCT, 30);
    assert.equal(UV_HIGH, 6);
    assert.equal(UV_VERY_HIGH, 8);
    assert.equal(WIND_STRONG_KMH, 50);
    assert.equal(WIND_VERY_STRONG_KMH, 75);
    assert.equal(HTTP_TIMEOUT_MS, 10000);
  });

  it('loads default test values when NODE_ENV is test', () => {
    const cfg = loadConfig({ NODE_ENV: 'test' });
    assert.equal(cfg.nodeEnv, 'test');
    assert.equal(cfg.port, 3000);
    assert.equal(cfg.rateLimitRpm, 60);
    assert.equal(cfg.logLevel, 'info');
    assert.equal(cfg.webhookUsername, 'test-user');
    assert.equal(cfg.webhookPassword, 'test-password-123');
  });

  it('sanitises freshservice domain by removing protocols and trailing slashes', () => {
    const cfg = loadConfig({
      NODE_ENV: 'test',
      FRESHSERVICE_DOMAIN: 'https://my-company.freshservice.com/',
    });
    assert.equal(cfg.freshserviceDomain, 'my-company.freshservice.com');
  });

  it('throws descriptive error when PORT is invalid', () => {
    assert.throws(
      () => loadConfig({ NODE_ENV: 'test', PORT: 'abc' }),
      /Invalid PORT configuration/,
    );
    assert.throws(
      () => loadConfig({ NODE_ENV: 'test', PORT: '70000' }),
      /Invalid PORT configuration/,
    );
  });

  it('throws descriptive error when RATE_LIMIT_RPM is invalid', () => {
    assert.throws(
      () => loadConfig({ NODE_ENV: 'test', RATE_LIMIT_RPM: '-5' }),
      /Invalid RATE_LIMIT_RPM configuration/,
    );
  });

  it('throws descriptive error in production if required variables are missing', () => {
    assert.throws(
      () => loadConfig({ NODE_ENV: 'production' }),
      /Missing required environment variable/,
    );
  });
});

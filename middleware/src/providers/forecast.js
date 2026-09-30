/**
 * forecast.js
 *
 * Open-Meteo Forecast API client for Tier 1 (daily forecast) and
 * Tier 3 (current weather conditions).
 *
 * Adheres to docs/references.md Section 7 and ADR-002, ADR-004.
 * Strictly plain ASCII - no emojis.
 */

import { HTTP_TIMEOUT_MS, OPEN_METEO_FORECAST_URL } from '../config.js';
import { normaliseCurrent, normaliseForecast } from '../engine/normaliser.js';

const TIER1_DAILY_VARIABLES = [
  'temperature_2m_max',
  'apparent_temperature_max',
  'precipitation_probability_max',
  'precipitation_sum',
  'uv_index_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'weather_code',
].join(',');

const TIER3_CURRENT_VARIABLES = [
  'temperature_2m',
  'weather_code',
  'wind_speed_10m',
  'precipitation',
].join(',');

/**
 * Fetches Tier 1 daily forecast data from Open-Meteo.
 *
 * @param {object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {string} params.targetDate - Target travel date YYYY-MM-DD
 * @param {string} [params.timezone='auto']
 * @param {object} [options={}]
 * @returns {Promise<object>} Normalised WeatherData
 */
export async function fetchForecastWeather(
  { latitude, longitude, targetDate, timezone = 'auto' },
  options = {},
) {
  const baseUrl = options.baseUrl || OPEN_METEO_FORECAST_URL;
  const timeoutMs = options.timeoutMs ?? HTTP_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? 2;
  const fetchFn = options.fetchFn || fetch;

  const url = new URL(baseUrl);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('daily', TIER1_DAILY_VARIABLES);
  url.searchParams.set('timezone', timezone);
  url.searchParams.set('forecast_days', '16');

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchFn(url.toString(), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timer);

      if (!response.ok) {
        if (response.status >= 500 && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt)));
          continue;
        }
        const errorText = await response.text();
        throw new Error(`Forecast API HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return normaliseForecast(data, targetDate);
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries && err.name !== 'AbortError') {
        await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  throw new Error(`Forecast fetch failed: ${lastError?.message}`);
}

/**
 * Fetches Tier 3 current weather conditions from Open-Meteo.
 *
 * @param {object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {string} [params.timezone='auto']
 * @param {object} [options={}]
 * @returns {Promise<object>} Normalised WeatherData
 */
export async function fetchCurrentWeather(
  { latitude, longitude, timezone = 'auto' },
  options = {},
) {
  const baseUrl = options.baseUrl || OPEN_METEO_FORECAST_URL;
  const timeoutMs = options.timeoutMs ?? HTTP_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? 2;
  const fetchFn = options.fetchFn || fetch;

  const url = new URL(baseUrl);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', TIER3_CURRENT_VARIABLES);
  url.searchParams.set('timezone', timezone);

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchFn(url.toString(), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timer);

      if (!response.ok) {
        if (response.status >= 500 && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt)));
          continue;
        }
        const errorText = await response.text();
        throw new Error(`Current weather API HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return normaliseCurrent(data);
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries && err.name !== 'AbortError') {
        await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  throw new Error(`Current weather fetch failed: ${lastError?.message}`);
}

export default { fetchForecastWeather, fetchCurrentWeather };

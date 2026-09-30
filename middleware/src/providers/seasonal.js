/**
 * seasonal.js
 *
 * Open-Meteo Seasonal Forecast API client for Tier 2 (15 to 180 days ahead).
 *
 * Adheres to docs/references.md Section 9 and ADR-002, ADR-004.
 * Strictly plain ASCII - no emojis.
 */

import { HTTP_TIMEOUT_MS, OPEN_METEO_SEASONAL_URL } from '../config.js';
import { normaliseSeasonal } from '../engine/normaliser.js';

const TIER2_SEASONAL_VARIABLES = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'wind_speed_10m_max',
  'weather_code',
].join(',');

/**
 * Fetches Tier 2 seasonal outlook from Open-Meteo.
 *
 * @param {object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {string} params.targetDate - Target travel date YYYY-MM-DD
 * @param {string} [params.timezone='auto']
 * @param {object} [options={}]
 * @returns {Promise<object>} Normalised WeatherData
 */
export async function fetchSeasonalWeather(
  { latitude, longitude, targetDate, timezone = 'auto' },
  options = {},
) {
  const baseUrl = options.baseUrl || OPEN_METEO_SEASONAL_URL;
  const timeoutMs = options.timeoutMs ?? HTTP_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? 2;
  const fetchFn = options.fetchFn || fetch;

  const url = new URL(baseUrl);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('daily', TIER2_SEASONAL_VARIABLES);
  url.searchParams.set('timezone', timezone);
  url.searchParams.set('forecast_months', '6');

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
        throw new Error(`Seasonal API HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return normaliseSeasonal(data, targetDate);
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries && err.name !== 'AbortError') {
        await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  throw new Error(`Seasonal fetch failed: ${lastError?.message}`);
}

export default { fetchSeasonalWeather };

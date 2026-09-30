/**
 * client.js
 *
 * Open-Meteo Geocoding API client.
 * Converts free-text city names to geographic coordinates, region, country, and timezone.
 *
 * Adheres to docs/references.md Section 8 and ADR-003.
 * Strictly plain ASCII - no emojis.
 */

import { HTTP_TIMEOUT_MS, OPEN_METEO_GEOCODING_URL } from '../config.js';

/**
 * Searches for a city by name and returns its geographic details.
 *
 * @param {string} cityName - Name of the city to geocode
 * @param {object} [options={}]
 * @param {string} [options.baseUrl] - Base API URL override
 * @param {number} [options.timeoutMs] - Request timeout in ms
 * @param {number} [options.maxRetries=2] - Number of retry attempts on transient failure
 * @param {typeof fetch} [options.fetchFn=fetch] - Injected fetch implementation
 * @returns {Promise<{ id: number, name: string, latitude: number, longitude: number, country: string, countryCode: string, admin1: string, timezone: string, formattedPlace: string } | null>}
 */
export async function searchCity(cityName, options = {}) {
  if (!cityName || typeof cityName !== 'string' || !cityName.trim()) {
    return null;
  }

  const baseUrl = options.baseUrl || OPEN_METEO_GEOCODING_URL;
  const timeoutMs = options.timeoutMs ?? HTTP_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? 2;
  const fetchFn = options.fetchFn || fetch;

  const url = new URL(baseUrl);
  url.searchParams.set('name', cityName.trim());
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');

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
          // Exponential backoff before retrying server errors
          await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt)));
          continue;
        }
        throw new Error(
          `Geocoding API responded with HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.results) || data.results.length === 0) {
        return null;
      }

      const top = data.results[0];
      const placeParts = [top.name, top.admin1, top.country].filter(Boolean);

      return {
        id: top.id,
        name: top.name,
        latitude: Number(top.latitude),
        longitude: Number(top.longitude),
        country: top.country || '',
        countryCode: top.country_code || '',
        admin1: top.admin1 || '',
        timezone: top.timezone || 'auto',
        formattedPlace: placeParts.join(', '),
      };
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries && err.name !== 'AbortError') {
        await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  throw new Error(`Geocoding failed for "${cityName}": ${lastError?.message}`);
}

export default { searchCity };

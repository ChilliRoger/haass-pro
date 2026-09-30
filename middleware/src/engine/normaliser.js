/**
 * normaliser.js
 *
 * Normalises raw weather responses from Open-Meteo Forecast, Seasonal, and
 * Current weather APIs into a unified, null-safe internal WeatherData shape.
 *
 * Adheres to docs/02-architecture.md Section 4 and ADR-002, ADR-004.
 * Strictly plain ASCII - no emojis.
 */

import { getConditionLabel } from './wmo-codes.js';
import { TIER_CONFIDENCE } from '../providers/tier-selector.js';

/**
 * Normalises Tier 1 forecast API response for a specific target travel date.
 *
 * @param {object} raw - Open-Meteo forecast API response
 * @param {string} targetDate - Date string in YYYY-MM-DD format
 * @returns {object} Normalised WeatherData object
 */
export function normaliseForecast(raw, targetDate) {
  if (!raw || !raw.daily || !Array.isArray(raw.daily.time)) {
    throw new Error('Invalid forecast API response structure: missing daily.time array.');
  }

  const times = raw.daily.time;
  const index = times.indexOf(targetDate);

  if (index === -1) {
    throw new Error(
      `Target date ${targetDate} not found in forecast time array (${times[0]} to ${times[times.length - 1]}).`,
    );
  }

  const wmo = raw.daily.weather_code?.[index] ?? null;
  const temp = raw.daily.temperature_2m_max?.[index] ?? null;
  const feelsLike = raw.daily.apparent_temperature_max?.[index] ?? null;
  const rainChance = raw.daily.precipitation_probability_max?.[index] ?? null;
  const precipSum = raw.daily.precipitation_sum?.[index] ?? null;
  const uv = raw.daily.uv_index_max?.[index] ?? null;
  const wind = raw.daily.wind_speed_10m_max?.[index] ?? null;
  const gusts = raw.daily.wind_gusts_10m_max?.[index] ?? null;

  return {
    tempC: temp !== null ? Number(temp) : null,
    feelsLikeC: feelsLike !== null ? Number(feelsLike) : null,
    rainChancePct: rainChance !== null ? Number(rainChance) : null,
    precipSumMm: precipSum !== null ? Number(precipSum) : null,
    uvIndex: uv !== null ? Number(uv) : null,
    windKmh: wind !== null ? Number(wind) : null,
    gustsKmh: gusts !== null ? Number(gusts) : null,
    condition: getConditionLabel(wmo),
    wmoCode: wmo !== null ? Number(wmo) : null,
    source: 'forecast',
    confidence: TIER_CONFIDENCE.tier1,
  };
}

/**
 * Normalises Tier 2 seasonal forecast API response for a specific target travel date.
 *
 * @param {object} raw - Open-Meteo seasonal API response
 * @param {string} targetDate - Date string in YYYY-MM-DD format
 * @returns {object} Normalised WeatherData object
 */
export function normaliseSeasonal(raw, targetDate) {
  if (!raw || !raw.daily || !Array.isArray(raw.daily.time)) {
    throw new Error('Invalid seasonal API response structure: missing daily.time array.');
  }

  const times = raw.daily.time;
  const index = times.indexOf(targetDate);

  if (index === -1) {
    throw new Error(
      `Target date ${targetDate} not found in seasonal time array (${times[0]} to ${times[times.length - 1]}).`,
    );
  }

  const wmo = raw.daily.weather_code?.[index] ?? null;
  const temp = raw.daily.temperature_2m_max?.[index] ?? null;
  const precipSum = raw.daily.precipitation_sum?.[index] ?? null;
  const wind = raw.daily.wind_speed_10m_max?.[index] ?? null;

  return {
    tempC: temp !== null ? Number(temp) : null,
    feelsLikeC: null, // Not available in seasonal tier
    rainChancePct: null, // Not available in seasonal tier
    precipSumMm: precipSum !== null ? Number(precipSum) : null,
    uvIndex: null, // Not available in seasonal tier
    windKmh: wind !== null ? Number(wind) : null,
    gustsKmh: null,
    condition: getConditionLabel(wmo),
    wmoCode: wmo !== null ? Number(wmo) : null,
    source: 'seasonal',
    confidence: TIER_CONFIDENCE.tier2,
  };
}

/**
 * Normalises Tier 3 current weather API response.
 *
 * @param {object} raw - Open-Meteo forecast API response with current object
 * @returns {object} Normalised WeatherData object
 */
export function normaliseCurrent(raw) {
  if (!raw || !raw.current) {
    throw new Error('Invalid current weather API response structure: missing current object.');
  }

  const wmo = raw.current.weather_code ?? null;
  const temp = raw.current.temperature_2m ?? null;
  const wind = raw.current.wind_speed_10m ?? null;
  const precip = raw.current.precipitation ?? null;

  return {
    tempC: temp !== null ? Number(temp) : null,
    feelsLikeC: null,
    rainChancePct: null,
    precipSumMm: precip !== null ? Number(precip) : null,
    uvIndex: null,
    windKmh: wind !== null ? Number(wind) : null,
    gustsKmh: null,
    condition: getConditionLabel(wmo),
    wmoCode: wmo !== null ? Number(wmo) : null,
    source: 'current',
    confidence: TIER_CONFIDENCE.tier3,
  };
}

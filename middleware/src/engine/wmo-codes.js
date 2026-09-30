/**
 * wmo-codes.js
 *
 * Maps WMO (World Meteorological Organization) weather interpretation codes
 * to standard English condition labels.
 *
 * Source: Open-Meteo documentation and WMO Code Table 4677.
 * Strictly plain ASCII - no emojis.
 */

export const WMO_CODE_MAP = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

/**
 * Maps a numeric WMO weather code to its human-readable description.
 *
 * @param {number | null | undefined} code - Numeric WMO code
 * @returns {string} Human-readable condition label (default: "Unknown")
 */
export function getConditionLabel(code) {
  if (code === null || code === undefined || typeof code !== 'number') {
    return 'Unknown';
  }
  return WMO_CODE_MAP[code] || `Weather code ${code}`;
}

/**
 * Checks if a WMO code indicates rain or drizzle.
 *
 * @param {number | null | undefined} code
 * @returns {boolean}
 */
export function isRainCode(code) {
  if (typeof code !== 'number') {
    return false;
  }
  return (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    code === 95 ||
    code === 96 ||
    code === 99
  );
}

/**
 * Checks if a WMO code indicates snow.
 *
 * @param {number | null | undefined} code
 * @returns {boolean}
 */
export function isSnowCode(code) {
  if (typeof code !== 'number') {
    return false;
  }
  return (code >= 71 && code <= 77) || code === 85 || code === 86;
}

/**
 * Checks if a WMO code indicates a thunderstorm.
 *
 * @param {number | null | undefined} code
 * @returns {boolean}
 */
export function isThunderstormCode(code) {
  if (typeof code !== 'number') {
    return false;
  }
  return code === 95 || code === 96 || code === 99;
}

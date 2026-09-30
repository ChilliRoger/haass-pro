/**
 * tier-selector.js
 *
 * Selects the appropriate weather data tier based on the number of days
 * between today and the travel date, adhering to ADR-004 and named constants.
 *
 * Strictly plain ASCII - no emojis.
 */

import { FORECAST_MAX_DAYS, SEASONAL_MAX_DAYS } from '../config.js';
import { calculateDaysFromToday } from '../validation/date-rules.js';

export const TIER_CONFIDENCE = {
  tier1: 'Forecast-based',
  tier2: 'Seasonal outlook, low confidence',
  tier3: 'Current conditions only, not a prediction',
};

/**
 * Determines the weather tier for a given number of days from today.
 *
 * @param {number} daysFromToday - Integer calendar days difference
 * @returns {{ tier: 1 | 2 | 3, source: "forecast" | "seasonal" | "current", confidence: string }}
 */
export function selectTierByDays(daysFromToday) {
  if (daysFromToday < 0) {
    throw new Error('Cannot select tier for past dates. Use validateTravelDate first.');
  }

  if (daysFromToday <= FORECAST_MAX_DAYS) {
    return {
      tier: 1,
      source: 'forecast',
      confidence: TIER_CONFIDENCE.tier1,
    };
  }

  if (daysFromToday <= SEASONAL_MAX_DAYS) {
    return {
      tier: 2,
      source: 'seasonal',
      confidence: TIER_CONFIDENCE.tier2,
    };
  }

  return {
    tier: 3,
    source: 'current',
    confidence: TIER_CONFIDENCE.tier3,
  };
}

/**
 * Determines the weather tier given a travel date and base reference date.
 *
 * @param {string | Date} travelDate
 * @param {string | Date} [today=new Date()]
 * @returns {{ tier: 1 | 2 | 3, source: "forecast" | "seasonal" | "current", confidence: string, daysFromToday: number }}
 */
export function selectTier(travelDate, today = new Date()) {
  const days = calculateDaysFromToday(travelDate, today);
  const tierInfo = selectTierByDays(days);
  return {
    ...tierInfo,
    daysFromToday: days,
  };
}

/**
 * recommender.js
 *
 * Deterministic, rule-based recommendation engine for Weather-Based Travel Recommendation.
 * Evaluates weather conditions against verified thresholds, computes a 0-100 Weather Risk Score,
 * assigns verdicts (Go, Go with caution, Reconsider), and generates tailored travel advice.
 *
 * Adheres to Section 1, Section 12 (WOW feature), ADR-007, and docs/02-architecture.md.
 * Strictly plain ASCII - no emojis.
 */

import {
  RAIN_HIGH_PCT,
  RAIN_MODERATE_PCT,
  TEMP_COLD_C,
  TEMP_HOT_C,
  TEMP_WARM_C,
  UV_HIGH,
  UV_VERY_HIGH,
  WIND_STRONG_KMH,
  WIND_VERY_STRONG_KMH,
} from "../config.js";

/**
 * Evaluates heat and high temperature conditions.
 *
 * @param {import('../engine/normaliser.js').WeatherData} weather
 * @returns {{ risk: number, alerts: string[], packing: string[], severity: number }}
 */
export function evaluateHeatRule(weather) {
  const temp = weather?.tempC;
  if (temp === null || temp === undefined || typeof temp !== "number") {
    return { risk: 0, alerts: [], packing: [], severity: 0 };
  }

  if (temp >= TEMP_HOT_C) {
    return {
      risk: 35,
      alerts: [
        `High temperatures reaching ${Math.round(temp)}C. Stay hydrated and minimise midday sun exposure.`,
      ],
      packing: ["Sun hat", "Breathable lightweight clothing", "Electrolyte packets"],
      severity: 3,
    };
  }

  if (temp >= TEMP_WARM_C) {
    return {
      risk: 10,
      alerts: [`Warm weather around ${Math.round(temp)}C. Ideal for morning and evening activities.`],
      packing: ["Lightweight clothing", "Water bottle"],
      severity: 1,
    };
  }

  return { risk: 0, alerts: [], packing: [], severity: 0 };
}
